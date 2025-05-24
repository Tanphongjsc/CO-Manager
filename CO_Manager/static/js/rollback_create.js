document.addEventListener('DOMContentLoaded', () => {
    const orderSelect = document.getElementById('ma_don_hang');
    const productionSelect = document.getElementById('ma_lenh_sx');
    const tableBody = document.querySelector('#nguyenLieuTable tbody');

    // Hàm lấy ngày hiện tại định dạng yyyy-mm-dd
    function getCurrentDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    // Khi chọn đơn hàng → lấy lệnh sản xuất
    orderSelect.addEventListener('change', function () {
        const selectedOrder = this.value;

        // Reset bảng và dropdown lệnh sản xuất
        tableBody.innerHTML = '';
        productionSelect.innerHTML = '<option value="">--Chọn--</option>';
        productionSelect.disabled = true;

        if (!this.value) return;

        // Loading + bỏ cache bằng timestamp
        productionSelect.innerHTML = '<option value="">Đang tải...</option>';
        const timestamp = new Date().getTime();
        const url = `/api/get_lenh_san_xuat/?ma_don_hang=${encodeURIComponent(selectedOrder)}&_=${timestamp}`;

        console.log('Gửi yêu cầu lấy lệnh sản xuất:', url);

        fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            cache: 'no-store'
        })
        .then(response => {
            if (!response.ok) throw new Error(`Lỗi: ${response.status}`);
            return response.json();
        })
        .then(data => {
            productionSelect.innerHTML = '<option value="">--Chọn--</option>';
            if (data.lenh_sx_list && data.lenh_sx_list.length > 0) {
                data.lenh_sx_list.forEach(lsx => {
                    const option = document.createElement('option');
                    option.value = lsx;
                    option.textContent = lsx;
                    productionSelect.appendChild(option);
                });
                productionSelect.disabled = false;
            } else {
                const option = document.createElement('option');
                option.disabled = true;
                option.textContent = 'Không có lệnh sản xuất';
                productionSelect.appendChild(option);
            }
        })
        .catch(error => {
            console.error('Lỗi khi lấy lệnh sản xuất:', error);
            productionSelect.innerHTML = '<option value="">--Lỗi tải dữ liệu--</option>';
            alert('Không thể tải danh sách lệnh sản xuất. Vui lòng thử lại.');
        });
    });

    // Khi chọn lệnh sản xuất → load chi tiết nguyên liệu
    productionSelect.addEventListener('change', function () {
        const maLenhSX = this.value;
        tableBody.innerHTML = '';

        if (!maLenhSX) return;

        // BƯỚC 1: Kiểm tra xem lệnh này đã có bảng kê chưa
        fetch(`/api/check_rollback_exist/?ma_lenh_sx=${maLenhSX}`)
            .then(response => {
                if (!response.ok) throw new Error(`Lỗi: ${response.status}`);
                return response.json();
            })
            .then(data => {
                if (data.exists) {
                    alert(data.message || 'Lệnh sản xuất này đã có bảng kê trừ lùi. Vui lòng xóa hết bảng kê cũ trước khi tạo mới.');
                    productionSelect.value = ''; // Reset lại lựa chọn
                    return;
                }

                // BƯỚC 2: Nếu không tồn tại, load chi tiết nguyên liệu
                fetch(`/api/get_lenh_san_xuat_detail/?ma_lenh_sx=${maLenhSX}`)
                    .then(response => {
                        if (!response.ok) throw new Error(`Lỗi: ${response.status}`);
                        return response.json();
                    })
                    .then(data => {
                        if (data.status === 'success' && Array.isArray(data.chi_tiet)) {
                            data.chi_tiet.forEach(item => {
                                addRow(maLenhSX, item);
                            });
                        } else {
                            alert(data.message || 'Không có dữ liệu chi tiết cho lệnh sản xuất này.');
                        }
                    })
                    .catch(error => {
                        console.error('Lỗi khi lấy chi tiết lệnh sản xuất:', error);
                        alert('Lỗi khi tải chi tiết sản phẩm.');
                    });
            })
            .catch(error => {
                console.error('Lỗi kiểm tra tồn tại:', error);
                alert('Không thể kiểm tra trạng thái lệnh sản xuất.');
            });
    });

    // Hàm thêm dòng nguyên liệu vào bảng
    function addRow(maLenhSX, item) {
        const row = document.createElement('tr');
        const tyLePhanTram = (item.ty_le_thu_hoi * 100).toFixed(2);

        row.innerHTML = `
            <td>${maLenhSX}</td>
            <td>${item.ten_nguyen_lieu}<input type="hidden" name="ten_nguyen_lieu[]" value="${item.ten_nguyen_lieu}"></td>
            <td>${item.ma_hs || ''}
                <input type="hidden" name="ma_hs[]" value="${item.ma_hs || ''}">
                <input type="hidden" name="id_san_pham[]" value="${item.id_san_pham || ''}">
            </td>
            <td>${item.don_vi_tinh}<input type="hidden" name="don_vi_tinh[]" value="${item.don_vi_tinh}"></td>
            <td><input type="number" name="so_luong_mua_vao[]" class="so-luong-mua" step="0.01" min="0" required></td>
            <td><input type="number" name="so_luong_san_xuat[]" class="so-luong-sx" step="0.01" min="0" required></td>
            <td>${tyLePhanTram}%<input type="hidden" name="ty_le_thu_hoi[]" value="${item.ty_le_thu_hoi}"></td>
            <td><input type="number" name="sl_thanh_pham_thu_hoi[]" class="sl-thanh-pham-thu-hoi" readonly></td>
            <td>${item.so_luong_nguyen_vat_lieu || 0}<input type="hidden" name="so_luong_san_pham_xuat[]" value="${item.so_luong_nguyen_vat_lieu || 0}"></td>
            <td><input type="number" name="sl_thanh_pham_ton_kho[]" class="sl-thanh-pham-ton-kho" readonly></td>
            <td><input type="text" name="ghi_chu[]"></td>
            <td><input type="date" name="ngay_tao[]" value="${getCurrentDate()}" required></td>
        `;

        tableBody.appendChild(row);

        const muaInput = row.querySelector('.so-luong-mua');
        const sxInput = row.querySelector('.so-luong-sx');

        muaInput.addEventListener('input', () => calculateThanhPham(row));
        sxInput.addEventListener('input', () => calculateThanhPham(row));

        calculateThanhPham(row); // initial
    }

    // Tính toán thành phẩm thu hồi và tồn kho
    function calculateThanhPham(row) {
        const soLuongSX = parseFloat(row.querySelector('.so-luong-sx').value) || 0;
        const tyLe = parseFloat(row.querySelector('input[name="ty_le_thu_hoi[]"]').value) || 0;
        const soLuongXuat = parseFloat(row.querySelector('input[name="so_luong_san_pham_xuat[]"]').value) || 0;

        const thuHoi = soLuongSX * tyLe;
        const tonKho = thuHoi - soLuongXuat;

        row.querySelector('.sl-thanh-pham-thu-hoi').value = thuHoi.toFixed(2);
        row.querySelector('.sl-thanh-pham-ton-kho').value = tonKho.toFixed(2);
    }

    // Validate khi submit
    document.getElementById('rollbackForm').addEventListener('submit', function (e) {
        const rows = tableBody.querySelectorAll('tr');
        if (rows.length === 0) {
            e.preventDefault();
            alert('Vui lòng chọn lệnh sản xuất và nhập đầy đủ thông tin.');
            return;
        }

        let hasEmpty = false;
        rows.forEach(row => {
            const mua = row.querySelector('.so-luong-mua').value;
            const sx = row.querySelector('.so-luong-sx').value;
            if (!mua || !sx) hasEmpty = true;
        });

        if (hasEmpty) {
            e.preventDefault();
            alert('Vui lòng nhập số lượng mua vào và sản xuất đầy đủ.');
        }
    });
});
