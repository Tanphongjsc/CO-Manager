// customer_management.js
document.addEventListener('DOMContentLoaded', function() {
    const addModal = document.getElementById('addCustomerModal');
    const editModal = document.getElementById('editCustomerModal');
    const addCloseBtn = addModal ? addModal.querySelector('.close') : null;
    const editCloseBtn = editModal ? editModal.querySelector('.close') : null;
    const addCancelBtn = document.getElementById('cancel-add-btn');
    const editCancelBtn = document.getElementById('cancel-edit-btn');
    const addCustomerBtn = document.getElementById('add-customer-btn');
    const editButtons = document.querySelectorAll('.edit-btn');
    const deleteButtons = document.querySelectorAll('.delete-btn');
    const addCustomerForm = document.getElementById('add-customer-form');
    const editCustomerForm = document.getElementById('edit-customer-form');

    // Mở modal Thêm mới
    if (addCustomerBtn) {
        addCustomerBtn.addEventListener('click', function(e) {
            e.preventDefault();
            if (addCustomerForm) {
                addCustomerForm.reset();
            }

            // Auto-fill mã KH tiếp theo
            const nextMaKh = document.getElementById('customer-management').getAttribute('data-next-ma-kh');
            document.getElementById('add-customer-ma-kh').value = nextMaKh;

            // Mặc định chọn trạng thái "active"
            document.getElementById('add-customer-trang-thai').value = 'active';

            if (addModal) {
                addModal.style.display = 'block';
            }
        });
    }

    // Mở modal Sửa
    if (editButtons) {
        editButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const customerId = this.getAttribute('data-id');
                const row = this.closest('tr');

                const maKh = row.cells[1].textContent.trim();
                const tenKh = row.cells[2].textContent.trim();
                const diaChi = row.cells[3].textContent.trim();
                const trangThai = row.cells[4].getAttribute('data-trang-thai') || '';
                const sdt = row.cells[5].textContent.trim();
                const fax = row.cells[6].textContent.trim();

                document.getElementById('edit-customer-id').value = customerId;
                document.getElementById('edit-customer-ma-kh').value = maKh;
                document.getElementById('edit-customer-ten-kh').value = tenKh;
                document.getElementById('edit-customer-dia-chi').value = diaChi;
                document.getElementById('edit-customer-trang-thai').value = trangThai;
                document.getElementById('edit-customer-sdt').value = sdt;
                document.getElementById('edit-customer-fax').value = fax;

                if (editModal) {
                    editModal.style.display = 'block';
                }
            });
        });
    }

    // Submit form Thêm mới
    if (addCustomerForm) {
        addCustomerForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const customerData = {
                ma_kh: document.getElementById('add-customer-ma-kh').value,
                ten_kh: document.getElementById('add-customer-ten-kh').value,
                dia_chi: document.getElementById('add-customer-dia-chi').value,
                trang_thai: document.getElementById('add-customer-trang-thai').value,
                sdt: document.getElementById('add-customer-sdt').value,
                fax: document.getElementById('add-customer-fax').value
            };

            fetch('/customers/create/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify(customerData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Thêm khách hàng thành công!');
                    if (addModal) {
                        addModal.style.display = 'none';
                    }
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

    // Submit form Sửa
    if (editCustomerForm) {
        editCustomerForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const customerData = {
                id: document.getElementById('edit-customer-id').value,
                ma_kh: document.getElementById('edit-customer-ma-kh').value,
                ten_kh: document.getElementById('edit-customer-ten-kh').value,
                dia_chi: document.getElementById('edit-customer-dia-chi').value,
                trang_thai: document.getElementById('edit-customer-trang-thai').value,
                sdt: document.getElementById('edit-customer-sdt').value,
                fax: document.getElementById('edit-customer-fax').value
            };

            fetch('/customers/update/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify(customerData)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Cập nhật khách hàng thành công!');
                    if (editModal) {
                        editModal.style.display = 'none';
                    }
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

    // Đóng modal - nút X
    if (addCloseBtn) {
        addCloseBtn.addEventListener('click', function() {
            addModal.style.display = 'none';
        });
    }
    if (editCloseBtn) {
        editCloseBtn.addEventListener('click', function() {
            editModal.style.display = 'none';
        });
    }

    // Đóng modal - nút Hủy
    if (addCancelBtn) {
        addCancelBtn.addEventListener('click', function() {
            addModal.style.display = 'none';
        });
    }
    if (editCancelBtn) {
        editCancelBtn.addEventListener('click', function() {
            editModal.style.display = 'none';
        });
    }

    // Đóng modal - click bên ngoài
    window.addEventListener('click', function(event) {
        if (addModal && event.target === addModal) {
            addModal.style.display = 'none';
        }
        if (editModal && event.target === editModal) {
            editModal.style.display = 'none';
        }
    });

    // CSRF token từ cookie
    function getCsrfToken() {
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1];
        return cookieValue || '';
    }

    // Tìm kiếm
    const searchInput = document.getElementById('customer-search-input');
    const searchBtn = document.getElementById('customer-search-btn');

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
            if (row.cells.length === 1) {
                return;
            }
            const rowText = row.textContent.toLowerCase();
            if (rowText.includes(searchValue)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    // Xóa khách hàng
    if (deleteButtons) {
        deleteButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const customerId = this.getAttribute('data-id');
                const row = this.closest('tr');

                if (confirm('Bạn có chắc chắn muốn xóa khách hàng này?')) {
                    fetch('/customers/delete/', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRFToken': getCsrfToken()
                        },
                        body: JSON.stringify({ id: customerId })
                    })
                    .then(response => response.json())
                    .then(data => {
                        if (data.success) {
                            alert('Xóa khách hàng thành công!');
                            row.remove();
                        } else {
                            alert('Có lỗi xảy ra khi xóa khách hàng: ' + data.message);
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