from django.shortcuts import render, get_object_or_404
from django.views.decorators.http import require_POST
from django.http import JsonResponse
from django.utils import timezone
from django.http import HttpResponse
from django.db import transaction

from .models import *

from collections import defaultdict
from io import BytesIO
import json
import requests
import re
import os

from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, Border, Side, PatternFill
from openpyxl.utils import get_column_letter

# Create your views here.

def dashboard(request):
    return render(request, 'dashboard.html', {})

def rollback(request):
    return render(request, 'rollback.html', {})

def purchase(request):
    return render(request, 'purchase.html', {})

def wo_ledger(request):
    return render(request, 'wo_management.html', {})

def ctc_ledger(request):
    return render(request, 'ctc_management.html', {})

def users_management(request):
    users = Nguoi.objects.all().order_by('id')

    context = {
        'users': users,
    }
    return render(request, 'user_management.html', context)


def users_management(request):
    users = Nguoi.objects.all().order_by('id')

    context = {
        'users': users,
    }
    return render(request, 'user_management.html', context)

@require_POST
def users_create(request):
    users = Nguoi.objects.all().order_by('id')

    context = {
        'users': users,
    }
    return render(request, 'user_management.html', context)

@require_POST
def users_update(request):
    users = Nguoi.objects.all().order_by('id')

    context = {
        'users': users,
    }
    return render(request, 'user_management.html', context)

@require_POST
def users_delete(request):
    users = Nguoi.objects.all().order_by('id')

    context = {
        'users': users,
    }
    return render(request, 'user_management.html', context)



def product_management(request):
    products = VatTu.objects.all().order_by('id_san_pham')
    context = {
        'products': products,
    }
    return render(request, 'product_management.html', context)

@require_POST
def product_update(request):
    """API endpoint để xử lý cập nhật thông tin sản phẩm"""
    try:
        # Phân tích JSON từ request body
        data = json.loads(request.body)
        
        # Lấy ID sản phẩm từ dữ liệu gửi lên
        product_id = data.get('id')

        # Tìm sản phẩm cần cập nhật trong database
        product = get_object_or_404(VatTu, id_san_pham=product_id)
        
        # Cập nhật thông tin sản phẩm
        product.ten_khac = data.get('alt_name', product.ten_khac)
        product.ma_hs = data.get('hs_code', product.ma_hs)
        product.ghi_chu = data.get('note', product.ghi_chu)

        # Xử lý trường số - tỉ lệ thu hồi
        recovery_rate = data.get('recovery_rate')
        if recovery_rate:
            try:
                product.ty_le_thu_hoi = float(recovery_rate)
            except (ValueError, TypeError):
                # Giữ nguyên giá trị cũ nếu dữ liệu không hợp lệ
                pass
        
        # Lưu thay đổi vào database
        product.save()
        
        # Trả về kết quả thành công
        return JsonResponse({
            'success': True,
            'message': 'Cập nhật sản phẩm thành công!'
        })
        
    except VatTu.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Không tìm thấy sản phẩm!'
        }, status=404)
        
    except json.JSONDecodeError:
        return JsonResponse({
            'success': False,
            'message': 'Dữ liệu không hợp lệ!'
        }, status=400)
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Lỗi: {str(e)}'
        }, status=500)

@require_POST
def product_delete(request):
    """Để xử lý xóa sản phẩm"""
    product_id = json.loads(request.body).get('id')

    if not product_id:
        return JsonResponse({
            'success': False,
            'message': 'Không tìm thấy mã sản phẩm!'
        }, status=404)

    product = get_object_or_404(VatTu, id_san_pham=product_id)
    product.delete()

    return JsonResponse({
        'success': True,
        'message': 'Xóa sản phẩm thành công!'
    })


@require_POST
def products_sync_cloudify(request):
    """Xử lý đồng bộ hóa dữ liệu sản phẩm từ Cloudify."""
    try:
        data_cloudify, session = fetch_erp_data(model='danh.muc.vat.tu.hang.hoa', endpoint='search_read', fields=["MA","TEN","DONG_SAN_PHAM","TINH_CHAT","LIST_NHOM_VTHH","DVT_CHINH_ID"])

    except requests.RequestException as e:
        return JsonResponse({
            'success': False,
            'message': f'Lỗi kết nối đến Cloudify: {str(e)}'
        }, status=500)
        
    if data_cloudify:
        adapter_data = {
            "0":'Vật tư hàng hóa', 
            "1":'Thành phẩm', 
            "2":'Dich vụ', 
            "3":'Chỉ là diễn giải', 
            "4":'Bán thành phẩm'
        }
        for item in data_cloudify['records']:
            item['TINH_CHAT'] = adapter_data.get(item['TINH_CHAT'], None)
            item['DVT_CHINH_ID'] = item['DVT_CHINH_ID'][1] if item['DVT_CHINH_ID'] else None

        if data_cloudify['length'] == len(data_cloudify['records']):

            # Lấy ra danh sách mã sản phẩm từ Cloudify
            cloudify_product = {item['MA']: item for item in data_cloudify['records']}

            # Lấy ra danh sách sản phẩm từ database
            db_products = VatTu.objects.filter(id_san_pham__in=cloudify_product.keys())
            
            # Lấy danh sách các mã đã tìm thấy trong database
            found_product_id = {item.id_san_pham for item in db_products}

            # Tạo danh sách các mã sản phẩm không tìm thấy trong database
            not_found_product_id = set(cloudify_product.keys()) - found_product_id

            # Update lại những sản phẩm đã tìm thấy
            for item in db_products:
                item.ten_sp_chinh = cloudify_product[item.id_san_pham].get('TEN')
                item.don_vi_tinh = cloudify_product[item.id_san_pham].get('DVT_CHINH_ID')
                item.loai_sp = cloudify_product[item.id_san_pham].get('TINH_CHAT')
                item.nhom_vthh = cloudify_product[item.id_san_pham].get('LIST_NHOM_VTHH')
        
            # Thêm mới những sản phẩm không tìm thấy
            objs = []
            for id in not_found_product_id:
                objs.append(
                    VatTu(
                        id_san_pham=id,
                        ten_sp_chinh=cloudify_product[id].get('TEN'),
                        don_vi_tinh=cloudify_product[id].get('DVT_CHINH_ID'),
                        loai_sp=cloudify_product[id].get('TINH_CHAT'),
                        nhom_vthh=cloudify_product[id].get('LIST_NHOM_VTHH')
                    )
                )

            # Dùng transaction để đảm bảo atomicity
            with transaction.atomic():
                VatTu.objects.bulk_update(db_products, ['ten_sp_chinh', 'don_vi_tinh', 'loai_sp', 'nhom_vthh']) # Cập nhật những sản phẩm đã tìm thấy
                VatTu.objects.bulk_create(objs) # Thêm mới những sản phẩm không tìm thấy

            return JsonResponse({
                'success': True,
                'data': data_cloudify
            })
        
        else:
            return JsonResponse({
                'success': False,
                'message': 'Đồng bộ thiếu dữ liệu!',
                'data': data_cloudify
            })

    return JsonResponse({
        'success': False,
        'message': 'Không thể đồng bộ hóa dữ liệu từ Cloudify!'
    }, status=500)


def fetch_erp_data(model=None, endpoint=None, params=None, fields=None, session=None):
    """Hàm lấy dữ liệu từ hệ thống ERP qua API"""

    # Cấu hình API
    BASE_URL = 'https://tanphongjsc.cloudify.vn/web'
    LOGIN_URL = f'{BASE_URL}/login'
    RPC_URL = f'{BASE_URL}/dataset/{endpoint}'
    EMAIL = os.getenv('cloudify_user')
    PASSWORD = os.getenv('cloudify_password')

    # Tạo session mới nếu chưa có
    if not session:
        session = requests.Session()
        login_page = session.get(LOGIN_URL)
        csrf_token = re.search(r'name="csrf_token".*?value="([^"]+)"', login_page.text).group(1)

        # Đăng nhập
        session.post(LOGIN_URL, data={
            'csrf_token': csrf_token,
            'login': EMAIL,
            'password': PASSWORD,
        })

    # Gọi JSON-RPC
    payload = {
        "jsonrpc": "2.0",
        "method": "call",
        "params": {
            "model": model,
            "fields": fields or [],
            "domain": []
        } if params is None else params,
        "id": int(timezone.now().timestamp() * 1000)
    }

    headers = {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
    }

    response = session.post(RPC_URL, headers=headers, json=payload)
    data = response.json().get('result', [])
    
    return data, session


def orders(request):
    # Truy vấn danh sách đơn hàng từ cơ sở dữ liệu
    orders = LenhSanXuat.objects.all().order_by('-id_lenh_san_xuat')
    
    for order in orders:
        if order.id_don_hang:
            len_id = len(order.id_don_hang)
            order.id_don_hang = f"ĐH{'0'*(6-len_id)}{int(order.id_don_hang)-1}"
    
    context = {
        'orders': orders,
    }

    return render(request, 'orders.html', context)

def orders_detail(request, pk):
    # Truy vấn chi tiết đơn hàng từ cơ sở dữ liệu
    order_items = CtLenhSanXuat.objects.filter(id_lenh_san_xuat=pk).select_related('id_san_pham', 'id_nguyen_vat_lieu', 'id_lenh_san_xuat')
    if not order_items.exists():
        return render(request, '404.html')
    
    # Lấy ra danh sách id_san_pham unique
    unique_products = {}
    for item in order_items:
        id = item.id_san_pham
        if id not in unique_products:
            unique_products[id] = item
    
    order_unique_items = list(unique_products.values())        


    # Tính tổng số lượng sản phẩm
    total_quantity = sum(item.so_luong_san_pham for item in order_unique_items)

    context = {
        'orders': order_items,
        'order_unique_items': order_unique_items,
        'total_quantity': total_quantity,
    }

    return render(request, 'orders_detail.html', context)

@require_POST
def orders_sync_cloudify(request):
    """Xử lý đồng bộ hóa dữ liệu đơn hàng từ Cloudify."""
    try:
        # Lấy danh sách lệnh sản xuất từ ERP
        production_orders_data, session = fetch_erp_data(model='stock.ex.lenh.san.xuat', endpoint='search_read', fields=['SO_LENH', 'LAP_TU_DON_DAT_HANG_IDS', 'NGAY', 'STOCK_EX_LENH_SAN_XUAT_CHI_TIET_THANH_PHAM_IDS'])

        if not production_orders_data:
            return JsonResponse({
                'success': False,
                'message': 'Không có dữ liệu lệnh sản xuất từ Cloudify!'
            }, status=404)

        # Chuyển đổi thành dict để dễ truy xuất
        production_orders = {order['SO_LENH']: order for order in production_orders_data['records']}
        
        # Tìm các lệnh sản xuất chưa tồn tại trong database
        existing_order_ids = set(
            LenhSanXuat.objects.filter(id_lenh_san_xuat__in=production_orders.keys())
            .values_list('id_lenh_san_xuat', flat=True)
        )
        new_order_ids = set(production_orders.keys()) - existing_order_ids

        if not new_order_ids:
            return JsonResponse({
                'success': True,
                'message': 'Tất cả lệnh sản xuất đã được đồng bộ!'
            })

        # Lấy thông tin định mức nguyên vật liệu cho các lệnh mới
        product_norms = []
        
        for order_id in new_order_ids:
            product_ids = production_orders[order_id]['STOCK_EX_LENH_SAN_XUAT_CHI_TIET_THANH_PHAM_IDS']
            
            for product_id in product_ids:
                # Lấy thông tin chi tiết thành phẩm
                product_params = {
                    "model": "stock.ex.lenh.san.xuat.chi.tiet.thanh.pham",
                    "method": "read",
                    "args": [product_id, ['MA_HANG_ID', 'SO_LUONG', 'STOCK_EX_THANH_PHAM_CHI_TIET_DINH_MUC_XUAT_NVL_IDS']],
                    "kwargs": {'active_menu': 171},
                }
                
                product_details, session = fetch_erp_data(endpoint='call_kw/stock.ex.lenh.san.xuat.chi.tiet.thanh.pham/read', params=product_params, session=session)
                
                if not product_details:
                    product_details, session = fetch_erp_data(endpoint='call_kw/stock.ex.lenh.san.xuat.chi.tiet.thanh.pham/read', params=product_params,)
                    
                product_details = product_details[0]
                material_ids = product_details['STOCK_EX_THANH_PHAM_CHI_TIET_DINH_MUC_XUAT_NVL_IDS']
                
                # Lấy thông tin định mức nguyên vật liệu
                material_details = []
                if material_ids:
                    material_params = {
                        "model": "stock.ex.thanh.pham.chi.tiet.dinh.muc.xuat.nvl",
                        "method": 'read',
                        "args": [material_ids, ['MA_HANG_ID', 'SO_LUONG_NVL']],
                        "kwargs": {'active_menu': 171},
                    }
                    
                    material_details, session = fetch_erp_data(endpoint='call_kw/stock.ex.thanh.pham.chi.tiet.dinh.muc.xuat.nvl/read', params=material_params, session=session)

                # Lưu thông tin định mức
                product_norms.append({
                    'id_lenh_san_xuat': order_id,
                    'id_san_pham': product_details['MA_HANG_ID'][1],
                    'so_luong_san_pham': product_details['SO_LUONG'],
                    'dinh_muc_nvl': {item['MA_HANG_ID'][1]: item['SO_LUONG_NVL'] for item in material_details or []}
                })

        # Lấy tất cả sản phẩm liên quan
        all_product_ids = set(
            [item['id_san_pham'] for item in product_norms] + # ID thành phẩm
            [key for item in product_norms for key in item['dinh_muc_nvl'].keys()] # ID nguyên vật liệu
        )
        
        all_products = {
            vt.id_san_pham: vt 
            for vt in VatTu.objects.filter(id_san_pham__in=all_product_ids)
        }

        # Tạo các đối tượng lệnh sản xuất
        lenh_san_xuat_objs = []
        for order_id in new_order_ids:
            order_data = production_orders[order_id]
            lenh_san_xuat_objs.append(
                LenhSanXuat(
                    id_lenh_san_xuat=order_id,
                    id_don_hang=order_data['LAP_TU_DON_DAT_HANG_IDS'][0] if order_data['LAP_TU_DON_DAT_HANG_IDS'] else None,
                    ngay_tao_don_hang=order_data['NGAY'].split(" ")[0]
                )
            )

        # Tạo dict để map order_id với object
        lenh_san_xuat_dict = {obj.id_lenh_san_xuat: obj for obj in lenh_san_xuat_objs}

        # Tạo các đối tượng chi tiết lệnh sản xuất
        ct_lenh_san_xuat_objs = []
        for product in product_norms:
            if product['id_san_pham'] not in all_products:
                continue
                
            for material_id, material_quantity in product['dinh_muc_nvl'].items():
                if material_id not in all_products:
                    continue
                    
                ct_lenh_san_xuat_objs.append(
                    CtLenhSanXuat(
                        id_lenh_san_xuat=lenh_san_xuat_dict[product['id_lenh_san_xuat']],
                        id_san_pham=all_products[product['id_san_pham']],
                        ten_san_pham=all_products[product['id_san_pham']].ten_sp_chinh,
                        so_luong_san_pham=product['so_luong_san_pham'],
                        id_nguyen_vat_lieu=all_products[material_id],
                        so_luong_nguyen_vat_lieu=material_quantity,
                    )
                )

        # Lưu vào database với transaction
        with transaction.atomic():
            LenhSanXuat.objects.bulk_create(lenh_san_xuat_objs)
            CtLenhSanXuat.objects.bulk_create(ct_lenh_san_xuat_objs)

        return JsonResponse({
            'success': True,
            'message': f'Đồng bộ thành công lệnh sản xuất!',
            'data_lenh_san_xuat': production_orders,
            'data_product_norms': product_norms
        })

    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': f'Lỗi đồng bộ hóa: {str(e)}'
        }, status=500)


def orders_export(request, pk):
    """Xuất báo cáo tỉ lệ phối trộn theo định dạng PDF hoặc Excel."""
    export_format = request.GET.get('format', '').lower()
    
    # Lấy và tổ chức dữ liệu
    try:
        order_data = get_order_data(pk)
    except Exception as e:
        return JsonResponse({'success': False, 'message': f'Dữ liệu thiếu hoặc không hợp lệ: {e}'}, status=400)
    
    context = {**order_data, 'today': timezone.now()}
    
    if export_format == 'pdf':
        return render(request, 'form/ti_le_dau_tron_pdf.html', context)
    elif export_format == 'excel':
        return create_excel_response(pk, context)
    else:
        return JsonResponse({'success': False, 'message': 'Format không hợp lệ!'}, status=400)

def get_order_data(order_id):
    """Lấy và tổ chức dữ liệu lệnh sản xuất."""
    # Lấy chi tiết lệnh sản xuất
    order_items = CtLenhSanXuat.objects.filter(id_lenh_san_xuat=order_id).select_related(
        'id_san_pham', 'id_nguyen_vat_lieu')
    
    # Xác định danh sách nguyên liệu để làm header
    material_types = sorted({obj.id_nguyen_vat_lieu.ten_khac for obj in order_items})

    # Gom nhóm theo sản phẩm
    products_map = {}
    total_quantity = 0
    material_totals = defaultdict(float)
    
    for item in order_items:
        product_id = item.id_san_pham.id_san_pham
        material_name = item.id_nguyen_vat_lieu.ten_khac
        material_qty = item.so_luong_nguyen_vat_lieu or 0
        
        # Khởi tạo thông tin sản phẩm nếu chưa có
        if product_id not in products_map:
            product_qty = item.so_luong_san_pham or 0
            products_map[product_id] = {
                'ten_san_pham': item.ten_san_pham or item.id_san_pham.ten_khac,
                'id_san_pham': item.id_san_pham,
                'so_luong_san_pham': product_qty,
                'materials': defaultdict(float),
            }
            total_quantity += product_qty
        
        # Cộng dồn NVL
        products_map[product_id]['materials'][material_name] += material_qty
        material_totals[material_name] += material_qty
    
    # Chuyển defaultdict sang dict thông thường
    for product in products_map.values():
        product['materials'] = dict(product['materials'])
    
    return {
        'order_items': list(products_map.values()),
        'material_types': material_types,
        'totals': dict(material_totals),
        'total_quantity': total_quantity,
    }

def create_excel_response(order_id, data):
    """Tạo file Excel báo cáo tỉ lệ phối trộn."""
    wb = Workbook()
    ws = wb.active
    
    # Thiết lập styles cho Excel
    styles = {
        'border': Border(left=Side(style='thin'), right=Side(style='thin'), 
                        top=Side(style='thin'), bottom=Side(style='thin')),
        'fill': PatternFill(start_color="F0F0F0", end_color="F0F0F0", fill_type="solid"),
        'base_font': Font(name='Times New Roman', size=12),
        'bold_font': Font(name='Times New Roman', size=12, bold=True),
        'title_font': Font(name='Times New Roman', size=14, bold=True),
        'center': Alignment(horizontal='center', vertical='center'),
        'right': Alignment(horizontal='right')
    }
    
    # ===== PHẦN 1: THÔNG TIN CÔNG TY =====
    company_info = [
        "CÔNG TY CỔ PHẦN TÂN PHONG", 
        "Địa chỉ: Thị Trấn Hùng Sơn, Huyện Lâm Thao, Tỉnh Phú Thọ", 
        "Điện thoại: 0210 221 5277", 
        "Mã số thuế: 2600274542"
    ]
    for i, info in enumerate(company_info):
        cell = ws.cell(row=i+1, column=1, value=info)
        cell.font = styles['bold_font'] if i == 0 else styles['base_font']
    
    # ===== PHẦN 2: TIÊU ĐỀ VÀ HEADER =====
    material_types = data['material_types']
    total_cols = len(material_types) + 5  # Tổng số cột
    
    # Tiêu đề bảng
    ws.merge_cells(start_row=6, start_column=1, end_row=6, end_column=total_cols)
    title_cell = ws.cell(row=6, column=1, value="BẢNG TỈ LỆ PHỐI TRỘN CÁC MẶT HÀNG CHÈ")
    apply_cell_style(title_cell, font=styles['title_font'], align=styles['center'])

    # Header dòng 1
    headers = ["STT", "Tên Hàng Hoá", "Mã HS", "Số lượng", "Thành phần"] + material_types[1:] + ["Tổng cộng"]
    for i, header in enumerate(headers, 1):
        if header:
            cell = ws.cell(row=7, column=i, value=header)
            apply_cell_style(cell, font=styles['bold_font'], border=styles['border'], 
                         align=styles['center'], fill=styles['fill'])

    # Merge cột thành phần
    ws.merge_cells(start_row=7, start_column=5, end_row=7, end_column=5 + len(material_types) - 1)

    # Header dòng 2 (thành phần chi tiết)
    for i, material in enumerate(material_types):
        cell = ws.cell(row=8, column=i+5, value=material)
        apply_cell_style(cell, font=styles['bold_font'], border=styles['border'], 
                     align=styles['center'], fill=styles['fill'])

    # Merge các cột cơ bản
    for col in [1, 2, 3, 4, len(headers)]:
        ws.merge_cells(start_row=7, start_column=col, end_row=8, end_column=col)
    
    # ===== PHẦN 3: DỮ LIỆU SẢN PHẨM =====
    material_cols = {m: i+5 for i, m in enumerate(material_types)}
    start_row = 9
    order_items = data['order_items']
    
    for row_idx, item in enumerate(order_items, start_row):
        # STT, Tên HH, Mã HS, Số lượng
        basic_cells = [
            (1, row_idx-start_row+1),
            (2, item['ten_san_pham']),
            (3, item['id_san_pham'].ma_hs),
            (4, item['so_luong_san_pham'])
        ]
        
        for col, value in basic_cells:
            cell = ws.cell(row=row_idx, column=col, value=value)
            number_format = '#,##0' if col == 4 else None
            apply_cell_style(cell, font=styles['base_font'], border=styles['border'], 
                         align=styles['center'], number_format=number_format)
        
        # Nguyên liệu
        for mat, col in material_cols.items():
            val = item['materials'].get(mat)
            cell = ws.cell(row=row_idx, column=col, value=val)
            apply_cell_style(cell, font=styles['base_font'], border=styles['border'], 
                         align=styles['center'], number_format='#,##0' if val else None)
        
        # Tổng cộng
        cell = ws.cell(row=row_idx, column=total_cols, value=item['so_luong_san_pham'])
        apply_cell_style(cell, font=styles['base_font'], border=styles['border'], 
                     align=styles['center'], number_format='#,##0')
    
    # ===== PHẦN 4: DÒNG TỔNG CỘNG =====
    total_row = start_row + len(order_items)
    
    # Tiêu đề "Tổng cộng"
    cell = ws.cell(row=total_row, column=1, value="Tổng cộng")
    apply_cell_style(cell, font=styles['bold_font'], border=styles['border'], align=styles['center'])
    ws.merge_cells(start_row=total_row, start_column=1, end_row=total_row, end_column=3)

    # Tổng số lượng sản phẩm
    cell = ws.cell(row=total_row, column=4, value=data['total_quantity'])
    apply_cell_style(cell, font=styles['bold_font'], border=styles['border'], 
                 align=styles['center'], number_format='#,##0')

    # Tổng lượng nguyên liệu
    for key, col in material_cols.items():
        cell = ws.cell(row=total_row, column=col, value=data['totals'].get(key))
        apply_cell_style(cell, font=styles['bold_font'], border=styles['border'], 
                     align=styles['center'], number_format='#,##0')
    
    # Tổng cộng cuối cùng
    cell = ws.cell(row=total_row, column=total_cols, value=data['total_quantity'])
    apply_cell_style(cell, font=styles['bold_font'], border=styles['border'], 
                 align=styles['center'], number_format='#,##0')
    
    # ===== PHẦN 5: CHỮ KÝ VÀ CAM KẾT =====
    sig_row = total_row + 3
    today = data['today']

    # Cam kết
    commitment = "Công ty cam kết số liệu, thông tin khai báo trên là đúng và chịu trách nhiệm trước pháp luật về thông tin, số liệu đã khai."
    cell = ws.cell(row=sig_row, column=1, value=commitment)
    cell.font = styles['base_font']
    ws.merge_cells(start_row=sig_row, start_column=1, end_row=sig_row, end_column=total_cols)

    # Ngày tháng, người đại diện, chỗ ký
    signatures = [
        (sig_row+2, total_cols-1, f"Ngày {today.day} tháng {today.month} năm {today.year}", 
         styles['base_font']),
        (sig_row+4, total_cols, "NGƯỜI ĐẠI DIỆN THEO PHÁP LUẬT CỦA THƯƠNG NHÂN", 
         styles['bold_font']),
        (sig_row+6, total_cols-1, "(Ký, đóng dấu, ghi rõ họ, tên)", 
         styles['base_font'])
    ]

    for row, col, text, font in signatures:
        cell = ws.cell(row=row, column=col, value=text)
        apply_cell_style(cell, font=font, align=styles['right'])
    
    # ===== PHẦN 6: ĐIỀU CHỈNH CHIỀU RỘNG CỘT =====
    # Chỉ xem xét các dòng quan trọng để tối ưu hiệu suất
    for column in ws.columns:
        max_length = 0
        column_letter = get_column_letter(column[0].column)
        
        for cell in column[6:11]:  # Chỉ kiểm tra các dòng header và một vài dòng đầu tiên
            try:
                cell_length = len(str(cell.value)) if cell.value else 0
                if cell_length > max_length:
                    max_length = cell_length
            except:
                pass
        
        ws.column_dimensions[column_letter].width = max_length + 3
    
    # ===== TẠO RESPONSE =====
    output = BytesIO()
    wb.save(output)
    output.seek(0)
    
    filename = f"Lenh_SX_{order_id}_{today.strftime('%Y-%m-%d')}.xlsx"
    response = HttpResponse(
        output.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = f'attachment; filename="{filename}"'
    return response

def apply_cell_style(cell, font=None, border=None, align=None, fill=None, number_format=None):
    """Áp dụng style cho một ô Excel."""
    if font: cell.font = font
    if border: cell.border = border
    if align: cell.alignment = align
    if fill: cell.fill = fill
    if number_format and cell.value is not None: cell.number_format = number_format