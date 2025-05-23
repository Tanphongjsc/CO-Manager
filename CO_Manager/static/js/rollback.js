document.addEventListener('DOMContentLoaded', () => {
    // Highlight active menu item
    const sidebarItems = document.querySelectorAll('.nav-item');
    sidebarItems.forEach(item => {
        if (item.getAttribute('data-module') === 'rollback') {
            item.classList.add('active');
        }
    });

    // Get elements
    const orderSelect = document.getElementById('ma_don_hang');
    const productionSelect = document.getElementById('ma_lenh_sx');
    const clearFilterBtn = document.getElementById('btnClearFilter');
    const filterBtn = document.getElementById('btnFilter');
    const createNewBtn = document.getElementById('btnCreateNew');
    const tableData = document.getElementById('tableData');

    // Handle order selection change
    orderSelect.addEventListener('change', function() {
        // Clear production order options
        productionSelect.innerHTML = '<option value="">--Chọn--</option>';
        
        // Enable/disable production select based on order selection
        if (this.value) {
            productionSelect.disabled = false;
            
            // Hiển thị trạng thái loading
            productionSelect.innerHTML = '<option value="">Đang tải...</option>';

            // Log để kiểm tra giá trị đơn hàng được chọn
            console.log('Đã chọn đơn hàng:', this.value);

            // Tạo URL có timestamp để tránh cache
            const timestamp = new Date().getTime();
            const url = `/api/get_lenh_san_xuat/?ma_don_hang=${encodeURIComponent(this.value)}&_=${timestamp}`;
            
            console.log('Gửi request đến URL:', url);

            // Gọi API để lấy danh sách lệnh sản xuất theo đơn hàng
            fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Cache-Control': 'no-cache, no-store, max-age=0'
                },
                cache: 'no-store'
            })
            .then(response => {
                console.log('API Response status:', response.status);
                if (!response.ok) {
                    throw new Error(`Network response was not ok: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('API Response data:', data);
                
                // Reset select before adding new options
                productionSelect.innerHTML = '<option value="">--Chọn--</option>';
                
                // Add production orders for selected order
                if (data && data.lenh_sx_list) {
                    const orders = data.lenh_sx_list;
                    if (orders.length === 0) {
                        const option = document.createElement('option');
                        option.disabled = true;
                        option.textContent = 'Không có lệnh sản xuất';
                        productionSelect.appendChild(option);
                    } else {
                        orders.forEach(order => {
                            const option = document.createElement('option');
                            option.value = order;
                            option.textContent = order;
                            productionSelect.appendChild(option);
                        });
                    }
                } else {
                    console.error('API did not return expected data structure:', data);
                    productionSelect.innerHTML = '<option value="">--Không có dữ liệu hợp lệ--</option>';
                }
            })
            .catch(error => {
                console.error('Error fetching production orders:', error);
                productionSelect.innerHTML = '<option value="">--Lỗi khi tải dữ liệu--</option>';
                // Hiển thị thông báo lỗi chi tiết
                alert('Không thể tải danh sách lệnh sản xuất. Vui lòng làm mới trang và thử lại.');
                console.error('Error details:', error.message);
            });
        } else {
            productionSelect.disabled = true;
            productionSelect.innerHTML = '<option value="">--Chọn--</option>';
        }
    });

    // Clear filter button
    clearFilterBtn.addEventListener('click', function() {
        // Reset form fields
        orderSelect.value = '';
        productionSelect.value = '';
        productionSelect.disabled = true;
        productionSelect.innerHTML = '<option value="">--Chọn--</option>';
        
        // Redirect to the page without query parameters
        window.location.href = '/rollback/';
    });

    // Filter button
    filterBtn.addEventListener('click', function() {
        const orderValue = orderSelect.value;
        const productionValue = productionSelect.value;
        
        // Build query string for filtering
        let queryParams = [];
        if (orderValue) {
            queryParams.push(`ma_don_hang=${encodeURIComponent(orderValue)}`);
        }
        if (productionValue) {
            queryParams.push(`ma_lenh_sx=${encodeURIComponent(productionValue)}`);
        }
        
        // Redirect to the page with query parameters
        if (queryParams.length > 0) {
            window.location.href = `/rollback/?${queryParams.join('&')}`;
        } else {
            window.location.href = '/rollback/';
        }
    });

    // Create new button
    createNewBtn.addEventListener('click', function() {
        // Redirect to creation page
        window.location.href = '/rollback/create/';
    });

    // Pre-select dropdown values based on URL parameters
    function initializeFormFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        const orderParam = urlParams.get('ma_don_hang');
        const productionParam = urlParams.get('ma_lenh_sx');
        
        if (orderParam) {
            // Set order value
            orderSelect.value = orderParam;
            
            // Trigger change event to load production orders
            const changeEvent = new Event('change');
            orderSelect.dispatchEvent(changeEvent);
            
            // Set production value after a delay to ensure options are loaded
            if (productionParam) {
                setTimeout(() => {
                    productionSelect.value = productionParam;
                    // Nếu không tìm thấy giá trị trong dropdown, thêm một option mới
                    if (productionSelect.value !== productionParam) {
                        const option = document.createElement('option');
                        option.value = productionParam;
                        option.textContent = productionParam;
                        productionSelect.appendChild(option);
                        productionSelect.value = productionParam;
                    }
                }, 1000);
            }
        }
    }
    
    // Format currency or number in table cells
    function formatNumericValues() {
        const numericCells = document.querySelectorAll('td[data-numeric="true"]');
        numericCells.forEach(cell => {
            const value = parseFloat(cell.textContent);
            if (!isNaN(value)) {
                cell.textContent = value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
                cell.classList.add('number-cell');
            }
        });
    }
    // Xử lý nút Sửa/Lưu trong bảng
    function initEditButtons() {
        document.querySelectorAll('.btn-edit').forEach(button => {
            button.addEventListener('click', function() {
                const row = this.closest('tr');
                const isEditing = this.textContent === 'Lưu';

                const muaInput = row.querySelector('input[name="so_luong_mua_vao"]');
                const sxInput = row.querySelector('input[name="so_luong_san_xuat"]');

                if (isEditing) {
                    // Lưu dữ liệu
                    const id = this.dataset.id;
                    const soLuongMuaVao = parseFloat(muaInput.value) || 0;
                    const soLuongSanXuat = parseFloat(sxInput.value) || 0;

                    // Disable inputs và hiển thị loading
                    muaInput.disabled = true;
                    sxInput.disabled = true;
                    this.textContent = 'Đang lưu...';
                    this.disabled = true;

                    fetch(`/api/rollback/update/${id}/`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': getCsrfToken(),
                        },
                        body: JSON.stringify({
                            so_luong_mua_vao: soLuongMuaVao,
                            so_luong_san_xuat: soLuongSanXuat,
                        })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.status === 'success') {
                            alert('Lưu thành công');
                            // Reload trang để cập nhật các giá trị tính toán
                            location.reload();
                        } else {
                            alert('Lỗi: ' + (data.message || 'Không thể lưu dữ liệu'));
                            // Khôi phục trạng thái chỉnh sửa
                            muaInput.disabled = false;
                            sxInput.disabled = false;
                            this.textContent = 'Lưu';
                            this.disabled = false;
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        alert('Lỗi kết nối: ' + error.message);
                        // Khôi phục trạng thái chỉnh sửa
                        muaInput.disabled = false;
                        sxInput.disabled = false;
                        this.textContent = 'Lưu';
                        this.disabled = false;
                    });
                } else {
                    // Chuyển sang chế độ chỉnh sửa
                    muaInput.disabled = false;
                    sxInput.disabled = false;
                    muaInput.style.border = '1px solid #ccc';
                    muaInput.style.background = 'white';
                    sxInput.style.border = '1px solid #ccc';
                    sxInput.style.background = 'white';
                    this.textContent = 'Lưu';
                    this.style.background = '#dc3545'; // Đổi màu thành đỏ khi ở chế độ lưu
                }
            });
        });
    }

    function getCsrfToken() {
        const name = 'csrftoken';
        const cookie = document.cookie.split(';').find(c => c.trim().startsWith(name + '='));
        return cookie ? decodeURIComponent(cookie.split('=')[1]) : '';
    }
    // Initialize form values from URL
    initializeFormFromUrl();

    initEditButtons();
    
    // Format numeric values in table
    formatNumericValues();
});