document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("analyzeBtn").addEventListener("click", analyzeText);
});

function analyzeText() {
    let text = document.getElementById("userInput").value;
    let language = document.getElementById("language").value;
    let analyzeBtn = document.getElementById("analyzeBtn");
    let loader = document.getElementById("loader");
    let resultDiv = document.getElementById("result");

    if (!text.trim()) {
        alert("กรุณาใส่ข้อความก่อนกดวิเคราะห์");
        return;
    }

    analyzeBtn.style.display = "none";
    loader.style.display = "block";
    resultDiv.style.display = "none"; // ซ่อนผลลัพธ์ตอนเริ่มต้น
    
    fetch("/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text, language: language })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            resultDiv.innerHTML = `<p style="color:red;"><b>ข้อผิดพลาด:</b> ${data.error}</p>`;
        } else {
            resultDiv.innerHTML = `<h3>ผลลัพธ์</h3><p><b>อารมณ์:</b> ${data.sentiment} (ความมั่นใจ: ${data.confidence})</p><p><b>AI ตอบ:</b> ${data.response}</p>`;
        }
        resultDiv.style.display = "block"; // แสดงกรอบผลลัพธ์เมื่อมีผลลัพธ์
    })
    .finally(() => {
        analyzeBtn.style.display = "inline-block";
        loader.style.display = "none";
    });
}

function login() {
    let username = document.getElementById("username").value.trim();
    let password = document.getElementById("password").value.trim();
    let errorMessage = document.getElementById("error-message");

    // ล้างข้อความแจ้งเตือนทุกครั้งที่เรียกฟังก์ชัน
    errorMessage.style.display = "none";
    errorMessage.textContent = "";

    if (username === "" || password === "") {
        errorMessage.textContent = "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน!";
        errorMessage.style.display = "block";
        return;
    }

    if (username === "admin" && password === "123") {
        window.location.href = "/home"; // เปลี่ยนไปหน้า index
    } else {
        errorMessage.textContent = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง! โปรดลองอีกครั้ง";
        errorMessage.style.display = "block";
    }
}

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
