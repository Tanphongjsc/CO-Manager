$(document).ready(function() {
    // === Khai báo các phần tử DOM ===
    const addModal = document.getElementById('addAppendixModal');
    const editModal = document.getElementById('editAppendixModal');
    const viewModal = document.getElementById('viewAppendixModal');
    
    const addAppendixForm = document.getElementById('add-appendix-form');
    const editAppendixForm = document.getElementById('edit-appendix-form');

    const exportWordBtn = document.getElementById('export-word-btn');
    const exportPdfBtn = document.getElementById('export-pdf-btn');
    const saveAppendixBtn = document.getElementById('save-appendix-btn');
    const addModalLsxSelect = $('#add-modal-lsx-select');
    const purchaseDataTableBody = document.getElementById('purchase-data-body');
    const modalSpinner = document.getElementById('modal-loading-spinner');
    const checkAllCheckbox = document.getElementById('check-all-rows');
    const mainTableBody = document.getElementById('main-table-body');

    // === Hàm tiện ích ===
    function getCsrfToken() {
        return document.querySelector('[name=csrfmiddlewaretoken]').value;
    }

    function formatNumber(num) {
        const number = parseFloat(num);
        if (isNaN(number)) return '0.00';
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(number);
    }
    
    function formatNumberForDisplay(numStr) {
        const number = parseFloat(numStr);
        if (isNaN(number)) return '';
        return new Intl.NumberFormat('vi-VN').format(number);
    }

    function getCurrentDateString() {
        return new Date().toISOString().slice(0, 10);
    }

    function openModal(modal) { if (modal) $(modal).css('display', 'flex'); }
    function closeModal(modal) { if (modal) $(modal).hide(); }

    // Gắn sự kiện đóng cho tất cả các nút Hủy, Đóng, và biểu tượng X
    $('.modal .close, .modal .cancel-btn, .modal .close-btn').on('click', function() {
        $(this).closest('.modal').hide();
    });

    // === Logic lọc bảng chính ===
    $('#lsx-select').select2({
        placeholder: '-- Nhập hoặc chọn LSX --',
        allowClear: true
    }).on('change', function() {
        const selectedLsxId = $(this).val();
        $(mainTableBody).find('tr').each(function() {
            const rowLsxId = $(this).data('lsx-id')?.toString();
            if (selectedLsxId) {
                $(this).toggle(rowLsxId === selectedLsxId);
            } else {
                $(this).show();
            }
        });
    });

    // === Logic cho Modal "Thêm mới" ===
    $('#add-appendix-btn').on('click', function() {
        addAppendixForm?.reset();
        $(purchaseDataTableBody).empty();
        saveAppendixBtn.disabled = true;
        $(checkAllCheckbox).prop('checked', false);
        addModalLsxSelect.select2({
            placeholder: '-- Vui lòng chọn --',
            dropdownParent: $('#addAppendixModal'),
            allowClear: true
        }).val(null).trigger('change');
        openModal(addModal);
    });
    
    addModalLsxSelect.on('change', function() {
        const selectedLsxId = $(this).val();
        $(purchaseDataTableBody).empty();
        $(checkAllCheckbox).prop('checked', false);
        if (!selectedLsxId) {
            saveAppendixBtn.disabled = true;
            return;
        }
        modalSpinner.style.display = 'flex';
        saveAppendixBtn.disabled = true;

        fetch(`/api/phu_luc_x/get_purchase_data_for_create/?id_lenh_san_xuat=${selectedLsxId}`)
            .then(response => {
                if (!response.ok) throw new Error(`Lỗi mạng: ${response.statusText}`);
                return response.json();
            })
            .then(data => {
                const purchaseData = data.dict_ct_thu_mua_tu_dan;
                if (data.success && Array.isArray(purchaseData) && purchaseData.length > 0) {
                    purchaseData.forEach(item => {
                        const rowHTML = `
                            <tr data-id-bang-ke="${item.id_bang_ke_thu_mua_tu_dan}">
                                <td style="text-align: center;"><input type="checkbox" class="row-checkbox" checked></td>
                                <td data-field="ten_hang_hoa">${item.ten_nguyen_lieu || ''}</td>
                                <td data-field="ma_hs">${item.ma_hs || ''}</td>
                                <td data-field="so_luong" data-raw-value="${item.tong_so_luong || 0}">${formatNumber(item.tong_so_luong)}</td>
                                <td data-field="tri_gia" data-raw-value="${item.tong_thanh_tien || 0}">${formatNumber(item.tong_thanh_tien)}</td>
                                <td data-field="dia_chi">${item.dia_chi || ''}</td>
                                <td data-field="ngay_lap_bkt">${item.id_bang_ke_thu_mua_tu_dan__ngay_lap_giay_to || ''}</td>
                                <td><input type="date" class="appendix-date" value="${getCurrentDateString()}" required></td>
                                <td><input type="text" class="appendix-note" placeholder="Ghi chú..."></td>
                            </tr>
                        `;
                        purchaseDataTableBody.insertAdjacentHTML('beforeend', rowHTML);
                    });
                    $(checkAllCheckbox).prop('checked', true);
                    saveAppendixBtn.disabled = false;
                } else {
                     alert('Không tìm thấy dữ liệu thu mua hoặc dữ liệu không hợp lệ.');
                }
            })
            .catch(error => alert('Đã xảy ra lỗi khi tải dữ liệu: ' + error.message))
            .finally(() => { modalSpinner.style.display = 'none'; });
    });

    addAppendixForm?.addEventListener('submit', function(e) {
        e.preventDefault();
        const selectedRows = purchaseDataTableBody.querySelectorAll('.row-checkbox:checked');
        if (selectedRows.length === 0) {
            alert('Vui lòng chọn ít nhất một dòng để lưu.');
            return;
        }

        saveAppendixBtn.disabled = true;
        saveAppendixBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';

        const itemsToSave = Array.from(selectedRows).map(checkbox => {
            const row = checkbox.closest('tr');
            return {
                id_bang_ke_thu_mua_tu_dan: row.dataset.idBangKe,
                id_lenh_san_xuat: addModalLsxSelect.val(),
                ten_hang_hoa: row.querySelector('[data-field="ten_hang_hoa"]').textContent,
                ma_hs: row.querySelector('[data-field="ma_hs"]').textContent,
                so_luong_mua_tu_dan: parseFloat(row.querySelector('[data-field="so_luong"]').dataset.rawValue),
                tri_gia_mua_tu_dan: parseFloat(row.querySelector('[data-field="tri_gia"]').dataset.rawValue),
                dia_chi: row.querySelector('[data-field="dia_chi"]').textContent,
                ngay_lap_giay_to: row.querySelector('[data-field="ngay_lap_bkt"]').textContent.trim(),
                ngay_lap_phu_luc_x: row.querySelector('.appendix-date').value,
                ghi_chu: row.querySelector('.appendix-note').value
            };
        });

        fetch('/api/phu_luc_x/create/', {
            method: 'POST',
            headers: {'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken()},
            body: JSON.stringify(itemsToSave)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('Thêm mới thành công!');
                window.location.reload();
            } else {
                alert('Lỗi khi lưu: ' + (data.message || 'Không thể lưu.'));
                saveAppendixBtn.disabled = false;
                saveAppendixBtn.innerHTML = 'Lưu các mục đã chọn';
            }
        })
        .catch(error => {
            alert('Lỗi kết nối khi lưu.');
            saveAppendixBtn.disabled = false;
            saveAppendixBtn.innerHTML = 'Lưu các mục đã chọn';
        });
    });

    document.addEventListener('change', function(e) {
        if (e.target.id === 'check-all-rows') {
            $(purchaseDataTableBody).find('.row-checkbox').prop('checked', e.target.checked);
        }
    });

    // === SỬ DỤNG EVENT DELEGATION CHO CÁC NÚT THAO TÁC ===
    $(mainTableBody).on('click', '.btn', function(e) {
        const target = $(e.currentTarget);
        const id = target.data('id');
        const row = target.closest('tr');

        // --- Xử lý nút XEM ---
        if (target.hasClass('view-btn')) {
            $(viewModal).data('current-id', id); // Lưu ID cho các nút xuất file
            $('#view-lsx-id').text(row.data('lsx-id'));
            $('#view-ten-hang-hoa').text(row.data('ten-hang-hoa'));
            $('#view-ma-hs').text(row.data('ma-hs'));
            $('#view-so-luong').text(formatNumberForDisplay(row.data('so-luong')));
            $('#view-tri-gia').text(formatNumberForDisplay(row.data('tri-gia')));
            $('#view-dia-chi').text(row.data('dia-chi'));
            $('#view-ngay-lap').text(new Date(row.data('ngay-lap')).toLocaleDateString('vi-VN'));
            $('#view-ghi-chu').text(row.data('ghi-chu'));
            openModal(viewModal);
        }

        // --- Xử lý nút SỬA ---
        if (target.hasClass('edit-btn')) {
            $('#edit-appendix-id').val(id);
            // CẬP NHẬT: Lấy và điền tên hàng hóa
            $('#edit-ten-hang-hoa').val($(row).data('ten-hang-hoa'));
            $('#edit-ngay-lap').val($(row).data('ngay-lap'));
            $('#edit-ghi-chu').val($(row).data('ghi-chu'));
            openModal(editModal);
        }
        
        // --- Xử lý nút XÓA ---
        if (target.hasClass('delete-btn')) {
            if (confirm(`Bạn có chắc chắn muốn xóa bản ghi có ID ${id} không?`)) {
                fetch(`/api/phu_luc_x/delete/${id}/`, {
                    method: 'POST',
                    headers: { 'X-CSRFToken': getCsrfToken() }
                })
                .then(response => {
                    if (response.ok) return response.json();
                    throw new Error('Xóa thất bại.');
                })
                .then(data => {
                    if(data.success) {
                        alert('Xóa thành công!');
                        $(row).remove();
                    } else {
                        alert('Lỗi: ' + data.message);
                    }
                })
                .catch(error => alert(error.message));
            }
        }
    });

    // === Xử lý các nút xuất file ===
    if (exportWordBtn) {
        exportWordBtn.addEventListener('click', async function() {
            const originalText = this.innerHTML;
            const currentId = $(viewModal).data('current-id');
            if (!currentId) return;

            try {
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang xuất...';
                this.disabled = true;
                const url = `/api/phu_luc_x/export/${currentId}/?format=word`;
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Lỗi server: ${response.status}`);
                window.location.href = url;
                setTimeout(() => {
                    this.innerHTML = originalText;
                    this.disabled = false;
                }, 2000);
            } catch (error) {
                console.error('Lỗi khi xuất Word:', error);
                alert('Không thể xuất file Word. Vui lòng thử lại.');
                this.innerHTML = originalText;
                this.disabled = false;
            }
        });
    }

    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', async function() {
            const currentId = $(viewModal).data('current-id');
            if (!currentId) return;
            try {
                const url = `/api/phu_luc_x/export/${currentId}/?format=pdf`;
                const response = await fetch(url);
                if (!response.ok) throw new Error(`Lỗi HTTP: ${response.status}`);
                const html = await response.text();
                const printWindow = window.open('', '_blank');
                if (!printWindow) {
                    alert('Vui lòng cho phép pop-up và thử lại.');
                    return;
                }
                printWindow.document.write(html);
                printWindow.document.close();
                printWindow.onload = () => printWindow.print();
            } catch (error) {
                console.error('Lỗi khi tạo bản in PDF:', error);
                alert('Không thể tạo bản PDF để in.');
            }
        });
    }

    // === Xử lý submit form SỬA ===
    editAppendixForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const id = $('#edit-appendix-id').val();
        const data = {
            // CẬP NHẬT: Gửi thêm tên hàng hóa
            ten_hang_hoa: $('#edit-ten-hang-hoa').val(),
            ngay_lap_giay_to: $('#edit-ngay-lap').val(),
            ghi_chu: $('#edit-ghi-chu').val()
        };

        fetch(`/api/phu_luc_x/update/${id}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify(data)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert('Cập nhật thành công!');
                window.location.reload();
            } else {
                alert('Lỗi khi cập nhật: ' + (data.message || 'Không thể lưu.'));
            }
        })
        .catch(error => alert('Lỗi kết nối khi cập nhật.'));
    });
});