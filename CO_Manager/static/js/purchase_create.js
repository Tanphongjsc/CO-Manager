document.addEventListener('DOMContentLoaded', () => {
    const maDonHangSelect = document.getElementById('ma_don_hang');
    const maLenhSxSelect = document.getElementById('ma_lenh_sx');
    const tenNguyenLieuSelect = document.getElementById('ten_nguyen_lieu');
    const soLuongSanPhamXuatInput = document.getElementById('so_luong_san_pham_xuat');
    const soLuongSanXuatToiThieuInput = document.getElementById('so_luong_san_xuat_toi_thieu');
    const ngayFromInput = document.getElementById('ngay_from');
    const ngayToInput = document.getElementById('ngay_to');
    const addRowBtn = document.getElementById('addRowBtn');
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const purchaseTableBody = document.getElementById('purchaseTableBody');
    const loading = document.getElementById('loading');

    // NEW: Additional elements for WO and non-invoice logic
    const coHoaDonCheckbox = document.getElementById('co_hoa_don');
    
    // WO form elements
    const tenHangHoaInput = document.getElementById('ten_hang_hoa');
    const tenNguyenLieuWoInput = document.getElementById('ten_nguyen_lieu_wo');
    const maHsInput = document.getElementById('ma_hs');
    const donViTinhInput = document.getElementById('don_vi_tinh');
    const SoLuongInput = document.getElementById('wo_so_luong');
    const triGiaFobInput = document.getElementById('tri_gia_fob');
    const toKhaiHaiQuanInput = document.getElementById('to_khai_hai_quan');
    const diaChiThuMuaWoInput = document.getElementById('dia_chi_thu_mua_wo');
    const noiKhaiThacInput = document.getElementById('noi_khai_thac');
    const nguoiPhuTrachSelect = document.getElementById('nguoi_phu_trach');
    const cccdCmndInput = document.getElementById('cccd_cmnd');
    const ngayTaoWoInput = document.getElementById('ngay_tao_wo');
    const woTableBody = document.getElementById('woTableBody');
    
    // Modal elements
    const addPersonModal = document.getElementById('addPersonModal');
    const closeModal = document.querySelector('.close');
    const cancelPersonBtn = document.getElementById('cancelPersonBtn');
    const savePersonBtn = document.getElementById('savePersonBtn');

    let materialData = [];
    let nguoiList = [];
    let rowCounter = 0;
    let selectedMaterial = null;
    
    // Set default dates
    const today = new Date().toISOString().split('T')[0];
    ngayFromInput.value = today;
    ngayToInput.value = today;
    ngayTaoWoInput.value = today; // Set default date for WO

    // Load người list on page load
    loadNguoiList();

    // Event listeners
    maDonHangSelect.addEventListener('change', handleDonHangChange);
    maLenhSxSelect.addEventListener('change', handleLenhSxChange);
    tenNguyenLieuSelect.addEventListener('change', handleNguyenLieuChange);
    addRowBtn.addEventListener('click', addNewRow);
    cancelBtn.addEventListener('click', handleCancel);
    saveBtn.addEventListener('click', handleSave);

    // === THÊM MỚI: WO Event listeners ===
    nguoiPhuTrachSelect.addEventListener('change', handleNguoiPhuTrachChange);

    // Real-time update WO table when form inputs change
    tenNguyenLieuWoInput.addEventListener('input', populateWoTable);
    maHsInput.addEventListener('input', populateWoTable);
    noiKhaiThacInput.addEventListener('input', populateWoTable);

    // Modal event listeners
    closeModal.addEventListener('click', closePersonModal);
    cancelPersonBtn.addEventListener('click', closePersonModal);
    savePersonBtn.addEventListener('click', saveNewPerson);

    async function handleDonHangChange() {
        const maDonHang = maDonHangSelect.value;
        resetSelects(['ma_lenh_sx', 'ten_nguyen_lieu']);
        clearInputs();
        clearTable();

        if (!maDonHang) return;

        showLoading();
        try {
            const response = await fetch(`/api/purchase/lenh_sx_by_don_hang/${maDonHang}/`);
            const data = await response.json();
            
            if (data.status === 'success') {
                const options = data.data.map(val => ({ value: val, text: val }));
                populateSelect(maLenhSxSelect, options, 'Chọn lệnh sản xuất');
                maLenhSxSelect.disabled = false;
            } else {
                alert(data.message || 'Lỗi khi tải danh sách lệnh sản xuất');
            }
        } catch (error) {
            console.error('Error loading production orders:', error);
            alert('Lỗi khi tải danh sách lệnh sản xuất');
        } finally {
            hideLoading();
        }
    }

    async function handleLenhSxChange() {
        const maLenhSx = maLenhSxSelect.value;
        resetSelects(['ten_nguyen_lieu']);
        clearInputs();
        clearTable();

        if (!maLenhSx) return;

        showLoading();
        try {
            const response = await fetch(`/api/purchase/materials/${maLenhSx}/`);
            const data = await response.json();
            
            if (data.status === 'success') {
                materialData = data.materials;
                
                if (materialData.length === 0) {
                    alert('Không có nguyên liệu nào cần thu mua cho lệnh sản xuất này hoặc đã tạo hết bảng kê thu mua');
                    return;
                }

                const materialOptions = materialData.map(m => ({
                    value: m.id_san_pham,
                    text: m.ten_nguyen_lieu
                }));
                
                populateSelect(tenNguyenLieuSelect, materialOptions, 'Chọn nguyên liệu');
                tenNguyenLieuSelect.disabled = false;
            } else {
                alert(data.message || 'Lỗi khi tải danh sách nguyên liệu');
            }
        } catch (error) {
            console.error('Error loading materials:', error);
            alert('Lỗi khi tải danh sách nguyên liệu');
        } finally {
            hideLoading();
        }
    }

    function handleNguyenLieuChange() {
        const selectedId = tenNguyenLieuSelect.value;
        
        if (!selectedId) {
            clearInputs();
            clearWoMappedData();
            addRowBtn.disabled = true;
            return;
        }

        selectedMaterial = materialData.find(m => m.id_san_pham === selectedId);
        
        if (selectedMaterial) {
            soLuongSanPhamXuatInput.value = selectedMaterial.so_luong_san_pham_xuat || 0;
            soLuongSanXuatToiThieuInput.value = selectedMaterial.so_luong_san_xuat_toi_thieu || 0;
            // === THÊM MỚI: Map dữ liệu sang WO form ===
            mapMaterialDataToWoForm();
            addRowBtn.disabled = false;
        }
    }
    // === THÊM MỚI: Function map dữ liệu nguyên liệu sang WO form ===
    function mapMaterialDataToWoForm() {
        if (!selectedMaterial) return;

        // Map tên hàng hóa từ tên nguyên liệu (readonly)
        tenHangHoaInput.value = selectedMaterial.ten_nguyen_lieu || '';

        // Map số lượng xuất từ bảng kê trừ lùi (readonly)
        SoLuongInput.value = selectedMaterial.so_luong_san_pham_xuat || 0;

        // Set tên nguyên liệu WO (user có thể chỉnh sửa)
        tenNguyenLieuWoInput.value = selectedMaterial.ten_nguyen_lieu || '';
        
        // Map mã HS nếu có
        maHsInput.value = selectedMaterial.ma_hs || '';
        
        // Set đơn vị tính mặc định
        if (!donViTinhInput.value) {
            donViTinhInput.value = selectedMaterial.don_vi_tinh || 'KGM';
        }

        updateWoTableDisplay();

        return;
    }
    
    function addNewRow() {
        if (!selectedMaterial) {
            alert('Vui lòng chọn nguyên liệu trước');
            return;
        }

        rowCounter++;
        const row = document.createElement('tr');
        const nguoiBanList = nguoiList.filter(n => n.vai_tro === 'Người bán');
        row.innerHTML = `
            <td class="text-center">${rowCounter}</td>
            <td><input type="date" name="ngay_mua_hang[]" class="form-control" value="${today}" required></td>
            <td>
                <select name="ho_ten[]" class="form-control person-select" required>
                    <option value="">-- Chọn người --</option>
                    ${nguoiBanList.map(n => `<option value="${n.id}" data-cmnd="${n.so_cmnd_cccd || ''}" data-diachi="${n.dia_chi || ''}">${n.ten}</option>`).join('')}
                    <option value="add_new">+ Thêm người mới</option>
                </select>
            </td>
            <td><input type="text" name="so_cmnd_cccd[]" class="form-control" readonly></td>
            <td><input type="text" name="dia_chi[]" class="form-control" readonly></td>
            <td><span class="dwt-display">${selectedMaterial.ten_nguyen_lieu}</span></td>
            <td><input type="number" name="so_luong[]" class="form-control" step="0.01" min="0" required></td>
            <td><input type="number" name="don_gia[]" class="form-control" step="0.01" min="0" required></td>
            <td><input type="text" name="ghi_chu[]" class="form-control"></td>
            <td class="text-center">
                <button type="button" class="btn btn-danger btn-sm" onclick="removeRow(this)">Xóa</button>
            </td>
        `;
        
        // Add hidden input for material ID
        const hiddenInput = document.createElement('input');
        hiddenInput.type = 'hidden';
        hiddenInput.name = 'id_san_pham[]';
        hiddenInput.value = selectedMaterial.id_san_pham;
        row.appendChild(hiddenInput);
        
        purchaseTableBody.appendChild(row);
        // **THÊM**: mỗi khi thêm row xong, redraw preview WO
        populateWoTable();

        // Add event listener for person select
        const personSelect = row.querySelector('.person-select');
        personSelect.addEventListener('change', function() {
            updatePersonInfo(this);
            // **THÊM**: khi đổi người bán, cũng redraw preview WO
            updateWoTableDisplay();
            if (this.value === 'add_new') {
                this.value = ''; // Reset select
                openPersonModal();
            }
        });

        // Add event listeners for WO table update
        const newRow = purchaseTableBody.querySelector('tr:last-child');
        if (newRow) {
            const inputs = newRow.querySelectorAll('input, select');
            inputs.forEach(input => {
                if (input.name !== 'ho_ten[]') {
                    input.addEventListener('change', populateWoTable);
                    input.addEventListener('input', populateWoTable);
                }
            });
        }
        
        // Enable save button when there's at least one row
        saveBtn.disabled = false;
    }

    async function handleSave() {
        const rows = purchaseTableBody.querySelectorAll('tr');
        if (rows.length === 0) {
            alert('Vui lòng thêm ít nhất một dòng dữ liệu');
            return;
        }

        // Validate purchase data
        let isValid = true;
        rows.forEach(row => {
            const personSelect = row.querySelector('[name="ho_ten[]"]');
            const soLuongInput = row.querySelector('[name="so_luong[]"]');
            const donGiaInput = row.querySelector('[name="don_gia[]"]');
            const ngayInput = row.querySelector('[name="ngay_mua_hang[]"]');

            if (!personSelect.value || !soLuongInput.value || !donGiaInput.value || !ngayInput.value) {
                isValid = false;
                if (!personSelect.value) personSelect.style.borderColor = 'red';
                if (!soLuongInput.value) soLuongInput.style.borderColor = 'red';
                if (!donGiaInput.value) donGiaInput.style.borderColor = 'red';
                if (!ngayInput.value) ngayInput.style.borderColor = 'red';
            }
        });

        // Validate WO data
        if (!tenNguyenLieuWoInput.value.trim()) {
            alert('Vui lòng nhập tên nguyên liệu WO');
            tenNguyenLieuWoInput.focus();
            return;
        }

        if (!ngayTaoWoInput.value) {
            alert('Vui lòng chọn ngày tạo bảng kê WO');
            ngayTaoWoInput.focus();
            return;
        }

        if (!isValid) {
            alert('Vui lòng điền đầy đủ thông tin bắt buộc');
            return;
        }

        // Submit form thông thường (không cần AJAX)
        document.getElementById('purchaseForm').submit();
    }

    async function loadNguoiList() {
        try {
            const response = await fetch('/api/nguoi/list/');
            const data = await response.json();
            
            if (data.status === 'success') {
                nguoiList = data.nguoi_list;
                // THÊM: Populate người phụ trách dropdown
                populateNguoiPhuTrachSelect();
            }
        } catch (error) {
            console.error('Error loading người list:', error);
        }
    }

    function populateNguoiPhuTrachSelect() {
        nguoiPhuTrachSelect.innerHTML = '<option value="">-- Chọn người phụ trách --</option>';
        
        // SỬA: Filter chỉ lấy người có vai trò "Người mua"
        const nguoiMuaList = nguoiList.filter(nguoi => nguoi.vai_tro === 'Người mua');
        
        nguoiMuaList.forEach(nguoi => {
            const option = document.createElement('option');
            option.value = nguoi.id;
            option.textContent = nguoi.ten;
            option.setAttribute('data-cmnd', nguoi.so_cmnd_cccd || '');
            nguoiPhuTrachSelect.appendChild(option);
        });
    }
    function openPersonModal() {
        addPersonModal.style.display = 'block';
        document.getElementById('modal_ten').value = '';
        document.getElementById('modal_so_cmnd_cccd').value = '';
        document.getElementById('modal_dia_chi').value = '';
        document.getElementById('modal_vai_tro').value = 'Người bán';
    }

    function closePersonModal() {
        addPersonModal.style.display = 'none';
    }

    async function saveNewPerson() {
        const ten = document.getElementById('modal_ten').value.trim();
        const so_cmnd_cccd = document.getElementById('modal_so_cmnd_cccd').value.trim();
        const dia_chi = document.getElementById('modal_dia_chi').value.trim();
        const vai_tro = document.getElementById('modal_vai_tro').value.trim();

        if (!ten) {
            alert('Vui lòng nhập họ tên');
            return;
        }

        try {
            const response = await fetch('/api/nguoi/add/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                },
                body: JSON.stringify({
                    ten: ten,
                    so_cmnd_cccd: so_cmnd_cccd,
                    dia_chi: dia_chi,
                    vai_tro: vai_tro
                })
            });

            const data = await response.json();
            
            if (data.status === 'success') {
                // Add to nguoiList
                nguoiList.push(data.nguoi);
                
                // Update all person selects
                updateAllPersonSelects();
                
                closePersonModal();
                alert('Thêm người thành công');
            } else {
                alert(data.message || 'Lỗi khi thêm người');
            }
        } catch (error) {
            console.error('Error adding person:', error);
            alert('Lỗi khi thêm người');
        }
    }

    function updateAllPersonSelects() {
        const personSelects = document.querySelectorAll('.person-select');
        personSelects.forEach(select => {
            const currentValue = select.value;
            
            // Clear and rebuild options
            select.innerHTML = '<option value="">-- Chọn người --</option>';
            // Lọc chỉ lấy người có vai trò "Người bán"
            const nguoiBanList = nguoiList.filter(n => n.vai_tro === 'Người bán');
            nguoiBanList.forEach(n => {
                const option = document.createElement('option');
                option.value = n.id;
                option.textContent = n.ten;
                option.setAttribute('data-cmnd', n.so_cmnd_cccd || '');
                option.setAttribute('data-diachi', n.dia_chi || '');
                select.appendChild(option);
            });
            
            // Re-add "add new" option
            const addNewOption = document.createElement('option');
            addNewOption.value = 'add_new';
            addNewOption.textContent = '+ Thêm người mới';
            select.appendChild(addNewOption);
            
            // Restore selected value if it still exists
            if (currentValue && nguoiBanList.find(n => n.id == currentValue)) {
                select.value = currentValue;
                updatePersonInfo(select);
            }
        });
        
    }

    // === THÊM MỚI: Handle người phụ trách change ===
    function handleNguoiPhuTrachChange() {
        const selectedOption = nguoiPhuTrachSelect.selectedOptions[0];
        
        if (selectedOption && selectedOption.value) {
            const cmnd = selectedOption.getAttribute('data-cmnd') || '';
            cccdCmndInput.value = cmnd;
        } else {
            cccdCmndInput.value = '';
        }
    }

    // === THÊM MỚI: Update WO table display in real-time ===
    function updateWoTableDisplay() {
        const rows = woTableBody.querySelectorAll('tr');
        let tongSoLuong = 0;
        let tongThanhTien = 0;

        rows.forEach(row => {
            // Bỏ qua dòng tổng cộng
            if (row.cells[1] && row.cells[1].textContent.includes('Tổng cộng')) return;

            const tenNguyenLieuCell = row.querySelector('.ten-nguyen-lieu');
            const maHsCell = row.querySelector('.ma-hs');
            const noiKhaiThacCell = row.querySelector('.noi-khai-thac');

            if (tenNguyenLieuCell) tenNguyenLieuCell.textContent = tenNguyenLieuWoInput.value;
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

    // === THÊM MỚI: Populate WO table when purchase rows are added/modified ===
    function populateWoTable() {
        woTableBody.innerHTML = '';
        // Kiểm tra xem có nguyên liệu được chọn chưa
        if (!selectedMaterial || !tenNguyenLieuWoInput.value.trim()) {
            return;
        }
        const purchaseRows = purchaseTableBody.querySelectorAll('tr');
        let tongSoLuong = 0;
        let tongThanhTien = 0;

        purchaseRows.forEach(row => {
            const ngayMuaHang = row.querySelector('[name="ngay_mua_hang[]"]').value;
            const personSelect = row.querySelector('[name="ho_ten[]"]');
            const soLuongInput = row.querySelector('[name="so_luong[]"]');
            const donGiaInput = row.querySelector('[name="don_gia[]"]');
            const ghiChuInput = row.querySelector('[name="ghi_chu[]"]');
            const cccdInput = row.querySelector('[name="so_cmnd_cccd[]"]');
            const diaChiInput = row.querySelector('[name="dia_chi[]"]');

            if (ngayMuaHang && personSelect.value && soLuongInput.value && donGiaInput.value) {
                const woRow = document.createElement('tr');

                const formattedDate = ngayMuaHang ? 
                    new Date(ngayMuaHang).toLocaleDateString('vi-VN') : '';

                const soLuong = parseFloat(soLuongInput.value || 0);
                const donGia = parseFloat(donGiaInput.value || 0);
                const tongTriGia = soLuong * donGia;

                tongSoLuong += soLuong;
                tongThanhTien += tongTriGia;

                woRow.innerHTML = `
                    <td>${formattedDate}</td>
                    <td>${personSelect.selectedOptions[0]?.textContent || ''}</td>
                    <td>${diaChiInput.value || ''}</td>
                    <td>${cccdInput.value || ''}</td>
                    <td class="ten-nguyen-lieu">${tenNguyenLieuWoInput.value}</td>
                    <td class="ma-hs">${maHsInput.value}</td>
                    <td class="noi-khai-thac">${noiKhaiThacInput.value}</td>
                    <td style="text-align: right;" data-so-luong="${soLuong}">
                        ${soLuong.toLocaleString('vi-VN', { minimumFractionDigits: 3 })}
                    </td>
                    <td style="text-align: right;">${donGia.toLocaleString('vi-VN')}</td>
                    <td style="text-align: right;" data-thanh-tien="${tongTriGia}">
                        ${tongTriGia.toLocaleString('vi-VN')}
                    </td>
                    <td>${ghiChuInput.value || ''}</td>
                `;

                woTableBody.appendChild(woRow);
            }
        });

        // Dòng tổng cộng
        if (purchaseRows.length > 0) {
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

    // Global functions for inline events
    window.updatePersonInfo = function(selectElement) {
        const row = selectElement.closest('tr');
        const selectedOption = selectElement.selectedOptions[0];
        
        // Reset border color
        selectElement.style.borderColor = '';
        
        if (selectedOption && selectedOption.value !== '' && selectedOption.value !== 'add_new') {
            const cmnd = selectedOption.getAttribute('data-cmnd') || '';
            const diaChi = selectedOption.getAttribute('data-diachi') || '';
            
            row.querySelector('[name="so_cmnd_cccd[]"]').value = cmnd;
            row.querySelector('[name="dia_chi[]"]').value = diaChi;
        } else {
            row.querySelector('[name="so_cmnd_cccd[]"]').value = '';
            row.querySelector('[name="dia_chi[]"]').value = '';
        }
    };

    // === SỬA: clearInputs - thêm clear WO data ===
    function clearInputs() {
        soLuongSanPhamXuatInput.value = '';
        soLuongSanXuatToiThieuInput.value = '';
        clearWoMappedData(); // Thêm dòng này
        addRowBtn.disabled = true;
        saveBtn.disabled = true;
    }

    // === THÊM MỚI: Clear WO mapped data ===
    function clearWoMappedData() {
        tenHangHoaInput.value = '';
        tenNguyenLieuWoInput.value = '';
        maHsInput.value = '';
        donViTinhInput.value = 'KGM';
        SoLuongInput.value = '';
        triGiaFobInput.value = '';
        toKhaiHaiQuanInput.value = '';
        diaChiThuMuaWoInput.value = '';
        noiKhaiThacInput.value = '';
        nguoiPhuTrachSelect.value = '';
        cccdCmndInput.value = '';
        clearWoTable();
    }

    // === THÊM MỚI: Clear WO table ===
    function clearWoTable() {
        woTableBody.innerHTML = '';
    }

    // === SỬA: clearTable - thêm clear WO table ===
    function clearTable() {
        purchaseTableBody.innerHTML = '';
        clearWoTable(); // Thêm dòng này
        rowCounter = 0;
    }

    window.removeRow = function(button) {
        const row = button.closest('tr');
        row.remove();
        updateRowNumbers();
        
        // Disable save button if no rows left
        const remainingRows = purchaseTableBody.querySelectorAll('tr');
        if (remainingRows.length === 0) {
            saveBtn.disabled = true;
        }
        populateWoTable();
    };

    function updateRowNumbers() {
        const rows = purchaseTableBody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            row.querySelector('td:first-child').textContent = index + 1;
        });
        rowCounter = rows.length;
    }

    function handleCancel() {
        if (confirm('Bạn có chắc muốn hủy? Dữ liệu đã nhập sẽ bị mất.')) {
            window.history.back();
        }
    }

    // Utility functions
    function resetSelects(selectIds) {
        selectIds.forEach(id => {
            const select = document.getElementById(id);
            select.innerHTML = '<option value="">-- Chọn --</option>';
            select.disabled = true;
        });
    }

    function populateSelect(selectElement, options, placeholder) {
        selectElement.innerHTML = `<option value="">-- ${placeholder} --</option>`;
        options.forEach(option => {
            const opt = document.createElement('option');
            opt.value = typeof option === 'object' ? option.value : option;
            opt.textContent = typeof option === 'object' ? option.text : option;
            selectElement.appendChild(opt);
        });
    }

    function showLoading() {
        if (loading) loading.style.display = 'block';
    }

    function hideLoading() {
        if (loading) loading.style.display = 'none';
    }

    // Add event listeners to clear validation styling
    document.addEventListener('input', function(e) {
        if (e.target.matches('input[required], select[required]')) {
            e.target.style.borderColor = '';
        }
    });
});