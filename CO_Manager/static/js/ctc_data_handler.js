// ===== DATA HANDLING AND API FUNCTIONS =====

// ===== DATA GETTERS =====

const getProductsForLenhSanXuat = (lenhSxId) => productData?.[lenhSxId] || [];

const initializeExistingCtcData = () => {
    const ctcRows = document.querySelectorAll('.standard-table tbody tr[data-lenh-sx-id]');
    existingCtcProductIds.clear();
    ctcRows.forEach(row => {
        const lenhSxId = row.dataset.lenhSxId;
        const sanPhamId = row.dataset.sanPhamId;
        if (lenhSxId && sanPhamId) {
            existingCtcProductIds.add(`${lenhSxId}_${sanPhamId}`);
        }
    });
};

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

// ===== API FUNCTIONS =====

const fetchCtcCreateData = async (lenhSxId) => {
    ctcCreateApiData = null; // Reset and make it flexible
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
            ctcCreateApiData = result.data; // Assign the whole data object
        } else {
            console.warn('API get_data_for_ctc_create không thành công hoặc thiếu data:', result.message);
        }
    } catch (error) {
        console.error('Lỗi gọi API get_data_for_ctc_create:', error);
    }
};

const fetchCtcDetails = async (id) => {
    if (!id) return null;
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

// ===== DROPDOWN POPULATION =====

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
    let productOptions = [];
    if (lenhSxId) {
        const allProductsForLenh = getProductsForLenhSanXuat(lenhSxId).filter(p => p.san_pham);
        const availableProducts = allProductsForLenh.filter(pItem => {
            const productId = pItem.san_pham.id_san_pham;
            const combinationKey = `${lenhSxId}_${productId}`;
            const isTheProductOfCurrentRecord = (productId && selectedValue && productId.toString() === selectedValue.toString());
            const isAlreadyCreated = existingCtcProductIds.has(combinationKey);
            return isTheProductOfCurrentRecord || !isAlreadyCreated;
        });
        productOptions = availableProducts.map(pItem => ({
            value: pItem.san_pham.id_san_pham,
            text: pItem.san_pham.ten_khac || pItem.san_pham.ten_sp_chinh,
            dataset: { 'ma-hs': pItem.san_pham.ma_hs || '', 'dvt': pItem.san_pham.don_vi_tinh || '', 'so-luong-sp': pItem.so_luong_san_pham || '' }
        }));
    }
    populateDropdown(fields.id_san_pham, productOptions, 'value', 'text', selectedValue, 'Chọn hàng hóa');
};

// ===== MATERIAL DROPDOWN FUNCTIONS =====

const generateMaterialOptionsHtml = (materialsToUse, selectedValue, globalMaterialDataSource) => {
    let options = '<option value="">-- Chọn nguyên liệu --</option>';
    const effectiveMaterials = (materialsToUse && materialsToUse.length > 0) ? materialsToUse : globalMaterialDataSource;
    let foundMatch = false;
    const addedNames = new Set();

    effectiveMaterials.forEach(material => {
        const name = material.ten_khac || material.ten_sp_chinh || material.name || material.ten_nguyen_lieu;
        if (!name || addedNames.has(name)) return;
        addedNames.add(name);

        const id = material.id_san_pham || material.id;
        const maHs = material.ma_hs || '';
        let isSelected = selectedValue && ((id && id.toString() === selectedValue.toString()) || (!foundMatch && typeof selectedValue === 'string' && name.toLowerCase() === selectedValue.toLowerCase()));
        if (isSelected) foundMatch = true;
        options += `<option value="${id || ''}" data-name="${name}" data-mahs="${maHs}" ${isSelected ? 'selected' : ''}>${name}</option>`;
    });

    if (selectedValue && !foundMatch && typeof selectedValue === 'string' && !addedNames.has(selectedValue)) {
        options += `<option value="${selectedValue}" data-name="${selectedValue}" data-mahs="" selected>${selectedValue}</option>`;
    }
    return options;
};

const createMaterialDropdown = (selectedValue = '', fieldName = '', isDisabled = false, availableMaterials = []) => {
    const optionsHtml = generateMaterialOptionsHtml(availableMaterials, selectedValue, materialData);
    return `<select class="form-control form-control-sm material-select" name="${fieldName}" ${isDisabled ? 'disabled' : ''}>${optionsHtml}</select>`;
};

// ===== APPENDIX LOGIC =====

/**
 * [MỚI] Cập nhật ngày lập phụ lục dựa trên lựa chọn Loại Phụ Lục.
 * @param {HTMLTableRowElement} rowElement - Dòng <tr> của bảng nguyên liệu.
 */
const updateNgayLapPhuLuc = (rowElement) => {
    if (!rowElement || !ctcCreateApiData || !isEditMode) return;

    const loaiPhuLucSelect = rowElement.querySelector('select[name$="_loai_phu_luc"]');
    const ngayLapPhuLucInput = rowElement.querySelector('input[name$="_ngay_lap_phu_luc"]');
    const materialSelect = rowElement.querySelector('select[name$="_id_nguyen_lieu"]');
    
    if (!loaiPhuLucSelect || !ngayLapPhuLucInput || !materialSelect) return;

    const selectedOption = materialSelect.options[materialSelect.selectedIndex];
    const materialName = selectedOption?.dataset.name || selectedOption?.text;

    if (!materialName) {
        ngayLapPhuLucInput.value = '';
        return;
    }

    const loaiPhuLuc = loaiPhuLucSelect.value;
    const dateSource = (loaiPhuLuc === 'Phụ lục X' && ctcCreateApiData.phu_luc_x) 
        ? ctcCreateApiData.phu_luc_x 
        : ctcCreateApiData.bang_ke_wo;

    const dateRaw = (dateSource && dateSource[materialName]) ? dateSource[materialName] : null;
    ngayLapPhuLucInput.value = dateRaw ? formatDateForInput(dateRaw) : '';
};


// ===== MATERIAL ROW RENDERING =====

const renderMaterialRow = (material, index, editable) => {
    const row = document.createElement('tr');
    const chiTietNguyenLieuDbId = material.id || material.db_id;

    row.dataset.materialRowUiId = chiTietNguyenLieuDbId || `new_${Date.now()}_${index}`;
    if (chiTietNguyenLieuDbId) row.dataset.originalMaterialDbId = chiTietNguyenLieuDbId;

    const inputState = editable ? '' : 'disabled';
    const defaults = editable ? { nuoc_xuat_xu: 'Việt Nam' } : {};

    const selectedMaterialForDropdown = material.id_nguyen_lieu || material.ten_nguyen_lieu;
    const maHs = getValue(material.ma_hs);
    const ngayKeBTM = getValue(material.ngay_ke_bang_thu_mua);
    const ngayLapPhuLucValue = formatDateForInput(material.ngay_bang_ke_wo);
    const nuocXx = getValue(material.nuoc_xuat_xu, defaults.nuoc_xuat_xu);
    const loaiPhuLuc = getValue(material.so_ban_khai_bao, 'Phụ lục II');

    const selectedProductId = fields.id_san_pham?.value;
    const availableMaterials = selectedProductId ? getMaterialsForProductFromProductData(selectedProductId) : [];
    const materialDropdownHtml = createMaterialDropdown(selectedMaterialForDropdown, `material_${index}_id_nguyen_lieu`, !editable, availableMaterials);

    const loaiPhuLucDropdownHtml = `
        <select class="form-control form-control-sm loai-phu-luc-select" name="material_${index}_loai_phu_luc" ${inputState}>
            <option value="Phụ lục II" ${loaiPhuLuc === 'Phụ lục II' ? 'selected' : ''}>Phụ lục II</option>
            <option value="Phụ lục X" ${loaiPhuLuc === 'Phụ lục X' ? 'selected' : ''}>Phụ lục X</option>
        </select>
    `;

    row.innerHTML = `
        <td class="text-center">${index + 1}</td>
        <td>${materialDropdownHtml}</td>
        <td><input type="text" class="form-control form-control-sm" value="${maHs}" name="material_${index}_ma_hs" readonly ${inputState}></td>
        <td><input type="${editable ? 'number' : 'text'}" step="any" class="form-control form-control-sm material-don-gia" value="${editable ? getValue(material.don_gia) : formatNumber(getValue(material.don_gia), 2)}" name="material_${index}_don_gia" ${inputState}></td>
        <td><input type="${editable ? 'number' : 'text'}" step="any" class="form-control form-control-sm material-dinh-muc" value="${editable ? getValue(material.dinh_muc_san_pham_hao_hut) : formatNumber(getValue(material.dinh_muc_san_pham_hao_hut), 4)}" name="material_${index}_dinh_muc" ${inputState}></td>
        <td><input type="${editable ? 'number' : 'text'}" step="any" class="form-control form-control-sm material-thanh-tien" value="${editable ? getValue(material.thanh_tien_co_xuat_xu_field) : formatNumber(getValue(material.thanh_tien_co_xuat_xu_field), 2)}" name="material_${index}_tt_co_xx" ${inputState}></td>
        <td><input type="${editable ? 'number' : 'text'}" step="any" class="form-control form-control-sm material-thanh-tien" value="${editable ? getValue(material.thanh_tien_khong_xuat_xu_field) : formatNumber(getValue(material.thanh_tien_khong_xuat_xu_field), 2)}" name="material_${index}_tt_khong_xx" ${inputState}></td>
        <td><input type="text" class="form-control form-control-sm material-nuoc-xx" value="${nuocXx}" name="material_${index}_nuoc_xx" ${inputState}></td>
        <td><input type="text" class="form-control form-control-sm" value="${ngayKeBTM}" name="material_${index}_ngay_btm" ${inputState}></td>
        <td>${loaiPhuLucDropdownHtml}</td>
        <td><input type="date" class="form-control form-control-sm" value="${ngayLapPhuLucValue}" name="material_${index}_ngay_lap_phu_luc" ${inputState}></td>
        <td><textarea class="form-control form-control-sm" name="material_${index}_ghi_chu" ${inputState}>${getValue(material.ghi_chu)}</textarea></td>
        <td class="material-action-cell">${editable ? `<button type="button" class="btn btn-sm btn-danger delete-material-btn"><i class="fas fa-trash"></i></button>` : ''}</td>
    `;
    return row;
};

const fillMaterialRowData = (rowElement, materialDetails) => {
    if (!materialDetails) return;
    
    const maHsInput = rowElement.querySelector('input[name$="_ma_hs"]');
    if (maHsInput) maHsInput.value = materialDetails.ma_hs || '';

    const dinhMucInput = rowElement.querySelector('input[name$="_dinh_muc"]');
    const tyLeThuHoi = parseFloat(materialDetails.ty_le_thu_hoi) || 1;
    const soLuongNVL = parseFloat(materialDetails.so_luong_nguyen_vat_lieu) || 0;
    const dinhMuc = (tyLeThuHoi !== 0 ? (soLuongNVL / tyLeThuHoi) : 0);
    if (dinhMucInput) {
        dinhMucInput.value = isEditMode ? dinhMuc.toFixed(4) : formatNumber(dinhMuc, 4);
    }

    const materialName = materialDetails.ten_khac || materialDetails.ten_sp_chinh || materialDetails.name || materialDetails.ten_nguyen_lieu;
    const ngayBtmInput = rowElement.querySelector('input[name$="_ngay_btm"]');
    const ngayLapPhuLucInput = rowElement.querySelector('input[name$="_ngay_lap_phu_luc"]');

    if (ctcCreateApiData && isEditMode && materialName) {
        if (ngayBtmInput) {
            ngayBtmInput.value = ctcCreateApiData.bang_ke_thu_mua?.[materialName] || '';
        }
        updateNgayLapPhuLuc(rowElement);
    } else {
        if (ngayBtmInput) ngayBtmInput.value = '';
        if (ngayLapPhuLucInput) ngayLapPhuLucInput.value = '';
    }
    
    calculateThanhTien(rowElement);
};

const updateExistingMaterialRowsWithApiData = () => {
    if (!materialTableBody || !ctcCreateApiData || !isEditMode) return;

    materialTableBody.querySelectorAll('tr:not(#emptyMaterialRow)').forEach(row => {
        const materialSelect = row.querySelector('.material-select');
        if (!materialSelect?.value) return;

        const selectedOption = materialSelect.options[materialSelect.selectedIndex];
        const materialName = selectedOption?.dataset.name || selectedOption?.text;
        if (!materialName) return;

        const ngayBtmInput = row.querySelector('input[name$="_ngay_btm"]');
        if (ngayBtmInput && ctcCreateApiData.bang_ke_thu_mua) {
            ngayBtmInput.value = ctcCreateApiData.bang_ke_thu_mua[materialName] || '';
        }
        updateNgayLapPhuLuc(row);
    });
};

// ===== MODAL POPULATION =====

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
            const selectedOption = Array.from(fields.id_san_pham.options).find(opt => opt.value == productIdToSelect);
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
        materials.forEach((material, index) => {
            materialTableBody.appendChild(renderMaterialRow(material, index, isEditMode));
        });
    }
    updateMaterialTableDisplay();
    openModal();
};