document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const backBtn = document.getElementById('backBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const exportWordBtn = document.getElementById('exportWordBtn');
    const editBtn = document.getElementById('editBtn');
    const saveBtn = document.getElementById('saveBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const woDetailForm = document.getElementById('woDetailForm');
    const woTableBody = document.getElementById('woTableBody');
    
    // Form inputs
    const tenNguyenLieuInput = document.getElementById('ten_nguyen_lieu');
    const donViTinhInput = document.getElementById('don_vi_tinh');
    const triGiaFobInput = document.getElementById('tri_gia_fob');
    const toKhaiHaiQuanInput = document.getElementById('to_khai_hai_quan');
    const diaChiThuMuaInput = document.getElementById('dia_chi_thu_mua');
    const noiKhaiThacInput = document.getElementById('noi_khai_thac');
    const nguoiPhuTrachSelect = document.getElementById('nguoi_phu_trach');
    const cccdCmndInput = document.getElementById('cccd_cmnd');
    const ngayTaoInput = document.getElementById('ngay_tao');
    const ghiChuInput = document.getElementById('ghi_chu');
    
    // Read-only fields
    const maDonHangInput = document.getElementById('ma_don_hang');
    const maLenhSxInput = document.getElementById('ma_lenh_sx');
    const idBangKeThuMuaInput = document.getElementById('id_bang_ke_thu_mua');
    const tenHangHoaInput = document.getElementById('ten_hang_hoa');
    const maHsInput = document.getElementById('ma_hs');
    const soLuongInput = document.getElementById('so_luong_wo');
    
    // Store original values for cancel functionality
    let originalValues = {};
    let purchaseDetailData = [];
    let isEditMode = false;

    // Event listeners
    backBtn.addEventListener('click', handleBack);
    exportPdfBtn.addEventListener('click', handleExportPdf);
    exportWordBtn.addEventListener('click', handleExportWord);
    saveBtn.addEventListener('click', handleSave);
    cancelEditBtn.addEventListener('click', handleCancelEdit);
    editBtn.addEventListener('click', handleEdit);
    nguoiPhuTrachSelect.addEventListener('change', handleNguoiPhuTrachChange);
    
    // Real-time update table when form inputs change
    tenNguyenLieuInput.addEventListener('input', updateTableDisplay);
    maHsInput.addEventListener('input', updateTableDisplay);
    noiKhaiThacInput.addEventListener('input', updateTableDisplay);

    // Initialize page
    initializePage();

    function initializePage() {
        // Kiểm tra các element tồn tại trước khi sử dụng
        if (!tenNguyenLieuInput || !ngayTaoInput) {
            console.error('Required form elements not found');
            return;
        }
        
        // Store original values
        storeOriginalValues();
        
        // Load purchase details for table
        const idBangKeThuMua = idBangKeThuMuaInput ? idBangKeThuMuaInput.value : null;
        if (idBangKeThuMua) {
            loadPurchaseDetails(idBangKeThuMua);
        }
        
        // Set initial edit mode
        setEditMode(false);
    }

    // Sửa chữa function storeOriginalValues
    function storeOriginalValues() {
        originalValues = {
            ten_nguyen_lieu: tenNguyenLieuInput ? tenNguyenLieuInput.value : '',
            don_vi_tinh: donViTinhInput ? donViTinhInput.value : '',
            tri_gia_fob: triGiaFobInput ? triGiaFobInput.value : '',
            to_khai_hai_quan: toKhaiHaiQuanInput ? toKhaiHaiQuanInput.value : '',
            dia_chi_thu_mua: diaChiThuMuaInput ? diaChiThuMuaInput.value : '',
            noi_khai_thac: noiKhaiThacInput ? noiKhaiThacInput.value : '',
            nguoi_phu_trach: nguoiPhuTrachSelect ? nguoiPhuTrachSelect.value : '',
            cccd_cmnd: cccdCmndInput ? cccdCmndInput.value : '',
            ngay_tao: ngayTaoInput ? ngayTaoInput.value : '',
            ghi_chu: ghiChuInput ? ghiChuInput.value : ''
        };
    }

    function setEditMode(editMode) {
        isEditMode = editMode;
        
        // Toggle readonly/disabled state for editable fields
        const editableFields = [
            tenNguyenLieuInput,
            donViTinhInput,
            triGiaFobInput,
            toKhaiHaiQuanInput,
            diaChiThuMuaInput,
            noiKhaiThacInput,
            nguoiPhuTrachSelect,
            ngayTaoInput,
            ghiChuInput
        ];

        editableFields.forEach(field => {
            if (field) { // Kiểm tra element tồn tại
                if (field.tagName === 'SELECT') {
                    field.disabled = !editMode;
                } else {
                    field.readOnly = !editMode;
                }
                
                // Add/remove edit styling
                if (editMode) {
                    field.classList.add('editable-field');
                } else {
                    field.classList.remove('editable-field');
                }
            }
        });

        // Toggle button visibility - SỬA CHỮA LOGIC NÀY
        if (editBtn) editBtn.style.display = editMode ? 'none' : 'inline-block';
        if (saveBtn) saveBtn.style.display = editMode ? 'inline-block' : 'none';
        if (cancelEditBtn) cancelEditBtn.style.display = editMode ? 'inline-block' : 'none';
        
        // Disable export buttons in edit mode
        if (exportPdfBtn) exportPdfBtn.disabled = editMode;
        if (exportWordBtn) exportWordBtn.disabled = editMode;
    }

    function handleBack() {
        if (isEditMode) {
            if (confirm('Bạn đang trong chế độ chỉnh sửa. Bạn có muốn thoát không? Các thay đổi chưa lưu sẽ bị mất.')) {
                window.location.href = '/wo/';
            }
        } else {
            window.location.href = '/wo/';
        }
    }

    function handleExportPdf() {
        const woId = document.getElementById('wo_id').value;
        if (!woId) return alert('Không tìm thấy ID bảng kê WO');
        window.open(`/wo/${woId}/export/pdf/`, '_blank');
    }

    function handleExportWord() {
        const woId = document.getElementById('wo_id').value;
        if (!woId) return alert('Không tìm thấy ID bảng kê WO');
        window.open(`/wo/${woId}/export/word/`, '_blank');
    }

    function handleEdit() {
        console.log("Edit mode activated");
        setEditMode(true);
        // Focus first editable field
        tenNguyenLieuInput.focus();
    }

    async function handleSave(event) {
        event.preventDefault(); 

        // Validate required fields
        if (!tenNguyenLieuInput.value.trim()) {
            alert('Vui lòng nhập tên nguyên liệu WO');
            tenNguyenLieuInput.focus();
            return;
        }

        if (!ngayTaoInput.value) {
            alert('Vui lòng chọn ngày tạo bảng kê');
            ngayTaoInput.focus();
            return;
        }

        const woId = document.getElementById('wo_id').value;

        const formData = {
            so_luong_wo: parseFloat(soLuongInput.value) || 0,
            ten_nguyen_lieu: tenNguyenLieuInput.value.trim(),
            don_vi_tinh: donViTinhInput.value.trim(),
            tri_gia_fob: parseFloat(triGiaFobInput.value) || 0,
            to_khai_hai_quan: toKhaiHaiQuanInput.value.trim(),
            dia_chi_thu_mua: diaChiThuMuaInput.value.trim(),
            noi_khai_thac: noiKhaiThacInput.value.trim(),
            id_nguoi: nguoiPhuTrachSelect.value || null,
            ngay: ngayTaoInput.value,
            
        };

        showLoading();
        try {
            const response = await fetch(`/wo/${woId}/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok && data.status === 'success') {
                alert('Cập nhật bảng kê WO thành công');
                storeOriginalValues();     // Cập nhật bản sao dữ liệu gốc
                setEditMode(false);        // Thoát chế độ chỉnh sửa
                handleNguoiPhuTrachChange(); // Cập nhật lại trường CCCD nếu thay đổi
            } else {
                alert(data.message || 'Lỗi khi cập nhật bảng kê WO');
            }
        } catch (error) {
            console.error('Lỗi khi gửi dữ liệu cập nhật:', error);
            alert('Đã xảy ra lỗi khi gửi dữ liệu đến máy chủ.');
        } finally {
            hideLoading();
        }
    }

    function handleCancelEdit() {
        if (confirm('Bạn có chắc muốn hủy chỉnh sửa? Các thay đổi sẽ không được lưu.')) {
            // Restore original values
            tenNguyenLieuInput.value = originalValues.ten_nguyen_lieu;
            donViTinhInput.value = originalValues.don_vi_tinh;
            triGiaFobInput.value = originalValues.tri_gia_fob;
            toKhaiHaiQuanInput.value = originalValues.to_khai_hai_quan;
            diaChiThuMuaInput.value = originalValues.dia_chi_thu_mua;
            noiKhaiThacInput.value = originalValues.noi_khai_thac;
            nguoiPhuTrachSelect.value = originalValues.nguoi_phu_trach;
            cccdCmndInput.value = originalValues.cccd_cmnd;
            ngayTaoInput.value = originalValues.ngay_tao;
            
            
            // Update table display with restored values
            updateTableDisplay();
            
            // Exit edit mode
            setEditMode(false);
        }
    }

    function handleNguoiPhuTrachChange() {
        const selectedOption = nguoiPhuTrachSelect.selectedOptions[0];
        
        if (selectedOption && selectedOption.value) {
            const cmnd = selectedOption.getAttribute('data-cmnd') || '';
            cccdCmndInput.value = cmnd;
        } else {
            cccdCmndInput.value = '';
        }
    }

    async function loadPurchaseDetails(purchaseId) {
        showLoading();
        try {
            const response = await fetch(`/api/wo/purchase_details/${purchaseId}/`);
            const data = await response.json();
            
            if (data.status === 'success' && data.details) {
                purchaseDetailData = data.details;
                populateTable(data.details);
            } else {
                console.error('Failed to load purchase details:', data.message);
                purchaseDetailData = [];
                populateTable([]);
            }
        } catch (error) {
            console.error('Error loading purchase details:', error);
            // Create mock data for testing if API fails
            purchaseDetailData = createMockPurchaseDetails();
            populateTable(purchaseDetailData);
        } finally {
            hideLoading();
        }
    }

    function createMockPurchaseDetails() {
        // Temporary mock data - same as create page
        return [
            {
                ngay_mua_hang: '2024-12-10',
                ten_nguoi_ban: 'An Văn Thao',
                dia_chi: 'Hà Long - Hà Trung - Thanh Hóa',
                so_cmnd_cccd: '038059011122',
                so_luong: 8500,
                don_gia: 11500,
                ghi_chu: ''
            },
            {
                ngay_mua_hang: '2024-12-15',
                ten_nguoi_ban: 'Lê Duy Hoàn',
                dia_chi: 'Hà Long - Hà Trung - Thanh Hóa',
                so_cmnd_cccd: '038200009918',
                so_luong: 10350,
                don_gia: 11500,
                ghi_chu: ''
            }
        ];
    }

    function populateTable(details) {
        woTableBody.innerHTML = '';
        
        let tongSoLuong = 0;
        let tongThanhTien = 0;

        details.forEach(detail => {
            const row = document.createElement('tr');

            const ngayMuaHang = detail.ngay_mua_hang ?
                new Date(detail.ngay_mua_hang).toLocaleDateString('vi-VN') : '';

            const cccdInfo = detail.so_cmnd_cccd || '';

            const soLuong = parseFloat(detail.so_luong || 0);
            const donGia = parseFloat(detail.don_gia || 0);
            const tongTriGia = soLuong * donGia;

            tongSoLuong += soLuong;
            tongThanhTien += tongTriGia;

            row.innerHTML = `
                <td>${ngayMuaHang}</td>
                <td>${detail.ten_nguoi_ban || ''}</td>
                <td>${detail.dia_chi || ''}</td>
                <td>${cccdInfo}</td>
                <td class="ten-nguyen-lieu">${tenNguyenLieuInput.value}</td>
                <td class="ma-hs">${maHsInput.value}</td>
                <td class="noi-khai-thac">${noiKhaiThacInput.value}</td>
                <td style="text-align: right;" data-so-luong="${soLuong}">
                    ${soLuong.toLocaleString('vi-VN', { minimumFractionDigits: 3 })}
                </td>
                <td style="text-align: right;">${donGia.toLocaleString('vi-VN')}</td>
                <td style="text-align: right;" data-thanh-tien="${tongTriGia}">
                    ${tongTriGia.toLocaleString('vi-VN')}
                </td>
                <td>${detail.ghi_chu || ''}</td>
            `;

            woTableBody.appendChild(row);
        });

        // Add total row
        if (details.length > 0) {
            const totalRow = document.createElement('tr');
            totalRow.style.fontWeight = 'bold';
            totalRow.style.backgroundColor = '#f8f9fa';

            totalRow.innerHTML = `
                <td></td>
                <td style="text-align: center;">Tổng cộng</td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td></td>
                <td style="text-align: right;">
                    ${tongSoLuong.toLocaleString('vi-VN', { minimumFractionDigits: 3 })} ${donViTinhInput.value}
                </td>
                <td></td>
                <td style="text-align: right;">
                    ${tongThanhTien.toLocaleString('vi-VN')}
                </td>
                <td></td>
            `;

            woTableBody.appendChild(totalRow);
        }
    }

    function updateTableDisplay() {
        const rows = woTableBody.querySelectorAll('tr');
        let tongSoLuong = 0;
        let tongThanhTien = 0;

        rows.forEach(row => {
            // Skip total row
            if (row.cells[1] && row.cells[1].textContent.includes('Tổng cộng')) return;

            const tenNguyenLieuCell = row.querySelector('.ten-nguyen-lieu');
            const maHsCell = row.querySelector('.ma-hs');
            const noiKhaiThacCell = row.querySelector('.noi-khai-thac');

            if (tenNguyenLieuCell) tenNguyenLieuCell.textContent = tenNguyenLieuInput.value;
            if (maHsCell) maHsCell.textContent = maHsInput.value;
            if (noiKhaiThacCell) noiKhaiThacCell.textContent = noiKhaiThacInput.value;

            const soLuongCell = row.cells[7];
            const thanhTienCell = row.cells[9];

            if (soLuongCell && thanhTienCell) {
                const soLuong = parseFloat(soLuongCell.dataset.soLuong || 0);
                const thanhTien = parseFloat(thanhTienCell.dataset.thanhTien || 0);
                tongSoLuong += soLuong;
                tongThanhTien += thanhTien;
            }
        });

        // Update total row
        const totalRow = woTableBody.querySelector('tr:last-child');
        if (totalRow && totalRow.cells[1] && totalRow.cells[1].textContent.includes('Tổng cộng')) {
            totalRow.cells[7].innerHTML = `${tongSoLuong.toLocaleString('vi-VN', { minimumFractionDigits: 3 })} ${donViTinhInput.value}`;
            totalRow.cells[9].textContent = tongThanhTien.toLocaleString('vi-VN');
        }
    }

    function showLoading() {
        // Add loading indicator if exists
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'flex';
    }

    function hideLoading() {
        // Hide loading indicator if exists
        const loading = document.getElementById('loading');
        if (loading) loading.style.display = 'none';
    }
});