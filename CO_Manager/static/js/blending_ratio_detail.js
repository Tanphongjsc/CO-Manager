document.addEventListener('DOMContentLoaded', function () {
    // === KHAI BÁO BIẾN VÀ DOM ELEMENTS ===
    const initialDataElement = document.getElementById('initial-data');
    if (!initialDataElement || !initialDataElement.textContent.trim()) {
        alert('Lỗi: Không thể tải dữ liệu từ server.');
        return;
    }
    let dataStore;
    try {
        dataStore = JSON.parse(initialDataElement.textContent);
    } catch (e) {
        alert('Lỗi: Dữ liệu từ server không hợp lệ.');
        return;
    }
    const pageContainer = document.getElementById('blending-ratio-detail-page');
    const editFormContainer = document.getElementById('edit-form-container');
    const previewTableBody = document.getElementById('preview-table-body');
    const materialHeaderRow = document.getElementById('material-header-row');
    const materialHeaderColspan = document.getElementById('material-header-colspan');
    const productSearchInput = document.getElementById('product-search-input');
    
    let allPossibleMaterials = [];
    let originalGrandTotal = 0;
    let highlightedIndex = null;     // Biến lưu trạng thái dòng đang được chọn

    // === CÁC HÀM TIỆN ÍCH ===
    const getCsrfToken = () => document.cookie.match(/csrftoken=([^;]+)/)?.[1] || null;
    function formatNumber(num) {
        return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(num || 0);
    }

    // Hàm để gọi API xuất dữ liệu PDF/In
    async function callExportApi(format) {
        try {
            const pk = dataStore.id_lenh_san_xuat;
            const response = await fetch(`/api/blendingratios/export/${pk}/?format=${format}`);
            if (!response.ok) throw new Error(`HTTP error ${response.status}`);
            
            const html = await response.text();
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('Vui lòng cho phép pop-up và thử lại.');
                return;
            }
            
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.onload = () => printWindow.print();

        } catch (error) {
            console.error('Lỗi khi tạo bản in:', error);
            alert('Không thể tạo bản PDF.');
        }
    }

    // === CÁC HÀM RENDER GIAO DIỆN ===
    function renderEditForm() {
        editFormContainer.innerHTML = '';
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
            productCard.dataset.itemIndex = itemIndex; // Định danh thẻ sản phẩm

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

        $('.add-material-select').select2({
            placeholder: "-- Chọn hoặc nhập để thêm NVL --",
            width: '100%',
            allowClear: true
        });
    }

    function renderPreviewTable() {
        materialHeaderColspan.setAttribute('colspan', dataStore.material_types.length);
        materialHeaderRow.innerHTML = dataStore.material_types.map(name => `<th>${name}</th>`).join('');
        previewTableBody.innerHTML = '';

        dataStore.order_items.forEach((item, index) => {
            const aggregatedMaterials = {};
            for (const material of Object.values(item.materials)) {
                aggregatedMaterials[material.name] = (aggregatedMaterials[material.name] || 0) + material.quantity;
            }
            const materialCellsHTML = dataStore.material_types.map(materialName =>
                `<td>${formatNumber(aggregatedMaterials[materialName] || 0)}</td>`
            ).join('');

            const rowHTML = `
                <tr>
                    <td>${index + 1}</td>
                    <td class="text-left col-product-name col-sticky">${item.ten_san_pham}</td>
                    <td>${item.ma_hs || ''}</td>
                    <td>${formatNumber(item.so_luong_san_pham)}</td>
                    ${materialCellsHTML}
                    <td>${formatNumber(item.total_materials)}</td>
                </tr>`;
            previewTableBody.innerHTML += rowHTML;
        });

        // Áp dụng lại highlight sau khi bảng được vẽ lại
        if (highlightedIndex !== null) {
            const targetRow = previewTableBody.querySelectorAll('tr')[highlightedIndex];
            if (targetRow) {
                targetRow.classList.add('highlighted-row');
            }
        }

        // Cập nhật và đổi màu tổng trọng lượng
        const currentTotal = dataStore.total_quantity_nguyenlieu;
        const currentTotalEl = document.getElementById('current-grand-total-value');
        const currentTotalContainer = currentTotalEl.closest('.grand-total-container');
        currentTotalEl.textContent = formatNumber(currentTotal);
        
        currentTotalContainer.style.color = ''; 
        currentTotalEl.style.backgroundColor = ''; 
        currentTotalEl.style.color = '';

        if (currentTotal > originalGrandTotal) {
            currentTotalContainer.style.color = '#E65100'; 
            currentTotalEl.style.backgroundColor = '#FFF3E0'; 
            currentTotalEl.style.color = '#E65100';
        } else if (currentTotal < originalGrandTotal) {
            currentTotalContainer.style.color = '#D32F2F'; 
            currentTotalEl.style.backgroundColor = '#FFEBEE'; 
            currentTotalEl.style.color = '#D32F2F';
        } else {
            currentTotalContainer.style.color = '#006064';
            currentTotalEl.style.backgroundColor = '#E0F7FA'; 
            currentTotalEl.style.color = '#006064';
        }
    }

    // === HÀM TÍNH TOÁN VÀ XỬ LÝ DỮ LIỆU ===
    function recalculateAllData() {
        const allUsedMaterialNames = new Set();
        dataStore.order_items.forEach(item => {
            for (const material of Object.values(item.materials)) {
                allUsedMaterialNames.add(material.name);
            }
        });
        dataStore.material_types = Array.from(allUsedMaterialNames).sort();

        dataStore.order_items.forEach(item => {
            item.total_materials = Object.values(item.materials).reduce((sum, material) => sum + material.quantity, 0);
        });
        
        const grandTotalsByName = dataStore.material_types.reduce((acc, name) => ({ ...acc, [name]: 0 }), {});
        dataStore.order_items.forEach(item => {
            for (const material of Object.values(item.materials)) {
                grandTotalsByName[material.name] += material.quantity;
            }
        });

        dataStore.totals = grandTotalsByName;
        dataStore.total_quantity_nguyenlieu = Object.values(grandTotalsByName).reduce((a, b) => a + b, 0);
        dataStore.total_quantity_sanpham = dataStore.order_items.reduce((sum, item) => sum + item.so_luong_san_pham, 0);
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
            return;
        }
        recalculateAllData();
        renderPreviewTable();
    }

    function handleContainerClick(event) {
        // Xử lý nút Xóa
        const deleteButton = event.target.closest('.delete-material-btn');
        if (deleteButton) {
            const { itemIndex, materialId } = deleteButton.dataset;
            const materialName = dataStore.order_items[itemIndex].materials[materialId]?.name || 'NVL này';
            if (confirm(`Bạn có chắc chắn muốn xóa "${materialName}" (ID: ${materialId}) khỏi sản phẩm này?`)) {
                delete dataStore.order_items[itemIndex].materials[materialId];
                recalculateAllData();
                renderEditForm();
                renderPreviewTable();
                handleProductSearch();
            }
            return;
        }

        // Xử lý Highlight
        const card = event.target.closest('.product-card');
        if (card) {
            const itemIndex = card.dataset.itemIndex;
            highlightedIndex = itemIndex; // Cập nhật trạng thái highlight

            previewTableBody.querySelectorAll('tr').forEach(row => row.classList.remove('highlighted-row'));

            if (itemIndex !== undefined) {
                const targetRow = previewTableBody.querySelectorAll('tr')[itemIndex];
                if (targetRow) {
                    targetRow.classList.add('highlighted-row');
                    targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    }
    
    $(document).on('select2:select', '.add-material-select', function(e) {
        const materialId = e.params.data.id;
        const materialName = e.params.data.text;
        const itemIndex = $(this).data('item-index');
        if (materialId && itemIndex > -1) {
            dataStore.order_items[itemIndex].materials[materialId] = { name: materialName, quantity: 0 };
            recalculateAllData();
            renderEditForm();
            renderPreviewTable();
            handleProductSearch();
        }
    });

    function handleProductSearch() {
        const searchTerm = productSearchInput.value.toLowerCase();
        document.querySelectorAll('.product-card').forEach(card => {
            const isMatch = card.dataset.productName.includes(searchTerm);
            card.style.display = isMatch ? '' : 'none';
        });
    }

    async function handleSaveChanges() {
        if (!confirm('Bạn có chắc chắn muốn lưu các thay đổi này không?')) return;

        const saveBtn = document.getElementById('save-btn');
        const pk = dataStore.id_lenh_san_xuat;
        if (!pk) {
            alert('Lỗi: Không tìm thấy mã lệnh sản xuất.');
            return;
        }
        const url = `/api/blendingratios/update_or_create/${pk}/`;
        saveBtn.disabled = true;
        saveBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Đang lưu...`;
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                body: JSON.stringify(dataStore)
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.detail || `Lỗi server: ${response.status}`);
            }
            alert('Lưu thay đổi thành công!');
            originalGrandTotal = dataStore.total_quantity_nguyenlieu;
            document.getElementById('original-grand-total-value').textContent = formatNumber(originalGrandTotal);
            renderPreviewTable();
        } catch (error) {
            alert(`Đã có lỗi xảy ra khi lưu: ${error.message}`);
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `<i class="fas fa-save"></i> Lưu thay đổi`;
        }
    }
    
    function switchToEditMode() {
        pageContainer.dataset.mode = 'edit';
        const switchToEditBtn = document.getElementById('switch-to-edit-btn');
        if (switchToEditBtn) switchToEditBtn.style.display = 'none';
        
        let saveBtn = document.getElementById('save-btn');
        if (!saveBtn) {
            const saveButtonHtml = `<button id="save-btn" class="btn btn-success"><i class="fas fa-save"></i> Lưu thay đổi</button>`;
            document.querySelector('.header-actions').insertAdjacentHTML('beforeend', saveButtonHtml);
            saveBtn = document.getElementById('save-btn');
            saveBtn.addEventListener('click', handleSaveChanges);
        }
        saveBtn.style.display = '';

        const currentUrl = new URL(window.location);
        currentUrl.searchParams.set('mode', 'edit');
        window.history.pushState({}, '', currentUrl);
    }
    
    // === HÀM KHỞI TẠO CHÍNH ===
    function init() {
        const productsDataElement = document.getElementById('products-data');
        if (productsDataElement) {
             try {
                const productsFromView = JSON.parse(productsDataElement.textContent);
                allPossibleMaterials = productsFromView.map(m => ({ id: m.id_san_pham, text: m.ten_khac })).sort((a,b) => a.text.localeCompare(b.text));
             } catch(e) { console.error("Lỗi đọc dữ liệu sản phẩm:", e); }
        }

        recalculateAllData();
        originalGrandTotal = dataStore.total_quantity_nguyenlieu;
        document.getElementById('original-grand-total-value').textContent = formatNumber(originalGrandTotal);
        
        renderEditForm();
        renderPreviewTable();
        
        // Gán các sự kiện
        editFormContainer.addEventListener('input', handleInputChange);
        editFormContainer.addEventListener('click', handleContainerClick);
        productSearchInput.addEventListener('input', handleProductSearch);
        document.getElementById('back-btn').addEventListener('click', (e) => { 
            e.preventDefault(); 
            window.location.href = '/blendingratios/'; 
        });
        document.getElementById('print-btn').addEventListener('click', () => {
            callExportApi('pdf');
        });
        document.getElementById('export-btn').addEventListener('click', () => {
            const pk = dataStore.id_lenh_san_xuat;
            if (!pk) {
                alert('Không thể xác định mã lệnh sản xuất.');
                return;
            }
            const url = `/api/blendingratios/export/${pk}/?format=excel`;
            window.location.href = url;
        });

        const switchToEditBtn = document.getElementById('switch-to-edit-btn');
        if (switchToEditBtn) {
            switchToEditBtn.addEventListener('click', switchToEditMode);
        }
        
        const saveBtn = document.getElementById('save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', handleSaveChanges);
        }
    }

    init();
});