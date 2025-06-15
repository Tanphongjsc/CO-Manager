document.addEventListener('DOMContentLoaded', () => {
    const orderSelect = document.getElementById('ma_don_hang');
    const productionSelect = document.getElementById('ma_lenh_sx');
    const clearFilterBtn = document.getElementById('btnClearFilter');
    const filterBtn = document.getElementById('btnFilter');
    const createNewBtn = document.getElementById('btnCreateNew');

    // Xử lý thay đổi đơn hàng
    orderSelect.addEventListener('change', function () {
        productionSelect.innerHTML = '<option value="">-- Chọn lệnh sản xuất --</option>';
        productionSelect.disabled = true;

        if (!this.value) return;

        const timestamp = new Date().getTime();
        const url = `/api/get_lenh_san_xuat_all/?ma_don_hang=${encodeURIComponent(this.value)}&_=${timestamp}`;

        productionSelect.innerHTML = '<option value="">Đang tải...</option>';

        fetch(url)
            .then(res => res.json())
            .then(data => {
                productionSelect.innerHTML = '<option value="">-- Chọn lệnh sản xuất --</option>';
                if (data.lenh_sx_list && data.lenh_sx_list.length > 0) {
                    data.lenh_sx_list.forEach(item => {
                        const opt = document.createElement('option');
                        opt.value = item;
                        opt.textContent = item;
                        productionSelect.appendChild(opt);
                    });
                } else {
                    const opt = document.createElement('option');
                    opt.disabled = true;
                    opt.textContent = 'Không có lệnh sản xuất';
                    productionSelect.appendChild(opt);
                }
                productionSelect.disabled = false;
            })
            .catch(error => {
                console.error('Lỗi khi tải lệnh sản xuất:', error);
                alert('Không thể tải danh sách lệnh sản xuất');
            });
    });

    // Xử lý nút XÓA LỌC
    clearFilterBtn?.addEventListener('click', function () {
        orderSelect.value = '';
        productionSelect.value = '';
        productionSelect.disabled = true;
        productionSelect.innerHTML = '<option value="">-- Chọn lệnh sản xuất --</option>';
        window.location.href = window.location.pathname;
    });

    // Xử lý nút LỌC
    filterBtn?.addEventListener('click', function () {
        const orderValue = orderSelect.value;
        const productionValue = productionSelect.value;
        let queryParams = [];

        if (orderValue) queryParams.push(`ma_don_hang=${encodeURIComponent(orderValue)}`);
        if (productionValue) queryParams.push(`ma_lenh_sx=${encodeURIComponent(productionValue)}`);

        window.location.href = queryParams.length > 0
            ? `${window.location.pathname}?${queryParams.join('&')}`
            : window.location.pathname;
    });

    // Xử lý nút TẠO MỚI
    createNewBtn?.addEventListener('click', function () {
        window.location.href = '/purchase/create/';
    });

    // Tự động chọn lại từ URL khi load
    function initializeFromUrl() {
        const params = new URLSearchParams(window.location.search);
        const orderParam = params.get('ma_don_hang');
        const productionParam = params.get('ma_lenh_sx');

        if (orderParam) {
            orderSelect.value = orderParam;
            const event = new Event('change');
            orderSelect.dispatchEvent(event);

            if (productionParam) {
                setTimeout(() => {
                    productionSelect.value = productionParam;
                    if (productionSelect.value !== productionParam) {
                        const opt = document.createElement('option');
                        opt.value = productionParam;
                        opt.textContent = productionParam;
                        productionSelect.appendChild(opt);
                        productionSelect.value = productionParam;
                    }
                }, 1000);
            }
        } else {
            productionSelect.disabled = true;
        }
    }
    function getCsrfToken() {
    const name = 'csrftoken';
    const cookie = document.cookie.split(';').find(c => c.trim().startsWith(name + '='));
    return cookie ? decodeURIComponent(cookie.split('=')[1]) : '';
    }

    function initDeleteButtons() {
        document.querySelectorAll('.btn-delete').forEach(button => {
            button.addEventListener('click', function () {
                const id = this.dataset.id;
                const name = this.dataset.name;

                if (confirm(`Bạn có chắc chắn muốn xóa bảng kê "${name}"?`)) {
                    this.textContent = 'Đang xóa...';
                    this.disabled = true;
                    this.style.backgroundColor = '#6c757d';

                    fetch(`/api/purchase/delete/${id}/`, {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': getCsrfToken(),
                        }
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            alert(data.message || 'Xóa thành công');
                            location.reload();
                        } else {
                            alert('Lỗi: ' + (data.message || 'Không thể xóa'));
                            this.textContent = 'XÓA';
                            this.disabled = false;
                            this.style.backgroundColor = '#dc3545';
                        }
                    })
                    .catch(error => {
                        console.error('Lỗi kết nối:', error);
                        alert('Lỗi kết nối: ' + error.message);
                        this.textContent = 'XÓA';
                        this.disabled = false;
                        this.style.backgroundColor = '#dc3545';
                    });
                }
            });
        });
    }
    initializeFromUrl();
    initDeleteButtons();
});
