document.addEventListener("DOMContentLoaded", function() {
    document.getElementById("analyzeBtn").addEventListener("click", analyzeText);
});

function analyzeText() {
    const text = document.getElementById("userInput").value;
    const languageBtn = document.getElementById("selected-language");
    const language = languageBtn.getAttribute('data-value'); // รับค่าจาก data-value
    const analyzeBtn = document.getElementById("analyzeBtn");
    const loader = document.getElementById("loader");
    const resultDiv = document.getElementById("result");

    if (!text.trim()) {
        alert("กรุณาใส่ข้อความก่อนกดวิเคราะห์");
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

document.addEventListener("DOMContentLoaded", function () {
    const dropdown = document.querySelector(".custom-dropdown");
    const dropdownBtn = document.getElementById("selected-language");
    const dropdownList = document.querySelector(".dropdown-list");
    const dropdownItems = document.querySelectorAll(".dropdown-list li");

    // เปิด/ปิด dropdown
    dropdownBtn.addEventListener("click", function () {
        dropdown.classList.toggle("active");
    });

    // เลือกภาษาและอัปเดต UI
    // ในส่วนการจัดการคลิก dropdown item
dropdownItems.forEach(item => {
    item.addEventListener("click", function () {
        const selectedValue = this.getAttribute("data-value");
        const selectedImg = this.getAttribute("data-img");
        dropdownBtn.innerHTML = `<img src="${selectedImg}" alt="${selectedValue} Flag"> ${this.textContent.trim()}`;
        dropdownBtn.setAttribute('data-value', selectedValue); // เพิ่ม data-value
        dropdown.classList.remove("active");
    });
});

    // ปิด dropdown เมื่อคลิกข้างนอก
    document.addEventListener("click", function (e) {
        if (!dropdown.contains(e.target)) {
            dropdown.classList.remove("active");
        }
    });
});
