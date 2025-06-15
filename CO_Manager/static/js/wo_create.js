document.addEventListener('DOMContentLoaded', () => {
    const maDonHangSelect = document.getElementById('ma_don_hang');
    const maLenhSxSelect = document.getElementById('ma_lenh_sx');
    const idBangKeThuMuaSelect = document.getElementById('id_bang_ke_thu_mua');
    const tenHangHoaInput = document.getElementById('ten_hang_hoa');
    const maHsInput = document.getElementById('ma_hs');
    const soLuongInput = document.getElementById('so_luong');
    const donViTinhInput = document.getElementById('don_vi_tinh');
    const triGiaFobInput = document.getElementById('tri_gia_fob');
    const toKhaiHaiQuanInput = document.getElementById('to_khai_hai_quan');
    const diaChiThuMuaInput = document.getElementById('dia_chi_thu_mua');
    const noiKhaiThacInput = document.getElementById('noi_khai_thac');
    const nguoiPhuTrachSelect = document.getElementById('nguoi_phu_trach');
    const cccdCmndInput = document.getElementById('cccd_cmnd');
    const tenNguyenLieuInput = document.getElementById('ten_nguyen_lieu');
    const ngayTaoInput = document.getElementById('ngay_tao');
    const ghiChuInput = document.getElementById('ghi_chu');
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const woTableBody = document.getElementById('woTableBody');

    let selectedPurchaseRecord = null;
    let purchaseDetailData = [];

    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    ngayTaoInput.value = today;

    // Event listeners
    maDonHangSelect.addEventListener('change', handleDonHangChange);
    maLenhSxSelect.addEventListener('change', handleLenhSxChange);
    idBangKeThuMuaSelect.addEventListener('change', handleBangKeThuMuaChange);
    nguoiPhuTrachSelect.addEventListener('change', handleNguoiPhuTrachChange);
    cancelBtn.addEventListener('click', handleCancel);
    document.getElementById('woForm').addEventListener('submit', handleSave);

    // Real-time update table when form inputs change
    tenNguyenLieuInput.addEventListener('input', updateTableDisplay);
    maHsInput.addEventListener('input', updateTableDisplay);
    noiKhaiThacInput.addEventListener('input', updateTableDisplay);

    async function handleDonHangChange() {
        const maDonHang = maDonHangSelect.value;
        resetForm();

        if (!maDonHang) return;

        showLoading();
        try {
            // Get production orders for the selected order
            const response = await fetch(`/api/get_lenh_sx_by_don_hang_wo/${maDonHang}/`);
            const data = await response.json();

            if (data.status === 'success' && data.data && data.data.length > 0) {
                populateSelect(maLenhSxSelect, data.data, 'Chọn lệnh sản xuất');
                maLenhSxSelect.disabled = false;
            } else {
                alert('Không có lệnh sản xuất nào có bảng kê thu mua từ dân cho đơn hàng này');
                maLenhSxSelect.disabled = true;
            }
        } catch (error) {
            console.error('Error loading production orders:', error);
            alert('Lỗi khi tải danh sách lệnh sản xuất');
            maLenhSxSelect.disabled = true;
        } finally {
            hideLoading();
        }
    }

    async function handleLenhSxChange() {
        const maLenhSx = maLenhSxSelect.value;
        
        resetPurchaseSelection();

        if (!maLenhSx) return;

        showLoading();
        try {
            // Get available purchase records for selected production order
            const response = await fetch(`/api/get_purchase_records_by_lenh_sx_wo/${maLenhSx}/`);
            const data = await response.json();
            
            if (data.status === 'success' && data.purchase_records && data.purchase_records.length > 0) {
                const purchaseOptions = data.purchase_records.map(record => ({
                    value: record.id_bang_ke_thu_mua_tu_dan,
                    text: `ID: ${record.id_bang_ke_thu_mua_tu_dan} - ${record.ten_nguyen_lieu}`,
                    data: record
                }));

                populateSelect(idBangKeThuMuaSelect, purchaseOptions, 'Chọn bảng kê thu mua');
                idBangKeThuMuaSelect.disabled = false;
            } else {
                alert('Lệnh sản xuất này không có bảng kê thu mua từ dân nào khả dụng');
                idBangKeThuMuaSelect.disabled = true;
            }
        } catch (error) {
            console.error('Error loading purchase records:', error);
            alert('Lỗi khi tải danh sách bảng kê thu mua');
            idBangKeThuMuaSelect.disabled = true;
        } finally {
            hideLoading();
        }
    }

    async function handleBangKeThuMuaChange() {
        const selectedId = idBangKeThuMuaSelect.value;
        
        if (!selectedId) {
            clearMappedData();
            return;
        }

        // Get the selected purchase record data from the option
        const selectedOption = idBangKeThuMuaSelect.selectedOptions[0];
        if (selectedOption && selectedOption.dataset.record) {
            selectedPurchaseRecord = JSON.parse(selectedOption.dataset.record);
        } else {
            // Fallback: get data from server
            await loadPurchaseRecordData(selectedId);
        }
        
        if (selectedPurchaseRecord) {
            // Map basic information from purchase record
            mapPurchaseDataToForm();
            
            // Load detailed purchase data for table display
            await loadPurchaseDetails(selectedId);
            
            saveBtn.disabled = false;
        }
    }

    async function loadPurchaseRecordData(purchaseId) {
        try {
            // Get the production order first
            const maLenhSx = maLenhSxSelect.value;
            const response = await fetch(`/api/get_purchase_records_by_lenh_sx/${maLenhSx}/`);
            const data = await response.json();
            
            if (data.status === 'success' && data.purchase_records) {
                selectedPurchaseRecord = data.purchase_records.find(record => 
                    record.id_bang_ke_thu_mua_tu_dan == purchaseId
                );
            }
        } catch (error) {
            console.error('Error loading purchase record data:', error);
        }
    }

    function mapPurchaseDataToForm() {
        if (!selectedPurchaseRecord) return;

        // Map tên hàng hóa từ tên nguyên liệu trong bảng kê thu mua từ dân (readonly)
        tenHangHoaInput.value = selectedPurchaseRecord.ten_nguyen_lieu || '';
        
        // Map mã HS (readonly)
        maHsInput.value = selectedPurchaseRecord.ma_hs || '';
        
        // Map số lượng xuất từ bảng kê trừ lùi (readonly)
        soLuongInput.value = selectedPurchaseRecord.so_luong_san_pham_xuat || 0;
        
        // Set đơn vị tính mặc định (user có thể chỉnh sửa)
        if (!donViTinhInput.value) {
            donViTinhInput.value = selectedPurchaseRecord.don_vi_tinh || 'KGM';
        }

        // Set default tên nguyên liệu WO (user có thể chỉnh sửa)
        if (!tenNguyenLieuInput.value) {
            tenNguyenLieuInput.value = selectedPurchaseRecord.ten_nguyen_lieu || '';
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
            // Tạo dữ liệu demo nếu API chưa sẵn sàng
            purchaseDetailData = createMockPurchaseDetails();
            populateTable(purchaseDetailData);
        } finally {
            hideLoading();
        }
    }

    function createMockPurchaseDetails() {
        // This is temporary mock data - replace with actual API call
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

        // Dòng tổng cộng
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

    function handleNguoiPhuTrachChange() {
        const selectedOption = nguoiPhuTrachSelect.selectedOptions[0];
        
        if (selectedOption && selectedOption.value) {
            const cmnd = selectedOption.getAttribute('data-cmnd') || '';
            cccdCmndInput.value = cmnd;
        } else {
            cccdCmndInput.value = '';
        }
    }

    async function handleSave(event) {
        event.preventDefault();

        if (!selectedPurchaseRecord) {
            alert('Vui lòng chọn bảng kê thu mua từ dân');
            return;
        }

        // Validate required fields
        if (!tenHangHoaInput.value.trim()) {
            alert('Vui lòng chọn bảng kê thu mua để tự động điền tên hàng hóa');
            return;
        }

        if (!tenNguyenLieuInput.value.trim()) {
            alert('Vui lòng nhập tên nguyên liệu');
            tenNguyenLieuInput.focus();
            return;
        }

        if (!ngayTaoInput.value) {
            alert('Vui lòng chọn ngày tạo bảng kê');
            ngayTaoInput.focus();
            return;
        }

        const formData = {
            id_bang_ke_thu_mua_tu_dan: selectedPurchaseRecord.id_bang_ke_thu_mua_tu_dan,
            ten_hang_hoa: tenNguyenLieuInput.value.trim(),
            ten_nguyen_lieu: tenNguyenLieuInput.value.trim(),
            ma_hs: maHsInput.value.trim(),
            so_luong_wo: parseFloat(soLuongInput.value) || 0,
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
            const response = await fetch('/wo/create/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            
            if (data.status === 'success') {
                alert('Tạo bảng kê WO thành công');
                if (data.data && data.data.redirect_url) {
                    window.location.href = data.data.redirect_url;
                } else {
                    window.location.href = '/wo/';
                }
            } else {
                alert(data.message || 'Lỗi khi tạo bảng kê WO');
            }
        } catch (error) {
            console.error('Error creating WO:', error);
            alert('Lỗi khi tạo bảng kê WO');
        } finally {
            hideLoading();
        }
    }

    function handleCancel() {
        if (confirm('Bạn có chắc muốn hủy? Dữ liệu đã nhập sẽ bị mất.')) {
            window.location.href = '/wo/';
        }
    }
    function parseVietnameseNumber(text) {
        if (!text) return 0;
        return parseFloat(text.replace(/\./g, '').replace(',', '.')) || 0;
    }

    function updateTableDisplay() {
        const rows = woTableBody.querySelectorAll('tr');
        let tongSoLuong = 0;
        let tongThanhTien = 0;

        rows.forEach(row => {
            // Bỏ qua dòng tổng cộng
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

        // Cập nhật dòng tổng cộng
        const totalRow = woTableBody.querySelector('tr:last-child');
        if (totalRow && totalRow.cells[1] && totalRow.cells[1].textContent.includes('Tổng cộng')) {
            totalRow.cells[7].innerHTML = `${tongSoLuong.toLocaleString('vi-VN', { minimumFractionDigits: 3 })} ${donViTinhInput.value}`;
            totalRow.cells[9].textContent = tongThanhTien.toLocaleString('vi-VN');
        }
    }

    function resetForm() {
        resetSelects(['ma_lenh_sx', 'id_bang_ke_thu_mua']);
        clearMappedData();
        clearTable();
        selectedPurchaseRecord = null;
        purchaseDetailData = [];
        saveBtn.disabled = true;
    }

    function resetPurchaseSelection() {
        resetSelects(['id_bang_ke_thu_mua']);
        clearMappedData();
        clearTable();
        selectedPurchaseRecord = null;
        purchaseDetailData = [];
        saveBtn.disabled = true;
    }

    function clearMappedData() {
        tenHangHoaInput.value = '';
        maHsInput.value = '';
        soLuongInput.value = '';
        donViTinhInput.value = 'KGM';
        triGiaFobInput.value = '';
        toKhaiHaiQuanInput.value = '';
        diaChiThuMuaInput.value = '';
        noiKhaiThacInput.value = '';
        nguoiPhuTrachSelect.value = '';
        cccdCmndInput.value = '';
        tenNguyenLieuInput.value = '';
    }

    function clearTable() {
        woTableBody.innerHTML = '';
    }

    function resetSelects(selectIds) {
        selectIds.forEach(id => {
            const select = document.getElementById(id);
            select.innerHTML = '<option value="">-- Chọn --</option>';
            select.disabled = true;
        });
    }

    function populateSelect(selectElement, options, placeholder) {
        selectElement.innerHTML = `<option value="">-- ${placeholder} --</option>`;
        
        const optionsArray = Array.isArray(options) ? options : [];
        optionsArray.forEach(option => {
            const opt = document.createElement('option');
            opt.value = typeof option === 'object' ? option.value : option;
            opt.textContent = typeof option === 'object' ? option.text : option;
            
            // Store data for later use
            if (typeof option === 'object' && option.data) {
                opt.dataset.record = JSON.stringify(option.data);
            }
            
            selectElement.appendChild(opt);
        });
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