from paddleocr import PaddleOCR
import cv2
from deep_translator import GoogleTranslator   
from tkinter import Tk, filedialog
import base64
from groq import Groq
import sys
sys.stdout.reconfigure(encoding='utf-8')

Tk().withdraw()

client = Groq(api_key="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")
image_path = filedialog.askopenfilename(
    title="Select an image file",
    filetypes=[("Image files", "*.jpg *.jpeg *.png *.bmp *.gif")]
)
with open(image_path, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode("utf-8")

response = client.chat.completions.create(
    model="meta-llama/llama-4-scout-17b-16e-instruct",
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "image_url",
                 "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}},
                {"type": "text",
                 "text": "You are an Helpful assistance Detect the language of the text in the image. Return ONLY the ISO 639-1 code (like 'ta', 'hi', 'en'). Do not add anything else, no punctuation, no explanations"}
            ]
        }
    ],
    max_completion_tokens=10
)
lang_code = response.choices[0].message.content.strip().lower()
lang_code = ''.join(filter(str.isalpha, lang_code))
print(f"Detected language by Llama 4 Scout: {lang_code}")
    
print("Selected file:", image_path)
ocr = PaddleOCR(lang=lang_code)


result = ocr.predict(image_path)
frame_texts = []
for res in result:
    texts = res.get("rec_texts", [])
print(texts)
s = " ".join(texts)


with open("detected_text.txt" , "w" , encoding='utf-8') as f:
    f.write(s)

try: 
    translated = GoogleTranslator(source=lang_code, target='en').translate(s)

    with open("translated.txt", "w", encoding="utf-8") as f:
        f.write(translated)
except:
    print("Connection Lost....")



import os
from groq import Groq

client = Groq(api_key="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")
with open("translated.txt" , 'r' , encoding='utf-8') as f:
    content = f.read()

speech_file_path = "speech.wav" 
model = "playai-tts"
voice = "Fritz-PlayAI"
text = content
response_format = "wav"

response = client.audio.speech.create(
    model=model,
    voice=voice,
    input=text,
    response_format=response_format
)

response.write_to_file(speech_file_path)

response_1 = client.audio.speech.create(
    model=model,
    voice=voice,
    input=s,
    response_format=response_format
)

response_1.write_to_file("speech_1.wav")