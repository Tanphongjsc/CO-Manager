// orders.js
document.addEventListener('DOMContentLoaded', function() {
    // Các phần tử DOM
    const modal = document.getElementById('productDetailModal');
    const closeBtn = document.getElementsByClassName('close')[0];
    const detailButtons = document.querySelectorAll('.detail-btn');
    const exportPdfBtn = document.getElementById('export-pdf');
    const exportExcelBtn = document.getElementById('export-excel');

    
    // Truy xuất dữ liệu Từ JSON được render bởi Django
    function getOrderItemsFromJson() {
        const dataScript = document.getElementById('order-data');
        if (dataScript) {
            try {
                const data = JSON.parse(dataScript.textContent);
                return data.items;
            } catch (e) {
                console.error('Lỗi khi phân tích dữ liệu JSON:', e);
                return [];
            }
        }
        return [];
    }
    
    // Lấy dữ liệu 
    const orderItems = getOrderItemsFromJson();
    
    // Xử lý nút chi tiết ---------------------------------------------------------------
    detailButtons.forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            
            // Tìm thông tin sản phẩm từ dữ liệu
            const productDetails = orderItems.filter(item => item.id === productId);
            
            if (productDetails.length > 0) {
                // Hiển thị thông tin sản phẩm trong modal
                document.getElementById('modal-product-name').textContent = productDetails[0].name;
                document.getElementById('modal-product-quantity').textContent = productDetails[0].quantity;
                document.getElementById('modal-product-unit').textContent = productDetails[0].unit;
                
                // Xóa dữ liệu cũ trong bảng nguyên vật liệu
                const materialsTable = document.getElementById('modal-materials');
                materialsTable.innerHTML = '';
                
                // Tạo bảng nguyên vật liệu từ dữ liệu thực
                const materialsMap = new Map(); // Sử dụng Map để nhóm các nguyên vật liệu giống nhau
                
                productDetails.forEach(item => {
                    const key = item.materialName;
                    if (!materialsMap.has(key)) {
                        materialsMap.set(key, {
                            name: item.materialName,
                            quantity: parseFloat(item.materialQuantity),
                            unit: item.materialUnit
                        });
                    } else {
                        // Cộng dồn số lượng nếu nguyên vật liệu đã tồn tại
                        const material = materialsMap.get(key);
                        material.quantity += parseFloat(item.materialQuantity);
                    }
                });
                
                // Thêm dữ liệu vào bảng
                materialsMap.forEach(material => {
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${material.name}</td>
                        <td>${material.quantity}</td>
                        <td>${material.unit}</td>
                    `;
                    materialsTable.appendChild(row);
                });
            }
            
            // Hiển thị modal
            modal.style.display = 'block';
        });
    });
    
    // Đóng modal khi nhấp vào nút đóng
    closeBtn.addEventListener('click', function() {
        modal.style.display = 'none';
    });
    
    // Đóng modal khi nhấp bên ngoài modal
    window.addEventListener('click', function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    });

    
    // Xử lý nút xuất PDF ---------------------------------------------------------------
    if (exportPdfBtn) {
        exportPdfBtn.addEventListener('click', async function() {
            try {
                const orderId = this.dataset.ordersId;
                const response = await fetch(`/orders/${orderId}/export/?format=pdf`);
                
                if (!response.ok) throw new Error(`HTTP error ${response.status}`);
                
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
                console.error('Lỗi khi tạo bản in:', error);
                alert('Không thể tạo bản PDF.');
            }
        });
    }

    
    // Xử lý nút xuất Excel ---------------------------------------------------------------
    if (exportExcelBtn) {
        exportExcelBtn.addEventListener('click', function() {
            const orderId = this.dataset.ordersId;
            // chuyển hướng trình duyệt đến view export
            window.location.href = `/orders/${orderId}/export/?format=excel`;
        });
    }
});