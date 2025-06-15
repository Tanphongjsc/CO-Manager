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

    // Load người list on page load
    loadNguoiList();

    // Event listeners
    maDonHangSelect.addEventListener('change', handleDonHangChange);
    maLenhSxSelect.addEventListener('change', handleLenhSxChange);
    tenNguyenLieuSelect.addEventListener('change', handleNguyenLieuChange);
    addRowBtn.addEventListener('click', addNewRow);
    cancelBtn.addEventListener('click', handleCancel);
    saveBtn.addEventListener('click', handleSave);
    
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
            addRowBtn.disabled = true;
            return;
        }

        selectedMaterial = materialData.find(m => m.id_san_pham === selectedId);
        
        if (selectedMaterial) {
            soLuongSanPhamXuatInput.value = selectedMaterial.so_luong_san_pham_xuat || 0;
            soLuongSanXuatToiThieuInput.value = selectedMaterial.so_luong_san_xuat_toi_thieu || 0;
            
            addRowBtn.disabled = false;
        }
    }

    function addNewRow() {
        if (!selectedMaterial) {
            alert('Vui lòng chọn nguyên liệu trước');
            return;
        }

        rowCounter++;
        const row = document.createElement('tr');
        row.innerHTML = `
            <td class="text-center">${rowCounter}</td>
            <td><input type="date" name="ngay_mua_hang[]" class="form-control" value="${today}" required></td>
            <td>
                <select name="ho_ten[]" class="form-control person-select" required>
                    <option value="">-- Chọn người --</option>
                    ${nguoiList.map(n => `<option value="${n.id}" data-cmnd="${n.so_cmnd_cccd || ''}" data-diachi="${n.dia_chi || ''}">${n.ten}</option>`).join('')}
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

        // Add event listener for person select
        const personSelect = row.querySelector('.person-select');
        personSelect.addEventListener('change', function() {
            updatePersonInfo(this);
            if (this.value === 'add_new') {
                this.value = ''; // Reset select
                openPersonModal();
            }
        });

        // Enable save button when there's at least one row
        saveBtn.disabled = false;
    }

    async function handleSave() {
        const rows = purchaseTableBody.querySelectorAll('tr');
        if (rows.length === 0) {
            alert('Vui lòng thêm ít nhất một dòng dữ liệu');
            return;
        }

        // Validate required fields
        let isValid = true;
        rows.forEach(row => {
            const personSelect = row.querySelector('[name="ho_ten[]"]');
            const soLuongInput = row.querySelector('[name="so_luong[]"]');
            const donGiaInput = row.querySelector('[name="don_gia[]"]');
            const ngayInput = row.querySelector('[name="ngay_mua_hang[]"]');

            if (!personSelect.value || !soLuongInput.value || !donGiaInput.value || !ngayInput.value) {
                isValid = false;
                // Highlight invalid fields
                if (!personSelect.value) personSelect.style.borderColor = 'red';
                if (!soLuongInput.value) soLuongInput.style.borderColor = 'red';
                if (!donGiaInput.value) donGiaInput.style.borderColor = 'red';
                if (!ngayInput.value) ngayInput.style.borderColor = 'red';
            }
        });

        if (!isValid) {
            alert('Vui lòng điền đầy đủ thông tin bắt buộc (Người bán, Số lượng, Đơn giá, Ngày mua hàng)');
            return;
        }

        // Submit form
        const form = document.getElementById('purchaseForm');
        if (form) {
            form.submit();
        }
    }

    async function loadNguoiList() {
        try {
            const response = await fetch('/api/nguoi/list/');
            const data = await response.json();
            
            if (data.status === 'success') {
                nguoiList = data.nguoi_list;
            }
        } catch (error) {
            console.error('Error loading người list:', error);
        }
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
            
            nguoiList.forEach(n => {
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
            if (currentValue && nguoiList.find(n => n.id == currentValue)) {
                select.value = currentValue;
                updatePersonInfo(select);
            }
        });
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

    window.removeRow = function(button) {
        const row = button.closest('tr');
        row.remove();
        updateRowNumbers();
        
        // Disable save button if no rows left
        const remainingRows = purchaseTableBody.querySelectorAll('tr');
        if (remainingRows.length === 0) {
            saveBtn.disabled = true;
        }
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

    function clearInputs() {
        soLuongSanPhamXuatInput.value = '';
        soLuongSanXuatToiThieuInput.value = '';
        addRowBtn.disabled = true;
        saveBtn.disabled = true;
    }

    function clearTable() {
        purchaseTableBody.innerHTML = '';
        rowCounter = 0;
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