# Multilingual OCR & Translation

Turn text from images or a live camera into readable + spoken output — with language detection, OCR, translation, and TTS.

## What it does

1. Take a frame from an **ESP32-CAM** stream, or upload an image
2. Detect the language in the image (Groq vision / Llama)
3. Run **PaddleOCR** for that language
4. Translate the text (e.g. with Google Translator)
5. Optionally convert original + translated text to speech

Built for multilingual documents (including Indian languages like Tamil / Hindi).

## Stack

| Layer | Tools |
| --- | --- |
| OCR | PaddleOCR, OpenCV |
| Language detect | Groq (`meta-llama/llama-4-scout-…`) vision |
| Translation | `deep-translator` |
| Backend | FastAPI / Uvicorn (`run_backend.py` → port `9000`) |
| Frontend | React + Vite + Tailwind (`frontend/`) |

## Project layout

```
OCR/
├── backend/           # capture + upload pipelines
│   ├── capture_image.py
│   └── upload_image.py
├── frontend/          # React UI (upload, language target, results)
├── run_backend.py     # start API from repo root
├── test/              # sample images
└── README.md
```

## Setup

### Backend

```bash
git clone https://github.com/ASWINN-M/OCR.git
cd OCR
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install paddleocr opencv-python deep-translator groq python-dotenv fastapi uvicorn
```

Create a `.env` in the project root:

```env
GROQ_API_KEY=your_groq_api_key
ESP32_CAM_URL=http://<esp32-ip>:81/stream
```

**Do not commit API keys.** Use environment variables only.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Run API

From the repo root:

```bash
python run_backend.py
```

API defaults to `http://0.0.0.0:9000`.

## Usage notes

- **Live capture:** Space captures a frame from the ESP32 stream; Esc exits the OpenCV window (`backend/capture_image.py`).
- **Upload:** File picker + OCR + translate flow in `backend/upload_image.py` and the React UI.
- Point the frontend axios base URL at your local API if needed.

## Portfolio

Featured on: [ASWINN-M/Portfolio](https://github.com/ASWINN-M/Portfolio)  
Live: https://ASWINN-M.github.io/Portfolio/

## License

See repository for license details (currently unlicensed unless added).
