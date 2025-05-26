// products.js
document.addEventListener('DOMContentLoaded', function() {
    // Các phần tử DOM
    const modal = document.getElementById('editProductModal');
    const closeBtn = modal ? modal.querySelector('.close') : null;
    const cancelBtn = document.getElementById('cancel-edit-btn');
    const editButtons = document.querySelectorAll('.edit-btn');
    const deleteButtons = document.querySelectorAll('.delete-btn');
    const productForm = document.getElementById('edit-product-form');
    
    // Xử lý nút Sửa để mở modal
    if (editButtons) {
        editButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const productId = this.getAttribute('data-id');
                
                // Lấy thông tin sản phẩm từ hàng được chọn
                const row = this.closest('tr');
                const productName = row.cells[1].textContent.trim();
                const productAltName = row.cells[2].textContent.trim();
                const productHsCode = row.cells[3].textContent.trim();
                const productRecoveryRate = row.cells[4].textContent.trim();
                const productUnit = row.cells[5].textContent.trim();
                const productType = row.cells[6].textContent.trim();
                const productNote = row.cells[7].textContent.trim();
                
                // Điền thông tin vào form trong modal
                document.getElementById('edit-product-id').value = productId;
                document.getElementById('edit-product-name').value = productName;
                document.getElementById('edit-product-alt-name').value = productAltName;
                document.getElementById('edit-product-hs-code').value = productHsCode;
                document.getElementById('edit-product-recovery-rate').value = productRecoveryRate !== 'None' ? productRecoveryRate : '';
                document.getElementById('edit-product-unit').value = productUnit;
                document.getElementById('edit-product-type').value = productType;
                document.getElementById('edit-product-note').value = productNote;
                
                // Hiển thị modal
                if (modal) {
                    modal.style.display = 'block';
                }
            });
        });
    }
    
    // Xử lý submit form
    if (productForm) {
        productForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Thu thập dữ liệu từ form
            const productData = {
                id: document.getElementById('edit-product-id').value,
                name: document.getElementById('edit-product-name').value,
                alt_name: document.getElementById('edit-product-alt-name').value,
                hs_code: document.getElementById('edit-product-hs-code').value,
                recovery_rate: document.getElementById('edit-product-recovery-rate').value,
                unit: document.getElementById('edit-product-unit').value,
                type: document.getElementById('edit-product-type').value,
                note: document.getElementById('edit-product-note').value
            };
            
            // Gửi dữ liệu lên server bằng AJAX
            fetch('/products/update/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify(productData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Cập nhật giao diện nếu thành công
                    alert('Cập nhật sản phẩm thành công!');
                    
                    // Đóng modal
                    if (modal) {
                        modal.style.display = 'none';
                    }
                    
                    // Tải lại trang để hiển thị dữ liệu mới
                    window.location.reload();
                } else {
                    alert('Có lỗi xảy ra: ' + data.message);
                }
            })
            .catch(error => {
                console.error('Lỗi:', error);
                alert('Có lỗi xảy ra khi gửi yêu cầu.');
            });
        });
    }
    
    // Đóng modal khi nhấp vào nút đóng (X)
    if (closeBtn) {
        closeBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    // Đóng modal khi nhấp vào nút Hủy
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function() {
            modal.style.display = 'none';
        });
    }
    
    // Đóng modal khi nhấp bên ngoài modal
    window.addEventListener('click', function(event) {
        if (modal && event.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    // Hàm để lấy CSRF token từ cookie
    function getCsrfToken() {
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1];
        return cookieValue || '';
    }
    
    // Xử lý tìm kiếm sản phẩm
    const searchInput = document.getElementById('product-search-input');
    const searchBtn = document.getElementById('product-search-btn');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            performSearch();
        });
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    function performSearch() {
        const searchValue = searchInput.value.toLowerCase().trim(); // Lấy giá trị tìm kiếm
        // Lấy tất cả các hàng trong bảng chứa dữ liệu sản phẩm
        const tableRows = document.querySelectorAll('.standard-table tbody tr');

        tableRows.forEach(row => {
            // Lấy toàn bộ nội dung text của hàng và chuyển về chữ thường
            const rowText = row.textContent.toLowerCase();
            
            // Nếu nội dung hàng chứa giá trị tìm kiếm thì hiển thị, ngược lại ẩn đi
            if (rowText.includes(searchValue)) {
                row.style.display = ''; // Hiển thị hàng
            } else {
                row.style.display = 'none'; // Ẩn hàng
            }
        });
    }

    // Xử lý nút đồng bộ từ Cloudify
    const syncBtn = document.getElementById('sync-cloudify-btn');
    const syncSpinner = document.getElementById('sync-spinner');

    if (syncBtn) {
        syncBtn.addEventListener('click', async function() {
            try {
                // Hiển thị spinner và vô hiệu hóa nút
                syncSpinner.classList.remove('d-none');
                syncBtn.disabled = true;
                const btnText = syncBtn.querySelector('.btn-text');
                if (btnText) btnText.textContent = 'Đang đồng bộ...';
                
                // Thêm độ trễ nhỏ để đảm bảo spinner được hiển thị
                await new Promise(resolve => setTimeout(resolve, 50));
                
                // Gọi API đồng bộ
                const response = await fetch('/products/sync-cloudify/', {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': getCsrfToken()
                    }
                });
                
                const data = await response.json();

                if (data.success) {
                    alert('Đồng bộ dữ liệu thành công!');
                    window.location.reload();
                } else {
                    alert('Có lỗi xảy ra khi đồng bộ: ' + data.message);
                }
            } catch (error) {
                console.error('Lỗi:', error);
                alert('Có lỗi xảy ra khi đồng bộ từ Cloudify.');
            } finally {
                // Ẩn spinner và kích hoạt lại nút
                syncSpinner.classList.add('d-none');
                syncBtn.disabled = false;
                const btnText = syncBtn.querySelector('.btn-text');
                if (btnText) btnText.textContent = 'Đồng bộ từ Cloudify';
            }
        });
    }

    // Xử lý nút xóa sản phẩm
    if (deleteButtons) {
        deleteButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const productId = this.getAttribute('data-id');
                const row = this.closest('tr');
                
                // Hiển thị hộp thoại xác nhận
                if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
                    // Gửi yêu cầu xóa sản phẩm
                    fetch('/products/delete/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': getCsrfToken()
                        },
                        body: JSON.stringify({ id: productId })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            alert('Xóa sản phẩm thành công!');
                            row.remove(); // Xóa hàng khỏi bảng
                        } else {
                            alert('Có lỗi xảy ra khi xóa sản phẩm: ' + data.message);
                        }
                    })
                    .catch(error => {
                        console.error('Lỗi:', error);
                        alert('Có lỗi xảy ra khi gửi yêu cầu xóa.');
                    });
                }
            });
        });
    }

});