from paddleocr import PaddleOCR
import cv2
from deep_translator import GoogleTranslator    
import os
import base64
from groq import Groq
from dotenv import load_dotenv
from fastapi import FastAPI


load_dotenv()



client = Groq(api_key= os.getenv("GROQ_API_KEY"))
def run_capture_process(target_lang="en"):

    # Get ESP32 camera URL from environment variable or use default
    esp32_url = os.getenv("ESP32_CAM_URL", "http://172.21.9.93:81/stream")
    print(f"Connecting to ESP32 camera at: {esp32_url}")
    
    cap = cv2.VideoCapture(esp32_url)
    
    # Set buffer size to reduce latency
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

    if not cap.isOpened():
        print(f"Error: Cannot open ESP32-CAM stream at {esp32_url}")
        print("Please check:")
        print("1. ESP32 camera is powered on and connected to the network")
        print("2. The IP address and port are correct")
        print("3. The stream URL is accessible")
        exit()
    
    print("ESP32 camera connected successfully!")

    # best_frame_data = {"timestamp_sec": 0, "texts": [], "combined_length": 0}

    # frame_number = 0
    # fps = cap.get(cv2.CAP_PROP_FPS) or 30

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        # frame_number += 1
        # timestamp = frame_number / fps


        cv2.imshow("Press Esc to exit", frame)
        key = cv2.waitKey(1)
        if key == 27:  
            break
        
        if key == 32:
            import time
            from pathlib import Path
            
            # Save to current directory for processing
            image_path = "capture_image.jpg"
            cv2.imwrite(image_path , frame)
            
            # Also save to stored_images folder for reuse
            base_dir = Path(__file__).resolve().parent
            stored_dir = base_dir / "stored_images"
            stored_dir.mkdir(exist_ok=True)
            timestamp = int(time.time() * 1000)
            stored_path = stored_dir / f"image_{timestamp}.jpg"
            cv2.imwrite(str(stored_path), frame)
            
            break


    cap.release()
    cv2.destroyAllWindows()
    gray = cv2.cvtColor(frame , cv2.COLOR_BGR2GRAY)

    i = 0
    while os.path.exists(f"captured_images/gray_{i}.jpg"):
        i += 1
    cv2.imwrite(f"captured_images/gray_{i}.jpg" , gray)
    with open(f"captured_images/gray_{i}.jpg", "rb") as f:
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
    print(f"Detected language code:{lang_code}")

    ocr = PaddleOCR(lang=lang_code)
    result = ocr.predict(frame)
    frame_texts = []
    for res in result:
        texts = res.get("rec_texts", [])
    s = "".join(texts)
    print(texts)

    print("Translation in process...")
    with open("detected_text.txt" , "w" , encoding='utf-8') as f:
        f.write(s)

    try: 
        translated = GoogleTranslator(source=lang_code, target='ta').translate(s)

        with open("translated.txt", "w", encoding="utf-8") as f:
            f.write(translated)
    except:
        print("Connection Lost....")

    print(f"Translation Completed. It translated to  {'en'}")

    import os
    from groq import Groq


    print("Converting the Translated words and Original Language words to Speech....")
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

    print("Text To Speech Completed Successfully")