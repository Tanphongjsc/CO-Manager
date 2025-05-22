// orders.js
document.addEventListener('DOMContentLoaded', function() {
    // Các phần tử DOM
    const searchInput = document.getElementById('order-search-input');
    const searchBtn = document.getElementById('order-search-btn');
    const syncBtn = document.getElementById('refresh-btn');
    const syncSpinner = document.getElementById('sync-spinner');
    
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
        const searchValue = searchInput.value.toLowerCase().trim();
        const tableRows = document.querySelectorAll('.standard-table tbody tr');
        
        tableRows.forEach(row => {
            // Bỏ qua dòng thông báo trống
            if (row.querySelector('.empty-message')) {
                return;
            }
            
            const cells = row.querySelectorAll('td');
            let rowText = '';
            
            // Lấy nội dung văn bản từ tất cả các cột (trừ cột Thao tác)
            for (let i = 0; i < cells.length - 1; i++) {
                rowText += cells[i].textContent.toLowerCase() + ' ';
            }
            
            // Hiển thị hoặc ẩn dòng dựa trên kết quả tìm kiếm
            if (rowText.includes(searchValue)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    // Hàm để lấy CSRF token từ cookie
    function getCsrfToken() {
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1];
        return cookieValue || '';
    }


    // Xử lý nút đồng bộ dữ liệu từ Cloudify
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
                const response = await fetch('/orders/sync-cloudify', {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': getCsrfToken()
                    }
                });
                
                const data = await response.json();

                if (data.success) {
                    alert('Đồng bộ dữ liệu thành công!');
                    // window.location.reload();
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

});