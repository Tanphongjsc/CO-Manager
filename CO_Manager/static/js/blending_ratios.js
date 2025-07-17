// blending_ratios.js

document.addEventListener('DOMContentLoaded', function() {
    // Các phần tử DOM
    const searchInput = document.getElementById('ratio-search-input');
    const searchBtn = document.getElementById('ratio-search-btn');
    const tableContainer = document.querySelector('.table-container');

    // Hàm lấy CSRF token từ cookie
    const getCsrfToken = () => document.cookie.match(/csrftoken=([^;]+)/)?.[1] || null;

    // --- LOGIC TÌM KIẾM (Giữ nguyên) ---
    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
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
            if (row.querySelector('.empty-message')) return;
            
            const cells = row.querySelectorAll('td');
            let rowText = '';
            
            for (let i = 0; i < cells.length - 1; i++) {
                rowText += cells[i].textContent.toLowerCase() + ' ';
            }
            
            if (rowText.includes(searchValue)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    // === LOGIC XÓA MỚI ===
    if (tableContainer) {
        tableContainer.addEventListener('click', async function(event) {
            // Chỉ hoạt động khi nhấn vào nút có class 'btn-delete-ratio'
            const deleteButton = event.target.closest('.btn-delete-ratio');
            if (!deleteButton) {
                return;
            }

            const pk = deleteButton.dataset.pk;
            const row = deleteButton.closest('tr');
            
            // Hỏi xác nhận trước khi xóa
            if (!confirm(`Bạn có chắc chắn muốn xóa tỉ lệ phối trộn cho Lệnh Sản Xuất ${pk} không? Hành động này không thể hoàn tác.`)) {
                return;
            }

            try {
                // Gửi yêu cầu POST đến API để xóa
                const response = await fetch(`/api/blendingratios/delete/${pk}/`, {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': getCsrfToken(),
                        'Content-Type': 'application/json'
                    }
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Lỗi không xác định từ server');
                }

                // Xóa dòng khỏi bảng để có phản hồi tức thì
                row.style.transition = 'opacity 0.4s ease';
                row.style.opacity = '0';
                setTimeout(() => {
                    row.remove();
                    // Hiển thị thông báo thành công và có thể tải lại trang để cập nhật thanh thông báo
                    alert(result.message);
                    window.location.reload(); 
                }, 400);

            } catch (error) {
                console.error('Lỗi khi xóa:', error);
                alert('Đã có lỗi xảy ra khi xóa: ' + error.message);
            }
        });
    }
});