// ===== EVENT HANDLERS AND USER INTERACTIONS =====

// ===== FILTER FUNCTIONS =====

const handleFilter = () => {
    if (!filterSelectBox || !mainTableBody) return;
    const selectedValue = filterSelectBox.value.trim();
    const rows = Array.from(mainTableBody.querySelectorAll('tr'));
    const emptyRow = mainTableBody.querySelector('tr .empty-message')?.closest('tr');
    let visibleCount = 0;
    rows.forEach(row => {
        if (row === emptyRow) return;
        const code = row.cells[1]?.textContent.trim() || '';
        const shouldShow = !selectedValue || code === selectedValue;
        row.style.display = shouldShow ? '' : 'none';
        if (shouldShow) visibleCount++;
    });
    if (emptyRow) emptyRow.style.display = visibleCount === 0 ? 'table-row' : 'none';
};

// ===== MAIN TABLE ACTIONS =====

const handleMainTableActions = async (e) => {
    const button = e.target.closest('button.btn[data-id]');
    if (!button) return;
    const ctcId = button.dataset.id;

    if (button.classList.contains('delete-btn')) {
        if (!confirm(`Bạn chắc chắn muốn xóa CTC ID: ${ctcId}?`)) return;
        try {
            const response = await fetch(`/api/ctc/${ctcId}/delete/`, {
                method: 'DELETE',
                headers: { 'X-CSRFToken': getCsrfToken() }
            });
            if (response.ok) {
                alert('Xóa thành công!');
                window.location.reload();
            } else {
                const err = await response.json();
                alert(`Xóa thất bại: ${err.detail || err.message || response.statusText}`);
            }
        } catch (error) {
            console.error('Lỗi xóa CTC:', error);
            alert(`Lỗi: ${error.message}`);
        }
        return;
    }

    const ctcData = await fetchCtcDetails(ctcId);
    if (ctcData) {
        const mode = button.classList.contains('edit-btn') ? 'edit' : 'view';
        await populateModal(ctcData, mode);
        if (fields.id_lenh_san_xuat.value) { // Luôn fetch data khi mở modal để có dữ liệu mới nhất
            await fetchCtcCreateData(fields.id_lenh_san_xuat.value);
            updateExistingMaterialRowsWithApiData();
        }
    } else {
        console.warn(`Không tải được dữ liệu cho CTC ID: ${ctcId}.`);
    }
};

// ===== SAVE FUNCTION =====

const handleSave = async (e) => {
    e.preventDefault();
    const payload = {
        id_bang_ke_ctc: currentCtcId,
        id_lenh_san_xuat_id: fields.id_lenh_san_xuat.value,
        id_san_pham_id: fields.id_san_pham.value,
        so_to_hai_quan: fields.so_to_hai_quan.value,
        so_luong: cleanValue(fields.so_luong.value),
        tri_gia_fob: cleanValue(fields.tri_gia_fob.value),
        chi_tiet_nguyen_lieu: Array.from(materialTableBody.querySelectorAll('tr:not(#emptyMaterialRow)')).map((row, index) => {
            const getMaterialInputValue = (nameSuffix) => row.querySelector(`[name="material_${index}_${nameSuffix}"]`)?.value;
            const selectedMaterialOption = row.querySelector(`[name="material_${index}_id_nguyen_lieu"]`)?.selectedOptions[0];
            const chiTietId = row.dataset.originalMaterialDbId ? parseInt(row.dataset.originalMaterialDbId, 10) : null;
            return {
                id: chiTietId,
                id_nguyen_lieu: cleanValue(selectedMaterialOption?.value),
                ten_nguyen_lieu: selectedMaterialOption?.dataset.name || getMaterialInputValue('ten_nguyen_lieu'),
                ma_hs: getMaterialInputValue('ma_hs'),
                don_gia: cleanValue(getMaterialInputValue('don_gia')),
                dinh_muc_san_pham_hao_hut: cleanValue(getMaterialInputValue('dinh_muc')),
                thanh_tien_co_xuat_xu_field: cleanValue(getMaterialInputValue('tt_co_xx')),
                thanh_tien_khong_xuat_xu_field: cleanValue(getMaterialInputValue('tt_khong_xx')),
                nuoc_xuat_xu: cleanValue(getMaterialInputValue('nuoc_xx')),
                ngay_ke_bang_thu_mua: cleanValue(getMaterialInputValue('ngay_btm')),
                so_ban_khai_bao: cleanValue(getMaterialInputValue('loai_phu_luc')), // Updated name
                ngay_bang_ke_wo: getMaterialInputValue('ngay_lap_phu_luc'), // Updated name
                ghi_chu: cleanValue(getMaterialInputValue('ghi_chu'))
            };
        })
    };

    try {
        const url = currentCtcId ? `/api/ctc/${currentCtcId}/update/` : '/api/ctc/create/';
        const method = currentCtcId ? 'PUT' : 'POST';
        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json', 'X-CSRFToken': getCsrfToken() },
            body: JSON.stringify(payload)
        });
        const result = await response.json();
        if (response.ok) {
            alert(result.message || 'Lưu thành công!');
            closeModal();
            window.location.reload();
        } else {
            alert(`Lưu thất bại: ${result.detail || result.message || response.statusText}`);
        }
    } catch (error) {
        console.error('Lỗi lưu CTC:', error);
        alert(`Lỗi khi lưu: ${error.message}`);
    }
};

// ===== MATERIAL MANAGEMENT =====

const handleAddMaterialManual = () => {
    if (!isEditMode || !materialTableBody) return;
    const newIndex = materialTableBody.querySelectorAll('tr:not(#emptyMaterialRow)').length;
    const newRowData = {
        nuoc_xuat_xu: 'Việt Nam',
        so_ban_khai_bao: 'Phụ lục II', // Default
        don_gia: 0,
        dinh_muc_san_pham_hao_hut: 0,
    };
    const newRowElement = renderMaterialRow(newRowData, newIndex, true);
    materialTableBody.appendChild(newRowElement);
    updateMaterialTableDisplay();
};

const handleDeleteMaterial = (e) => {
    const btn = e.target.closest('.delete-material-btn');
    if (!btn || !isEditMode || !materialTableBody) return;
    const rowToDelete = btn.closest('tr');
    if (rowToDelete && rowToDelete !== emptyMaterialRow) {
        rowToDelete.remove();
        // Re-index rows
        materialTableBody.querySelectorAll('tr:not(#emptyMaterialRow)').forEach((row, idx) => {
            row.cells[0].textContent = idx + 1;
            row.querySelectorAll('[name]').forEach(input => {
                input.name = input.name.replace(/material_\d+/, `material_${idx}`);
            });
        });
        updateMaterialTableDisplay();
    }
};

// ===== EXPORT FUNCTIONS =====

const handleExport = async (button, format) => {
    const originalText = button.textContent;
    button.textContent = 'Đang xuất...';
    button.disabled = true;
    try {
        const ctcId = button.dataset.id;
        if (!ctcId) throw new Error(`Không tìm thấy ID CTC để xuất ${format}.`);
        const exportUrl = `/ctc/${ctcId}/export/?format=${format}`;
        const response = await fetch(exportUrl);
        if (!response.ok) throw new Error(`Lỗi server ${response.status}`);
        if (format === 'pdf') {
            const html = await response.text();
            const printWindow = window.open('', '_blank');
            if (!printWindow) throw new Error('Vui lòng cho phép pop-up.');
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.onload = () => printWindow.print();
        } else {
            window.location.href = exportUrl;
        }
    } catch (error) {
        console.error(`Lỗi xuất ${format}:`, error);
        alert(`Không thể xuất ${format}. ${error.message}`);
    } finally {
        setTimeout(() => {
            button.textContent = originalText;
            button.disabled = false;
        }, 1500);
    }
};

// ===== EVENT LISTENERS SETUP =====

document.addEventListener('DOMContentLoaded', () => {
    if (typeof initializeExistingCtcData === 'function') {
        initializeExistingCtcData();
    }

    buttons.filter?.addEventListener('click', (e) => { e.preventDefault(); handleFilter(); });
    
    buttons.clearFilter?.addEventListener('click', (e) => {
        e.preventDefault();
        
        // Kiểm tra nếu jQuery và Select2 đã được tải
        if (window.jQuery && jQuery.fn.select2) {
            // Reset giá trị của Select2 và kích hoạt sự kiện change
            $('#ctc-ma-lenh-sx-select').val(null).trigger('change');
        } else if (filterSelectBox) {
            // Fallback nếu không có jQuery/Select2
            filterSelectBox.value = '';
        }

        // Gọi hàm lọc để làm mới bảng
        handleFilter();
    });


    mainTableBody?.addEventListener('click', handleMainTableActions);

    buttons.addCtc?.addEventListener('click', async (e) => {
        e.preventDefault();
        await populateModal({ chi_tiet_nguyen_lieu: [] }, 'edit');
    });

    buttons.closeModal?.addEventListener('click', confirmCloseModal);
    window.addEventListener('click', (e) => { if (e.target === modal) confirmCloseModal(); });

    buttons.toggleEdit?.addEventListener('click', async () => {
        if (currentCtcId && !isEditMode) {
            const ctcData = await fetchCtcDetails(currentCtcId);
            if (ctcData) await populateModal(ctcData, 'edit');
        }
    });

    buttons.cancelEdit?.addEventListener('click', async () => {
        if (currentCtcId) {
            const d = await fetchCtcDetails(currentCtcId);
            if (d) await populateModal(d, 'view'); else closeModal();
        } else closeModal();
    });

    buttons.save?.addEventListener('click', handleSave);
    buttons.addMaterial?.addEventListener('click', handleAddMaterialManual);
    buttons.exportPdf?.addEventListener('click', function() { handleExport(this, 'pdf'); });
    buttons.exportExcel?.addEventListener('click', function() { handleExport(this, 'excel'); });

    materialTableBody?.addEventListener('click', (e) => {
        if (e.target.closest('.delete-material-btn')) handleDeleteMaterial(e);
    });

    materialTableBody?.addEventListener('change', (e) => {
        const target = e.target;
        if (!isEditMode) return;

        // Khi thay đổi Nguyên liệu
        if (target.classList.contains('material-select')) {
            const row = target.closest('tr');
            const selectedMaterialId = target.value;
            const lenhSxId = fields.id_lenh_san_xuat.value;
            const productId = fields.id_san_pham.value;

            let materialDetails = null;
            if (productId && lenhSxId && selectedMaterialId) {
                const productInfo = getProductDetails(lenhSxId, productId);
                materialDetails = productInfo?.nguyen_vat_lieu 
                    ? Object.values(productInfo.nguyen_vat_lieu).find(m => (m.id_san_pham || m.id)?.toString() === selectedMaterialId) 
                    : materialData.find(m => (m.id_san_pham || m.id)?.toString() === selectedMaterialId);
            }
            if (row) fillMaterialRowData(row, materialDetails);
        }

        // [MỚI] Khi thay đổi Loại Phụ Lục
        if (target.classList.contains('loai-phu-luc-select')) {
            const row = target.closest('tr');
            if (row) updateNgayLapPhuLuc(row);
        }
    });

    materialTableBody?.addEventListener('input', (e) => {
        const target = e.target;
        if (isEditMode && (target.classList.contains('material-don-gia') || target.classList.contains('material-dinh-muc') || target.classList.contains('material-nuoc-xx'))) {
            const row = target.closest('tr');
            if (row) calculateThanhTien(row);
        }
    });

    fields.id_lenh_san_xuat?.addEventListener('change', async function() {
        const lenhSxId = this.value;
        populateProductDropdown(lenhSxId);
        ['id_san_pham', 'ma_hs', 'don_vi_tinh', 'so_luong'].forEach(k => { if(fields[k]) fields[k].value = ''; });
        resetMaterialTable();
        ctcCreateApiData = null;
        if (lenhSxId && isEditMode) {
            await fetchCtcCreateData(lenhSxId);
        }
    });

    fields.id_san_pham?.addEventListener('change', function() {
        const selectedOpt = this.options[this.selectedIndex];
        const productId = this.value;
        const lenhSxId = fields.id_lenh_san_xuat.value;

        if (fields.ma_hs) fields.ma_hs.value = selectedOpt?.dataset.maHs || '';
        if (fields.don_vi_tinh) fields.don_vi_tinh.value = selectedOpt?.dataset.dvt || '';
        if (fields.so_luong) fields.so_luong.value = selectedOpt?.dataset.soLuongSp || '';
        resetMaterialTable();

        if (isEditMode && productId && materialTableBody) {
            const productDetails = getProductDetails(lenhSxId, productId);
            if (productDetails?.nguyen_vat_lieu) {
                const materialsForProduct = Object.values(productDetails.nguyen_vat_lieu);
                if (materialsForProduct.length > 0) {
                    materialsForProduct.forEach((nvl, index) => {
                        const newRowElement = renderMaterialRow({
                            id_nguyen_lieu: nvl.id_san_pham || nvl.id,
                            don_gia: nvl.don_gia || 0,
                        }, index, true);
                        materialTableBody.appendChild(newRowElement);
                        fillMaterialRowData(newRowElement, nvl);
                    });
                }
            }
        }
        updateMaterialTableDisplay();
    });
});