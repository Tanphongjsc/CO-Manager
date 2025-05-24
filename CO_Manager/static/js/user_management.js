// user_management.js
document.addEventListener('DOMContentLoaded', function() {
    // Các phần tử DOM
    const addModal = document.getElementById('addUserModal');
    const editModal = document.getElementById('editUserModal');
    const addCloseBtn = addModal ? addModal.querySelector('.close') : null;
    const editCloseBtn = editModal ? editModal.querySelector('.close') : null;
    const addCancelBtn = document.getElementById('cancel-add-btn');
    const editCancelBtn = document.getElementById('cancel-edit-btn');
    const addUserBtn = document.getElementById('add-user-btn');
    const editButtons = document.querySelectorAll('.edit-btn');
    const deleteButtons = document.querySelectorAll('.delete-btn');
    const addUserForm = document.getElementById('add-user-form');
    const editUserForm = document.getElementById('edit-user-form');
    
    // Xử lý nút Thêm mới để mở modal
    if (addUserBtn) {
        addUserBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Reset form
            if (addUserForm) {
                addUserForm.reset();
            }
            
            // Hiển thị modal thêm mới
            if (addModal) {
                addModal.style.display = 'block';
            }
        });
    }
    
    // Xử lý nút Sửa để mở modal
    if (editButtons) {
        editButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const userId = this.getAttribute('data-id');
                
                // Lấy thông tin người dùng từ hàng được chọn
                const row = this.closest('tr');
                const userName = row.cells[1].textContent.trim();
                const userCmnd = row.cells[2].textContent.trim();
                const userDate = row.cells[3].textContent.trim();
                const userAddress = row.cells[4].textContent.trim();
                const userRole = row.cells[5].textContent.trim();

                // Ánh xạ giá trị hiển thị sang giá trị 'value' của dropdown
                let userRoleValue = '';
                if (userRole === 'Người mua') {
                    userRoleValue = 'buyer';
                } else if (userRole === 'Người bán') {
                    userRoleValue = 'seller';
                }

                // Chuyển đổi định dạng ngày từ DD/MM/YYYY sang YYYY-MM-DD
                let formattedDate = '';
                if (userDate && userDate !== '') {
                    const dateParts = userDate.split('/');
                    if (dateParts.length === 3) {
                        // Từ DD/MM/YYYY thành YYYY-MM-DD
                        formattedDate = `${dateParts[2]}-${dateParts[1].padStart(2, '0')}-${dateParts[0].padStart(2, '0')}`;
                    }
                }

                // Điền thông tin vào form trong modal
                document.getElementById('edit-user-id').value = userId;
                document.getElementById('edit-user-name').value = userName;
                document.getElementById('edit-user-cmnd').value = userCmnd;
                document.getElementById('edit-user-date').value = formattedDate;
                document.getElementById('edit-user-address').value = userAddress;
                document.getElementById('edit-user-role').value = userRoleValue;
                
                // Hiển thị modal
                if (editModal) {
                    editModal.style.display = 'block';
                }
            });
        });
    }
    
    // Xử lý submit form thêm mới
    if (addUserForm) {
        addUserForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Thu thập dữ liệu từ form
            const userData = {
                name: document.getElementById('add-user-name').value,
                cmnd: document.getElementById('add-user-cmnd').value,
                date: document.getElementById('add-user-date').value,
                address: document.getElementById('add-user-address').value,
                role: document.getElementById('add-user-role').value
            };
            
            // Gửi dữ liệu lên server bằng AJAX
            fetch('/users/create/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify(userData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Thêm người dùng thành công
                    alert('Thêm người dùng thành công!');
                    
                    // Đóng modal
                    if (addModal) {
                        addModal.style.display = 'none';
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
    
    // Xử lý submit form chỉnh sửa
    if (editUserForm) {
        editUserForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Thu thập dữ liệu từ form
            const userData = {
                id: document.getElementById('edit-user-id').value,
                name: document.getElementById('edit-user-name').value,
                cmnd: document.getElementById('edit-user-cmnd').value,
                date: document.getElementById('edit-user-date').value,
                address: document.getElementById('edit-user-address').value,
                role: document.getElementById('edit-user-role').value
            };
            
            // Gửi dữ liệu lên server bằng AJAX
            fetch('/users/update/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify(userData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    // Cập nhật người dùng thành công
                    alert('Cập nhật người dùng thành công!');
                    
                    // Đóng modal
                    if (editModal) {
                        editModal.style.display = 'none';
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
    
    // Đóng modal khi nhấp vào nút đóng (X) - Add Modal
    if (addCloseBtn) {
        addCloseBtn.addEventListener('click', function() {
            addModal.style.display = 'none';
        });
    }
    
    // Đóng modal khi nhấp vào nút đóng (X) - Edit Modal
    if (editCloseBtn) {
        editCloseBtn.addEventListener('click', function() {
            editModal.style.display = 'none';
        });
    }
    
    // Đóng modal khi nhấp vào nút Hủy - Add Modal
    if (addCancelBtn) {
        addCancelBtn.addEventListener('click', function() {
            addModal.style.display = 'none';
        });
    }
    
    // Đóng modal khi nhấp vào nút Hủy - Edit Modal
    if (editCancelBtn) {
        editCancelBtn.addEventListener('click', function() {
            editModal.style.display = 'none';
        });
    }
    
    // Đóng modal khi nhấp bên ngoài modal
    window.addEventListener('click', function(event) {
        if (addModal && event.target === addModal) {
            addModal.style.display = 'none';
        }
        if (editModal && event.target === editModal) {
            editModal.style.display = 'none';
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
    
    // Xử lý tìm kiếm người dùng
    const searchInput = document.getElementById('user-search-input');
    const searchBtn = document.getElementById('user-search-btn');
    
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
        // Lấy tất cả các hàng trong bảng chứa dữ liệu người dùng
        const tableRows = document.querySelectorAll('.standard-table tbody tr');

        tableRows.forEach(row => {
            // Bỏ qua hàng thông báo "Không có dữ liệu"
            if (row.cells.length === 1) {
                return;
            }
            
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

    // Xử lý nút xóa người dùng
    if (deleteButtons) {
        deleteButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const userId = this.getAttribute('data-id');
                const row = this.closest('tr');
                
                // Hiển thị hộp thoại xác nhận
                if (confirm('Bạn có chắc chắn muốn xóa người dùng này?')) {
                    // Gửi yêu cầu xóa người dùng
                    fetch('/users/delete/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': getCsrfToken()
                        },
                        body: JSON.stringify({ id: userId })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            alert('Xóa người dùng thành công!');
                            row.remove(); // Xóa hàng khỏi bảng
                        } else {
                            alert('Có lỗi xảy ra khi xóa người dùng: ' + data.message);
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