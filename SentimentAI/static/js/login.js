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