// product_form.js
document.addEventListener('DOMContentLoaded', function() {
    
    function getCsrfToken() {
        const cookieValue = document.cookie
            .split('; ')
            .find(row => row.startsWith('csrftoken='))
            ?.split('=')[1];
        return cookieValue || '';
    }

    function escapeHtml(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    const mode = document.getElementById('form-mode').value;
    const productId = mode === 'edit' ? document.getElementById('edit-product-id-val').value : null;

    // Load data if in edit mode
    if (mode === 'edit' && productId) {
        fetch(`/api/products/detail/${productId}/`)
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    fillProductForm(data.product);
                    data.materials.forEach(mat => addBomRow(mat));
                    calculateBomTotals();
                } else {
                    alert('Lỗi tải dữ liệu sản phẩm: ' + data.message);
                }
            });
    }

    function fillProductForm(p) {
        document.getElementById('id_san_pham').value = p.id_san_pham;
        document.getElementById('ten_sp_chinh').value = p.ten_sp_chinh;
        document.getElementById('ten_khac').value = p.ten_khac;
        document.getElementById('ma_hs').value = p.ma_hs;
        document.getElementById('ty_le_thu_hoi').value = p.ty_le_thu_hoi !== null ? p.ty_le_thu_hoi : '';
        document.getElementById('don_vi_tinh').value = p.don_vi_tinh;
        document.getElementById('loai_sp').value = p.loai_sp;
        document.getElementById('id_nhom_vthh').value = p.id_nhom_vthh;
        document.getElementById('ghi_chu').value = p.ghi_chu;
    }

    // --- BOM LOGIC ---
    const tbody = document.getElementById('bom-tbody');
    const addRowBtn = document.getElementById('add-bom-row-btn');
    
    addRowBtn.addEventListener('click', () => addBomRow());

    function addBomRow(data = {}) {
        const tr = document.createElement('tr');
        const safeId = escapeHtml(data.id_nguyen_vat_lieu || '');
        const safeTen = escapeHtml(data.ten_nguyen_lieu || '');
        const safeLoai = escapeHtml(data.loai_sp || '');
        const safeDvt = escapeHtml(data.don_vi_tinh || '');
        const safeGhiChu = escapeHtml(data.ghi_chu || '');
        tr.innerHTML = `
            <td class="stt-col"></td>
            <td>
                <div style="display: flex; gap: 5px;">
                    <input type="text" class="form-control bom-ma" value="${safeId}" readonly required>
                    <button type="button" class="btn btn-sm btn-info select-vattu-btn" style="padding: 0 5px;">+</button>
                </div>
            </td>
            <td><input type="text" class="form-control bom-ten" value="${safeTen}" readonly></td>
            <td><input type="text" class="form-control bom-loai" value="${safeLoai}" readonly></td>
            <td><input type="text" class="form-control bom-dvt" value="${safeDvt}" readonly></td>
            <td><input type="number" class="form-control bom-sl" step="0.0001" min="0" value="${data.so_luong || 0}" required></td>
            <td><input type="number" class="form-control bom-tl" step="0.000001" min="0" value="${data.trong_luong || 0}" required></td>
            <td><input type="number" class="form-control bom-gia" step="1" min="0" value="${data.gia || 0}"></td>
            <td style="text-align: center;"><input type="checkbox" class="bom-chinh" ${data.la_nvl_chinh ? 'checked' : ''}></td>
            <td><input type="text" class="form-control bom-ghi" value="${safeGhiChu}"></td>
            <td style="text-align: center;">
                <button type="button" class="btn btn-sm btn-danger delete-row-btn"><i class="fas fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
        updateStt();
        bindRowEvents(tr);
    }

    function updateStt() {
        const rows = tbody.querySelectorAll('tr');
        rows.forEach((row, index) => {
            row.querySelector('.stt-col').textContent = index + 1;
        });
        calculateBomTotals();
    }

    function bindRowEvents(row) {
        row.querySelector('.delete-row-btn').addEventListener('click', function() {
            row.remove();
            updateStt();
        });

        row.querySelector('.bom-sl').addEventListener('input', calculateBomTotals);
        row.querySelector('.bom-tl').addEventListener('input', calculateBomTotals);
        row.querySelector('.bom-chinh').addEventListener('change', calculateBomTotals);

        row.querySelector('.select-vattu-btn').addEventListener('click', function() {
            openSelectVattuModal(row);
        });
    }

    function calculateBomTotals() {
        let totalNet = 0;
        let totalGross = 0;
        let totalSl = 0;
        const rows = tbody.querySelectorAll('tr');

        rows.forEach(row => {
            const sl = parseFloat(row.querySelector('.bom-sl').value) || 0;
            const tl = parseFloat(row.querySelector('.bom-tl').value) || 0;
            const isChinh = row.querySelector('.bom-chinh').checked;

            totalSl += sl;
            totalGross += tl;
            if (isChinh) totalNet += tl;
        });

        document.getElementById('top-total-net').textContent = totalNet.toLocaleString(undefined, {maximumFractionDigits: 6});
        document.getElementById('top-total-gross').textContent = totalGross.toLocaleString(undefined, {maximumFractionDigits: 6});
        
        document.getElementById('footer-total-sl').textContent = totalSl.toLocaleString(undefined, {maximumFractionDigits: 4});
        document.getElementById('footer-total-tl').textContent = totalGross.toLocaleString(undefined, {maximumFractionDigits: 6});
        document.getElementById('footer-row-count').textContent = rows.length;
    }

    // --- MODAL CHỌN VẬT TƯ ---
    const modal = document.getElementById('selectVattuModal');
    const closeBtn = document.getElementById('closeSelectVattuModal');
    const searchInput = document.getElementById('vattu-search-input');
    const vattuTbody = document.getElementById('vattu-list-tbody');
    let currentRowToFill = null;
    let fullVattuList = [];

    if (modal) {
        closeBtn.addEventListener('click', () => modal.style.display = 'none');
        window.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
        searchInput.addEventListener('input', filterVattuList);
    }

    function openSelectVattuModal(row) {
        currentRowToFill = row;
        modal.style.display = 'block';
        
        if (fullVattuList.length === 0) {
            fetch('/api/products/vattu-list/')
                .then(res => res.json())
                .then(data => {
                    if (data.success) {
                        fullVattuList = data.data;
                        renderVattuTable(fullVattuList);
                    }
                });
        } else {
            renderVattuTable(fullVattuList);
        }
    }

    function renderVattuTable(list) {
        vattuTbody.innerHTML = '';
        
        // Trích xuất mã sản phẩm đang được form xử lý để không cho tự chọn
        const currentFormId = document.getElementById('id_san_pham').value.trim();
        
        // Trích xuất danh sách nguyên vật liệu đã chọn
        const selectedIds = Array.from(tbody.querySelectorAll('.bom-ma')).map(inp => inp.value);

        list.forEach(item => {
            const tr = document.createElement('tr');
            const isSelf = currentFormId && item.id_san_pham === currentFormId;
            const isSelected = selectedIds.includes(item.id_san_pham);
            
            const safeId = escapeHtml(item.id_san_pham);
            const safeTen = escapeHtml(item.ten_sp_chinh);
            const safeLoai = escapeHtml(item.loai_sp);
            const safeDvt = escapeHtml(item.don_vi_tinh);
            const safeNhom = escapeHtml(item.nhom_vthh || '');

            let btnHtml = '';
            if (isSelf) {
                btnHtml = '<span class="text-danger">SP hiện tại</span>';
            } else if (isSelected) {
                btnHtml = '<span class="text-muted">Đã chọn</span>';
            } else {
                btnHtml = `<button type="button" class="btn btn-sm btn-success choose-vt-btn" 
                                data-id="${safeId}" 
                                data-ten="${safeTen}"
                                data-loai="${safeLoai}"
                                data-dvt="${safeDvt}">Chọn</button>`;
            }

            tr.innerHTML = `
                <td>${safeId}</td>
                <td>${safeTen}</td>
                <td>${safeDvt}</td>
                <td>${safeLoai}</td>
                <td>${safeNhom}</td>
                <td>${btnHtml}</td>
            `;
            vattuTbody.appendChild(tr);
        });

        vattuTbody.querySelectorAll('.choose-vt-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                if (currentRowToFill) {
                    currentRowToFill.querySelector('.bom-ma').value = this.getAttribute('data-id');
                    currentRowToFill.querySelector('.bom-ten').value = this.getAttribute('data-ten');
                    currentRowToFill.querySelector('.bom-loai').value = this.getAttribute('data-loai');
                    currentRowToFill.querySelector('.bom-dvt').value = this.getAttribute('data-dvt');
                }
                modal.style.display = 'none';
            });
        });
    }

    function filterVattuList() {
        const val = searchInput.value.toLowerCase().trim();
        const filtered = fullVattuList.filter(item => {
            return (item.id_san_pham && item.id_san_pham.toLowerCase().includes(val)) ||
                   (item.ten_sp_chinh && item.ten_sp_chinh.toLowerCase().includes(val)) ||
                   (item.loai_sp && item.loai_sp.toLowerCase().includes(val)) ||
                   (item.nhom_vthh && item.nhom_vthh.toLowerCase().includes(val));
        });
        renderVattuTable(filtered);
    }

    // --- SUBMIT DATA ---
    document.getElementById('save-product-btn').addEventListener('click', function() {
        const productForm = document.getElementById('product-form');
        if (!productForm.checkValidity()) {
            productForm.reportValidity();
            return;
        }

        const id_san_pham = document.getElementById('id_san_pham').value.trim();
        const loai_sp = document.getElementById('loai_sp').value;
        const ty_le_thu_hoi = document.getElementById('ty_le_thu_hoi').value;

        if (ty_le_thu_hoi && parseFloat(ty_le_thu_hoi) < 0) {
            alert('Tỉ lệ thu hồi không được âm');
            return;
        }

        const productData = {
            id_san_pham: id_san_pham,
            ten_sp_chinh: document.getElementById('ten_sp_chinh').value,
            ten_khac: document.getElementById('ten_khac').value,
            ma_hs: document.getElementById('ma_hs').value,
            ty_le_thu_hoi: ty_le_thu_hoi,
            don_vi_tinh: document.getElementById('don_vi_tinh').value,
            loai_sp: loai_sp,
            id_nhom_vthh: document.getElementById('id_nhom_vthh').value,
            ghi_chu: document.getElementById('ghi_chu').value
        };

        const materialsData = [];
        const rows = tbody.querySelectorAll('tr');
        const nvlIds = new Set();
        
        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            const maNvl = row.querySelector('.bom-ma').value;
            if (!maNvl) {
                alert(`Dòng ${i+1}: Vui lòng chọn nguyên vật liệu`);
                return;
            }
            if (nvlIds.has(maNvl)) {
                alert(`Dòng ${i+1}: Nguyên vật liệu "${maNvl}" bị trùng lặp`);
                return;
            }
            nvlIds.add(maNvl);

            const sl = parseFloat(row.querySelector('.bom-sl').value) || 0;
            const tl = parseFloat(row.querySelector('.bom-tl').value) || 0;
            const gia = parseFloat(row.querySelector('.bom-gia').value) || 0;

            if (sl < 0 || tl < 0 || gia < 0) {
                alert(`Dòng ${i+1}: Số lượng, trọng lượng và giá không được âm`);
                return;
            }

            materialsData.push({
                id_nguyen_vat_lieu: maNvl,
                so_luong: sl,
                trong_luong: tl,
                gia: gia,
                la_nvl_chinh: row.querySelector('.bom-chinh').checked,
                ghi_chu: row.querySelector('.bom-ghi').value
            });
        }

        const payload = {
            product: productData,
            materials: materialsData
        };

        const targetUrl = mode === 'edit' ? '/products/update/' : '/api/products/create/';

        const saveBtn = document.getElementById('save-product-btn');
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Đang lưu...';

        fetch(targetUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify(payload)
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                alert(data.message);
                window.location.href = '/products/';
            } else {
                alert('Lỗi: ' + data.message);
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Lưu thông tin';
            }
        })
        .catch(err => {
            console.error(err);
            alert('Lỗi kết nối máy chủ');
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Lưu thông tin';
        });
    });
});
