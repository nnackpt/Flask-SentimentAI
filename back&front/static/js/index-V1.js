document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("analyzeBtn").addEventListener("click", analyzeText);
    document.getElementById("clearBtn").addEventListener("click", clearText);

    // History panel functionality
    const historyBtn = document.getElementById("historyBtn");
    const historyPanel = document.getElementById("historyPanel");
    const panelOverlay = document.getElementById("panelOverlay");
    const closePanel = document.getElementById("closePanel");

    // Open panel when history button is clicked
    historyBtn.addEventListener("click", function() {
        historyPanel.classList.add("open");
        panelOverlay.classList.add("open");
        loadHistoryItems(); // Load history items when panel opens
    });

    // Close panel only when close button is clicked
    closePanel.addEventListener("click", closeHistoryPanel);
    
    // Remove the event listener for panelOverlay
    // panelOverlay.addEventListener("click", closeHistoryPanel);
    
    function closeHistoryPanel() {
        historyPanel.classList.remove("open");
        panelOverlay.classList.remove("open");
    }
});

// Function to load history items from server
function loadHistoryItems() {
    const historyList = document.getElementById("historyList");
    historyList.innerHTML = '<div class="loading-spinner">กำลังโหลด...</div>';
    
    fetch("/get_history_data")
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            if (data.length === 0) {
                historyList.innerHTML = '<div class="empty-history-message">ไม่พบประวัติการวิเคราะห์</div>';
                return;
            }
            
            historyList.innerHTML = '';
            data.forEach((item, index) => {
                const historyItem = document.createElement("div");
                historyItem.className = "history-item";
                
                // Use text as the identifier or index if no ID is available
                historyItem.setAttribute("data-text", item.text);
                historyItem.setAttribute("data-index", index);
                
                // Fix sentiment class assignment
                let sentimentClass = "sentiment-neutral";
                // Check specifically for "ไม่พอใจ" (not satisfied)
                if (item.sentiment.includes("ไม่พอใจ")) {
                    sentimentClass = "sentiment-negative";
                }
                // Only assign positive class if it contains "พอใจ" but NOT "ไม่พอใจ"
                else if (item.sentiment.includes("พอใจ") && !item.sentiment.includes("ไม่พอใจ")) {
                    sentimentClass = "sentiment-positive";
                }
                
                historyItem.innerHTML = `
                    <div class="history-item-header">
                        <div class="history-date">${formatDate(item.timestamp)}</div>
                        <button class="delete-history-btn" aria-label="ลบรายการนี้">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                    <div class="history-text">${item.text}</div>
                    <div class="history-sentiment ${sentimentClass}">
                        ${item.sentiment} (${item.confidence})
                    </div>
                    <div class="history-response">
                        <strong>คำตอบแนะนำ:</strong> ${item.response || "ไม่มีข้อมูล"}
                    </div>
                `;
                
                historyList.appendChild(historyItem);
            });

            // Add event listeners for delete buttons
            document.querySelectorAll('.delete-history-btn').forEach(btn => {
                btn.addEventListener('click', handleDeleteHistory);
            });
        })
        .catch(error => {
            console.error('Error loading history:', error);
            historyList.innerHTML = `<div class="empty-history-message">เกิดข้อผิดพลาดในการโหลดประวัติ</div>`;
        });
}

// Function to handle history item deletion
function handleDeleteHistory(event) {
    event.stopPropagation(); // Prevent parent events from triggering
    
    const historyItem = event.target.closest('.history-item');
    const historyText = historyItem.getAttribute('data-text');
    
    if (confirm('คุณต้องการลบรายการนี้ใช่หรือไม่?')) {
        // Send delete request to server
        fetch("/delete_history", {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                text: historyText
            })
        })
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Remove the item from the UI with animation
                historyItem.style.opacity = '0';
                setTimeout(() => {
                    historyItem.remove();
                    
                    // Check if there are no items left
                    const historyList = document.getElementById("historyList");
                    if (historyList.children.length === 0) {
                        historyList.innerHTML = '<div class="empty-history-message">ไม่พบประวัติการวิเคราะห์</div>';
                    }
                }, 300);
                
                showNotification("ลบรายการเรียบร้อยแล้ว");
            } else {
                showNotification("เกิดข้อผิดพลาดในการลบรายการ");
            }
        })
        .catch(error => {
            console.error('Error deleting history:', error);
            showNotification("เกิดข้อผิดพลาดในการลบรายการ");
        });
    }
}

// Helper function to close the history panel
function closeHistoryPanel() {
    const historyPanel = document.getElementById("historyPanel");
    const panelOverlay = document.getElementById("panelOverlay");
    historyPanel.classList.remove("open");
    panelOverlay.classList.remove("open");
}

// Helper function to format date
function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('th-TH', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    }).format(date);
}

// Analyze text function
function analyzeText() {
    const text = document.getElementById("userInput").value;
    const languageBtn = document.getElementById("selected-language");
    const language = languageBtn.getAttribute('data-value');
    const analyzeBtn = document.getElementById("analyzeBtn");
    const loader = document.getElementById("loader");
    const resultDiv = document.getElementById("result");

    if (!text.trim()) {
        showNotification("กรุณาใส่ข้อความก่อนกดวิเคราะห์");
        return;
    }

    analyzeBtn.style.display = "none";
    loader.style.display = "block";
    resultDiv.style.display = "none";
    
    fetch("/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, language })
    })
    .then(response => {
        if (!response.ok) throw new Error('Network response was not ok');
        return response.json();
    })
    .then(data => {
        if (data.error) {
            resultDiv.innerHTML = `<p style="color:red;"><b>ข้อผิดพลาด:</b> ${data.error}</p>`;
        } else {
            resultDiv.innerHTML = `
                <h3>ผลลัพธ์</h3>
                <p><b>อารมณ์ของข้อความ:</b> ${data.sentiment} (ความมั่นใจ: ${data.confidence})</p>
                <p><b>แนะนำคำตอบจาก AI:</b> ${data.response}</p>
            `;
            // ลบบรรทัดด้านล่างนี้เพื่อไม่ให้เกิดการบันทึกซ้ำ
            // saveToHistory(text, data);
        }
        resultDiv.style.display = "block";
    })
    .catch(error => {
        console.error('Error:', error);
        resultDiv.innerHTML = `<p style="color:red;"><b>เกิดข้อผิดพลาด:</b> ${error.message}</p>`;
        resultDiv.style.display = "block";
    })
    .finally(() => {
        analyzeBtn.style.display = "inline-block";
        loader.style.display = "none";
    });
}

function clearText() {
    const userInput = document.getElementById("userInput");
    userInput.value = "";
}

// Function to show notification
function showNotification(message) {
    const notification = document.getElementById('customAlert');
    const messageElement = notification.querySelector('.notification-message');
    
    messageElement.textContent = message;
    notification.classList.add('show');
    
    setTimeout(() => {
      notification.classList.remove('show');
    }, 3000);
}

document.addEventListener("DOMContentLoaded", function () {
    const dropdown = document.querySelector(".custom-dropdown");
    const dropdownBtn = document.getElementById("selected-language");
    const dropdownList = document.querySelector(".dropdown-list");
    const dropdownItems = document.querySelectorAll(".dropdown-list li");

    // Toggle dropdown
    dropdownBtn.addEventListener("click", function () {
        dropdown.classList.toggle("active");
    });

    // Select language and update UI
    dropdownItems.forEach(item => {
        item.addEventListener("click", function () {
            const selectedValue = this.getAttribute("data-value");
            const selectedImg = this.getAttribute("data-img");
            dropdownBtn.innerHTML = `<img src="${selectedImg}" alt="${selectedValue} Flag"> ${this.textContent.trim()}`;
            dropdownBtn.setAttribute('data-value', selectedValue);
            dropdown.classList.remove("active");
        });
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", function (e) {
        if (!dropdown.contains(e.target)) {
            dropdown.classList.remove("active");
        }
    });
});