// ฟังก์ชันลบประวัติการวิเคราะห์
function deleteHistory(text) {
    Swal.fire({
        title: 'คุณแน่ใจหรือไม่?',
        text: "คุณจะไม่สามารถย้อนกลับการลบข้อมูลนี้!",
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#3085d6',
        cancelButtonColor: '#d33',
        confirmButtonText: 'ยืนยัน',
        cancelButtonText: 'ยกเลิก'
    }).then((result) => {
        if (result.isConfirmed) {
            // ดำเนินการลบข้อมูล
            fetch("/delete_history", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: text })
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    location.reload(); // รีเฟรชหน้าเพื่ออัปเดตประวัติ
                } else {
                    Swal.fire(
                        'เกิดข้อผิดพลาด!',
                        'เกิดข้อผิดพลาดขณะลบข้อมูล',
                        'error'
                    );
                }
            });
        }
    });
}

// ฟังก์ชันดาวน์โหลดประวัติการวิเคราะห์เป็นไฟล์ txt
function downloadResult(text, sentiment, confidence, response) {
    const content = `ข้อความ: ${text}\nอารมณ์: ${sentiment} (ความมั่นใจ: ${confidence})\nคำตอบ AI: ${response}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "analysis_result.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

document.addEventListener("DOMContentLoaded", function () {
    // กำหนดจำนวนประวัติต่อหน้า
    const itemsPerPage = 4;

    // รับประวัติทั้งหมด
    const historyCards = Array.from(document.querySelectorAll(".history-card"));

    // คำนวณจำนวนหน้า
    const totalPages = Math.ceil(historyCards.length / itemsPerPage);

    // แสดงประวัติบนหน้าแรก
    displayPage(1, historyCards, itemsPerPage);

    // สร้างปุ่ม pagination ถ้ามีมากกว่าหนึ่งหน้า
    if (totalPages > 1) {
        createPagination(totalPages);
    } else {
        document.getElementById("pagination").style.display = "none";
    }

    // ฟังก์ชันแสดงประวัติบนหน้าที่ระบุ
    function displayPage(page, cards, itemsPerPage) {
        const startIndex = (page - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;

        cards.forEach((card, index) => {
            if (index >= startIndex && index < endIndex) {
                card.style.display = "block";
            } else {
                card.style.display = "none";
            }
        });
    }

    // ฟังก์ชันสร้างปุ่ม pagination
    function createPagination(totalPages) {
        const paginationContainer = document.getElementById("pagination");

        for (let i = 1; i <= totalPages; i++) {
            const pageBtn = document.createElement("button");
            pageBtn.textContent = i;
            pageBtn.classList.add("page-btn");

            if (i === 1) {
                pageBtn.classList.add("active");
            }

            pageBtn.addEventListener("click", () => {
                const currentPageBtns = document.querySelectorAll(".page-btn");
                currentPageBtns.forEach(btn => btn.classList.remove("active"));
                pageBtn.classList.add("active");

                displayPage(i, historyCards, itemsPerPage);
            });

            paginationContainer.appendChild(pageBtn);
        }
    }
});


document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".download-btn").forEach(button => {
        button.addEventListener("click", function () {
            let text = this.getAttribute("data-text");
            let sentiment = this.getAttribute("data-sentiment");
            let confidence = this.getAttribute("data-confidence");
            let response = this.getAttribute("data-response");

            downloadResult(text, sentiment, confidence, response);
        });
    });
});
