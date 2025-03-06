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
