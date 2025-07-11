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
        if (mode === 'edit' && fields.id_lenh_san_xuat.value) {
            await fetchCtcCreateData(fields.id_lenh_san_xuat.value);
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
                so_ban_khai_bao: cleanValue(getMaterialInputValue('so_kb')),
                ngay_bang_ke_wo: getMaterialInputValue('ngay_wo'),
                ghi_chu: cleanValue(getMaterialInputValue('ghi_chu'))
            };
        })
    };

    try {
        const url = currentCtcId ? `/api/ctc/${currentCtcId}/update/` : '/api/ctc/create/';
        const method = currentCtcId ? 'PUT' : 'POST';
        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
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
        ma_hs: '',
        ngay_ke_bang_thu_mua: '',
        ngay_bang_ke_wo: '',
        nuoc_xuat_xu: 'Việt Nam',
        so_ban_khai_bao: 'Phụ lục II',
        don_gia: 0,
        dinh_muc_san_pham_hao_hut: 0,
        thanh_tien_co_xuat_xu_field: 0,
        thanh_tien_khong_xuat_xu_field: 0,
        ghi_chu: ''
    };
    const newRowElement = renderMaterialRow(newRowData, newIndex, true);
    if (emptyMaterialRow && emptyMaterialRow.style.display !== 'none' && materialTableBody.contains(emptyMaterialRow)) {
        materialTableBody.removeChild(emptyMaterialRow);
    }
    materialTableBody.appendChild(newRowElement);
    updateMaterialTableDisplay();
};

const handleDeleteMaterial = (e) => {
    const btn = e.target.closest('.delete-material-btn');
    if (!btn || !isEditMode || !materialTableBody) return;
    const rowToDelete = btn.closest('tr');
    if (rowToDelete && rowToDelete !== emptyMaterialRow) {
        rowToDelete.remove();
        updateMaterialTableDisplay();
        materialTableBody.querySelectorAll('tr:not(#emptyMaterialRow)').forEach((row, idx) => {
            row.cells[0].textContent = idx + 1;
            row.querySelectorAll('[name]').forEach(input => {
                input.name = input.name.replace(/material_\d+/, `material_${idx}`);
            });
            row.dataset.materialRowUiId = `new_${Date.now()}_${idx}`;
        });
    }
};

// ===== EXPORT FUNCTIONS =====

const handleExport = async (button, format) => {
    const originalText = button.textContent;
    try {
        button.textContent = 'Đang xuất...';
        button.disabled = true;
        const ctcId = button.dataset.id;
        if (!ctcId) {
            alert(`Không tìm thấy ID CTC để xuất ${format}.`);
            return;
        }
        const exportUrl = `/ctc/${ctcId}/export/?format=${format}`;
        const response = await fetch(exportUrl);
        if (!response.ok) throw new Error(`Lỗi server ${response.status}`);
        if (format === 'pdf') {
            const html = await response.text();
            const printWindow = window.open('', '_blank');
            if (!printWindow) {
                alert('Vui lòng cho phép pop-up.');
                return;
            }
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
        }, format === 'excel' ? 2000 : 500);
    }
};

// ===== EVENT LISTENERS SETUP =====

document.addEventListener('DOMContentLoaded', () => {
    // Khởi tạo dữ liệu về các CTC đã tồn tại
    if (typeof initializeExistingCtcData === 'function') {
        initializeExistingCtcData();
    }

    // Filter buttons
    buttons.filter?.addEventListener('click', (e) => {
        e.preventDefault();
        handleFilter();
    });

    buttons.clearFilter?.addEventListener('click', (e) => {
        e.preventDefault();
        if (filterSelectBox) filterSelectBox.value = '';
        handleFilter();
    });

    // Main table actions
    mainTableBody?.addEventListener('click', handleMainTableActions);

    // Modal buttons
    buttons.addCtc?.addEventListener('click', async (e) => {
        e.preventDefault();
        await populateModal({
            id_bang_ke_ctc: null,
            id_lenh_san_xuat_id: '',
            id_san_pham: {},
            chi_tiet_nguyen_lieu: []
        }, 'edit');
    });

    buttons.closeModal?.addEventListener('click', confirmCloseModal);

    window.addEventListener('click', (e) => {
        if (e.target === modal) confirmCloseModal();
    });

    buttons.toggleEdit?.addEventListener('click', async () => {
        if (currentCtcId && !isEditMode) {
            const ctcData = await fetchCtcDetails(currentCtcId);
            if (ctcData) {
                await populateModal(ctcData, 'edit');
                if (fields.id_lenh_san_xuat.value) {
                    await fetchCtcCreateData(fields.id_lenh_san_xuat.value);
                }
            }
        }
    });

    buttons.cancelEdit?.addEventListener('click', async () => {
        if (currentCtcId) {
            const d = await fetchCtcDetails(currentCtcId);
            if (d) await populateModal(d, 'view');
            else closeModal();
        } else closeModal();
    });

    buttons.save?.addEventListener('click', handleSave);
    buttons.addMaterial?.addEventListener('click', handleAddMaterialManual);

    // Export buttons
    buttons.exportPdf?.addEventListener('click', function() {
        handleExport(this, 'pdf');
    });
    buttons.exportExcel?.addEventListener('click', function() {
        handleExport(this, 'excel');
    });

    // Material table events
    materialTableBody?.addEventListener('click', (e) => {
        if (e.target.closest('.delete-material-btn')) handleDeleteMaterial(e);
    });

    materialTableBody?.addEventListener('change', (e) => {
        if (e.target.classList.contains('material-select') && isEditMode) {
            const select = e.target;
            const row = select.closest('tr');
            const selectedMaterialId = select.value;
            const lenhSxId = fields.id_lenh_san_xuat.value;
            const productId = fields.id_san_pham.value;

            let materialDetails = null;
            if (productId && lenhSxId && selectedMaterialId) {
                const productInfo = getProductDetails(lenhSxId, productId);
                if (productInfo?.nguyen_vat_lieu) {
                    materialDetails = Object.values(productInfo.nguyen_vat_lieu).find(m => 
                        (m.id_san_pham || m.id)?.toString() === selectedMaterialId.toString()
                    );
                }
            }
            if (!materialDetails && selectedMaterialId) {
                materialDetails = materialData.find(m => 
                    (m.id_san_pham || m.id)?.toString() === selectedMaterialId.toString()
                );
            }

            if (row && materialDetails) {
                fillMaterialRowData(row, materialDetails, false);
            } else if (row) {
                row.querySelector('input[name$="_ma_hs"]').value = '';
                row.querySelector('input[name$="_dinh_muc"]').value = '';
                row.querySelector('input[name$="_ngay_btm"]').value = '';
                row.querySelector('input[name$="_ngay_wo"]').value = '';
                calculateThanhTien(row);
            }
        }
    });

    materialTableBody?.addEventListener('input', (e) => {
        const target = e.target;
        // Cập nhật điều kiện 'if' để bao gồm cả class 'material-nuoc-xx'
        if (isEditMode && (
            target.classList.contains('material-don-gia') || 
            target.classList.contains('material-dinh-muc') ||
            target.classList.contains('material-nuoc-xx') // <-- Thêm điều kiện này
        )) {
            const row = target.closest('tr');
            if (row) calculateThanhTien(row);
        }
    });

    // Form field events
    fields.id_lenh_san_xuat?.addEventListener('change', async function() {
        const lenhSxId = this.value;
        populateProductDropdown(lenhSxId);
        ['id_san_pham', 'ma_hs', 'don_vi_tinh', 'so_luong'].forEach(fieldKey => {
            if(fields[fieldKey]) fields[fieldKey].value = '';
        });
        resetMaterialTable();

        if (lenhSxId && isEditMode) {
            await fetchCtcCreateData(lenhSxId);
            updateExistingMaterialRowsWithApiData();
        } else {
            ctcCreateApiData = null;
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
                    if (emptyMaterialRow && materialTableBody.contains(emptyMaterialRow)) materialTableBody.removeChild(emptyMaterialRow);
                    materialsForProduct.forEach((nvl, index) => {
                        const newRowElement = renderMaterialRow({
                            id_nguyen_lieu: nvl.id_san_pham || nvl.id,
                            ten_nguyen_lieu: nvl.ten_khac || nvl.ten_sp_chinh,
                            ma_hs: nvl.ma_hs,
                            nuoc_xuat_xu: 'Việt Nam',
                            so_ban_khai_bao: 'Phụ lục II',
                            don_gia: nvl.don_gia || 0,
                        }, index, true);
                        materialTableBody.appendChild(newRowElement);
                        fillMaterialRowData(newRowElement, nvl, true);
                    });
                }
            }
        }
        updateMaterialTableDisplay();
    });
});
