// products.js
document.addEventListener('DOMContentLoaded', function() {
    
    // Hàm lấy CSRF token
    function getCsrfToken() {
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1];
        return cookieValue || '';
    }

    // Hàm escape HTML để phòng chống XSS
    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // --- TÌM KIẾM SẢN PHẨM ---
    const searchInput = document.getElementById('product-search-input');
    const searchBtn = document.getElementById('product-search-btn');
    
    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') performSearch();
        });
    }
    
    function performSearch() {
        const searchValue = searchInput.value.toLowerCase().trim();
        const tableRows = document.querySelectorAll('.data-table tbody tr');

        tableRows.forEach(row => {
            const rowText = row.textContent.toLowerCase();
            if (rowText.includes(searchValue)) {
                row.style.display = '';
            } else {
                row.style.display = 'none';
            }
        });
    }

    // --- XÓA SẢN PHẨM ---
    const deleteButtons = document.querySelectorAll('.delete-btn');
    if (deleteButtons) {
        deleteButtons.forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                const productId = this.getAttribute('data-id');
                const row = this.closest('tr');
                
                if (confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) {
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
                            row.remove();
                        } else {
                            alert(data.message); // Hiển thị chi tiết lỗi
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

    // --- CRUD NHÓM VTHH ---
    const manageNhomBtn = document.getElementById('manage-nhom-vthh-btn');
    const nhomModal = document.getElementById('manageNhomVthhModal');
    const closeNhomModalBtn = document.getElementById('closeNhomVthhModal');
    const nhomForm = document.getElementById('nhom-vthh-form');
    const nhomTbody = document.getElementById('nhom-vthh-tbody');
    const nhomCancelBtn = document.getElementById('nhom-vthh-cancel-btn');

    if (manageNhomBtn && nhomModal) {
        manageNhomBtn.addEventListener('click', function() {
            loadNhomVthh();
            nhomModal.style.display = 'block';
        });

        closeNhomModalBtn.addEventListener('click', function() {
            nhomModal.style.display = 'none';
        });

        window.addEventListener('click', function(event) {
            if (event.target === nhomModal) nhomModal.style.display = 'none';
        });
    }

    function loadNhomVthh() {
        fetch('/api/nhom-vthh/list/')
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    renderNhomVthhTable(data.data);
                }
            });
    }

    function renderNhomVthhTable(list) {
        nhomTbody.innerHTML = '';
        list.forEach(item => {
            const tr = document.createElement('tr');
            const safeMaNhom = escapeHtml(item.ma_nhom);
            const safeTenNhom = escapeHtml(item.ten_nhom);
            tr.innerHTML = `
                <td>${safeMaNhom}</td>
                <td>${safeTenNhom}</td>
                <td>
                    <button class="btn btn-sm btn-warning edit-nhom-btn" data-id="${item.id}" data-ma="${safeMaNhom}" data-ten="${safeTenNhom}">Sửa</button>
                    <button class="btn btn-sm btn-danger delete-nhom-btn" data-id="${item.id}">Xóa</button>
                </td>
            `;
            nhomTbody.appendChild(tr);
        });

        document.querySelectorAll('.edit-nhom-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                const ma = this.getAttribute('data-ma');
                const ten = this.getAttribute('data-ten');
                
                document.getElementById('nhom-vthh-id').value = id;
                document.getElementById('nhom-vthh-ma').value = ma;
                document.getElementById('nhom-vthh-ten').value = ten;
                
                document.getElementById('nhom-vthh-form-title').textContent = 'Sửa Nhóm VTHH';
                document.getElementById('nhom-vthh-submit-btn').textContent = 'Cập nhật';
                nhomCancelBtn.classList.remove('d-none');
            });
        });

        document.querySelectorAll('.delete-nhom-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const id = this.getAttribute('data-id');
                if (confirm('Bạn có chắc chắn muốn xóa nhóm này?')) {
                    fetch(`/api/nhom-vthh/delete/${id}/`, {
                        method: 'POST',
                        headers: {'X-CSRFToken': getCsrfToken()}
                    })
                    .then(res => res.json())
                    .then(data => {
                        if (data.success) {
                            loadNhomVthh();
                        } else {
                            alert(data.message);
                        }
                    });
                }
            });
        });
    }

    if (nhomForm) {
        nhomForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const id = document.getElementById('nhom-vthh-id').value;
            const ma_nhom = document.getElementById('nhom-vthh-ma').value;
            const ten_nhom = document.getElementById('nhom-vthh-ten').value;
            
            const url = id ? `/api/nhom-vthh/update/${id}/` : '/api/nhom-vthh/create/';
            
            fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRFToken': getCsrfToken()
                },
                body: JSON.stringify({ ma_nhom, ten_nhom })
            })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    resetNhomForm();
                    loadNhomVthh();
                } else {
                    alert(data.message);
                }
            });
        });
    }

    if (nhomCancelBtn) {
        nhomCancelBtn.addEventListener('click', resetNhomForm);
    }

    function resetNhomForm() {
        nhomForm.reset();
        document.getElementById('nhom-vthh-id').value = '';
        document.getElementById('nhom-vthh-form-title').textContent = 'Thêm Nhóm VTHH Mới';
        document.getElementById('nhom-vthh-submit-btn').textContent = 'Thêm';
        nhomCancelBtn.classList.add('d-none');
    }
});