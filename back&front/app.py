from flask import Flask, request, jsonify, render_template, redirect, url_for
from flask_cors import CORS
import google.generativeai as genai
from transformers import AutoTokenizer, pipeline
import re
from pythainlp.tokenize import word_tokenize
from datetime import datetime

app = Flask(__name__, static_folder='static')
CORS(app)
app.template_folder = "templates"

# ตั้งค่า Gemini API Key
genai.configure(api_key="*********************")   

# ใช้โมเดลใหม่ที่แม่นยำขึ้น
eng_model_name = "cardiffnlp/twitter-roberta-base-sentiment-latest"
thai_model_name = "airesearch/wangchanberta-base-att-spm-uncased"

# โหลดโมเดลและโทเคนไนเซอร์
eng_tokenizer = AutoTokenizer.from_pretrained(eng_model_name)
eng_classifier = pipeline("sentiment-analysis", model=eng_model_name, tokenizer=eng_tokenizer)

thai_tokenizer = AutoTokenizer.from_pretrained(thai_model_name)
thai_classifier = pipeline("sentiment-analysis", model=thai_model_name, tokenizer=thai_tokenizer)

# รายการคำสำคัญสำหรับอารมณ์เชิงลบและเชิงบวก
NEGATIVE_KEYWORDS = [
    "ห่วย", "เสียหาย", "แย่", "ผิดหวัง", "ไม่พอใจ", "เลวร้าย", 
    "พัง", "ชำรุด", "ไม่ได้เรื่อง", "หลอกลวง", "โกง", 
    "ไม่ตรงปก", "ไม่โอเค", "ไม่ดี", "ไม่มีคุณภาพ", "ไร้ประโยชน์", 
    "ผิดพลาด", "ไม่สมราคา", "ไม่ครบ", "ขาดตก", "บกพร่อง", 
    "ช้า", "ล่าช้า", "ไม่ตอบโจทย์", "ไม่เป็นไปตามที่กล่าวอ้าง", 
    "ไม่เหมาะสม", "ไม่สะดวก", "ไม่พอใจอย่างมาก", "ไม่ได้มาตรฐาน", 
    "ไม่น่าพอใจ", "ไม่คุ้มค่า", "ไม่ใส่ใจ", "ไม่เอาใจใส่", 
    "ไม่สนใจ", "ไม่แก้ไข", "ไม่ช่วยเหลือ", "ไม่ตอบสนอง", 
    "ไม่รับผิดชอบ", "ไม่จริงใจ", "ไม่โปร่งใส", "ไม่ซื่อสัตย์"
]

POSITIVE_KEYWORDS = [
    "ดี", "พอใจ", "ขอบคุณ", "ยอดเยี่ยม", "ประทับใจ", 
    "คุ้มค่า", "คุณภาพดี", "รวดเร็ว", "ตรงเวลา", "ถูกต้อง", 
    "น่าพอใจ", "น่าประทับใจ", "สมบูรณ์แบบ", "ครบถ้วน", 
    "เป็นมืออาชีพ", "ใส่ใจ", "เอาใจใส่", "ช่วยเหลือดี", 
    "ตอบสนองดี", "รับผิดชอบ", "จริงใจ", "โปร่งใส", "ซื่อสัตย์", 
    "น่าเชื่อถือ", "น่าไว้วางใจ", "เกินคาด", "เหนือความคาดหมาย", 
    "น่าสนับสนุน", "น่าใช้งาน", "น่าซื้อ", "น่าลอง", 
    "น่าสนใจ", "น่าติดตาม", "น่าสัมผัส", "น่าชื่นชม"
]

def detect_keywords(text):
    text = text.lower()
    
    # นับจำนวนคำเชิงบวกและเชิงลบ
    positive_count = sum(1 for keyword in POSITIVE_KEYWORDS if keyword in text)
    negative_count = sum(1 for keyword in NEGATIVE_KEYWORDS if keyword in text)
    
    # กำหนดอารมณ์ตามจำนวนคำ
    if positive_count > negative_count:
        return "positive"
    elif negative_count > positive_count:
        return "negative"
    
    # หากไม่มีคำสำคัญ คืนค่า None
    return None

# ฟังก์ชันประมวลผลข้อความก่อนวิเคราะห์อารมณ์
def preprocess_text(text, language):
    text = text.lower().strip()
    text = re.sub(r"[^\w\s]", "", text)  # ลบอักขระพิเศษ
    
    # จำกัดความยาวข้อความ
    max_length = 512  # ตามข้อจำกัดของโมเดล
    if len(text) > max_length:
        text = text[:max_length]
    
    if language == "th":
        text = " ".join(word_tokenize(text))  # ตัดคำภาษาไทย
    return text

# ฟังก์ชันแปลงค่าอารมณ์เป็นระดับต่างๆ
def map_sentiment(sentiment_label, score, language):
    # กรณีที่เป็น "negative" (ไม่พอใจ) หรือ "คำวิจารณ์รุนแรง"
    if sentiment_label in ["neg", "negative"]:
        if score > 0.8:
            return "คำวิจารณ์รุนแรง 😠"  # คำวิจารณ์ที่รุนแรงมาก
        elif score > 0.6:
            return "ไม่พอใจ 😟"  # ไม่พอใจแบบทั่วไป
        else:
            return "เป็นกลาง 😐"  # ลดความผิดพลาดของโมเดล

    # กรณีที่เป็น "positive" (พอใจ)
    elif sentiment_label in ["pos", "positive"]:
        if score > 0.9:
            return "พอใจมาก 😊"  # ระดับความพอใจสูง
        elif score > 0.75:
            return "พอใจ 🙂"  # พอใจปกติ
        elif score > 0.5:  # เพิ่มระดับตรงนี้
            return "เป็นกลาง 😐"  # กรณีที่คะแนนไม่สูงพอ
        else:
            return "เป็นกลาง 😐"  # ป้องกันโมเดลตีความผิด

    # กรณีที่ไม่สามารถจำแนกอารมณ์ได้
    return "เป็นกลาง 😐"  # กรณีที่โมเดลไม่แน่ใจ

# ฟังก์ชันเรียก Gemini API
def get_gemini_response(prompt, language):
    try:
        model = genai.GenerativeModel("gemini-2.0-flash")
        
        if language == "th":
            prompt = f"ตอบคำถามนี้เป็นภาษาไทย โดยให้คำตอบเป็นมุมมองของธุรกิจว่าควรตอบกลับลูกค้าอย่างไร ขอคำตอบไม่เกิน 300 ตัวอักษร: {prompt}"
        else:
            prompt = f"Answer this question in English, giving your answer from a business perspective on how you should respond to your customers, Please provide an answer in no more than 300 characters.: {prompt}"
        
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        print(f"Error calling Gemini API: {e}")
        return "ขออภัย ไม่สามารถสร้างคำตอบได้ในขณะนี้ กรุณาลองใหม่ภายหลัง"

# หน้าแรกของเว็บ
@app.route("/")
def login_page():
    return render_template("login.html")

@app.route("/home")
def home():
    return render_template("index.html")

# Route สำหรับการออกจากระบบ
@app.route("/logout")
def logout():
    return redirect(url_for("login_page"))

# สร้าง list สำหรับเก็บประวัติการวิเคราะห์
analysis_history = []

@app.route("/delete_history", methods=["POST"])
def delete_history():
    try:
        data = request.get_json()
        text_to_delete = data.get("text")

        if not text_to_delete:
            return jsonify({"success": False, "error": "ไม่พบข้อมูลที่ต้องการลบ"}), 400

        # ลบข้อมูลจากประวัติ
        global analysis_history
        analysis_history = [item for item in analysis_history if item["text"] != text_to_delete]

        return jsonify({"success": True})
    except Exception as e:
        print(f"Error during deletion: {e}")
        return jsonify({"success": False, "error": "เกิดข้อผิดพลาดขณะลบข้อมูล"}), 500

# API วิเคราะห์ข้อความ
@app.route("/analyze", methods=["POST"])
def analyze():
    try:
        data = request.get_json()
        user_text = data.get("text")
        language = data.get("language", "th")
        if not user_text or not isinstance(user_text, str):
            return jsonify({"error": "กรุณาใส่ข้อความที่ต้องการวิเคราะห์"}), 400
        
        # ทำความสะอาดข้อความ
        processed_text = preprocess_text(user_text, language)
        
        # ตรวจจับคำสำคัญ
        keyword_sentiment = detect_keywords(user_text)
        if keyword_sentiment == "negative":
            sentiment = "ไม่พอใจ 😟"
            confidence = 0.95
        elif keyword_sentiment == "positive":
            sentiment = "พอใจ 🙂"
            confidence = 0.95
        else:
            # วิเคราะห์อารมณ์ด้วยโมเดล
            if language == "th":
                sentiment_result = thai_classifier(processed_text)[0]
            else:
                sentiment_result = eng_classifier(processed_text)[0]
            sentiment = map_sentiment(sentiment_result["label"], sentiment_result["score"], language)
            confidence = round(sentiment_result["score"], 2)
        
        # ให้ AI ตอบในภาษาที่เลือก
        ai_response = get_gemini_response(user_text, language)
        
        # เก็บประวัติการวิเคราะห์พร้อมบันทึกเวลา
        timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")  # บันทึกเวลาปัจจุบัน
        analysis_history.append({
            "text": user_text,
            "sentiment": sentiment,
            "confidence": confidence,
            "response": ai_response,
            "timestamp": timestamp  # เพิ่มฟิลด์ timestamp
        })
        return jsonify({
            "sentiment": sentiment,
            "confidence": confidence,
            "response": ai_response,
            "timestamp": timestamp  # ส่งค่า timestamp กลับไปยัง frontend (ถ้าต้องการ)
        })
    except Exception as e:
        print(f"Error during analysis: {e}")
        return jsonify({"error": "เกิดข้อผิดพลาดระหว่างการวิเคราะห์ กรุณาลองใหม่ภายหลัง"}), 500
    
# Route สำหรับหน้าประวัติการวิเคราะห์
@app.route("/history")
def history_page():
    # ตรวจสอบและเพิ่มค่าเริ่มต้นสำหรับ timestamp หากไม่มี
    for item in analysis_history:
        if "timestamp" not in item:
            item["timestamp"] = "1970-01-01 00:00:00"  # ค่าเริ่มต้นสำหรับข้อมูลเก่า
    
    # เรียงข้อมูลประวัติจากใหม่ไปเก่า (Newest to Oldest)
    sorted_history = sorted(analysis_history, key=lambda x: x["timestamp"], reverse=True)
    return render_template("history.html", history=sorted_history)

@app.route("/question")
def question():
    return render_template("question.html")

# ข้าม favicon.ico เพื่อไม่ให้เกิด 404
@app.route('/favicon.ico')
def favicon():
    return '', 204

if __name__ == "__main__":
    app.run(debug=True)