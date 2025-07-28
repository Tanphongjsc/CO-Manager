// ===== CORE UTILITIES AND MODAL MANAGEMENT =====

// Global variables
let lenhSanXuatData = {};
let productData = {};
let materialData = [];
let currentCtcId = null;
let isEditMode = false;
let ctcCreateApiData = null;
let existingCtcProductIds = new Set();

// DOM element getters
const getElem = id => document.getElementById(id);
const querySel = selector => document.querySelector(selector);

// DOM elements
const modal = getElem('ctcModal');
const ctcForm = getElem('ctcForm');
const modalTitle = getElem('modalTitle');
const materialTableBody = getElem('materialTable')?.querySelector('tbody');
const emptyMaterialRow = getElem('emptyMaterialRow');
const materialCountBadge = getElem('materialCount');
const mainTableBody = querySel('.standard-table tbody');
const filterSelectBox = getElem('ctc-ma-lenh-sx-select');

// Button elements
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

// Form field elements
const fields = {
    id_lenh_san_xuat: getElem('modal_id_lenh_san_xuat'),
    id_san_pham: getElem('modal_id_san_pham'),
    ma_hs: getElem('modal_ma_hs'),
    so_luong: getElem('modal_so_luong'),
    don_vi_tinh: getElem('modal_don_vi_tinh'),
    tri_gia_fob: getElem('modal_tri_gia_fob'),
    so_to_hai_quan: getElem('modal_so_to_hai_quan')
};

// ===== UTILITY FUNCTIONS =====

const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
    } catch (e) {
        return '';
    }
};

const getCsrfToken = () => document.cookie.match(/csrftoken=([^;]+)/)?.[1] || null;

const getValue = (val, defaultVal = '') => (val !== null && val !== undefined ? val : defaultVal);

const cleanValue = (value) => {
    if (typeof value === 'string' && value.trim() === '') return null;
    const num = parseFloat(value);
    return (typeof value === 'string' && !isNaN(num) && isFinite(value)) ? num : value;
};

const formatNumber = (value, decimalPlaces = 0) => {
    if (value === null || value === undefined || isNaN(value)) {
        return '';
    }
    const num = parseFloat(value);
    if (isNaN(num)) {
        return '';
    }
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimalPlaces,
        maximumFractionDigits: decimalPlaces,
    }).format(num);
};

// ===== DATA INITIALIZATION =====

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

// ===== MODAL MANAGEMENT =====

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

// ===== MATERIAL TABLE MANAGEMENT =====

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

const calculateThanhTien = (row) => {
    // Lấy các giá trị cần thiết từ các input trong hàng
    const donGia = parseFloat(row.querySelector('input[name$="_don_gia"]')?.value) || 0;
    const dinhMuc = parseFloat(row.querySelector('input[name$="_dinh_muc"]')?.value) || 0;
    const nuocXxInput = row.querySelector('input[name$="_nuoc_xx"]');
    
    // Xử lý chuỗi đầu vào: loại bỏ khoảng trắng thừa và chuyển thành chữ thường để so sánh
    const nuocXx = (nuocXxInput?.value || '').trim().toLowerCase();
    const ttCoXxInput = row.querySelector('input[name$="_tt_co_xx"]');
    const ttKhongXxInput = row.querySelector('input[name$="_tt_khong_xx"]');
    
    // Đảm bảo các input tồn tại
    if (!ttCoXxInput || !ttKhongXxInput) return;

    // Tính giá trị thành tiền cơ bản
    const thanhTien = donGia * dinhMuc;

    // Phân bổ giá trị dựa trên nước xuất xứ
    let ttCoXxValue = 0;
    let ttKhongXxValue = 0;

    if (nuocXx === 'việt nam') {
        ttCoXxValue = thanhTien;
    } else {
        ttKhongXxValue = thanhTien;
    }

    // Cập nhật giá trị vào các ô input, giữ nguyên định dạng cho chế độ xem/sửa
    const formatValue = (value) => isEditMode ? value.toFixed(2) : formatNumber(value, 2);

    ttCoXxInput.value = formatValue(ttCoXxValue);
    ttKhongXxInput.value = formatValue(ttKhongXxValue);

    // Đảm bảo giá trị được lưu lại trong thuộc tính 'value' khi ở chế độ xem
    if (!isEditMode) {
        ttCoXxInput.setAttribute('value', formatNumber(ttCoXxValue, 2));
        ttKhongXxInput.setAttribute('value', formatNumber(ttKhongXxValue, 2));
    }
};

const confirmCloseModal = () => {
    if (isEditMode && !confirm("Bạn có thay đổi chưa lưu. Bạn có chắc muốn đóng?")) return false;
    closeModal();
    return true;
};

// Initialize data when script loads
initializeData();
