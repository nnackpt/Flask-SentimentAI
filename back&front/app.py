from flask import Flask, request, jsonify, render_template
import google.generativeai as genai
from transformers import AutoTokenizer, pipeline
import re
from pythainlp.tokenize import word_tokenize

app = Flask(__name__)
app.template_folder = "templates"

# ตั้งค่า Gemini API Key
genai.configure(api_key="***********************")   

# ใช้โมเดลใหม่ที่แม่นยำขึ้น
eng_model_name = "cardiffnlp/twitter-roberta-base-sentiment-latest"
thai_model_name = "airesearch/wangchanberta-base-att-spm-uncased"

# โหลดโมเดลและโทเคนไนเซอร์
eng_tokenizer = AutoTokenizer.from_pretrained(eng_model_name)
eng_classifier = pipeline("sentiment-analysis", model=eng_model_name, tokenizer=eng_tokenizer)

thai_tokenizer = AutoTokenizer.from_pretrained(thai_model_name)
thai_classifier = pipeline("sentiment-analysis", model=thai_model_name, tokenizer=thai_tokenizer)

# ฟังก์ชันประมวลผลข้อความก่อนวิเคราะห์อารมณ์
def preprocess_text(text, language):
    text = text.lower().strip()
    text = re.sub(r"[^\w\s]", "", text)  # ลบอักขระพิเศษ
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
    model = genai.GenerativeModel("gemini-pro")
    
    if language == "th":
        prompt = f"ตอบคำถามนี้เป็นภาษาไทย โดยให้คำตอบเป็นมุมมองของธุรกิจว่าควรตอบกลับลูกค้าอย่างไร: {prompt}"
    else:
        prompt = f"Answer this question in English, giving your answer from a business perspective on how you should respond to your customers: {prompt}"

    response = model.generate_content(prompt)
    return response.text

# หน้าแรกของเว็บ
@app.route("/")
def home():
    return render_template("index.html")

# API วิเคราะห์ข้อความ
@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json()
    user_text = data.get("text")
    language = data.get("language", "th")

    # ทำความสะอาดข้อความ
    processed_text = preprocess_text(user_text, language)

    # วิเคราะห์อารมณ์
    if language == "th":
        sentiment_result = thai_classifier(processed_text)[0]
    else:
        sentiment_result = eng_classifier(processed_text)[0]

    sentiment = map_sentiment(sentiment_result["label"], sentiment_result["score"], language)
    confidence = round(sentiment_result["score"], 2)

    # ให้ AI ตอบในภาษาที่เลือก
    ai_response = get_gemini_response(user_text, language)

    return jsonify({
        "sentiment": sentiment,
        "confidence": confidence,
        "response": ai_response,
    })

# ข้าม favicon.ico เพื่อไม่ให้เกิด 404
@app.route('/favicon.ico')
def favicon():
    return '', 204

if __name__ == "__main__":
    app.run(debug=True)