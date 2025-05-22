document.addEventListener('DOMContentLoaded', () => {
    console.log("Trang xem bảng kê trừ lùi nguyên liệu đã được tải.");
     // === AJAX Export PDF + In ===
    const exportBtn = document.querySelector('#btn-export-pdf');
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const recordId = document.querySelector('#record-id')?.value;
            if (!recordId) return alert('Không tìm thấy mã bảng kê.');

            fetch(`/rollback/${recordId}/export/pdf/`)
                .then(res => res.text())
                .then(html => {
                    const newWin = window.open('', '_blank');
                    newWin.document.write(html);
                    newWin.document.close();

                    newWin.onload = () => {
                        newWin.focus();
                        newWin.print();
                    };
                })
                .catch(err => {
                    console.error('Lỗi xuất PDF:', err);
                    alert('Không thể tải nội dung để in PDF.');
                });
        });
    }
    // Hàm chuyển đổi số thành chữ tiếng Việt với chữ cái đầu viết hoa
    const numberToVietnameseWords = (number) => {
        if (number === 0) return "Không";
        
        const units = ["", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
        const teens = ["", "mười một", "mười hai", "mười ba", "mười bốn", "mười lăm", "mười sáu", "mười bảy", "mười tám", "mười chín"];
        const tens = ["", "mười", "hai mươi", "ba mươi", "bốn mươi", "năm mươi", "sáu mươi", "bảy mươi", "tám mươi", "chín mươi"];
        
        // Xử lý số hàng trăm
        const handleHundreds = (num) => {
            if (num === 0) return "";
            
            let result = "";
            const hundred = Math.floor(num / 100);
            const remainder = num % 100;
            
            if (hundred > 0) {
                result += units[hundred] + " trăm";
                
                // Xử lý phần còn lại
                if (remainder > 0) {
                    const ten = Math.floor(remainder / 10);
                    const unit = remainder % 10;
                    
                    if (ten === 0 && unit > 0) {
                        result += " lẻ " + units[unit];
                    } else if (ten === 1) {
                        if (unit === 0) {
                            result += " " + tens[1];
                        } else {
                            result += " " + teens[unit];
                        }
                    } else {
                        result += " " + tens[ten];
                        if (unit > 0) {
                            // Trường hợp đặc biệt cho "mươi năm" -> "mươi lăm"
                            if (unit === 5 && ten > 1) {
                                result += " lăm";
                            } 
                            // Trường hợp đặc biệt cho "mươi một" -> "mươi mốt"
                            else if (unit === 1 && ten > 1) {
                                result += " mốt";
                            } else {
                                result += " " + units[unit];
                            }
                        }
                    }
                }
            }
            
            return result;
        };
        
        // Xử lý các nhóm 3 chữ số từ phải sang trái
        const processNumber = (num) => {
            if (num === 0) return "không";
            
            const groups = [];
            let temp = num;
            
            while (temp > 0) {
                groups.push(temp % 1000);
                temp = Math.floor(temp / 1000);
            }
            
            const groupNames = ["", " nghìn", " triệu", " tỷ", " nghìn tỷ", " triệu tỷ"];
            let result = "";
            
            for (let i = groups.length - 1; i >= 0; i--) {
                if (groups[i] !== 0) {
                    result += handleHundreds(groups[i]) + groupNames[i];
                    
                    // Thêm dấu phẩy giữa các nhóm
                    if (i > 0 && groups[i-1] !== 0) {
                        result += " ";
                    }
                } else if (i === 0 && groups.length > 1) {
                    // Không thêm gì nếu nhóm cuối cùng là 0
                } else if (i > 0 && groups[i+1] !== 0) {
                    // Thêm tên nhóm nếu nhóm trước không phải là 0
                    result += groupNames[i] + " ";
                }
            }
            
            // Viết hoa chữ cái đầu tiên
            return result.charAt(0).toUpperCase() + result.slice(1);
        };
        
        return processNumber(number);
    };
    
    // Calculate the missing "thanh_pham_kho_thu_hoi" value
    const calculateMissingValues = () => {
        // We'll only perform calculations if the thanh_pham_kho_thu_hoi value is empty
        // Otherwise, we'll respect the values coming from the database
        
        const dataRows = document.querySelectorAll('.print-table tbody tr:not(:last-child)');
        
        // Do not calculate if values are already set - use the values from the template
        // This is to ensure we use the mapped values from the database when available
    };
    
    // Format numbers with commas
    const formatNumbers = () => {
        const numericCells = document.querySelectorAll('.print-table td:not(.note-cell):not(.hs-code):not(.percent-value)');
        numericCells.forEach(cell => {
            const text = cell.textContent.trim();
            if (text && !isNaN(parseFloat(text.replace(/,/g, '')))) {
                const num = parseFloat(text.replace(/,/g, ''));
                if (num % 1 !== 0) {
                    cell.textContent = num.toLocaleString('vi-VN', { 
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                    });
                } else if (num > 0) {
                    cell.textContent = num.toLocaleString('vi-VN');
                }
            }
        });
    };

    // Improved HS code formatting to ensure consistent styling
    const formatHSCodes = () => {
        const hsCells = document.querySelectorAll('.print-table .hs-code');
        hsCells.forEach(cell => {
            const text = cell.textContent.trim();
            // Skip if empty
            if (!text) return;
            
            // Remove any existing dots or spaces to get clean code
            const cleanCode = text.replace(/[\.\s]/g, '');
            
            // Check if it's a valid HS code (digits only)
            if (/^\d+$/.test(cleanCode)) {
                // Ensure it's displayed as 6 digits by padding with leading zeros if needed
                const normalizedCode = cleanCode.padStart(6, '0');
                cell.textContent = normalizedCode;
            }
        });
    };

    // Format percentage values - Convert to proper display format (0.4 -> 40%)
    const formatPercentages = () => {
        const percentCells = document.querySelectorAll('.print-table .percent-value');
        percentCells.forEach(cell => {
            const text = cell.textContent.trim();
            if (text && !isNaN(parseFloat(text.replace(/[%,]/g, '')))) {
                // Remove % symbol if present
                let value = parseFloat(text.replace(/[%,]/g, ''));
                
                // Check if value is in decimal format (less than 1)
                if (value < 1) {
                    value = value * 100;
                }
                
                cell.textContent = `${value}%`;
            }
        });
    };

    // Format number in words in footer with capitalized first letter
    const formatInventoryInWords = () => {
        const inventoryElement = document.querySelector('.print-footer .left p:first-child');
        if (inventoryElement) {
            const text = inventoryElement.textContent;
            const matches = text.match(/: ([0-9.,]+) kg/);

            if (matches && matches[1]) {
                const cleaned = matches[1].replace(/,/g, '');
                const numValue = parseFloat(cleaned);  // Giữ số thập phân
                const intPart = Math.floor(numValue); // Lấy phần nguyên

                const numInWords = numberToVietnameseWords(intPart);
                inventoryElement.innerHTML = `Số lượng TP còn tồn kho: ${numValue.toLocaleString('vi-VN')} kg (${numInWords} kg)`;
            }
        }
    };

    // Add button hover effects
    const enhanceButtons = () => {
        const buttons = document.querySelectorAll('.btn-group a');
        buttons.forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                btn.style.transform = 'translateY(-2px)';
                btn.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
            });
            
            btn.addEventListener('mouseleave', () => {
                btn.style.transform = 'translateY(0)';
                btn.style.boxShadow = '0 2px 5px rgba(0,0,0,0.1)';
            });
        });
    };

    // Initialize
    calculateMissingValues();
    formatHSCodes();
    formatPercentages();
    formatNumbers();
    formatInventoryInWords();
    enhanceButtons();
});