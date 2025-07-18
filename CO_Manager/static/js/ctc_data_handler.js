// ===== DATA HANDLING AND API FUNCTIONS =====

// ===== DATA GETTERS =====

const getProductsForLenhSanXuat = (lenhSxId) => productData?.[lenhSxId] || [];


/**
 * Mới: Thu thập các cặp [Lệnh sản xuất - Sản phẩm] đã có bảng kê từ bảng chính.
 * Hàm này đọc các data-attributes đã được thêm vào ở file HTML.
 */
const initializeExistingCtcData = () => {
    const ctcRows = document.querySelectorAll('.standard-table tbody tr[data-lenh-sx-id]');
    existingCtcProductIds.clear(); // Xóa dữ liệu cũ trước khi thêm mới
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
    ctcCreateApiData = { bang_ke_thu_mua: {}, bang_ke_wo: {} };
    if (!lenhSxId) return;

    try {
        const response = await fetch('/api/get_data_for_ctc_create/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
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

const fetchCtcDetails = async (id) => {
    if (!id) {
        console.warn('fetchCtcDetails: ID rỗng.');
        return null;
    }
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
    populateDropdown(
        fields.id_lenh_san_xuat,
        Object.values(lenhSanXuatData).map(val => ({ value: val, text: val })),
        'value',
        'text',
        selectedValue,
        'Chọn lệnh sản xuất'
    );
};

const populateProductDropdown = (lenhSxId = null, selectedValue = null) => {
    let productOptions = [];
    if (lenhSxId) {
        const allProductsForLenh = getProductsForLenhSanXuat(lenhSxId).filter(p => p.san_pham);

        const availableProducts = allProductsForLenh.filter(pItem => {
            const productId = pItem.san_pham.id_san_pham;
            const combinationKey = `${lenhSxId}_${productId}`;

            // 1. Nó là sản phẩm thuộc bản ghi đang được xem hoặc sửa. (Không còn phụ thuộc vào isEditMode nữa)
            const isTheProductOfCurrentRecord = (productId && selectedValue && productId.toString() === selectedValue.toString());

            // 2. Nó là sản phẩm chưa từng được tạo Bảng kê CTC.
            const isAlreadyCreated = existingCtcProductIds.has(combinationKey);

            // => Hiển thị sản phẩm nếu nó là của bản ghi hiện tại HOẶC nó chưa được tạo.
            return isTheProductOfCurrentRecord || !isAlreadyCreated;
        });
        
        productOptions = availableProducts.map(pItem => ({
            value: pItem.san_pham.id_san_pham,
            text: pItem.san_pham.ten_khac || pItem.san_pham.ten_sp_chinh,
            dataset: {
                'ma-hs': pItem.san_pham.ma_hs || '',
                'dvt': pItem.san_pham.don_vi_tinh || '',
                'so-luong-sp': pItem.so_luong_san_pham || ''
            }
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
        if (!name || addedNames.has(name)) {
            return;
        }
        addedNames.add(name);

        const id = material.id_san_pham || material.id;
        const maHs = material.ma_hs || '';

        let isSelected = false;
        if (selectedValue) {
            if (id && id.toString() === selectedValue.toString()) {
                isSelected = true;
            } else if (!foundMatch && typeof selectedValue === 'string' && name.toLowerCase() === selectedValue.toLowerCase()) {
                isSelected = true;
            }
        }

        if (isSelected) {
            foundMatch = true;
        }
        options += `<option value="${id || ''}" data-name="${name}" data-mahs="${maHs}" ${isSelected ? 'selected' : ''}>${name}</option>`;
    });

    if (selectedValue && !foundMatch && typeof selectedValue === 'string') {
        if (!addedNames.has(selectedValue)) {
            options += `<option value="${selectedValue}" data-name="${selectedValue}" data-mahs="" selected>${selectedValue}</option>`;
        }
    }
    return options;
};

const createMaterialDropdown = (selectedValue = '', fieldName = '', isDisabled = false, availableMaterials = []) => {
    const optionsHtml = generateMaterialOptionsHtml(availableMaterials, selectedValue, materialData);
    return `<select class="form-control form-control-sm material-select" name="${fieldName}" ${isDisabled ? 'disabled' : ''}>${optionsHtml}</select>`;
};

const updateMaterialDropdowns = () => {
    if (!isEditMode || !materialTableBody) return;
    const selectedProductId = fields.id_san_pham?.value;
    const availableMaterials = selectedProductId ? getMaterialsForProductFromProductData(selectedProductId) : [];
    materialTableBody.querySelectorAll('.material-select').forEach(select => {
        const currentSelectedMaterialId = select.value;
        select.innerHTML = generateMaterialOptionsHtml(availableMaterials, currentSelectedMaterialId, materialData);
    });
};

// ===== MATERIAL ROW RENDERING =====

const renderMaterialRow = (material, index, editable) => {
    const row = document.createElement('tr');
    const chiTietNguyenLieuDbId = material.id || material.db_id;

    row.dataset.materialRowUiId = chiTietNguyenLieuDbId || `new_${Date.now()}_${index}`;
    if (chiTietNguyenLieuDbId) row.dataset.originalMaterialDbId = chiTietNguyenLieuDbId;

    const inputState = editable ? '' : 'disabled';
    const defaults = editable ? { nuoc_xuat_xu: 'Việt Nam', so_ban_khai_bao: 'Phụ lục II' } : {};

    const selectedMaterialForDropdown = material.id_nguyen_lieu || material.ten_nguyen_lieu;
    const maHs = getValue(material.ma_hs);
    const ngayKeBTM = getValue(material.ngay_ke_bang_thu_mua);
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
        <td><input type="${editable ? 'number' : 'text'}" step="any" class="form-control form-control-sm material-don-gia" value="${editable ? getValue(material.don_gia) : formatNumber(getValue(material.don_gia), 2)}" name="material_${index}_don_gia" ${inputState}></td>
        <td><input type="${editable ? 'number' : 'text'}" step="any" class="form-control form-control-sm material-dinh-muc" value="${editable ? getValue(material.dinh_muc_san_pham_hao_hut) : formatNumber(getValue(material.dinh_muc_san_pham_hao_hut), 4)}" name="material_${index}_dinh_muc" ${inputState}></td>
        <td><input type="${editable ? 'number' : 'text'}" step="any" class="form-control form-control-sm material-thanh-tien" value="${editable ? getValue(material.thanh_tien_co_xuat_xu_field) : formatNumber(getValue(material.thanh_tien_co_xuat_xu_field), 2)}" name="material_${index}_tt_co_xx" ${inputState}></td>
        <td><input type="${editable ? 'number' : 'text'}" step="any" class="form-control form-control-sm material-thanh-tien" value="${editable ? getValue(material.thanh_tien_khong_xuat_xu_field) : formatNumber(getValue(material.thanh_tien_khong_xuat_xu_field), 2)}" name="material_${index}_tt_khong_xx" ${inputState}></td>
        <td><input type="text" class="form-control form-control-sm material-nuoc-xx" value="${nuocXx}" name="material_${index}_nuoc_xx" ${inputState}></td>
        <td><input type="text" class="form-control form-control-sm" value="${ngayKeBTM}" name="material_${index}_ngay_btm" ${inputState}></td>
        <td><input type="text" class="form-control form-control-sm" value="${soKb}" name="material_${index}_so_kb" ${inputState}></td>
        <td><input type="date" class="form-control form-control-sm" value="${ngayKeWO}" name="material_${index}_ngay_wo" ${inputState}></td>
        <td><textarea class="form-control form-control-sm" name="material_${index}_ghi_chu" ${inputState}>${getValue(material.ghi_chu)}</textarea></td>
        <td class="material-action-cell">${editable ? `<button type="button" class="btn btn-sm btn-danger delete-material-btn"><i class="fas fa-trash"></i></button>` : ''}</td>
    `;
    return row;
};

const fillMaterialRowData = (rowElement, materialDetails, isNewRow = true) => {
    if (!materialDetails) return;

    const maHsInput = rowElement.querySelector('input[name$="_ma_hs"]');
    const dinhMucInput = rowElement.querySelector('input[name$="_dinh_muc"]');
    const ngayBtmInput = rowElement.querySelector('input[name$="_ngay_btm"]');
    const ngayWoInput = rowElement.querySelector('input[name$="_ngay_wo"]');

    if (maHsInput) maHsInput.value = materialDetails.ma_hs || '';

    const tyLeThuHoi = parseFloat(materialDetails.ty_le_thu_hoi) || 1;
    const soLuongNVL = parseFloat(materialDetails.so_luong_nguyen_vat_lieu) || 0;
    const dinhMuc = (tyLeThuHoi !== 0 ? (soLuongNVL / tyLeThuHoi) : 0);
    if (dinhMucInput) {
        dinhMucInput.value = isEditMode ? dinhMuc.toFixed(4) : formatNumber(dinhMuc, 4);
        if (!isEditMode) dinhMucInput.setAttribute('value', formatNumber(dinhMuc, 4));
    }

    if (ctcCreateApiData && isEditMode) {
        const materialName = materialDetails.ten_khac || materialDetails.ten_sp_chinh || materialDetails.name || materialDetails.ten_nguyen_lieu;

        const btmDate = (materialName && ctcCreateApiData.bang_ke_thu_mua?.[materialName]) || '';
        if (ngayBtmInput) {
            ngayBtmInput.value = btmDate;
        }

        const woDateRaw = (materialName && ctcCreateApiData.bang_ke_wo?.[materialName]) || null;
        if (ngayWoInput) {
            ngayWoInput.value = woDateRaw ? formatDateForInput(woDateRaw) : '';
        }
    } else {
        if (ngayBtmInput) ngayBtmInput.value = '';
        if (ngayWoInput) ngayWoInput.value = '';
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
        if (ngayBtmInput && ctcCreateApiData.bang_ke_thu_mua && ctcCreateApiData.bang_ke_thu_mua.hasOwnProperty(materialName)) {
            ngayBtmInput.value = ctcCreateApiData.bang_ke_thu_mua[materialName] || '';
        }

        const ngayWoInput = row.querySelector('input[name$="_ngay_wo"]');
        if (ngayWoInput && ctcCreateApiData.bang_ke_wo && ctcCreateApiData.bang_ke_wo.hasOwnProperty(materialName)) {
            const woDate = ctcCreateApiData.bang_ke_wo[materialName];
            ngayWoInput.value = woDate ? formatDateForInput(woDate) : '';
        }
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
        if (emptyMaterialRow && materialTableBody.contains(emptyMaterialRow)) materialTableBody.removeChild(emptyMaterialRow);
        materials.forEach((material, index) => {
            materialTableBody.appendChild(renderMaterialRow(material, index, isEditMode));
        });
        updateMaterialTableDisplay();
    }
    openModal();
};
