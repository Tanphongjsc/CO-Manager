// blending_ratios_create.js (Phiên bản hoàn chỉnh)

document.addEventListener('DOMContentLoaded', function () {
    // === KHAI BÁO CÁC BIẾN VÀ DOM ELEMENTS ===
    const lsxSelect = document.getElementById('lsx-select');
    const mainContentWrapper = document.getElementById('main-content-wrapper');
    const noDataPlaceholder = document.getElementById('no-data-placeholder');
    const loadingSpinner = document.getElementById('loading-spinner');
    const editFormContainer = document.getElementById('edit-form-container');
    const previewTableBody = document.getElementById('preview-table-body');
    const materialHeaderRow = document.getElementById('material-header-row');
    const materialHeaderColspan = document.getElementById('material-header-colspan');
    const productSearchInput = document.getElementById('product-search-input');
    const currentLsxIdSpan = document.getElementById('current-lsx-id');
    const saveBtn = document.getElementById('save-btn');

    let dataStore = {};
    let allPossibleMaterials = [];
    let originalGrandTotal = 0;

    // === CÁC HÀM TIỆN ÍCH ===
    const getCsrfToken = () => document.cookie.match(/csrftoken=([^;]+)/)?.[1] || null;
    const formatNumber = (num) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(num || 0);

    // === CÁC HÀM RENDER, TÍNH TOÁN (ĐỒNG BỘ LOGIC VỚI TRANG DETAIL) ===
    function renderEditForm() {
        editFormContainer.innerHTML = '';
        if (!dataStore.order_items) return;
        dataStore.order_items.forEach((item, itemIndex) => {
            const materialsHTML = Object.entries(item.materials)
                .map(([materialId, materialData]) => `
                    <div class="input-row">
                        <label>${materialData.name}</label>
                        <div class="input-group">
                            <input type="number" step="any" value="${materialData.quantity}"
                                   data-item-index="${itemIndex}" data-material-id="${materialId}" class="material-input">
                            <button class="delete-material-btn" title="Xóa nguyên vật liệu này" 
                                    data-item-index="${itemIndex}" data-material-id="${materialId}">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                `).join('');
            
            const availableMaterials = allPossibleMaterials.filter(m => !item.materials.hasOwnProperty(m.id));
            const optionsHTML = availableMaterials.map(m => `<option value="${m.id}">${m.text}</option>`).join('');

            const productCard = document.createElement('div');
            productCard.className = 'product-card';
            productCard.dataset.productName = item.ten_san_pham.toLowerCase();
            productCard.innerHTML = `
                <div class="product-header">
                    <span class="product-stt">${itemIndex + 1}</span>
                    <span class="product-name-text">${item.ten_san_pham}</span>
                </div>
                <div class="input-row">
                    <label>Số lượng sản phẩm</label>
                    <div class="input-group">
                        <input type="number" step="any" value="${item.so_luong_san_pham}"
                               data-item-index="${itemIndex}" class="product-quantity-input">
                    </div>
                </div>
                <div class="materials-list">${materialsHTML}</div>
                <div class="add-material-container">
                    ${availableMaterials.length > 0 ? `
                        <select class="add-material-select" data-item-index="${itemIndex}">
                            <option></option>
                            ${optionsHTML}
                        </select>
                    ` : '<p class="text-muted small">Đã dùng hết các loại NVL.</p>'}
                </div>
                <div class="notes-container">
                    <label>Ghi chú</label>
                    <textarea class="product-notes-input" data-item-index="${itemIndex}" rows="2">${item.ghi_chu || ''}</textarea>
                </div>
            `;
            editFormContainer.appendChild(productCard);
        });
        $('.add-material-select').select2({ placeholder: "-- Chọn để thêm NVL --", width: '100%', allowClear: true });
    }

    function renderPreviewTable() {
        dataStore.material_types = dataStore.material_types || [];
        materialHeaderColspan.setAttribute('colspan', dataStore.material_types.length);
        materialHeaderRow.innerHTML = dataStore.material_types.map(name => `<th>${name}</th>`).join('');

        previewTableBody.innerHTML = '';
        if (!dataStore.order_items) return;
        dataStore.order_items.forEach((item, index) => {
            const aggregatedMaterials = {};
            Object.values(item.materials).forEach(material => {
                aggregatedMaterials[material.name] = (aggregatedMaterials[material.name] || 0) + material.quantity;
            });
            const materialCellsHTML = dataStore.material_types.map(materialName => `<td>${formatNumber(aggregatedMaterials[materialName] || 0)}</td>`).join('');
            
            previewTableBody.innerHTML += `
                <tr>
                    <td>${index + 1}</td>
                    <td class="text-left col-product-name col-sticky">${item.ten_san_pham}</td>
                    <td>${item.ma_hs || ''}</td>
                    <td>${formatNumber(item.so_luong_san_pham)}</td>
                    ${materialCellsHTML}
                    <td>${formatNumber(item.total_materials)}</td>
                </tr>`;
        });
        
        // LOGIC THAY ĐỔI MÀU SẮC
        const currentTotal = dataStore.total_quantity_nguyenlieu;
        const currentTotalEl = document.getElementById('current-grand-total-value');
        const currentTotalContainer = currentTotalEl.closest('.grand-total-container');
        currentTotalEl.textContent = formatNumber(currentTotal);
        
        currentTotalContainer.style.color = '';
        currentTotalEl.style.backgroundColor = ''; 
        currentTotalEl.style.color = '';

        if (currentTotal > originalGrandTotal) {
            currentTotalContainer.style.color = '#E65100'; // Orange
            currentTotalEl.style.backgroundColor = '#FFF3E0';
            currentTotalEl.style.color = '#E65100';
        } else if (currentTotal < originalGrandTotal) {
            currentTotalContainer.style.color = '#D32F2F'; // Red
            currentTotalEl.style.backgroundColor = '#FFEBEE';
            currentTotalEl.style.color = '#D32F2F';
        } else {
            currentTotalContainer.style.color = '#006064'; // Green/Cyan
            currentTotalEl.style.backgroundColor = '#E0F7FA';
            currentTotalEl.style.color = '#006064';
        }
    }

    function recalculateAllData() {
        const allUsedMaterialNames = new Set();
        if (!dataStore.order_items) return;
        
        dataStore.order_items.forEach(item => {
            Object.values(item.materials).forEach(material => allUsedMaterialNames.add(material.name));
        });
        dataStore.material_types = Array.from(allUsedMaterialNames).sort();
        
        let totalNguyenLieu = 0;
        let totalSanPham = 0;
        
        dataStore.order_items.forEach(item => {
            item.total_materials = Object.values(item.materials).reduce((sum, material) => sum + (material.quantity || 0), 0);
            totalNguyenLieu += item.total_materials;
            totalSanPham += item.so_luong_san_pham;
        });

        dataStore.total_quantity_nguyenlieu = totalNguyenLieu;
        dataStore.total_quantity_sanpham = totalSanPham;
    }

    // === CÁC HÀM XỬ LÝ SỰ KIỆN ===
    function handleInputChange(event) {
        const target = event.target;
        if (!target.matches('.product-quantity-input, .material-input, .product-notes-input')) return;
        const itemIndex = target.dataset.itemIndex;
        if (itemIndex === undefined) return;

        if (target.classList.contains('product-quantity-input')) {
            dataStore.order_items[itemIndex].so_luong_san_pham = parseFloat(target.value) || 0;
        } else if (target.classList.contains('material-input')) {
            const materialId = target.dataset.materialId;
            if (dataStore.order_items[itemIndex].materials[materialId]) {
                dataStore.order_items[itemIndex].materials[materialId].quantity = parseFloat(target.value) || 0;
            }
        } else if (target.classList.contains('product-notes-input')) {
            dataStore.order_items[itemIndex].ghi_chu = target.value;
            return; // Không cần tính toán lại khi chỉ thay đổi ghi chú
        }
        recalculateAllData();
        renderPreviewTable();
    }

    function handleContainerClick(event) {
        const deleteButton = event.target.closest('.delete-material-btn');
        if (!deleteButton) return;
        const { itemIndex, materialId } = deleteButton.dataset;
        const materialName = dataStore.order_items[itemIndex].materials[materialId]?.name || 'NVL này';
        if (confirm(`Bạn có chắc muốn xóa "${materialName}" khỏi sản phẩm này?`)) {
            delete dataStore.order_items[itemIndex].materials[materialId];
            recalculateAllData();
            renderEditForm();
            renderPreviewTable();
            handleProductSearch();
        }
    }
    
    $(document).on('select2:select', '.add-material-select', function(e) {
        const materialId = e.params.data.id;
        const itemIndex = $(this).data('item-index');
        const selectedMaterial = allPossibleMaterials.find(m => m.id == materialId);
        if (selectedMaterial && itemIndex > -1) {
            dataStore.order_items[itemIndex].materials[materialId] = { name: selectedMaterial.text, quantity: 0 };
            recalculateAllData();
            renderEditForm();
            renderPreviewTable();
            handleProductSearch();
        }
    });

    function handleProductSearch() {
        if(!productSearchInput) return;
        const searchTerm = productSearchInput.value.toLowerCase().trim();
        document.querySelectorAll('.product-card').forEach(card => {
            const isMatch = card.dataset.productName.includes(searchTerm);
            card.style.display = isMatch ? '' : 'none';
        });
    }

    async function handleSaveChanges() {
        if (!confirm('Bạn có chắc chắn muốn lưu tỉ lệ phối trộn này không?')) return;
        
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Đang lưu...`;

        const pk = dataStore.id_lenh_san_xuat;
        const url = `/api/blendingratios/update_or_create/${pk}/`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                body: JSON.stringify(dataStore)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.detail || 'Lỗi không xác định từ server.');
            
            alert('Lưu thành công! Đang chuyển hướng về trang danh sách...');
            window.location.href = "/blendingratios/";
        } catch (error) {
            alert(`Lỗi khi lưu: ${error.message}`);
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i class="fas fa-save"></i> Lưu tỉ lệ`;
        }
    }

    // === HÀM LẤY DỮ LIỆU TỪ API ===
    async function fetchOrderData(lsxId) {
        mainContentWrapper.style.display = 'none';
        noDataPlaceholder.style.display = 'none';
        loadingSpinner.style.display = 'block';
        $(lsxSelect).prop('disabled', true);

        try {
            const response = await fetch(`/api/blendingratios/get_order_data_for_create/?lsx_id=${lsxId}`);
            const result = await response.json();

            if (!result.success) {
                throw new Error(result.detail);
            }
            
            dataStore = result.data;
            originalGrandTotal = dataStore.total_quantity_nguyenlieu || 0;
            
            initializeEditor();
            mainContentWrapper.style.display = 'block';

        } catch (error) {
            alert(`Không thể tải dữ liệu cho LSX ${lsxId}: ${error.message}`);
            noDataPlaceholder.style.display = 'block';
        } finally {
            loadingSpinner.style.display = 'none';
            $(lsxSelect).prop('disabled', false);
        }
    }

    // === HÀM KHỞI TẠO CHÍNH ===
    function initializeEditor() {
        currentLsxIdSpan.textContent = dataStore.id_lenh_san_xuat;
        document.getElementById('original-grand-total-value').textContent = formatNumber(originalGrandTotal);
        renderEditForm();
        renderPreviewTable();
    }

    function init() {
        $(lsxSelect).select2({
            placeholder: "-- Vui lòng chọn --",
            allowClear: true
        });

        const productsDataElement = document.getElementById('products-data');
        if (productsDataElement && productsDataElement.textContent) {
             try {
                const productsFromView = JSON.parse(productsDataElement.textContent);
                allPossibleMaterials = productsFromView.map(m => ({ id: m.id_san_pham, text: m.ten_khac }));
             } catch(e) { console.error("Lỗi khi đọc dữ liệu sản phẩm:", e); }
        }

        $(lsxSelect).on('change', function() {
            const selectedLsxId = this.value;
            if (selectedLsxId) {
                fetchOrderData(selectedLsxId);
            } else {
                mainContentWrapper.style.display = 'none';
                noDataPlaceholder.style.display = 'block';
            }
        });

        editFormContainer.addEventListener('input', handleInputChange);
        editFormContainer.addEventListener('click', handleContainerClick);
        productSearchInput.addEventListener('input', handleProductSearch);
        saveBtn.addEventListener('click', handleSaveChanges);

        // LOGIC TỰ ĐỘNG CHỌN KHI CÓ THAM SỐ TRÊN URL ===
        const urlParams = new URLSearchParams(window.location.search);
        const lsxIdFromUrl = urlParams.get('lsx_id');

        if (lsxIdFromUrl) {
            $(lsxSelect).val(lsxIdFromUrl);  // Cập nhật giá trị cho dropdown của Select2
            
            $(lsxSelect).trigger('change');  // Kích hoạt sự kiện 'change' để Select2 nhận giá trị mới và để hàm listener của chúng ta chạy và tải dữ liệu
        }

    }

    init();
});