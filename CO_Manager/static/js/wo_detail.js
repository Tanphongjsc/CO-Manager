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
    const coHoaDonCheckbox = document.getElementById('co_hoa_don'); // Thêm checkbox
    
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
        
        // Set initial edit mode
        setEditMode(false);

        calculateTotalsOnLoad();
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
            ghi_chu: ghiChuInput ? ghiChuInput.value : '',
            co_hoa_don: coHoaDonCheckbox ? coHoaDonCheckbox.checked : false // Thêm checkbox vào originalValues
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
            ghiChuInput,
            coHoaDonCheckbox // Thêm checkbox vào danh sách có thể chỉnh sửa
        ];

        editableFields.forEach(field => {
            if (field) { // Kiểm tra element tồn tại
                if (field.tagName === 'SELECT' || field.type === 'checkbox') {
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

        // Toggle button visibility
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
        
        // Kiểm tra checkbox có hóa đơn - SỬA LOGIC KIỂM TRA
        if (coHoaDonCheckbox && coHoaDonCheckbox.checked) {
            // Nếu có hóa đơn, xuất bình thường (luồng cũ)
            window.open(`/wo/${woId}/export/pdf/`, '_blank');
        } else {
            // Nếu không có hóa đơn, hiển thị popup chọn nguyên liệu (luồng mới)
            showMaterialSelectionPopup('pdf');
        }
    }

    function handleExportWord() {
        const woId = document.getElementById('wo_id').value;
        if (!woId) return alert('Không tìm thấy ID bảng kê WO');
        
        // Kiểm tra checkbox có hóa đơn - SỬA LOGIC KIỂM TRA
        if (coHoaDonCheckbox && coHoaDonCheckbox.checked) {
            // Nếu có hóa đơn, xuất bình thường (luồng cũ)
            window.open(`/wo/${woId}/export/word/`, '_blank');
        } else {
            // Nếu không có hóa đơn, hiển thị popup chọn nguyên liệu (luồng mới)
            showMaterialSelectionPopup('word');
        }
    }

    // Hàm hiển thị popup chọn nguyên liệu
    async function showMaterialSelectionPopup(exportType) {
        const woId = document.getElementById('wo_id').value;
        
        try {
            showLoading();
            const response = await fetch(`/wo/${woId}/get-similar-materials/`, {
                method: 'GET',
                headers: {
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                }
            });

            const data = await response.json();
            
            if (response.ok && data.status === 'success') {
                populateMaterialList(data.materials, exportType);
                document.getElementById('materialSelectionPopup').style.display = 'block';
            } else {
                alert(data.message || 'Lỗi khi tải danh sách nguyên liệu');
            }
        } catch (error) {
            console.error('Lỗi khi tải danh sách nguyên liệu:', error);
            alert('Đã xảy ra lỗi khi tải danh sách nguyên liệu');
        } finally {
            hideLoading();
        }
    }

    // Hàm hiển thị danh sách nguyên liệu trong popup
    function populateMaterialList(materials, exportType) {
        const materialList = document.getElementById('materialList');
        materialList.innerHTML = '';
        
        // Thêm nguyên liệu hiện tại (luôn được chọn)
        const currentWoId = document.getElementById('wo_id').value;
        const currentMaterialDiv = document.createElement('div');
        currentMaterialDiv.className = 'material-item';
        currentMaterialDiv.innerHTML = `
            <input type="checkbox" id="material_${currentWoId}" value="${currentWoId}" checked disabled>
            <div class="material-info">
                <div class="material-name">${tenNguyenLieuInput.value} (Hiện tại)</div>
                <div class="material-details">
                    Lệnh SX: ${maLenhSxInput.value} | 
                    Số lượng: ${soLuongInput.value} KGM
                </div>
            </div>
        `;
        materialList.appendChild(currentMaterialDiv);
        
        // Thêm các nguyên liệu cùng loại
        materials.forEach(material => {
            const materialDiv = document.createElement('div');
            materialDiv.className = 'material-item';
            materialDiv.innerHTML = `
                <input type="checkbox" id="material_${material.id}" value="${material.id}">
                <div class="material-info">
                    <div class="material-name">${material.ten_nguyen_lieu}</div>
                    <div class="material-details">
                        Lệnh SX: ${material.ma_lenh_sx} | 
                        Số lượng: ${material.so_luong} KGM | 
                        Ngày: ${material.ngay}
                    </div>
                </div>
            `;
            materialList.appendChild(materialDiv);
        });
        
        // Lưu export type để sử dụng khi xuất file
        materialList.dataset.exportType = exportType;
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
            co_hoa_don: coHoaDonCheckbox ? coHoaDonCheckbox.checked : false // Thêm trường co_hoa_don
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
            if (coHoaDonCheckbox) coHoaDonCheckbox.checked = originalValues.co_hoa_don; // Khôi phục checkbox
            
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

            // Tính tổng số lượng và thành tiền
            const soLuongCell = row.cells[7];
            const thanhTienCell = row.cells[9];

            if (soLuongCell && thanhTienCell) {
                const soLuong = parseFloat(soLuongCell.dataset.soLuong || soLuongCell.textContent.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
                const thanhTien = parseFloat(thanhTienCell.dataset.thanhTien || thanhTienCell.textContent.replace(/[^\d]/g, '')) || 0;
                tongSoLuong += soLuong;
                tongThanhTien += thanhTien;
            }
        });

        // Update total row - Sửa chỗ này để dùng KGM thay vì kg
        const totalRow = woTableBody.querySelector('tr:last-child');
        if (totalRow && totalRow.cells[1] && totalRow.cells[1].textContent.includes('Tổng cộng')) {
            // Cập nhật tổng số lượng với đơn vị KGM
            const tongSoLuongCell = totalRow.cells[7];
            if (tongSoLuongCell) {
                tongSoLuongCell.innerHTML = `${tongSoLuong.toLocaleString('vi-VN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} KGM`;
            }
            
            // Cập nhật tổng thành tiền
            const tongThanhTienCell = totalRow.cells[9];
            if (tongThanhTienCell) {
                tongThanhTienCell.textContent = tongThanhTien.toLocaleString('vi-VN');
            }
        }
    }

    function calculateTotalsOnLoad() {
        const rows = woTableBody.querySelectorAll('tr');
        let tongSoLuong = 0;
        let tongThanhTien = 0;

        rows.forEach(row => {
            // Skip total row
            if (row.cells[1] && row.cells[1].textContent.includes('Tổng cộng')) return;

            const soLuongCell = row.cells[7];
            const thanhTienCell = row.cells[9];

            if (soLuongCell && thanhTienCell) {
                // Lấy giá trị từ data attribute hoặc parse từ text
                const soLuong = parseFloat(soLuongCell.dataset.soLuong) || 
                            parseFloat(soLuongCell.textContent.replace(/[^\d.,]/g, '').replace(',', '.')) || 0;
                const thanhTien = parseFloat(thanhTienCell.dataset.thanhTien) || 
                                parseFloat(thanhTienCell.textContent.replace(/[^\d]/g, '')) || 0;
                
                tongSoLuong += soLuong;
                tongThanhTien += thanhTien;
            }
        });

        // Update total row
        const totalRow = woTableBody.querySelector('tr:last-child');
        if (totalRow && totalRow.cells[1] && totalRow.cells[1].textContent.includes('Tổng cộng')) {
            const tongSoLuongCell = totalRow.cells[7];
            const tongThanhTienCell = totalRow.cells[9];
            
            if (tongSoLuongCell) {
                tongSoLuongCell.innerHTML = `${tongSoLuong.toLocaleString('vi-VN', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} KGM`;
            }
            
            if (tongThanhTienCell) {
                tongThanhTienCell.textContent = tongThanhTien.toLocaleString('vi-VN');
            }
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

    // Các hàm xử lý popup (sẽ được gọi từ HTML)
    window.closeMaterialPopup = function() {
        document.getElementById('materialSelectionPopup').style.display = 'none';
    }

    window.exportSelectedMaterials = async function() {
        const checkboxes = document.querySelectorAll('#materialList input[type="checkbox"]:checked');
        const selectedIds = Array.from(checkboxes).map(cb => cb.value);
        const exportType = document.getElementById('materialList').dataset.exportType;
        
        if (selectedIds.length === 0) {
            alert('Vui lòng chọn ít nhất một nguyên liệu');
            return;
        }

        try {
            showLoading();
            
            if (exportType === 'pdf') {
                // XỬ LÝ PDF BẰNG AJAX (GIỐNG wo_export_pdf)
                const response = await fetch('/wo/export-multiple/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    },
                    body: JSON.stringify({
                        wo_ids: selectedIds,
                        export_type: 'pdf'
                    })
                });

                if (response.ok) {
                    // Lấy HTML content trả về và mở trong tab mới để in PDF
                    const htmlContent = await response.text();
                    const printWindow = window.open('', '_blank');
                    printWindow.document.write(htmlContent);
                    printWindow.document.close();
                    
                    // Đóng popup
                    closeMaterialPopup();
                } else {
                    const errorData = await response.json();
                    alert(errorData.message || 'Lỗi khi xuất PDF');
                }
            } else {
                // XỬ LÝ WORD BẰNG DOWNLOAD FILE (GIỮ NGUYÊN)
                const response = await fetch('/wo/export-multiple/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                    },
                    body: JSON.stringify({
                        wo_ids: selectedIds,
                        export_type: 'word'
                    })
                });

                if (response.ok) {
                    // Tạo blob và download file
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    
                    // Lấy tên file từ header hoặc tạo tên mặc định
                    const contentDisposition = response.headers.get('Content-Disposition');
                    let filename = `Bang_ke_WO_nhieu_nguyen_lieu.docx`;
                    if (contentDisposition) {
                        const filenameMatch = contentDisposition.match(/filename="([^"]+)"/);
                        if (filenameMatch) {
                            filename = filenameMatch[1];
                        }
                    }
                    
                    a.download = filename;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    
                    // Đóng popup
                    closeMaterialPopup();
                } else {
                    const errorData = await response.json();
                    alert(errorData.message || 'Lỗi khi xuất file Word');
                }
            }
        } catch (error) {
            console.error('Lỗi khi xuất file:', error);
            alert('Đã xảy ra lỗi khi xuất file');
        } finally {
            hideLoading();
        }
    }
});