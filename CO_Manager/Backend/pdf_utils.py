from django.template.loader import get_template
from django.conf import settings
import os
import io
import re
from num2words import num2words
from django.utils.html import conditional_escape
from django.contrib.humanize.templatetags.humanize import intcomma
import datetime
import xlsxwriter
from django.conf import settings
from Backend.models import VatTu


def convert_number_to_vietnamese_words(number):
    """Convert a number to Vietnamese words with the first letter capitalized"""
    if number == 0:
        return "Không"
    
    # Using the num2words library with Vietnamese language
    words = num2words(number, lang='vi')
    
    # Capitalize the first letter
    words = words.capitalize()
    
    return words


def generate_excel(data, record):
    """Generate an Excel file for rollback data"""
    output = io.BytesIO()
    workbook = xlsxwriter.Workbook(output)
    worksheet = workbook.add_worksheet()
    
    # Define formats
    header_format = workbook.add_format({
        'bold': True,
        'align': 'center',
        'valign': 'vcenter',
        'border': 1,
        'bg_color': '#F2F2F2'
    })
    
    cell_format = workbook.add_format({
        'align': 'center',
        'valign': 'vcenter',
        'border': 1
    })
    
    number_format = workbook.add_format({
        'align': 'center',
        'valign': 'vcenter',
        'border': 1,
        'num_format': '#,##0.00'
    })
    
    title_format = workbook.add_format({
        'bold': True,
        'align': 'center',
        'valign': 'vcenter',
        'font_size': 14
    })
    
    note_format = workbook.add_format({
        'align': 'left',
        'valign': 'vcenter',
        'border': 1
    })
    
    total_format = workbook.add_format({
        'bold': True,
        'align': 'right',
        'valign': 'vcenter',
        'border': 1
    })
    
    bold_format = workbook.add_format({
        'bold': True
    })
    
    # Set column widths
    worksheet.set_column('A:A', 5)  # STT
    worksheet.set_column('B:B', 20)  # Tên Nguyên Liệu
    worksheet.set_column('C:C', 10)  # Mã HS
    worksheet.set_column('D:D', 10)  # ĐV tính
    worksheet.set_column('E:K', 15)  # Số lượng mua vào và các cột khác
    
    # Company information - with bold company name
    row = 0
    worksheet.write(row, 0, "Công ty cổ phần Tân Phong", bold_format)
    row += 1
    worksheet.write(row, 0, "Địa chỉ: Thị trấn Hùng Sơn, huyện Lâm Thao, tỉnh Phú Thọ")
    row += 1
    worksheet.write(row, 0, "Điện thoại: 02102215277")
    row += 1
    worksheet.write(row, 0, "Mã số Doanh nghiệp: 2600 274 542")
    row += 2
    
    # Lấy thông tin từ VatTu nếu có
    ten_nguyen_lieu = record.ten_nguyen_lieu
    ma_hs = ''
    don_vi_tinh = 'kg'
    ty_le_thu_hoi = None
    try:
        if record.id_san_pham:
            vat_tu = VatTu.objects.get(id_san_pham=record.id_san_pham)
            ten_nguyen_lieu = vat_tu.ten_khac or record.ten_nguyen_lieu
            ma_hs = vat_tu.ma_hs or ''
            don_vi_tinh = vat_tu.don_vi_tinh or 'kg'
            ty_le_thu_hoi = vat_tu.ty_le_thu_hoi
    except VatTu.DoesNotExist:
        pass
    if ty_le_thu_hoi is None:
        ty_le_thu_hoi = 0

    ty_le_str = f"{ty_le_thu_hoi * 100:.2f}%" if ty_le_thu_hoi else ''
    # Tính giá trị thu hồi và tồn kho nếu chưa có
    so_luong_thanh_pham_thu_hoi = record.thanh_pham_thu_hoi
    if so_luong_thanh_pham_thu_hoi is None and record.so_luong_san_xuat is not None:
        so_luong_thanh_pham_thu_hoi = record.so_luong_san_xuat * ty_le_thu_hoi

    so_luong_thanh_pham_ton_kho = record.so_luong_thanh_pham_ton_kho
    if so_luong_thanh_pham_ton_kho is None and so_luong_thanh_pham_thu_hoi is not None and record.so_luong_san_pham_xuat is not None:
        so_luong_thanh_pham_ton_kho = so_luong_thanh_pham_thu_hoi - record.so_luong_san_pham_xuat

    worksheet.merge_range('A6:K6', f"BẢNG KÊ TRỪ LÙI NGUYÊN LIỆU THU MUA SẢN XUẤT - {ten_nguyen_lieu}", title_format)
    row += 3

    worksheet.merge_range('A7:A8', "STT", header_format)
    worksheet.merge_range('B7:B8', "Tên Nguyên Liệu", header_format)
    worksheet.merge_range('C7:C8', "Mã HS", header_format)
    worksheet.merge_range('D7:D8', "ĐV tính", header_format)
    worksheet.merge_range('E7:E8', "Số lượng mua vào", header_format)
    worksheet.merge_range('F7:F8', "Số lượng sản xuất", header_format)
    worksheet.merge_range('G7:G8', "Tỷ lệ thu hồi", header_format)
    worksheet.merge_range('H7:H8', "Thành phẩm kho thu hồi", header_format)

    ngay_thang = record.ngay_thang or datetime.datetime.now()
    date_format = ngay_thang.strftime("%d/%m/%Y")

    worksheet.write(6, 8, "Số lượng thành phẩm xuất", header_format)
    worksheet.write(7, 8, date_format, header_format)
    worksheet.merge_range('J7:J8', "Số lượng TP còn tồn kho", header_format)
    worksheet.merge_range('K7:K8', "Ghi chú", header_format)

    row = 8
    worksheet.write(row, 0, 1, cell_format)
    worksheet.write(row, 1, ten_nguyen_lieu, cell_format)
    worksheet.write(row, 2, ma_hs, cell_format)
    worksheet.write(row, 3, don_vi_tinh, cell_format)
    worksheet.write(row, 4, record.so_luong_mua_vao, number_format)
    worksheet.write(row, 5, record.so_luong_san_xuat, number_format)
    worksheet.write(row, 6, ty_le_str, cell_format)
    worksheet.write(row, 7, so_luong_thanh_pham_thu_hoi, number_format)
    worksheet.write(row, 8, record.so_luong_san_pham_xuat, number_format)
    worksheet.write(row, 9, so_luong_thanh_pham_ton_kho, number_format)
    worksheet.write(row, 10, record.ghi_chu, note_format)

    row += 1
    worksheet.merge_range(f'A{row+1}:D{row+1}', "Tổng cộng:", total_format)
    worksheet.write(row, 4, record.so_luong_mua_vao, number_format)
    worksheet.write(row, 5, record.so_luong_san_xuat, number_format)
    worksheet.write(row, 6, ty_le_str, cell_format)
    worksheet.write(row, 7, so_luong_thanh_pham_thu_hoi, number_format)
    worksheet.write(row, 8, record.so_luong_san_pham_xuat, number_format)
    worksheet.write(row, 9, so_luong_thanh_pham_ton_kho, number_format)
    worksheet.write(row, 10, "-", cell_format)

    row += 3
    ton_kho_chu = convert_number_to_vietnamese_words(int(so_luong_thanh_pham_ton_kho or 0))
    worksheet.write(row, 0, f"Số lượng TP còn tồn kho: {so_luong_thanh_pham_ton_kho or 0} kg ({ton_kho_chu} kg)")
    row += 1
    worksheet.write(row, 0, "Chúng tôi cam kết hoàn toàn chịu trách nhiệm trước Pháp luật Việt Nam với các dữ liệu đã khai trên đây")

    if record.ngay_thang:
        ngay = record.ngay_thang.day
        thang = record.ngay_thang.month
        nam = record.ngay_thang.year
    else:
        today = datetime.datetime.now()
        ngay = today.day
        thang = today.month
        nam = today.year

    # Fix position of date and company name to be under the commitment text
    row += 1  # Move to next row after commitment text
    worksheet.write(row, 8, f"Ngày {ngay} tháng {thang} năm {nam}")
    row += 1
    worksheet.write(row, 8, "Công ty cổ phần Tân Phong", bold_format)

    workbook.close()
    output.seek(0)
    return output