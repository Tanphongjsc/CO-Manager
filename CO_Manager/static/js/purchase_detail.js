document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const editBtn = document.getElementById('editBtn');
    const addRowBtn = document.getElementById('addRowBtn');
    const saveBtn = document.getElementById('saveBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    const exportPdfBtn = document.getElementById('exportPdfBtn');
    const purchaseTable = document.getElementById('purchaseTable');
    const purchaseTableBody = document.getElementById('purchaseTableBody');
    const purchaseDetailForm = document.getElementById('purchaseDetailForm');
    const ngayFromInput = document.getElementById('ngay_from');
    const ngayToInput = document.getElementById('ngay_to');
    // Modal elements
    const addPersonModal = document.getElementById('addPersonModal');
    const closeModal = document.querySelector('.close');
    const cancelPersonBtn = document.getElementById('cancelPersonBtn');
    const savePersonBtn = document.getElementById('savePersonBtn');

    // State variables
    let isEditMode = false;
    let originalData = {};
    let nguoiList = [];
    let rowCounter = 0;

    // Initialize
    init();

    async function init() {
        await loadNguoiList();
        saveOriginalData();
        setupEventListeners();
        updateRowNumbers();
    }

    function setupEventListeners() {
        // Main buttons
        editBtn.addEventListener('click', toggleEditMode);
        addRowBtn.addEventListener('click', addNewRow);
        saveBtn.addEventListener('click', function(e) {
            e.preventDefault();
            handleSave();
        });
        cancelEditBtn.addEventListener('click', handleCancelEdit);
        exportExcelBtn.addEventListener('click', handleExportExcel);
        exportPdfBtn.addEventListener('click', handleExportPdf);
        
        // Modal events
        closeModal.addEventListener('click', closePersonModal);
        cancelPersonBtn.addEventListener('click', closePersonModal);
        savePersonBtn.addEventListener('click', saveNewPerson);
        
        // Calculate totals on input change
        document.addEventListener('input', handleInputChange);
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

    function saveOriginalData() {
        const rows = purchaseTableBody.querySelectorAll('tr:not(.total-row)');
        originalData = { rows: [] };

        rows.forEach((row, index) => {
            const firstCell = row.querySelector('td');
            if (firstCell && firstCell.colSpan !== 12) {
                const values = row.querySelectorAll('.display-value');
                const ctIdInput = row.querySelector('input[name^="ct_id_"]');
                const rowData = {
                    ngay_mua_hang: values[0]?.textContent.trim() || '',
                    ten_nguoi_ban: values[1]?.textContent.trim() || '',
                    so_cmnd_cccd: values[2]?.textContent.trim() || '',
                    dia_chi: values[3]?.textContent.trim() || '',
                    ten_nguyen_lieu: values[4]?.textContent.trim() || '',
                    don_vi_tinh: values[5]?.textContent.trim() || '',
                    so_luong: values[6]?.textContent.trim() || '',
                    don_gia: values[7]?.textContent.trim() || '',
                    thanh_tien: values[8]?.textContent.trim() || '',
                    ghi_chu: values[9]?.textContent.trim() || '',
                    ct_id: ctIdInput ? ctIdInput.value : ''
                };
                originalData.rows.push(rowData);
            }
        });

        originalData.totalQuantity = document.getElementById('totalQuantity')?.textContent || '0';
        originalData.totalAmount = document.getElementById('totalAmount')?.textContent || '0';

        // Lưu giá trị ngày từ - đến ban đầu
        originalData.ngayFrom = ngayFromInput ? ngayFromInput.value : '';
        originalData.ngayTo = ngayToInput ? ngayToInput.value : '';
        rowCounter = originalData.rows.length;
    }



    function toggleEditMode() {
        isEditMode = !isEditMode;
        
        if (isEditMode) {
            enterEditMode();
        } else {
            exitEditMode();
        }
    }

    function enterEditMode() {
        // Show/hide buttons
        editBtn.style.display = 'none';
        addRowBtn.style.display = 'inline-block';
        saveBtn.style.display = 'inline-block';
        cancelEditBtn.style.display = 'inline-block';
        
        // Add edit mode class to table
        purchaseTable.classList.add('edit-mode');

        // Enable date range inputs
        if (ngayFromInput) ngayFromInput.removeAttribute('readonly');
        if (ngayToInput) ngayToInput.removeAttribute('readonly');
        
        // Setup person selects for existing rows
        setupPersonSelects();
        
        // Add event listeners for quantity and price inputs
        setupCalculationListeners();
        
        isEditMode = true;
    }

    function exitEditMode() {
        // Show/hide buttons
        editBtn.style.display = 'inline-block';
        addRowBtn.style.display = 'none';
        saveBtn.style.display = 'none';
        cancelEditBtn.style.display = 'none';
        
        // Remove edit mode class
        purchaseTable.classList.remove('edit-mode');
        
        // Disable date range inputs
        if (ngayFromInput) ngayFromInput.setAttribute('readonly', 'readonly');
        if (ngayToInput) ngayToInput.setAttribute('readonly', 'readonly');

        isEditMode = false;
    }

    function setupPersonSelects() {
        const personSelects = document.querySelectorAll('.person-select');
        
        personSelects.forEach(select => {
            // Clear existing options
            select.innerHTML = '<option value="">-- Chọn người --</option>';
            
            // Add người options
            nguoiList.forEach(nguoi => {
                const option = document.createElement('option');
                option.value = nguoi.id;
                option.textContent = nguoi.ten;
                option.setAttribute('data-cmnd', nguoi.so_cmnd_cccd || '');
                option.setAttribute('data-ngaycap', nguoi.ngay_cap_cmnd_cccd || ''); // ✅ Đã có sẵn
                option.setAttribute('data-diachi', nguoi.dia_chi || '');
                
                // Set selected if matches original value
                const originalValue = select.getAttribute('data-original-value');
                if (nguoi.ten === originalValue) {
                    option.selected = true;
                }
                
                select.appendChild(option);
            });
            
            // Add "add new person" option
            const addNewOption = document.createElement('option');
            addNewOption.value = 'add_new';
            addNewOption.textContent = '+ Thêm người mới';
            select.appendChild(addNewOption);
            
            // Add change event listener
            select.addEventListener('change', function() {
                handlePersonSelectChange(this);
            });
        });
    }

    function handlePersonSelectChange(selectElement) {
        const row = selectElement.closest('tr');
        const selectedOption = selectElement.selectedOptions[0];
        
        if (selectElement.value === 'add_new') {
            selectElement.value = ''; // Reset select
            openPersonModal();
            return;
        }
        
        if (selectedOption && selectedOption.value !== '') {
            const cmnd = selectedOption.getAttribute('data-cmnd') || '';
            const ngayCap = selectedOption.getAttribute('data-ngaycap') || '';
            const diaChi = selectedOption.getAttribute('data-diachi') || '';
            
            // Update readonly inputs
            row.querySelector('.cmnd-input').value = cmnd;
            row.querySelector('.address-input').value = diaChi;
            
            // Update person info display
            const personCmnd = row.querySelector('.person-cmnd');
            const personNgayCap = row.querySelector('.person-ngaycap'); 
            const personAddress = row.querySelector('.person-address');
            
            if (personCmnd) personCmnd.textContent = cmnd;
            if (personNgayCap) personNgayCap.textContent = ngayCap; // ✅ Cập nhật ngày cấp
            if (personAddress) personAddress.textContent = diaChi;
        } else {
            row.querySelector('.cmnd-input').value = '';
            row.querySelector('.address-input').value = '';
            
            // Clear person info display
            const personCmnd = row.querySelector('.person-cmnd');
            const personNgayCap = row.querySelector('.person-ngaycap');
            const personAddress = row.querySelector('.person-address');
            
            if (personCmnd) personCmnd.textContent = '';
            if (personNgayCap) personNgayCap.textContent = '';
            if (personAddress) personAddress.textContent = '';
        }
    }

    function setupCalculationListeners() {
        const quantityInputs = document.querySelectorAll('.quantity-input');
        const priceInputs = document.querySelectorAll('.price-input');
        
        [...quantityInputs, ...priceInputs].forEach(input => {
            input.addEventListener('input', function() {
                calculateRowTotal(this.closest('tr'));
                calculateGrandTotal();
            });
        });
    }

    function calculateRowTotal(row) {
        const quantityInput = row.querySelector('.quantity-input');
        const priceInput = row.querySelector('.price-input');
        const totalInput = row.querySelector('input[name*="thanh_tien"]');
        
        if (quantityInput && priceInput && totalInput) {
            const quantity = parseFloat(quantityInput.value) || 0;
            const price = parseFloat(priceInput.value) || 0;
            const total = quantity * price;
            
            totalInput.value = total.toFixed(0);
        }
    }

    function calculateGrandTotal() {
        let totalQuantity = 0;
        let totalAmount = 0;

        const rows = purchaseTableBody.querySelectorAll('tr:not(.total-row)');
        rows.forEach(row => {
            const firstCell = row.querySelector('td');
            if (firstCell && firstCell.colSpan !== 12) {
                const quantityInput = row.querySelector('.quantity-input');
                const totalInput = row.querySelector('input[name*="thanh_tien"]');

                if (quantityInput && totalInput) {
                    totalQuantity += parseFloat(quantityInput.value) || 0;
                    totalAmount += parseFloat(totalInput.value) || 0;
                }
            }
        });

        document.getElementById('totalQuantity').textContent = totalQuantity.toFixed(2);
        document.getElementById('totalAmount').textContent = totalAmount.toFixed(0);
    }

    function isDuplicateRow(tenNguoiBanId, ngayMua, soLuong, donGia) {
        if (!tenNguoiBanId || parseFloat(soLuong) <= 0 || parseFloat(donGia) <= 0) return false;

        const rows = purchaseTableBody.querySelectorAll('tr:not(.total-row)');
        for (const row of rows) {
            const personSelect = row.querySelector('.person-select');
            const dateInput = row.querySelector('input[name^="ngay_mua_hang_"]');
            const quantityInput = row.querySelector('input[name^="so_luong_"]');
            const priceInput = row.querySelector('input[name^="don_gia_"]');

            if (
                personSelect?.value == tenNguoiBanId &&
                dateInput?.value == ngayMua &&
                parseFloat(quantityInput?.value || 0) == parseFloat(soLuong) &&
                parseFloat(priceInput?.value || 0) == parseFloat(donGia)
            ) {
                return true;
            }
        }
        return false;
    }

    function addNewRow() {
        // Get material info from the form
        const tenNguyenLieu = document.getElementById('ten_nguyen_lieu').value;
        const today = new Date().toISOString().split('T')[0];
        const tenNguoiBanId = ''; // mặc định ban đầu rỗng
        const soLuong = 0;
        const donGia = 0;
        const ngayMua = today;
        const donViTinh = document.getElementById('don_vi_tinh_hidden')?.value || 'Kg';

        if (isDuplicateRow(tenNguoiBanId, ngayMua, soLuong, donGia)) {
            alert("Dòng dữ liệu giống nhau đã tồn tại. Vui lòng kiểm tra lại.");
            return;
        }
        rowCounter++;
        const row = document.createElement('tr');
        row.setAttribute('data-row-id', rowCounter);

        row.innerHTML = `
            <td>${rowCounter}</td>
            <td>
                <span class="display-value">${today}</span>
                <input type="date" class="edit-input form-control" value="${today}" name="ngay_mua_hang_${rowCounter}">
            </td>
            <td>
                <span class="display-value"></span>
                <select class="edit-input form-control person-select" name="ten_nguoi_ban_${rowCounter}" data-original-value="">
                    <option value="">-- Chọn người --</option>
                    ${nguoiList.map(n => `<option value="${n.id}" data-cmnd="${n.so_cmnd_cccd || ''}" data-ngaycap="${n.ngay_cap_cmnd_cccd || ''}" data-diachi="${n.dia_chi || ''}">${n.ten}</option>`).join('')}
                    <option value="add_new">+ Thêm người mới</option>
                </select>
                <div class="person-info">
                    <div>CMND/CCCD: <span class="person-cmnd"></span></div>
                    <div>Ngày cấp: <span class="person-ngaycap"></span></div>
                    <div>Địa chỉ: <span class="person-address"></span></div>
                </div>
            </td>
            <td>
                <span class="display-value"></span>
                <input type="text" class="edit-input form-control cmnd-input" value="" name="so_cmnd_cccd_${rowCounter}" readonly>
            </td>
            <td>
                <span class="display-value"></span>
                <input type="text" class="edit-input form-control address-input" value="" name="dia_chi_${rowCounter}" readonly>
            </td>
            <td>
                <span class="display-value">${tenNguyenLieu}</span>
                <input type="text" class="edit-input form-control" value="${tenNguyenLieu}" name="ten_nguyen_lieu_${rowCounter}" readonly>
            </td>
            <td>
                <span class="display-value">${donViTinh}</span>
                <input type="text" class="edit-input form-control" value="${donViTinh}" name="don_vi_tinh_${rowCounter}" readonly>
            </td>
            <td>
                <span class="display-value">0</span>
                <input type="number" class="edit-input form-control quantity-input" value="0" name="so_luong_${rowCounter}" step="0.01">
            </td>
            <td>
                <span class="display-value">0</span>
                <input type="number" class="edit-input form-control price-input" value="0" name="don_gia_${rowCounter}">
            </td>
            <td class="text-right">
                <span class="display-value total-amount">0</span>
                <input type="number" class="edit-input form-control" value="0" name="thanh_tien_${rowCounter}" readonly>
            </td>
            <td>
                <span class="display-value"></span>
                <input type="text" class="edit-input form-control" value="" name="ghi_chu_${rowCounter}">
            </td>
            <td class="edit-column">
                <button type="button" class="btn btn-danger btn-sm delete-row">Xóa</button>
            </td>
            <input type="hidden" name="ct_id_${rowCounter}" value="">
        `;

        // Insert before total row
        const totalRow = purchaseTableBody.querySelector('.total-row');
        if (totalRow) {
            purchaseTableBody.insertBefore(row, totalRow);
        } else {
            purchaseTableBody.appendChild(row);
        }

        // Setup event listeners for the new row
        const personSelect = row.querySelector('.person-select');
        personSelect.addEventListener('change', function () {
            handlePersonSelectChange(this);
        });

        const deleteBtn = row.querySelector('.delete-row');
        deleteBtn.addEventListener('click', function () {
            removeRow(this);
        });

        const quantityInput = row.querySelector('.quantity-input');
        const priceInput = row.querySelector('.price-input');

        [quantityInput, priceInput].forEach(input => {
            input.addEventListener('input', function () {
                calculateRowTotal(this.closest('tr'));
                calculateGrandTotal();
            });
        });

        // Remove "no data" row if it exists
        const noDataRow = purchaseTableBody.querySelector('.no-data');
        if (noDataRow) {
            noDataRow.closest('tr').remove();
        }
    }


    function removeRow(button) {
        const row = button.closest('tr');
        row.remove();
        updateRowNumbers();
        calculateGrandTotal();
        
        // Add "no data" row if no rows left
        const remainingRows = purchaseTableBody.querySelectorAll('tr:not(.total-row)');
        if (remainingRows.length === 0) {
            const noDataRow = document.createElement('tr');
            noDataRow.innerHTML = '<td colspan="12" class="no-data">Chưa có dữ liệu chi tiết</td>';
            const totalRow = purchaseTableBody.querySelector('.total-row');
            if (totalRow) {
                purchaseTableBody.insertBefore(noDataRow, totalRow);
            } else {
                purchaseTableBody.appendChild(noDataRow);
            }
        }
    }

    function updateRowNumbers() {
        const rows = purchaseTableBody.querySelectorAll('tr:not(.total-row)');
        let counter = 0;

        rows.forEach(row => {
            const firstCell = row.querySelector('td');
            if (firstCell && firstCell.colSpan !== 12) {
                counter++;
                const sttCell = row.querySelector('td:first-child');
                if (sttCell) sttCell.textContent = counter;
            }
        });

        rowCounter = counter;
    }

    function handleCancelEdit() {
        if (confirm('Bạn có chắc muốn hủy các thay đổi? Dữ liệu đã chỉnh sửa sẽ bị mất.')) {
            restoreOriginalData();
            exitEditMode();
        }
    }

    // Sửa lại function restoreOriginalData() để khôi phục cả ngày từ - đến
    function restoreOriginalData() {
        // XÓA FOOTER (tfoot) nếu tồn tại để không bị lặp dòng tổng
        const tfoot = document.querySelector('#purchaseTable tfoot');
        if (tfoot) {
            tfoot.remove();
        }

        // Khôi phục giá trị ngày từ - đến
        if (ngayFromInput && originalData.ngayFrom !== undefined) {
            ngayFromInput.value = originalData.ngayFrom;
        }
        if (ngayToInput && originalData.ngayTo !== undefined) {
            ngayToInput.value = originalData.ngayTo;
        }

        purchaseTableBody.innerHTML = '';
        if (originalData.rows.length === 0) {
            const noDataRow = document.createElement('tr');
            noDataRow.innerHTML = '<td colspan="12" class="no-data">Chưa có dữ liệu chi tiết</td>';
            purchaseTableBody.appendChild(noDataRow);
        } else {
            originalData.rows.forEach((rowData, index) => {
                const donViTinh = rowData.don_vi_tinh || document.getElementById('don_vi_tinh_hidden')?.value || 'Kg';
                
                const row = document.createElement('tr');
                row.setAttribute('data-row-id', index + 1);

                row.innerHTML = `
                    <td>${index + 1}</td>
                    <td>
                        <span class="display-value">${rowData.ngay_mua_hang}</span>
                        <input type="date" class="edit-input form-control" value="${rowData.ngay_mua_hang}" name="ngay_mua_hang_${index + 1}">
                    </td>
                    <td>
                        <span class="display-value">${rowData.ten_nguoi_ban}</span>
                        <select class="edit-input form-control person-select" name="ten_nguoi_ban_${index + 1}" data-original-value="${rowData.ten_nguoi_ban}">
                            <option value="">-- Chọn người --</option>
                            <option value="${rowData.id_nguoi_ban}" selected>${rowData.ten_nguoi_ban}</option>
                        </select>
                        <div class="person-info">
                            <div>CMND/CCCD: <span class="person-cmnd">${rowData.so_cmnd_cccd}</span></div>
                            <div>Ngày cấp: <span class="person-ngaycap">${rowData.ngay_cap_cmnd_cccd || ''}</span></div>
                            <div>Địa chỉ: <span class="person-address">${rowData.dia_chi}</span></div>
                        </div>
                    </td>
                    <td>
                        <span class="display-value">${rowData.so_cmnd_cccd}</span>
                        <input type="text" class="edit-input form-control cmnd-input" value="${rowData.so_cmnd_cccd}" name="so_cmnd_cccd_${index + 1}" readonly>
                    </td>
                    <td>
                        <span class="display-value">${rowData.dia_chi}</span>
                        <input type="text" class="edit-input form-control address-input" value="${rowData.dia_chi}" name="dia_chi_${index + 1}" readonly>
                    </td>
                    <td>
                        <span class="display-value">${rowData.ten_nguyen_lieu}</span>
                        <input type="text" class="edit-input form-control" value="${rowData.ten_nguyen_lieu}" name="ten_nguyen_lieu_${index + 1}" readonly>
                    </td>
                    <td>
                        <span class="display-value">${donViTinh}</span>
                        <input type="text" class="edit-input form-control" value="${donViTinh}" name="don_vi_tinh_${index + 1}" readonly>
                    </td>
                    <td>
                        <span class="display-value">${rowData.so_luong}</span>
                        <input type="number" class="edit-input form-control quantity-input" value="${parseFloat(rowData.so_luong.replace(',', ''))}" name="so_luong_${index + 1}" step="0.01">
                    </td>
                    <td>
                        <span class="display-value">${rowData.don_gia}</span>
                        <input type="number" class="edit-input form-control price-input" value="${parseFloat(rowData.don_gia.replace(/,/g, ''))}" name="don_gia_${index + 1}">
                    </td>
                    <td class="text-right">
                        <span class="display-value total-amount">${rowData.thanh_tien}</span>
                        <input type="number" class="edit-input form-control" value="${parseFloat(rowData.thanh_tien.replace(/,/g, ''))}" name="thanh_tien_${index + 1}" readonly>
                    </td>
                    <td>
                        <span class="display-value">${rowData.ghi_chu}</span>
                        <input type="text" class="edit-input form-control" value="${rowData.ghi_chu}" name="ghi_chu_${index + 1}">
                    </td>
                    <td class="edit-column">
                        <button type="button" class="btn btn-danger btn-sm delete-row">Xóa</button>
                    </td>
                    <input type="hidden" name="ct_id_${index + 1}" value="${rowData.ct_id || ''}">
                `;

                purchaseTableBody.appendChild(row);
            });
        }

        // Thêm lại dòng tổng cộng mới
        const totalRow = document.createElement('tfoot');
        totalRow.innerHTML = `
            <tr class="total-row">
                <td colspan="7"><strong>Tổng cộng</strong></td>
                <td class="text-right"><strong id="totalQuantity">${originalData.totalQuantity}</strong></td>
                <td></td>
                <td class="text-right"><strong id="totalAmount">${originalData.totalAmount}</strong></td>
                <td></td>
                <td class="edit-column"></td>
            </tr>
        `;
        document.querySelector('#purchaseTable').appendChild(totalRow);

        rowCounter = originalData.rows.length;
    }

    async function handleSave() {
        if (!validateForm()) {
            return;
        }
        
        const formData = new FormData(purchaseDetailForm);
        
        try {
            const response = await fetch(window.location.href, {
                method: 'POST',
                body: formData
            });
            
            if (response.ok) {
                alert('Lưu thành công!');
                // Reload page to show updated data
                window.location.reload();
            } else {
                alert('Có lỗi xảy ra khi lưu dữ liệu');
            }
        } catch (error) {
            console.error('Error saving:', error);
            alert('Có lỗi xảy ra khi lưu dữ liệu');
        }
    }

    function validateForm() {
        const rows = purchaseTableBody.querySelectorAll('tr:not(.total-row)');
        let isValid = true;

        rows.forEach(row => {
            const firstCell = row.querySelector('td');
            if (firstCell && firstCell.colSpan !== 12) {
                const personSelect = row.querySelector('.person-select');
                const quantityInput = row.querySelector('.quantity-input');
                const priceInput = row.querySelector('.price-input');

                if (personSelect && !personSelect.value) {
                    personSelect.style.borderColor = 'red';
                    isValid = false;
                }

                if (quantityInput && !quantityInput.value) {
                    quantityInput.style.borderColor = 'red';
                    isValid = false;
                }

                if (priceInput && !priceInput.value) {
                    priceInput.style.borderColor = 'red';
                    isValid = false;
                }
            }
        });

        if (!isValid) alert('Vui lòng điền đầy đủ thông tin bắt buộc (Người, Số lượng, Đơn giá)');

        return isValid;
    }

    function handleFormSubmit(e) {
        e.preventDefault();
        handleSave();
    }

    function handleInputChange(e) {
        // Clear validation styling
        if (e.target.matches('input, select')) {
            e.target.style.borderColor = '';
        }
    }

    // Export functions
    function handleExportExcel() {
        const recordId = document.getElementById('purchaseDetailForm').dataset.recordId;
        if (!recordId) return alert("Không tìm thấy mã bảng kê.");
        window.open(`/purchase/${recordId}/export-excel/`, '_blank');
    }

    function handleExportPdf() {
        const recordId = document.getElementById('purchaseDetailForm').dataset.recordId;
        if (!recordId) return alert("Không tìm thấy mã bảng kê.");
        window.open(`/purchase/${recordId}/export-pdf/`, '_blank');
    }

    // Modal functions
    function openPersonModal() {
        addPersonModal.style.display = 'flex';
        document.getElementById('modal_ten').value = '';
        document.getElementById('modal_so_cmnd_cccd').value = '';
        document.getElementById('modal_ngay_cap_cmnd_cccd').value = '';
        document.getElementById('modal_dia_chi').value = '';
        document.getElementById('modal_vai_tro').value = 'Người bán';
    }

    function closePersonModal() {
        addPersonModal.style.display = 'none';
    }

    async function saveNewPerson() {
        const ten = document.getElementById('modal_ten').value.trim();
        const so_cmnd_cccd = document.getElementById('modal_so_cmnd_cccd').value.trim();
        const ngayCap = document.getElementById('modal_ngay_cap_cmnd_cccd').value.trim();
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
                    ngay_cap_cmnd_cccd: ngayCap,
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
            const originalValue = select.getAttribute('data-original-value');
            
            // Clear and rebuild options
            select.innerHTML = '<option value="">-- Chọn người --</option>';
            
            nguoiList.forEach(nguoi => {
                const option = document.createElement('option');
                option.value = nguoi.id;
                option.textContent = nguoi.ten;
                option.setAttribute('data-cmnd', nguoi.so_cmnd_cccd || '');
                option.setAttribute('data-ngaycap', nguoi.ngay_cap_cmnd_cccd || ''); // ✅ Thêm ngày cấp
                option.setAttribute('data-diachi', nguoi.dia_chi || '');
                
                if (nguoi.ten === originalValue) {
                    option.selected = true;
                }
                
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
                handlePersonSelectChange(select);
            }
        });
    }

    // Handle delete row
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('delete-row')) {
            removeRow(e.target);
        }
    });
});