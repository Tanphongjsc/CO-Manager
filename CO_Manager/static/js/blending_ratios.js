// blending_ratios.js
document.addEventListener('DOMContentLoaded', function() {
    // Các phần tử DOM
    const searchInput = document.getElementById('ratio-search-input');
    const searchBtn = document.getElementById('ratio-search-btn');
    
    // Gán sự kiện cho nút tìm kiếm
    if (searchBtn) {
        searchBtn.addEventListener('click', function() {
            performSearch();
        });
    }
    
    // Gán sự kiện cho ô input tìm kiếm (khi nhấn Enter)
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
    
    /**
     * Hàm thực hiện tìm kiếm trên bảng
     */
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
            
            // Lấy nội dung văn bản từ tất cả các cột (trừ cột Thao tác cuối cùng)
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

    // Không còn logic cho nút đồng bộ nữa.
});