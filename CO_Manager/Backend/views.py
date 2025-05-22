from django.shortcuts import render, get_object_or_404, redirect
from .models import BangKeTruLuiNguyenLieu, LenhSanXuat, CtLenhSanXuat, VatTu
from django.views.decorators.http import require_GET, require_POST
from django.http import JsonResponse, HttpResponse
from datetime import datetime, date
from .pdf_utils import convert_number_to_vietnamese_words, generate_excel

# Các view đã có
def dashboard(request):
    return render(request, 'dashboard.html', {})

def orders(request):
    return render(request, 'orders.html', {})

def purchase(request):
    return render(request, 'purchase.html', {})

def wo_ledger(request):
    return render(request, 'wo_management.html', {})

def ctc_ledger(request):
    return render(request, 'ctc_management.html', {})

def user_management(request):
    return render(request, 'user_management.html', {})


# ==================== HELPER FUNCTIONS ====================
def _get_vat_tu_info(id_san_pham):
    """
    Get VatTu information by product ID - only for NVL-KHÔ items
    Returns tuple: (vat_tu_object, ty_le_thu_hoi, don_vi_tinh, ten_nguyen_lieu, ma_hs)
    """
    try:
        if id_san_pham:
            vat_tu = VatTu.objects.get(id_san_pham=id_san_pham, nhom_vthh='NVL - KHÔ')
            return (
                vat_tu,
                vat_tu.ty_le_thu_hoi,
                vat_tu.don_vi_tinh or 'kg',
                vat_tu.ten_khac,
                vat_tu.ma_hs
            )
    except VatTu.DoesNotExist:
        pass
    return None, None, 'kg', None, ''


def _calculate_quantities(record, ty_le_thu_hoi):
    """
    Calculate derived quantities for rollback record
    Returns tuple: (so_luong_thanh_pham_thu_hoi, so_luong_thanh_pham_ton_kho)
    """
    # Calculate finished product recovery quantity
    so_luong_thanh_pham_thu_hoi = record.thanh_pham_thu_hoi
    if (so_luong_thanh_pham_thu_hoi is None and 
        record.so_luong_san_xuat is not None and 
        ty_le_thu_hoi is not None):
        so_luong_thanh_pham_thu_hoi = record.so_luong_san_xuat * ty_le_thu_hoi
    
    # Calculate inventory quantity
    so_luong_thanh_pham_ton_kho = record.so_luong_thanh_pham_ton_kho
    if (so_luong_thanh_pham_ton_kho is None and 
        so_luong_thanh_pham_thu_hoi is not None and 
        record.so_luong_san_pham_xuat is not None):
        so_luong_thanh_pham_ton_kho = so_luong_thanh_pham_thu_hoi - record.so_luong_san_pham_xuat
    
    return so_luong_thanh_pham_thu_hoi, so_luong_thanh_pham_ton_kho


def _get_production_order_output_quantity(record):
    """Get production order output quantity from CtLenhSanXuat - only for NVL-KHÔ items"""
    so_luong_san_pham_xuat = record.so_luong_san_pham_xuat
    try:
        ct_lenh_sx = CtLenhSanXuat.objects.filter(
            id_lenh_san_xuat=record.id_lenh_san_xuat,
            id_nguyen_vat_lieu__id_san_pham=record.id_san_pham,
            id_nguyen_vat_lieu__nhom_vthh='NVL - KHÔ'
        ).first()
        
        if ct_lenh_sx:
            so_luong_san_pham_xuat = ct_lenh_sx.so_luong_nguyen_vat_lieu
    except CtLenhSanXuat.DoesNotExist:
        pass
    
    return so_luong_san_pham_xuat


def _determine_status(record, so_luong_san_pham_xuat, so_luong_thanh_pham_thu_hoi):
    """Determine the status of a rollback record"""
    if record.trang_thai is not None:
        return record.trang_thai
    
    # Auto-determine status based on data completeness
    if (record.so_luong_mua_vao is not None and 
        record.so_luong_san_xuat is not None and 
        so_luong_san_pham_xuat is not None and 
        so_luong_thanh_pham_thu_hoi is not None):
        return "Hoàn thành"
    else:
        return "Đang xử lý"


def _format_rollback_record(record):
    """
    Format a single rollback record for display
    Returns formatted dictionary
    """
    # Get VatTu information - only for NVL-KHÔ items
    vat_tu, ty_le_thu_hoi, don_vi_tinh, ten_khac, ma_hs = _get_vat_tu_info(record.id_san_pham)
    
    # Use alternative name from VatTu if available
    ten_nguyen_lieu = ten_khac or record.ten_nguyen_lieu
    ma_hs = ma_hs if ma_hs else ''
    
    # Get production order output quantity
    so_luong_san_pham_xuat = _get_production_order_output_quantity(record)
    
    # Calculate derived quantities
    so_luong_thanh_pham_thu_hoi, so_luong_thanh_pham_ton_kho = _calculate_quantities(record, ty_le_thu_hoi)
    
    # Determine status
    trang_thai = _determine_status(record, so_luong_san_pham_xuat, so_luong_thanh_pham_thu_hoi)
    
    return {
        'id_bang_ke_tru_lui': record.id_bang_ke_tru_lui,
        'ma_lenh_sx': record.id_lenh_san_xuat.id_lenh_san_xuat,
        'ma_don_hang': record.id_lenh_san_xuat.id_don_hang,
        'ten_nguyen_lieu': ten_nguyen_lieu,
        'ma_hs': ma_hs,
        'don_vi_tinh': don_vi_tinh,
        'so_luong_mua_vao': record.so_luong_mua_vao,
        'so_luong_san_xuat': record.so_luong_san_xuat,
        'ty_le_thu_hoi': ty_le_thu_hoi,
        'so_luong_thanh_pham_thu_hoi': so_luong_thanh_pham_thu_hoi,
        'so_luong_san_pham_xuat': so_luong_san_pham_xuat,
        'so_luong_thanh_pham_ton_kho': so_luong_thanh_pham_ton_kho,
        'ghi_chu': record.ghi_chu,
        'ngay_thang': record.ngay_thang,
        'trang_thai': trang_thai
    }


def _safe_float_conversion(value, default=0):
    """Safely convert value to float with default fallback"""
    try:
        return float(value) if value else default
    except (ValueError, TypeError):
        return default


def _parse_date(date_string):
    """Parse date string safely"""
    if not date_string:
        return date.today()
    
    try:
        year, month, day = map(int, date_string.split('-'))
        return date(year, month, day)
    except (ValueError, AttributeError):
        return date.today()


def _update_vat_tu_recovery_rate(id_san_pham, ty_le_thu_hoi):
    """Update recovery rate in VatTu table - only for NVL-KHÔ items"""
    if not id_san_pham or ty_le_thu_hoi <= 0:
        return
    
    try:
        vat_tu = VatTu.objects.get(id_san_pham=id_san_pham, nhom_vthh='NVL - KHÔ')
        vat_tu.ty_le_thu_hoi = ty_le_thu_hoi
        vat_tu.save()
    except VatTu.DoesNotExist:
        pass


def _update_production_order_detail(lenh_sx, id_san_pham, so_luong_san_pham_xuat):
    """Update production order detail quantity - only for NVL-KHÔ items"""
    if not id_san_pham:
        return
    
    try:
        ct_lenh_sx = CtLenhSanXuat.objects.filter(
            id_lenh_san_xuat=lenh_sx,
            id_nguyen_vat_lieu__id_san_pham=id_san_pham,
            id_nguyen_vat_lieu__nhom_vthh='NVL - KHÔ'
        ).first()
        
        if ct_lenh_sx:
            ct_lenh_sx.so_luong_nguyen_vat_lieu = so_luong_san_pham_xuat
            ct_lenh_sx.save()
    except Exception as e:
        print(f"Error updating production order detail: {e}")


# ==================== ROLLBACK MAIN VIEWS ====================
def rollback(request):
    """Main rollback list view with filtering - only show NVL-KHÔ related records"""
    # Get filter parameters
    ma_don_hang = request.GET.get('ma_don_hang')
    ma_lenh_sx = request.GET.get('ma_lenh_sx')
    
    # Base query with related data - filter for NVL-KHÔ items only
    records = BangKeTruLuiNguyenLieu.objects.filter(
        id_san_pham__in=VatTu.objects.filter(nhom_vthh='NVL - KHÔ').values_list('id_san_pham', flat=True)
    ).select_related('id_lenh_san_xuat')
    
    # Apply filters
    if ma_don_hang:
        records = records.filter(id_lenh_san_xuat__id_don_hang=ma_don_hang)
    
    if ma_lenh_sx:
        records = records.filter(id_lenh_san_xuat__id_lenh_san_xuat=ma_lenh_sx)
    
    # Format records for display
    # Gộp bản ghi theo ten_nguyen_lieu
    record_dict = {}

    for record in records:
        formatted = _format_rollback_record(record)
        key = formatted['ten_nguyen_lieu'].strip().lower()

        if key not in record_dict:
            record_dict[key] = formatted
        else:
            # Cộng dồn các trường số
            record_dict[key]['so_luong_mua_vao'] += formatted['so_luong_mua_vao'] or 0
            record_dict[key]['so_luong_san_xuat'] += formatted['so_luong_san_xuat'] or 0
            record_dict[key]['so_luong_thanh_pham_thu_hoi'] += formatted['so_luong_thanh_pham_thu_hoi'] or 0
            record_dict[key]['so_luong_san_pham_xuat'] += formatted['so_luong_san_pham_xuat'] or 0
            record_dict[key]['so_luong_thanh_pham_ton_kho'] += formatted['so_luong_thanh_pham_ton_kho'] or 0

    # Dùng danh sách đã gộp
    formatted_records = list(record_dict.values())
    
    # Get order list for dropdown
    don_hang_list = LenhSanXuat.objects.values_list('id_don_hang', flat=True).distinct()
    
    context = {
        'records': formatted_records,
        'don_hang_list': don_hang_list
    }
    
    return render(request, 'rollback.html', context)


def rollback_detail(request, pk):
    """Rollback detail view - only for NVL-KHÔ items"""
    try:
        # Filter for NVL-KHÔ items only
        record = BangKeTruLuiNguyenLieu.objects.filter(
            id_bang_ke_tru_lui=pk,
            id_san_pham__in=VatTu.objects.filter(nhom_vthh='NVL - KHÔ').values_list('id_san_pham', flat=True)
        ).select_related('id_lenh_san_xuat').get()
        
        formatted_record = _format_rollback_record(record)
        context = {'record': formatted_record}
    except BangKeTruLuiNguyenLieu.DoesNotExist:
        context = {'record': None}
    
    return render(request, 'rollback_detail.html', context)


def rollback_create(request):
    """Create new rollback records - only for NVL-KHÔ items"""
    don_hang_list = LenhSanXuat.objects.values_list('id_don_hang', flat=True).distinct()
    
    if request.method == 'GET':
        return render(request, 'rollback_create.html', {'don_hang_list': don_hang_list})
    
    # POST request processing
    ma_lenh_sx = request.POST.get('ma_lenh_sx')
    
    if not ma_lenh_sx:
        return render(request, 'rollback_create.html', {
            'error': 'Vui lòng chọn lệnh sản xuất',
            'don_hang_list': don_hang_list
        })
    
    # Get production order
    try:
        lenh_sx = LenhSanXuat.objects.get(id_lenh_san_xuat=ma_lenh_sx)
    except LenhSanXuat.DoesNotExist:
        return render(request, 'rollback_create.html', {
            'error': f'Không tìm thấy lệnh sản xuất với mã: {ma_lenh_sx}',
            'don_hang_list': don_hang_list
        })
    
    # Get form data lists
    form_fields = [
        'id_san_pham', 'ten_nguyen_lieu', 'ma_hs', 'don_vi_tinh',
        'so_luong_mua_vao', 'so_luong_san_xuat', 'ty_le_thu_hoi',
        'sl_thanh_pham_thu_hoi', 'so_luong_san_pham_xuat',
        'sl_thanh_pham_ton_kho', 'ghi_chu', 'ngay_tao'
    ]
    
    form_data = {}
    for field in form_fields:
        form_data[field] = request.POST.getlist(f'{field}[]')
    
    if not form_data['ten_nguyen_lieu']:
        return render(request, 'rollback_create.html', {
            'error': 'Không có dữ liệu nguyên liệu để lưu',
            'don_hang_list': don_hang_list
        })
    
    # Process each material - only NVL-KHÔ items
    created_records = []
    for i in range(len(form_data['ten_nguyen_lieu'])):
        try:
            # Check if the product is NVL-KHÔ before processing
            id_san_pham = form_data['id_san_pham'][i] if i < len(form_data['id_san_pham']) else None
            if id_san_pham:
                try:
                    VatTu.objects.get(id_san_pham=id_san_pham, nhom_vthh='NVL - KHÔ')
                except VatTu.DoesNotExist:
                    # Skip this record if it's not NVL-KHÔ
                    continue
            
            record_data = _process_single_material_record(form_data, i, lenh_sx)
            if record_data:
                bangke_tru_lui = BangKeTruLuiNguyenLieu(**record_data)
                bangke_tru_lui.save()
                created_records.append(bangke_tru_lui)
                
                # Update related data
                ty_le_thu_hoi = _safe_float_conversion(
                    form_data['ty_le_thu_hoi'][i] if i < len(form_data['ty_le_thu_hoi']) else None
                )
                if ty_le_thu_hoi > 1:
                    ty_le_thu_hoi = ty_le_thu_hoi / 100
                
                _update_vat_tu_recovery_rate(id_san_pham, ty_le_thu_hoi)
                _update_production_order_detail(
                    lenh_sx, 
                    id_san_pham, 
                    record_data.get('so_luong_san_pham_xuat', 0)
                )
                
        except Exception as e:
            print(f"Error processing material record {i}: {e}")
            continue
    
    if not created_records:
        return render(request, 'rollback_create.html', {
            'error': 'Không thể tạo bảng kê trừ lùi. Vui lòng kiểm tra lại dữ liệu hoặc đảm bảo có ít nhất một nguyên liệu thuộc nhóm NVL - KHÔ.',
            'don_hang_list': don_hang_list
        })
    
    return redirect('rollback')


def _process_single_material_record(form_data, index, lenh_sx):
    """Process a single material record from form data - only for NVL-KHÔ items"""
    i = index
    
    # Get basic data
    id_san_pham = form_data['id_san_pham'][i] if i < len(form_data['id_san_pham']) else None
    ten_nguyen_lieu = form_data['ten_nguyen_lieu'][i]
    ma_hs = form_data['ma_hs'][i] if i < len(form_data['ma_hs']) else ''
    
    # Get ma_hs from VatTu if not provided - only for NVL-KHÔ items
    if not ma_hs and id_san_pham:
        _, _, _, _, ma_hs = _get_vat_tu_info(id_san_pham)
    
    # Parse quantities
    so_luong_mua_vao = _safe_float_conversion(
        form_data['so_luong_mua_vao'][i] if i < len(form_data['so_luong_mua_vao']) else None
    )
    so_luong_san_xuat = _safe_float_conversion(
        form_data['so_luong_san_xuat'][i] if i < len(form_data['so_luong_san_xuat']) else None
    )
    
    # Parse recovery rate
    ty_le_thu_hoi = _safe_float_conversion(
        form_data['ty_le_thu_hoi'][i] if i < len(form_data['ty_le_thu_hoi']) else None
    )
    if ty_le_thu_hoi > 1:
        ty_le_thu_hoi = ty_le_thu_hoi / 100
    
    # Calculate or get recovery quantity
    if i < len(form_data['sl_thanh_pham_thu_hoi']) and form_data['sl_thanh_pham_thu_hoi'][i]:
        so_luong_thanh_pham_thu_hoi = _safe_float_conversion(form_data['sl_thanh_pham_thu_hoi'][i])
    else:
        so_luong_thanh_pham_thu_hoi = so_luong_san_xuat * ty_le_thu_hoi
    
    # Get output quantity
    so_luong_san_pham_xuat = _safe_float_conversion(
        form_data['so_luong_san_pham_xuat'][i] if i < len(form_data['so_luong_san_pham_xuat']) else None
    )
    
    # Calculate or get inventory quantity
    if i < len(form_data['sl_thanh_pham_ton_kho']) and form_data['sl_thanh_pham_ton_kho'][i]:
        so_luong_ton_kho = _safe_float_conversion(form_data['sl_thanh_pham_ton_kho'][i])
    else:
        so_luong_ton_kho = so_luong_thanh_pham_thu_hoi - so_luong_san_pham_xuat
    
    # Parse date
    ngay_tao = _parse_date(
        form_data['ngay_tao'][i] if i < len(form_data['ngay_tao']) and form_data['ngay_tao'][i] else None
    )
    
    # Determine status
    trang_thai = "Hoàn thành" if so_luong_mua_vao > 0 and so_luong_san_xuat > 0 else "Đang xử lý"
    
    # Get notes
    ghi_chu = form_data['ghi_chu'][i] if i < len(form_data['ghi_chu']) else ''
    
    return {
        'id_lenh_san_xuat': lenh_sx,
        'id_san_pham': id_san_pham,
        'ten_nguyen_lieu': ten_nguyen_lieu,
        'so_luong_mua_vao': so_luong_mua_vao,
        'so_luong_san_xuat': so_luong_san_xuat,
        'thanh_pham_thu_hoi': so_luong_thanh_pham_thu_hoi,
        'so_luong_san_pham_xuat': so_luong_san_pham_xuat,
        'so_luong_thanh_pham_ton_kho': so_luong_ton_kho,
        'ngay_thang': ngay_tao,
        'trang_thai': trang_thai,
        'ghi_chu': ghi_chu
    }


# ==================== API ENDPOINTS ====================
@require_GET
def get_lenh_san_xuat(request):
    """API endpoint to get production orders by order code"""
    ma_don_hang = request.GET.get('ma_don_hang')
    
    if ma_don_hang:
        lenh_sx_list = LenhSanXuat.objects.filter(
            id_don_hang=ma_don_hang
        ).values_list('id_lenh_san_xuat', flat=True)
        return JsonResponse({'lenh_sx_list': list(lenh_sx_list)})
    
    return JsonResponse({'lenh_sx_list': []})


@require_GET
def get_lenh_san_xuat_detail(request):
    """API endpoint to get production order details - only for NVL-KHÔ items, gộp theo tên_khac"""
    ma_lenh_sx = request.GET.get('ma_lenh_sx')
    
    if not ma_lenh_sx:
        return JsonResponse({
            'status': 'error',
            'message': 'Vui lòng cung cấp mã lệnh sản xuất'
        })
    
    try:
        lenh_sx = LenhSanXuat.objects.get(id_lenh_san_xuat=ma_lenh_sx)

        ct_lenh_sx = CtLenhSanXuat.objects.filter(
            id_lenh_san_xuat=lenh_sx,
            id_nguyen_vat_lieu__nhom_vthh='NVL - KHÔ'
        )

        # Gộp theo tên_khac (tên nguyên liệu)
        nguyen_lieu_dict = {}

        for item in ct_lenh_sx:
            vat_tu = item.id_nguyen_vat_lieu

            if not vat_tu or vat_tu.nhom_vthh != 'NVL - KHÔ':
                continue

            ten_nguyen_lieu = vat_tu.ten_khac or vat_tu.ten_sp_chinh
            if not ten_nguyen_lieu:
                continue

            key = ten_nguyen_lieu.strip().lower()

            if key not in nguyen_lieu_dict:
                nguyen_lieu_dict[key] = {
                    'id_ct_lenh_san_xuat': item.id_ct_lenh_san_xuat,
                    'ten_nguyen_lieu': ten_nguyen_lieu,
                    'ma_hs': vat_tu.ma_hs or '',
                    'don_vi_tinh': vat_tu.don_vi_tinh or 'kg',
                    'ty_le_thu_hoi': vat_tu.ty_le_thu_hoi,
                    'so_luong_nguyen_vat_lieu': item.so_luong_nguyen_vat_lieu or 0,
                    'so_luong_san_pham': item.so_luong_san_pham or 0,
                    'id_san_pham': vat_tu.id_san_pham,
                }
            else:
                # Cộng dồn số lượng
                nguyen_lieu_dict[key]['so_luong_nguyen_vat_lieu'] += item.so_luong_nguyen_vat_lieu or 0
                nguyen_lieu_dict[key]['so_luong_san_pham'] += item.so_luong_san_pham or 0

                # Cập nhật tỷ lệ thu hồi nếu ban đầu chưa có
                if nguyen_lieu_dict[key]['ty_le_thu_hoi'] is None and vat_tu.ty_le_thu_hoi is not None:
                    nguyen_lieu_dict[key]['ty_le_thu_hoi'] = vat_tu.ty_le_thu_hoi

        return JsonResponse({
            'status': 'success',
            'ma_don_hang': lenh_sx.id_don_hang,
            'ma_lenh_sx': lenh_sx.id_lenh_san_xuat,
            'ngay_tao': lenh_sx.ngay_tao_don_hang.strftime('%Y-%m-%d') if lenh_sx.ngay_tao_don_hang else None,
            'chi_tiet': list(nguyen_lieu_dict.values())
        })

    except LenhSanXuat.DoesNotExist:
        return JsonResponse({
            'status': 'error',
            'message': f'Không tìm thấy lệnh sản xuất với mã: {ma_lenh_sx}'
        })


# ==================== EXPORT FUNCTIONS ====================
@require_GET
def rollback_export_pdf(request, pk):
    """Render rollback record as HTML for PDF printing (AJAX) - only for NVL-KHÔ items"""
    try:
        record = BangKeTruLuiNguyenLieu.objects.filter(
            id_bang_ke_tru_lui=pk,
            id_san_pham__in=VatTu.objects.filter(nhom_vthh='NVL - KHÔ').values_list('id_san_pham', flat=True)
        ).select_related('id_lenh_san_xuat').get()
    except BangKeTruLuiNguyenLieu.DoesNotExist:
        return HttpResponse("Không tìm thấy bảng kê trừ lùi hoặc sản phẩm không thuộc nhóm NVL - KHÔ", status=404)

    formatted_record = _format_rollback_record(record)

    if formatted_record['ty_le_thu_hoi']:
        formatted_record['ty_le_thu_hoi'] *= 100

    ton_kho = int(formatted_record['so_luong_thanh_pham_ton_kho']) if formatted_record['so_luong_thanh_pham_ton_kho'] else 0
    ton_kho_chu = convert_number_to_vietnamese_words(ton_kho)

    context = {
        'record': formatted_record,
        'ton_kho_chu': ton_kho_chu
    }

    return render(request, 'rollback_detail_pdf.html', context)


@require_GET
def rollback_export_excel(request, pk):
    """Export a rollback record to Excel - only for NVL-KHÔ items"""
    try:
        record = BangKeTruLuiNguyenLieu.objects.filter(
            id_bang_ke_tru_lui=pk,
            id_san_pham__in=VatTu.objects.filter(nhom_vthh='NVL - KHÔ').values_list('id_san_pham', flat=True)
        ).select_related('id_lenh_san_xuat').get()
    except BangKeTruLuiNguyenLieu.DoesNotExist:
        return HttpResponse("Không tìm thấy bảng kê trừ lùi hoặc sản phẩm không thuộc nhóm NVL - KHÔ", status=404)
    
    # Generate Excel file
    excel_file = generate_excel(data=None, record=record)
    
    response = HttpResponse(
        excel_file, 
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = f'attachment; filename="bang_ke_tru_lui_{pk}.xlsx"'
    
    return response