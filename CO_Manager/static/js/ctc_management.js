document.addEventListener('DOMContentLoaded', () => {
    // 1. Khai báo các phần tử DOM và biến trạng thái
    const getElem = id => document.getElementById(id);
    const querySel = selector => document.querySelector(selector);

    const modal = getElem('ctcModal');
    const ctcForm = getElem('ctcForm');
    const modalTitle = getElem('modalTitle');
    const materialTableBody = getElem('materialTable')?.querySelector('tbody');
    const emptyMaterialRow = getElem('emptyMaterialRow');
    const materialCountBadge = getElem('materialCount');
    const mainTableBody = querySel('.standard-table tbody');
    const filterSelectBox = getElem('ctc-ma-lenh-sx-select');

    const buttons = {
        filter: getElem('ctc-filter-btn'),
        clearFilter: getElem('ctc-clear-filter-btn'),
        toggleEdit: getElem('toggleEditBtn'),
        cancelEdit: getElem('cancelEditBtn'),
        save: getElem('saveCCTCBtn'),
        addMaterial: getElem('addMaterialRowBtn'),
        closeModal: getElem('closeModalBtn'),
        addCtc: getElem('add-ctc-btn'),
        exportExcel: getElem('exportExcelBtn'),
        exportPdf: getElem('exportPdfBtn')
    };

    const fields = {
        id_lenh_san_xuat: getElem('modal_id_lenh_san_xuat'),
        id_san_pham: getElem('modal_id_san_pham'),
        ma_hs: getElem('modal_ma_hs'),
        so_luong: getElem('modal_so_luong'),
        don_vi_tinh: getElem('modal_don_vi_tinh'),
        tri_gia_fob: getElem('modal_tri_gia_fob'),
        so_to_hai_quan: getElem('modal_so_to_hai_quan')
    };

    let lenhSanXuatData = {};
    let productData = {}; // Dữ liệu sản phẩm và nguyên liệu tương ứng
    let materialData = []; // Danh sách toàn bộ nguyên liệu có sẵn
    let currentCtcId = null; // ID của CTC đang xem/sửa
    let isEditMode = false; // Trạng thái form (xem/sửa)
    let ctcCreateApiData = null; // Dữ liệu từ API khi tạo/sửa CTC (ngày BTM, WO theo LSX)

    // --- 2. CÁC HÀM TIỆN ÍCH ---
    const formatDateForInput = (dateString) => {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
        } catch (e) { return ''; }
    };

    const getCsrfToken = () => document.cookie.match(/csrftoken=([^;]+)/)?.[1] || null;

    const getValue = (val, defaultVal = '') => (val !== null && val !== undefined ? val : defaultVal);

    const cleanValue = (value) => {
        if (typeof value === 'string' && value.trim() === '') return null;
        const num = parseFloat(value);
        return (typeof value === 'string' && !isNaN(num) && isFinite(value)) ? num : value;
    };

    // --- 3. TRUY CẬP DỮ LIỆU ---
    const initializeData = () => {
        const parseJsonData = (id, defaultValue) => {
            try {
                const element = getElem(id);
                return element ? JSON.parse(element.textContent || (Array.isArray(defaultValue) ? '[]' : '{}')) : defaultValue;
            } catch (e) {
                console.error(`Lỗi parse JSON cho ${id}:`, e);
                return defaultValue;
            }
        };
        lenhSanXuatData = parseJsonData('lenh-san-xuat-data', {});
        productData = parseJsonData('product-data', {});
        materialData = parseJsonData('material-data', []);
    };

    const getProductsForLenhSanXuat = (lenhSxId) => productData?.[lenhSxId] || [];

    const getMaterialsForProductFromProductData = (productId) => {
        for (const lenhId in productData) {
            const productInfo = (productData[lenhId] || []).find(p => p.san_pham?.id_san_pham === productId);
            if (productInfo?.nguyen_vat_lieu) return Object.values(productInfo.nguyen_vat_lieu);
        }
        return [];
    };

    const getProductDetails = (lenhSxId, productId) => {
        if (!lenhSxId || !productId) return null;
        return getProductsForLenhSanXuat(lenhSxId).find(p => p.san_pham?.id_san_pham === productId);
    };

    const fetchCtcCreateData = async (lenhSxId) => {
        ctcCreateApiData = { bang_ke_thu_mua: {}, bang_ke_wo: {} }; // Reset trước khi fetch
        if (!lenhSxId) return;

        try {
            const response = await fetch('/api/get_data_for_ctc_create/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                body: JSON.stringify({ id_lenh_san_xuat: lenhSxId })
            });
            if (!response.ok) throw new Error(`API get_data_for_ctc_create thất bại: ${response.status}`);
            const result = await response.json();
            if (result.success && result.data) {
                ctcCreateApiData = result.data;
            } else {
                console.warn('API get_data_for_ctc_create không thành công hoặc thiếu data:', result.message);
            }
        } catch (error) {
            console.error('Lỗi gọi API get_data_for_ctc_create:', error);
        }
    };

    // --- 4. QUẢN LÝ UI BẢNG NGUYÊN LIỆU ---
    const updateMaterialTableDisplay = () => {
        if (!materialTableBody) return;
        const rowCount = materialTableBody.querySelectorAll('tr:not(#emptyMaterialRow)').length;
        if (materialCountBadge) materialCountBadge.textContent = `(${rowCount})`;
        if (emptyMaterialRow) {
            const isEmpty = rowCount === 0;
            emptyMaterialRow.style.display = isEmpty ? 'table-row' : 'none';
            if (isEmpty && !materialTableBody.contains(emptyMaterialRow)) {
                materialTableBody.appendChild(emptyMaterialRow);
            }
        }
    };

    const resetMaterialTable = () => {
        if (!materialTableBody) return;
        materialTableBody.innerHTML = '';
        updateMaterialTableDisplay();
    };

    // --- 5. TẠO DROPDOWN ---
    const generateMaterialOptionsHtml = (materialsToUse, selectedValue, globalMaterialDataSource) => {
        let options = '<option value="">-- Chọn nguyên liệu --</option>';
        const effectiveMaterials = (materialsToUse && materialsToUse.length > 0) ? materialsToUse : globalMaterialDataSource;
        let foundMatch = false;

        effectiveMaterials.forEach(material => {
            const name = material.ten_khac || material.ten_sp_chinh || material.name || material.ten_nguyen_lieu;
            const id = material.id_san_pham || material.id;
            const maHs = material.ma_hs || '';
            // Sử dụng ID để so sánh thay vì tên để đảm bảo tính chính xác
            const isSelected = selectedValue && id && (selectedValue === id.toString()); 
            if (isSelected) foundMatch = true;
            options += `<option value="${id || ''}" data-name="${name}" data-mahs="${maHs}" ${isSelected ? 'selected' : ''}>${name} (${maHs})</option>`;
        });
        // Nếu selectedValue không phải là ID, có thể đây là tên cũ. Cần xử lý để không mất dữ liệu cũ.
        // Tuy nhiên, việc lưu trữ và so sánh theo ID là tốt nhất.
        // Tạm thời giữ lại logic này nếu selectedValue là tên, nhưng khuyến nghị chuyển sang ID
        if (selectedValue && !foundMatch && typeof selectedValue === 'string') {
             // Thử tìm theo tên trong trường hợp dữ liệu cũ lưu tên thay vì ID
             const materialByName = effectiveMaterials.find(m => (m.ten_khac || m.ten_sp_chinh || m.name || m.ten_nguyen_lieu)?.toLowerCase() === selectedValue.toLowerCase());
             if (materialByName) {
                 options += `<option value="${materialByName.id_san_pham || materialByName.id}" data-name="${selectedValue}" data-mahs="${materialByName.ma_hs || ''}" selected>${selectedValue}</option>`;
             } else {
                 options += `<option value="${selectedValue}" data-name="${selectedValue}" data-mahs="" selected>${selectedValue}</option>`;
             }
        }
        return options;
    };

    const createMaterialDropdown = (selectedValue = '', fieldName = '', isDisabled = false, availableMaterials = []) => {
        const optionsHtml = generateMaterialOptionsHtml(availableMaterials, selectedValue, materialData);
        return `<select class="form-control form-control-sm material-select" name="${fieldName}" ${isDisabled ? 'disabled' : ''}>${optionsHtml}</select>`;
    };

    const populateDropdown = (selectElement, data, valueField, textField, selectedValue, defaultOptionText) => {
        if (!selectElement) return;
        selectElement.innerHTML = `<option value="">-- ${defaultOptionText} --</option>` +
            data.map(item => {
                const value = typeof valueField === 'function' ? valueField(item) : item[valueField];
                const text = typeof textField === 'function' ? textField(item) : item[textField];
                const dataAttributes = item.dataset ? Object.entries(item.dataset).map(([key, val]) => `data-${key}="${val}"`).join(' ') : '';
                return `<option value="${value}" ${dataAttributes} ${selectedValue == value ? 'selected' : ''}>${text}</option>`;
            }).join('');
        if (selectedValue) selectElement.value = selectedValue;
    };

    const populateLenhSanXuatDropdown = (selectedValue = null) => {
        populateDropdown(fields.id_lenh_san_xuat, Object.values(lenhSanXuatData).map(val => ({ value: val, text: val })), 'value', 'text', selectedValue, 'Chọn lệnh sản xuất');
    };

    const populateProductDropdown = (lenhSxId = null, selectedValue = null) => {
        let products = [];
        if (lenhSxId) {
            products = getProductsForLenhSanXuat(lenhSxId)
                .filter(p => p.san_pham)
                .map(pItem => ({
                    value: pItem.san_pham.id_san_pham,
                    text: pItem.san_pham.ten_khac || pItem.san_pham.ten_sp_chinh,
                    dataset: {
                        'ma-hs': pItem.san_pham.ma_hs || '',
                        'dvt': pItem.san_pham.don_vi_tinh || '',
                        'so-luong-sp': pItem.so_luong_san_pham || ''
                    }
                }));
        }
        populateDropdown(fields.id_san_pham, products, 'value', 'text', selectedValue, 'Chọn hàng hóa');
    };

    const updateMaterialDropdowns = () => {
        if (!isEditMode || !materialTableBody) return;
        const selectedProductId = fields.id_san_pham?.value;
        const availableMaterials = selectedProductId ? getMaterialsForProductFromProductData(selectedProductId) : [];
        materialTableBody.querySelectorAll('.material-select').forEach(select => {
            // Lấy ID nguyên liệu đang được chọn để tái chọn sau khi cập nhật options
            const currentSelectedMaterialId = select.value; 
            select.innerHTML = generateMaterialOptionsHtml(availableMaterials, currentSelectedMaterialId, materialData);
        });
    };

    // --- 6. QUẢN LÝ MODAL ---
    const openModal = () => {
        if (modal) {
            modal.style.setProperty('display', 'flex', 'important');
            document.body.style.overflow = 'hidden';
        }
    };

    const closeModal = () => {
        if (modal) modal.style.setProperty('display', 'none', 'important');
        document.body.style.overflow = '';
        ctcForm?.reset();
        currentCtcId = null;
        ctcCreateApiData = null;
        setModalMode(false);
        populateLenhSanXuatDropdown();
        populateProductDropdown();
        resetMaterialTable();
    };

    const setModalMode = (editMode) => {
        isEditMode = editMode;
        if (!ctcForm) return;
        ctcForm.className = editMode ? 'edit-mode' : 'view-mode';

        Object.values(fields).forEach(field => {
            if (!field) return;
            const isSelect = field.tagName === 'SELECT';
            const alwaysReadonly = ['modal_ma_hs', 'modal_don_vi_tinh'].includes(field.id);
            field.disabled = isSelect ? !editMode : false;
            field.readOnly = !isSelect ? (alwaysReadonly || !editMode) : false;
        });

        materialTableBody?.querySelectorAll('input, select, textarea').forEach(el => {
            el.disabled = !editMode;
            if (el.name?.endsWith('_ma_hs')) el.readOnly = true;
        });
        
        const showIf = (condition) => condition ? 'inline-flex' : 'none';
        buttons.save && (buttons.save.style.display = showIf(editMode));
        buttons.toggleEdit && (buttons.toggleEdit.style.display = showIf(!editMode && currentCtcId));
        buttons.cancelEdit && (buttons.cancelEdit.style.display = showIf(editMode));
        buttons.addMaterial && (buttons.addMaterial.style.display = showIf(editMode));
        
        [buttons.exportExcel, buttons.exportPdf].forEach(btn => {
            if (btn) {
                btn.style.display = showIf(!editMode && currentCtcId);
                if (currentCtcId) btn.dataset.id = currentCtcId;
            }
        });
    };

    const fetchCtcDetails = async (id) => {
        if (!id) { console.warn('fetchCtcDetails: ID rỗng.'); return null; }
        try {
            const response = await fetch(`/ctc/${id}/`);
            if (!response.ok) {
                alert(`Lỗi ${response.status}: Không thể lấy dữ liệu CTC (ID: ${id}).`);
                return null;
            }
            const data = await response.json();
            if (data?.success && data?.ctc_data) return data.ctc_data;
            alert(data?.message || `Không tìm thấy dữ liệu CTC (ID: ${id}).`);
            return null;
        } catch (error) {
            console.error(`Lỗi tải CTC (ID: ${id}):`, error);
            alert(`Lỗi tải CTC: ${error.message}`);
            return null;
        }
    };

    const renderMaterialRow = (material, index, editable) => {
        const row = document.createElement('tr');
        const chiTietNguyenLieuDbId = material.id || material.db_id;

        row.dataset.materialRowUiId = chiTietNguyenLieuDbId || `new_${Date.now()}_${index}`;
        if (chiTietNguyenLieuDbId) row.dataset.originalMaterialDbId = chiTietNguyenLieuDbId;

        const inputState = editable ? '' : 'disabled';
        const defaults = editable ? { nuoc_xuat_xu: 'Việt Nam', so_ban_khai_bao: 'Phụ lục II' } : {};
        
        // Cố gắng lấy ID nguyên liệu nếu có, nếu không thì dùng tên để tạo dropdown
        const selectedMaterialForDropdown = material.id_nguyen_lieu || material.ten_nguyen_lieu;
        const maHs = getValue(material.ma_hs);
        const ngayKeBTM = getValue(material.ngay_ke_bang_thu_mua); // Không cần set default ''
        const ngayKeWO = formatDateForInput(material.ngay_bang_ke_wo);
        const nuocXx = getValue(material.nuoc_xuat_xu, defaults.nuoc_xuat_xu);
        const soKb = getValue(material.so_ban_khai_bao, defaults.so_ban_khai_bao);

        const selectedProductId = fields.id_san_pham?.value;
        const availableMaterials = selectedProductId ? getMaterialsForProductFromProductData(selectedProductId) : [];
        const materialDropdownHtml = createMaterialDropdown(selectedMaterialForDropdown, `material_${index}_id_nguyen_lieu`, !editable, availableMaterials);

        row.innerHTML = `
            <td class="text-center">${index + 1}</td>
            <td>${materialDropdownHtml}</td>
            <td><input type="text" class="form-control form-control-sm" value="${maHs}" name="material_${index}_ma_hs" readonly ${inputState}></td>
            <td><input type="number" step="any" class="form-control form-control-sm material-don-gia" value="${getValue(material.don_gia)}" name="material_${index}_don_gia" ${inputState}></td>
            <td><input type="number" step="any" class="form-control form-control-sm material-dinh-muc" value="${getValue(material.dinh_muc_san_pham_hao_hut)}" name="material_${index}_dinh_muc" ${inputState}></td>
            <td><input type="number" step="any" class="form-control form-control-sm material-thanh-tien" value="${getValue(material.thanh_tien_co_xuat_xu_field)}" name="material_${index}_tt_co_xx" ${inputState}></td>
            <td><input type="number" step="any" class="form-control form-control-sm material-thanh-tien" value="${getValue(material.thanh_tien_khong_xuat_xu_field)}" name="material_${index}_tt_khong_xx" ${inputState}></td>
            <td><input type="text" class="form-control form-control-sm" value="${nuocXx}" name="material_${index}_nuoc_xx" ${inputState}></td>
            <td><input type="text" class="form-control form-control-sm" value="${ngayKeBTM}" name="material_${index}_ngay_btm" ${inputState}></td>
            <td><input type="text" class="form-control form-control-sm" value="${soKb}" name="material_${index}_so_kb" ${inputState}></td>
            <td><input type="date" class="form-control form-control-sm" value="${ngayKeWO}" name="material_${index}_ngay_wo" ${inputState}></td>
            <td><textarea class="form-control form-control-sm" name="material_${index}_ghi_chu" ${inputState}>${getValue(material.ghi_chu)}</textarea></td>
            <td class="material-action-cell">${editable ? `<button type="button" class="btn btn-sm btn-danger delete-material-btn"><i class="fas fa-trash"></i></button>` : ''}</td>
        `;
        return row;
    };

    const populateModal = async (ctcData, mode = 'view') => {
        if (!ctcData) return;
        currentCtcId = ctcData.id_bang_ke_ctc;
        const isCreatingNew = !currentCtcId;

        modalTitle.textContent = (mode === 'edit' && isCreatingNew) ? 'Thêm mới Bảng kê CTC' : `Chi tiết Bảng kê CTC - ID: ${currentCtcId || 'MỚI'}`;

        populateLenhSanXuatDropdown(ctcData.id_lenh_san_xuat_id);
        const productIdToSelect = ctcData.id_san_pham_actual_id || ctcData.id_san_pham?.id_san_pham;
        
        let autoFilledSoLuong = getValue(ctcData.so_luong);

        if (ctcData.id_lenh_san_xuat_id) {
            populateProductDropdown(ctcData.id_lenh_san_xuat_id, productIdToSelect);
            if (productIdToSelect && fields.id_san_pham) {
                const selectedOption = Array.from(fields.id_san_pham.options).find(opt => opt.value == productIdToSelect); // Dùng == để so sánh số và chuỗi
                if (selectedOption) {
                    fields.id_san_pham.value = productIdToSelect;
                    fields.ma_hs.value = selectedOption.dataset.maHs || '';
                    fields.don_vi_tinh.value = selectedOption.dataset.dvt || '';
                    if (selectedOption.dataset.soLuongSp) autoFilledSoLuong = selectedOption.dataset.soLuongSp;
                }
            }
        } else {
            populateProductDropdown();
        }
        
        fields.so_luong.value = autoFilledSoLuong;
        fields.tri_gia_fob.value = getValue(ctcData.tri_gia_fob);
        fields.so_to_hai_quan.value = getValue(ctcData.so_to_hai_quan);

        if (typeof ctcData.id_san_pham === 'object' && ctcData.id_san_pham) {
            if (!fields.ma_hs.value) fields.ma_hs.value = ctcData.id_san_pham.ma_hs || '';
            if (!fields.don_vi_tinh.value) fields.don_vi_tinh.value = ctcData.id_san_pham.don_vi_tinh || '';
        } else if (!productIdToSelect) {
            fields.ma_hs.value = '';
            fields.don_vi_tinh.value = '';
        }

        setModalMode(mode === 'edit');
        resetMaterialTable();

        const materials = ctcData.chi_tiet_nguyen_lieu || [];
        if (materials.length > 0) {
            if (emptyMaterialRow && materialTableBody.contains(emptyMaterialRow)) materialTableBody.removeChild(emptyMaterialRow);
            materials.forEach((material, index) => {
                materialTableBody.appendChild(renderMaterialRow(material, index, isEditMode));
            });
            updateMaterialTableDisplay();
        }
        openModal();
    };

    const updateExistingMaterialRowsWithApiData = () => {
        if (!materialTableBody || !ctcCreateApiData || !isEditMode) return;

        materialTableBody.querySelectorAll('tr:not(#emptyMaterialRow)').forEach(row => {
            const materialSelect = row.querySelector('.material-select');
            if (!materialSelect?.value) return;
            
            const selectedOption = materialSelect.options[materialSelect.selectedIndex];
            const materialId = selectedOption?.value; // Lấy value (ID) của option
            if (!materialId) return;

            const ngayBtmInput = row.querySelector('input[name$="_ngay_btm"]');
            if (ngayBtmInput && ctcCreateApiData.bang_ke_thu_mua && ctcCreateApiData.bang_ke_thu_mua.hasOwnProperty(materialId)) {
                ngayBtmInput.value = ctcCreateApiData.bang_ke_thu_mua[materialId] || '';
            }

            const ngayWoInput = row.querySelector('input[name$="_ngay_wo"]');
            if (ngayWoInput && ctcCreateApiData.bang_ke_wo && ctcCreateApiData.bang_ke_wo.hasOwnProperty(materialId)) {
                const woDate = ctcCreateApiData.bang_ke_wo[materialId];
                ngayWoInput.value = woDate ? formatDateForInput(woDate) : '';
            }
        });
    };

    const calculateThanhTien = (row) => {
        const donGia = parseFloat(row.querySelector('input[name$="_don_gia"]')?.value) || 0;
        const dinhMuc = parseFloat(row.querySelector('input[name$="_dinh_muc"]')?.value) || 0;
        const thanhTien = (donGia * dinhMuc).toFixed(2);
        
        const ttCoXxInput = row.querySelector('input[name$="_tt_co_xx"]');
        if (ttCoXxInput) ttCoXxInput.value = thanhTien;
        const ttKhongXxInput = row.querySelector('input[name$="_tt_khong_xx"]');
        if (ttKhongXxInput) ttKhongXxInput.value = thanhTien;
    };

    // --- 7. XỬ LÝ SỰ KIỆN CHÍNH ---
    const handleFilter = () => {
        if (!filterSelectBox || !mainTableBody) return;
        const selectedValue = filterSelectBox.value.trim();
        const rows = Array.from(mainTableBody.querySelectorAll('tr'));
        const emptyRow = mainTableBody.querySelector('tr .empty-message')?.closest('tr');
        let visibleCount = 0;
        rows.forEach(row => {
            if (row === emptyRow) return;
            const code = row.cells[1]?.textContent.trim() || '';
            const shouldShow = !selectedValue || code === selectedValue;
            row.style.display = shouldShow ? '' : 'none';
            if (shouldShow) visibleCount++;
        });
        if (emptyRow) emptyRow.style.display = visibleCount === 0 ? 'table-row' : 'none';
    };

    const handleMainTableActions = async (e) => {
        const button = e.target.closest('button.btn[data-id]');
        if (!button) return;
        const ctcId = button.dataset.id;

        if (button.classList.contains('delete-btn')) {
            if (!confirm(`Bạn chắc chắn muốn xóa CTC ID: ${ctcId}?`)) return;
            try {
                const response = await fetch(`/api/ctc/${ctcId}/delete/`, { method: 'DELETE', headers: { 'X-CSRFToken': getCsrfToken() } });
                if (response.ok) { alert('Xóa thành công!'); window.location.reload(); }
                else { const err = await response.json(); alert(`Xóa thất bại: ${err.detail || err.message || response.statusText}`); }
            } catch (error) { console.error('Lỗi xóa CTC:', error); alert(`Lỗi: ${error.message}`); }
            return;
        }

        const ctcData = await fetchCtcDetails(ctcId);
        if (ctcData) {
            const mode = button.classList.contains('edit-btn') ? 'edit' : 'view';
            await populateModal(ctcData, mode);
            if (mode === 'edit' && fields.id_lenh_san_xuat.value) {
                await fetchCtcCreateData(fields.id_lenh_san_xuat.value);
            }
        } else {
            console.warn(`Không tải được dữ liệu cho CTC ID: ${ctcId}.`);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const payload = {
            id_bang_ke_ctc: currentCtcId,
            id_lenh_san_xuat_id: fields.id_lenh_san_xuat.value,
            id_san_pham_id: fields.id_san_pham.value,
            so_to_hai_quan: fields.so_to_hai_quan.value,
            so_luong: cleanValue(fields.so_luong.value),
            tri_gia_fob: cleanValue(fields.tri_gia_fob.value),
            chi_tiet_nguyen_lieu: Array.from(materialTableBody.querySelectorAll('tr:not(#emptyMaterialRow)')).map((row, index) => {
                const getMaterialInputValue = (nameSuffix) => row.querySelector(`[name="material_${index}_${nameSuffix}"]`)?.value;
                const selectedMaterialOption = row.querySelector(`[name="material_${index}_id_nguyen_lieu"]`)?.selectedOptions[0]; // Lấy option đã chọn
                const chiTietId = row.dataset.originalMaterialDbId ? parseInt(row.dataset.originalMaterialDbId, 10) : null;
                return {
                    id: chiTietId,
                    id_nguyen_lieu: cleanValue(selectedMaterialOption?.value), // Lưu ID
                    ten_nguyen_lieu: selectedMaterialOption?.dataset.name || getMaterialInputValue('ten_nguyen_lieu'), // Nếu không có ID, có thể vẫn lưu tên
                    ma_hs: getMaterialInputValue('ma_hs'),
                    don_gia: cleanValue(getMaterialInputValue('don_gia')),
                    dinh_muc_san_pham_hao_hut: cleanValue(getMaterialInputValue('dinh_muc')),
                    thanh_tien_co_xuat_xu_field: cleanValue(getMaterialInputValue('tt_co_xx')),
                    thanh_tien_khong_xuat_xu_field: cleanValue(getMaterialInputValue('tt_khong_xx')),
                    nuoc_xuat_xu: cleanValue(getMaterialInputValue('nuoc_xx')),
                    ngay_ke_bang_thu_mua: cleanValue(getMaterialInputValue('ngay_btm')),
                    so_ban_khai_bao: cleanValue(getMaterialInputValue('so_kb')),
                    ngay_bang_ke_wo: getMaterialInputValue('ngay_wo'),
                    ghi_chu: cleanValue(getMaterialInputValue('ghi_chu'))
                };
            })
        };

        try {
            const url = currentCtcId ? `/api/ctc/${currentCtcId}/update/` : '/api/ctc/create/';
            const method = currentCtcId ? 'PUT' : 'POST';
            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() }, body: JSON.stringify(payload) });
            const result = await response.json();
            if (response.ok) {
                alert(result.message || 'Lưu thành công!');
                closeModal();
                window.location.reload();
            } else {
                alert(`Lưu thất bại: ${result.detail || result.message || response.statusText}`);
            }
        } catch (error) {
            console.error('Lỗi lưu CTC:', error);
            alert(`Lỗi khi lưu: ${error.message}`);
        }
    };

    // Hàm chung để tính định mức và điền các trường liên quan
    const fillMaterialRowData = (rowElement, materialDetails, isNewRow = true) => {
        if (!materialDetails) return;

        const maHsInput = rowElement.querySelector('input[name$="_ma_hs"]');
        const dinhMucInput = rowElement.querySelector('input[name$="_dinh_muc"]');
        const ngayBtmInput = rowElement.querySelector('input[name$="_ngay_btm"]');
        const ngayWoInput = rowElement.querySelector('input[name$="_ngay_wo"]');

        if (maHsInput) maHsInput.value = materialDetails.ma_hs || '';

        // Tính định mức SP hao hụt
        const tyLeThuHoi = parseFloat(materialDetails.ty_le_thu_hoi) || 1;
        const soLuongNVL = parseFloat(materialDetails.so_luong_nguyen_vat_lieu) || 0;
        const dinhMuc = (tyLeThuHoi !== 0 ? (soLuongNVL / tyLeThuHoi) : 0).toFixed(4);
        if (dinhMucInput) dinhMucInput.value = dinhMuc;

        // Điền ngày BTM/WO nếu có ctcCreateApiData
        if (ctcCreateApiData && isEditMode) {
            const materialId = materialDetails.id_san_pham || materialDetails.id;
            if (materialId) {
                if (ngayBtmInput && ctcCreateApiData.bang_ke_thu_mua && ctcCreateApiData.bang_ke_thu_mua.hasOwnProperty(materialId)) {
                    ngayBtmInput.value = ctcCreateApiData.bang_ke_thu_mua[materialId] || '';
                }
                if (ngayWoInput && ctcCreateApiData.bang_ke_wo && ctcCreateApiData.bang_ke_wo.hasOwnProperty(materialId)) {
                    const woDate = ctcCreateApiData.bang_ke_wo[materialId];
                    ngayWoInput.value = woDate ? formatDateForInput(woDate) : '';
                }
            }
        }

        calculateThanhTien(rowElement);
    };

    const handleAddMaterialManual = () => {
        if (!isEditMode || !materialTableBody) return;
        const newIndex = materialTableBody.querySelectorAll('tr:not(#emptyMaterialRow)').length;
        const newRowData = { 
            ma_hs: '', 
            ngay_ke_bang_thu_mua: '', 
            ngay_bang_ke_wo: '', 
            nuoc_xuat_xu: 'Việt Nam', 
            so_ban_khai_bao: 'Phụ lục II',
            // Để trống id_nguyen_lieu và ten_nguyen_lieu để người dùng chọn
            // Đặt các giá trị mặc định cho các trường cần thiết
            don_gia: 0,
            dinh_muc_san_pham_hao_hut: 0,
            thanh_tien_co_xuat_xu_field: 0,
            thanh_tien_khong_xuat_xu_field: 0,
            ghi_chu: ''
        };
        const newRowElement = renderMaterialRow(newRowData, newIndex, true);
        if (emptyMaterialRow && emptyMaterialRow.style.display !== 'none' && materialTableBody.contains(emptyMaterialRow)) {
            materialTableBody.removeChild(emptyMaterialRow);
        }
        materialTableBody.appendChild(newRowElement);
        updateMaterialTableDisplay();
    };

    const handleDeleteMaterial = (e) => {
        const btn = e.target.closest('.delete-material-btn');
        if (!btn || !isEditMode || !materialTableBody) return;
        const rowToDelete = btn.closest('tr');
        if (rowToDelete && rowToDelete !== emptyMaterialRow) {
            rowToDelete.remove();
            updateMaterialTableDisplay();
            materialTableBody.querySelectorAll('tr:not(#emptyMaterialRow)').forEach((row, idx) => {
                row.cells[0].textContent = idx + 1;
                // Cập nhật lại thuộc tính 'name' cho các input/select để đảm bảo index đúng
                row.querySelectorAll('[name]').forEach(input => { 
                    input.name = input.name.replace(/material_\d+/, `material_${idx}`); 
                });
                // Cập nhật lại dataset.materialRowUiId cho các dòng còn lại
                row.dataset.materialRowUiId = `new_${Date.now()}_${idx}`; 
            });
        }
    };

    // --- 8. KHỞI TẠO VÀ GẮN SỰ KIỆN ---
    initializeData();

    const confirmCloseModal = () => {
        if (isEditMode && !confirm("Bạn có thay đổi chưa lưu. Bạn có chắc muốn đóng?")) return false;
        closeModal();
        return true;
    };

    buttons.filter?.addEventListener('click', (e) => { e.preventDefault(); handleFilter(); });
    buttons.clearFilter?.addEventListener('click', (e) => { e.preventDefault(); if (filterSelectBox) filterSelectBox.value = ''; handleFilter(); });
    mainTableBody?.addEventListener('click', handleMainTableActions);
    buttons.addCtc?.addEventListener('click', async (e) => { e.preventDefault(); await populateModal({ id_bang_ke_ctc: null, id_lenh_san_xuat_id: '', id_san_pham: {}, chi_tiet_nguyen_lieu: [] }, 'edit'); });
    buttons.closeModal?.addEventListener('click', confirmCloseModal);
    window.addEventListener('click', (e) => { if (e.target === modal) confirmCloseModal(); });
    
    buttons.toggleEdit?.addEventListener('click', async () => {
        if (currentCtcId && !isEditMode) {
            const ctcData = await fetchCtcDetails(currentCtcId);
            if (ctcData) {
                await populateModal(ctcData, 'edit');
                if (fields.id_lenh_san_xuat.value) {
                    await fetchCtcCreateData(fields.id_lenh_san_xuat.value);
                }
            }
        }
    });

    buttons.cancelEdit?.addEventListener('click', async () => { if (currentCtcId) { const d = await fetchCtcDetails(currentCtcId); if (d) await populateModal(d, 'view'); else closeModal(); } else closeModal(); });
    buttons.save?.addEventListener('click', handleSave);
    buttons.addMaterial?.addEventListener('click', handleAddMaterialManual);

    const handleExport = async (button, format) => {
        const originalText = button.textContent;
        try {
            button.textContent = 'Đang xuất...'; button.disabled = true;
            const ctcId = button.dataset.id;
            if (!ctcId) { alert(`Không tìm thấy ID CTC để xuất ${format}.`); return; }
            const exportUrl = `/ctc/${ctcId}/export/?format=${format}`;
            const response = await fetch(exportUrl);
            if (!response.ok) throw new Error(`Lỗi server ${response.status}`);
            if (format === 'pdf') {
                const html = await response.text();
                const printWindow = window.open('', '_blank');
                if (!printWindow) { alert('Vui lòng cho phép pop-up.'); return; }
                printWindow.document.write(html); printWindow.document.close(); printWindow.onload = () => printWindow.print();
            } else { window.location.href = exportUrl; }
        } catch (error) { console.error(`Lỗi xuất ${format}:`, error); alert(`Không thể xuất ${format}. ${error.message}`);
        } finally { setTimeout(() => { button.textContent = originalText; button.disabled = false; }, format === 'excel' ? 2000 : 500); }
    };

    buttons.exportPdf?.addEventListener('click', function() { handleExport(this, 'pdf'); });
    buttons.exportExcel?.addEventListener('click', function() { handleExport(this, 'excel'); });

    materialTableBody?.addEventListener('click', (e) => { if (e.target.closest('.delete-material-btn')) handleDeleteMaterial(e); });
    
    // Xử lý sự kiện thay đổi trên dropdown nguyên liệu
    materialTableBody?.addEventListener('change', (e) => {
        if (e.target.classList.contains('material-select') && isEditMode) {
            const select = e.target;
            const row = select.closest('tr');
            const selectedMaterialId = select.value; // Lấy ID của nguyên liệu được chọn
            const lenhSxId = fields.id_lenh_san_xuat.value;
            const productId = fields.id_san_pham.value;

            // Tìm chi tiết nguyên liệu trong productData dựa trên ID sản phẩm chính và ID nguyên liệu đã chọn
            let materialDetails = null;
            if (productId && lenhSxId && selectedMaterialId) {
                const productInfo = getProductDetails(lenhSxId, productId);
                if (productInfo?.nguyen_vat_lieu) {
                    materialDetails = Object.values(productInfo.nguyen_vat_lieu).find(m => 
                        (m.id_san_pham || m.id)?.toString() === selectedMaterialId.toString()
                    );
                }
            }
            // Nếu không tìm thấy trong productData (ví dụ: nguyên liệu thêm thủ công, không có trong định mức gốc)
            // thì thử tìm trong materialData toàn cục
            if (!materialDetails && selectedMaterialId) {
                materialDetails = materialData.find(m => 
                    (m.id_san_pham || m.id)?.toString() === selectedMaterialId.toString()
                );
            }
            
            // Cập nhật các trường liên quan
            if (row && materialDetails) {
                fillMaterialRowData(row, materialDetails, false); // isNewRow = false vì đây là thay đổi trên dòng đã tồn tại
            } else if (row) {
                 // Nếu không tìm thấy chi tiết, xóa các trường liên quan
                row.querySelector('input[name$="_ma_hs"]').value = '';
                row.querySelector('input[name$="_dinh_muc"]').value = '';
                row.querySelector('input[name$="_ngay_btm"]').value = '';
                row.querySelector('input[name$="_ngay_wo"]').value = '';
                calculateThanhTien(row);
            }
        }
    });

    materialTableBody?.addEventListener('input', (e) => {
        const target = e.target;
        if (isEditMode && (target.classList.contains('material-don-gia') || target.classList.contains('material-dinh-muc'))) {
            const row = target.closest('tr');
            if (row) calculateThanhTien(row);
        }
    });

    fields.id_lenh_san_xuat?.addEventListener('change', async function() {
        const lenhSxId = this.value;
        populateProductDropdown(lenhSxId);
        // Reset các trường liên quan đến sản phẩm
        ['id_san_pham', 'ma_hs', 'don_vi_tinh', 'so_luong'].forEach(fieldKey => { if(fields[fieldKey]) fields[fieldKey].value = ''; });
        resetMaterialTable();
        
        if (lenhSxId && isEditMode) {
            await fetchCtcCreateData(lenhSxId);
            updateExistingMaterialRowsWithApiData();
        } else {
            ctcCreateApiData = null;
        }
    });

    fields.id_san_pham?.addEventListener('change', function() {
        const selectedOpt = this.options[this.selectedIndex];
        const productId = this.value;
        const lenhSxId = fields.id_lenh_san_xuat.value;

        if (fields.ma_hs) fields.ma_hs.value = selectedOpt?.dataset.maHs || '';
        if (fields.don_vi_tinh) fields.don_vi_tinh.value = selectedOpt?.dataset.dvt || '';
        if (fields.so_luong) fields.so_luong.value = selectedOpt?.dataset.soLuongSp || '';

        resetMaterialTable();

        // Tự động điền các dòng nguyên liệu khi chọn sản phẩm chính (chỉ khi tạo mới hoặc sản phẩm thay đổi trong chế độ sửa)
        if (isEditMode && productId && materialTableBody) {
            const productDetails = getProductDetails(lenhSxId, productId);
            if (productDetails?.nguyen_vat_lieu) {
                const materialsForProduct = Object.values(productDetails.nguyen_vat_lieu);
                if (materialsForProduct.length > 0) {
                    if (emptyMaterialRow && materialTableBody.contains(emptyMaterialRow)) materialTableBody.removeChild(emptyMaterialRow);
                    materialsForProduct.forEach((nvl, index) => {
                        const newRowElement = renderMaterialRow({
                            id_nguyen_lieu: nvl.id_san_pham || nvl.id, // Đảm bảo truyền ID để chọn trong dropdown
                            ten_nguyen_lieu: nvl.ten_khac || nvl.ten_sp_chinh, 
                            ma_hs: nvl.ma_hs,
                            nuoc_xuat_xu: 'Việt Nam', 
                            so_ban_khai_bao: 'Phụ lục II',
                            don_gia: nvl.don_gia || 0, // Điền giá trị mặc định cho don_gia
                        }, index, true);
                        materialTableBody.appendChild(newRowElement);
                        // Sau khi render row, tìm lại materialDetails để điền các trường khác
                        fillMaterialRowData(newRowElement, nvl, true); 
                    });
                }
            }
        }
        updateMaterialTableDisplay();
    });
});