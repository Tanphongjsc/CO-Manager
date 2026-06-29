// orders.js
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('order-search-input');
    const searchBtn = document.getElementById('order-search-btn');
    const addOrderBtn = document.getElementById('add-order-btn');
    const editButtons = document.querySelectorAll('.edit-order-btn');

    // Add modal elements
    const addModal = document.getElementById('addOrderModal');
    const addCloseBtn = addModal ? addModal.querySelector('.close') : null;
    const cancelAddBtn = document.getElementById('cancel-add-order-btn');
    const addOrderForm = document.getElementById('add-order-form');
    const addProductRowBtn = document.getElementById('add-product-row-btn');
    const productList = document.getElementById('product-list');
    const dinhMucTable = document.getElementById('dinh-muc-table');

    // Edit modal elements
    const editModal = document.getElementById('editOrderModal');
    const editCloseBtn = editModal ? editModal.querySelector('.close') : null;
    const cancelEditBtn = document.getElementById('cancel-edit-order-btn');
    const editOrderForm = document.getElementById('edit-order-form');
    const editAddProductRowBtn = document.getElementById('edit-add-product-row-btn');
    const editProductList = document.getElementById('edit-product-list');
    const editDinhMucTable = document.getElementById('edit-dinh-muc-table');

    const ordersManagement = document.getElementById('orders-management');

    // Cache định mức đã fetch
    const dinhMucCache = {};

    // Lưu HTML options sản phẩm
    const initialProductSelect = productList ? productList.querySelector('.product-select') : null;
    const productOptionsHTML = initialProductSelect ? initialProductSelect.innerHTML : '<option value="">-- Chọn sản phẩm --</option>';

    // CSRF token
    function getCsrfToken() {
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1];
        return cookieValue || '';
    }

    // === Tìm kiếm ===
    if (searchBtn) searchBtn.addEventListener('click', performSearch);
    if (searchInput) searchInput.addEventListener('keypress', e => { if (e.key === 'Enter') performSearch(); });

    function performSearch() {
        const searchValue = searchInput.value.toLowerCase().trim();
        document.querySelectorAll('.standard-table tbody tr').forEach(row => {
            if (row.querySelector('.empty-message')) return;
            const cells = row.querySelectorAll('td');
            let rowText = '';
            for (let i = 0; i < cells.length - 1; i++) rowText += cells[i].textContent.toLowerCase() + ' ';
            row.style.display = rowText.includes(searchValue) ? '' : 'none';
        });
    }

    // === Helper: tạo product row ===
    function createProductRow(targetList, dinhMucTableEl) {
        const row = document.createElement('div');
        row.className = 'product-row';

        row.innerHTML = `
            <select class="form-control product-select" style="flex:2;">
                ${productOptionsHTML}
            </select>
            <input type="number" class="form-control product-qty" placeholder="Số lượng" min="0" step="0.01" style="flex:1;">
            <button type="button" class="btn btn-danger btn-remove-product" title="Xóa"><i class="fas fa-trash"></i></button>
        `;

        targetList.appendChild(row);

        row.querySelector('.product-select').addEventListener('change', e => {
            onProductChange(e.target.value, dinhMucTableEl, targetList);
        });
        row.querySelector('.product-qty').addEventListener('input', () => {
            recalculateDinhMuc(targetList, dinhMucTableEl);
        });
        row.querySelector('.btn-remove-product').addEventListener('click', () => {
            row.remove();
            recalculateDinhMuc(targetList, dinhMucTableEl);
        });

        return row;
    }

    // === Fetch định mức ===
    async function onProductChange(productId, dinhMucTableEl, targetList) {
        if (!productId) return;
        if (!dinhMucCache[productId]) {
            try {
                const response = await fetch(`/api/orders/product-dinh-muc/?product_id=${productId}`, {
                    headers: { 'X-CSRFToken': getCsrfToken() }
                });
                const data = await response.json();
                dinhMucCache[productId] = data.success ? data : { materials: [], ten_san_pham: '' };
            } catch (err) {
                console.error('Lỗi fetch định mức:', err);
                dinhMucCache[productId] = { materials: [], ten_san_pham: '' };
            }
        }
        recalculateDinhMuc(targetList, dinhMucTableEl);
    }

    // === Tính lại bảng định mức ===
    function resetDinhMucTable(dinhMucTableEl) {
        dinhMucTableEl.querySelector('tbody').innerHTML =
            '<tr><td colspan="5" class="text-center">Chọn sản phẩm để xem định mức</td></tr>';
    }

    function recalculateDinhMuc(targetList, dinhMucTableEl) {
        const rows = targetList.querySelectorAll('.product-row');
        const tbody = dinhMucTableEl.querySelector('tbody');
        let html = '';
        let hasData = false;
        const productGroups = [];

        rows.forEach(row => {
            const productId = row.querySelector('.product-select').value;
            const qty = parseFloat(row.querySelector('.product-qty').value) || 0;
            if (!productId || qty <= 0) return;

            const dmData = dinhMucCache[productId];
            if (!dmData) return;

            if (!dmData.materials.length) {
                productGroups.push({ ten_san_pham: dmData.ten_san_pham || productId, qty, materials: [], noData: true });
                hasData = true;
                return;
            }

            const materials = dmData.materials.map(mat => ({
                ten_nvl: mat.ten_nguyen_vat_lieu,
                dinh_muc: mat.dinh_muc,
                sl_nvl: roundTo(qty * mat.dinh_muc, 4),
            }));
            productGroups.push({ ten_san_pham: dmData.ten_san_pham, qty, materials, noData: false });
            hasData = true;
        });

        if (!hasData) {
            tbody.innerHTML = '<tr><td colspan="5" class="text-center">Chọn sản phẩm và nhập số lượng để xem định mức</td></tr>';
            return;
        }

        productGroups.forEach(group => {
            if (group.noData) {
                html += `<tr><td>${group.ten_san_pham}</td><td>${group.qty}</td><td colspan="3" class="text-center">Không có dữ liệu định mức</td></tr>`;
                return;
            }
            const rowspan = group.materials.length;
            group.materials.forEach((mat, idx) => {
                html += '<tr>';
                if (idx === 0) {
                    html += `<td rowspan="${rowspan}">${group.ten_san_pham}</td>`;
                    html += `<td rowspan="${rowspan}">${group.qty}</td>`;
                }
                html += `<td>${mat.ten_nvl}</td><td>${mat.dinh_muc}</td><td>${mat.sl_nvl}</td>`;
                html += '</tr>';
            });
        });

        tbody.innerHTML = html;
    }

    function roundTo(num, decimals) {
        return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
    }

    // ===========================
    // ADD ORDER MODAL
    // ===========================
    if (addOrderBtn) {
        addOrderBtn.addEventListener('click', function(e) {
            e.preventDefault();
            addOrderForm.reset();

            document.getElementById('add-order-id-lsx').value = ordersManagement.getAttribute('data-next-id-lsx');
            document.getElementById('add-order-id-dh').value = ordersManagement.getAttribute('data-next-id-dh');
            document.getElementById('add-order-ngay-tao').value = new Date().toISOString().split('T')[0];

            productList.innerHTML = '';
            createProductRow(productList, dinhMucTable);
            resetDinhMucTable(dinhMucTable);
            addModal.style.display = 'block';
        });
    }

    if (addCloseBtn) addCloseBtn.addEventListener('click', () => addModal.style.display = 'none');
    if (cancelAddBtn) cancelAddBtn.addEventListener('click', () => addModal.style.display = 'none');

    if (addProductRowBtn) {
        addProductRowBtn.addEventListener('click', () => createProductRow(productList, dinhMucTable));
    }

    if (addOrderForm) {
        addOrderForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const products = collectProducts(productList);
            if (products.length === 0) { alert('Vui lòng chọn ít nhất 1 sản phẩm!'); return; }

            fetch('/orders/create/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                body: JSON.stringify({
                    id_lenh_san_xuat: document.getElementById('add-order-id-lsx').value,
                    id_don_hang: document.getElementById('add-order-id-dh').value,
                    id_khach_hang: document.getElementById('add-order-khach-hang').value,
                    ngay_tao: document.getElementById('add-order-ngay-tao').value,
                    products: products,
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) { alert('Tạo đơn hàng thành công!'); addModal.style.display = 'none'; window.location.reload(); }
                else alert('Có lỗi xảy ra: ' + data.message);
            })
            .catch(error => { console.error('Lỗi:', error); alert('Có lỗi xảy ra khi gửi yêu cầu.'); });
        });
    }

    // ===========================
    // EDIT ORDER MODAL
    // ===========================
    if (editButtons) {
        editButtons.forEach(btn => {
            btn.addEventListener('click', async function(e) {
                e.preventDefault();
                const idLsx = this.getAttribute('data-id-lsx');

                // Fetch order data for edit
                try {
                    const response = await fetch(`/api/orders/order-data-for-edit/?id_lenh_sx=${idLsx}`, {
                        headers: { 'X-CSRFToken': getCsrfToken() }
                    });
                    const data = await response.json();

                    if (!data.success) {
                        alert('Không lấy được dữ liệu đơn hàng: ' + data.message);
                        return;
                    }

                    // Fill form
                    document.getElementById('edit-order-id-lsx').value = data.id_lenh_san_xuat;
                    document.getElementById('edit-order-id-lsx-display').value = data.id_lenh_san_xuat;
                    document.getElementById('edit-order-id-dh').value = data.id_don_hang;
                    document.getElementById('edit-order-khach-hang').value = data.id_khach_hang || '';
                    document.getElementById('edit-order-ngay-tao').value = data.ngay_tao || '';

                    // Fill product rows
                    editProductList.innerHTML = '';
                    for (const product of data.products) {
                        const row = createProductRow(editProductList, editDinhMucTable);
                        row.querySelector('.product-select').value = product.product_id;
                        row.querySelector('.product-qty').value = product.so_luong_san_pham;
                        // Fetch dinh muc for each product
                        await onProductChange(product.product_id, editDinhMucTable, editProductList);
                    }

                    if (data.products.length === 0) {
                        createProductRow(editProductList, editDinhMucTable);
                    }

                    recalculateDinhMuc(editProductList, editDinhMucTable);
                    editModal.style.display = 'block';

                } catch (err) {
                    console.error('Lỗi:', err);
                    alert('Có lỗi xảy ra khi lấy dữ liệu đơn hàng.');
                }
            });
        });
    }

    if (editCloseBtn) editCloseBtn.addEventListener('click', () => editModal.style.display = 'none');
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', () => editModal.style.display = 'none');

    if (editAddProductRowBtn) {
        editAddProductRowBtn.addEventListener('click', () => createProductRow(editProductList, editDinhMucTable));
    }

    if (editOrderForm) {
        editOrderForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const products = collectProducts(editProductList);
            if (products.length === 0) { alert('Vui lòng chọn ít nhất 1 sản phẩm!'); return; }

            fetch('/orders/update/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
                body: JSON.stringify({
                    id_lenh_san_xuat: document.getElementById('edit-order-id-lsx').value,
                    id_don_hang: document.getElementById('edit-order-id-dh').value,
                    id_khach_hang: document.getElementById('edit-order-khach-hang').value,
                    ngay_tao: document.getElementById('edit-order-ngay-tao').value,
                    products: products,
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) { alert('Cập nhật đơn hàng thành công!'); editModal.style.display = 'none'; window.location.reload(); }
                else alert('Có lỗi xảy ra: ' + data.message);
            })
            .catch(error => { console.error('Lỗi:', error); alert('Có lỗi xảy ra khi gửi yêu cầu.'); });
        });
    }

    // === Click outside to close modals ===
    window.addEventListener('click', function(event) {
        if (addModal && event.target === addModal) addModal.style.display = 'none';
        if (editModal && event.target === editModal) editModal.style.display = 'none';
    });

    // === Collect products from list ===
    function collectProducts(targetList) {
        const products = [];
        targetList.querySelectorAll('.product-row').forEach(row => {
            const productId = row.querySelector('.product-select').value;
            const qty = parseFloat(row.querySelector('.product-qty').value) || 0;
            if (productId && qty > 0) products.push({ product_id: productId, so_luong_san_pham: qty });
        });
        return products;
    }
});