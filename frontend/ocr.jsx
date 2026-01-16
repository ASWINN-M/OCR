import React, { useState, useRef } from "react";
import axios from "axios";

// Note: This single-file React app contains multiple components used by App.
// Required packages: react, react-dom, axios, tailwindcss, @mui/material (optional).
// Tailwind should be configured in your project for styles to apply.

// --------------------- LanguageSelector.js ---------------------
export function LanguageSelector({ value, onChange }) {
  const languages = [
    { code: "en", name: "English" },
    { code: "hi", name: "Hindi" },
    { code: "ta", name: "Tamil" },
    { code: "te", name: "Telugu" },
    { code: "ml", name: "Malayalam" },
    { code: "fr", name: "French" },
    { code: "es", name: "Spanish" },
    { code: "zh", name: "Chinese" },
    { code: "auto", name: "Auto-detect" },
  ];

  return (
    <div className="flex gap-2 items-center">
      <label className="text-sm font-medium">Target:</label>
      <select
        className="p-2 border rounded-md bg-white"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {languages.map((l) => (
          <option key={l.code} value={l.code}>
            {l.name} ({l.code})
          </option>
        ))}
      </select>
    </div>
  );
}


export function UploadImage({ onFileSelected }) {
  const fileRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files[0];
    if (file) onFileSelected(file);
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <p className="mb-2 text-sm text-gray-600">Upload an image containing text</p>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="block w-full text-sm text-gray-700"
      />
      <div className="mt-3 flex gap-2">
        <button
          onClick={() => fileRef.current && fileRef.current.click()}
          className="px-3 py-2 bg-blue-600 text-white rounded-md"
        >
          Choose File
        </button>
      </div>
    </div>
  );
}


export function CameraCapture({ onCapture }) {
  const videoRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);

  async function startCamera() {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setStreaming(true);
      }
    } catch (e) {
      setError("Unable to access camera. Check permissions.");
    }
  }

  function stopCamera() {
    const stream = videoRef.current?.srcObject;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
    setStreaming(false);
  }

  function capturePhoto() {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], "captured_image.jpg", { type: "image/jpeg" });

        // send image to parent
        onCapture(file);

        // auto-stop camera after capture
        stopCamera();
      }
    }, "image/jpeg", 0.9);
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Camera Capture</h3>
        {!streaming ? (
          <button
            onClick={startCamera}
            className="px-3 py-1 bg-green-600 text-white rounded"
          >
            Open Camera
          </button>
        ) : (
          <button
            onClick={stopCamera}
            className="px-3 py-1 bg-red-600 text-white rounded"
          >
            Stop
          </button>
        )}
      </div>

      {error && <div className="mb-2 text-sm text-red-600">{error}</div>}

      <div className="w-full h-64 bg-black rounded overflow-hidden flex items-center justify-center">
        <video ref={videoRef} className="w-full h-full object-cover" />
      </div>

      <button
        onClick={capturePhoto}
        disabled={!streaming}
        className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-md w-full disabled:opacity-50"
      >
        Capture Image
      </button>
    </div>
  );
}


// --------------------- AudioPlayer.js ---------------------
export function AudioPlayer({ src, label }) {
  if (!src) return null;
  return (
    <div className="p-3 border rounded-md bg-white">
      <div className="text-sm text-gray-600 mb-2">{label}</div>
      <audio controls src={src} className="w-full" />
    </div>
  );
}

// --------------------- ResultSection.js ---------------------
export function ResultSection({ originalText, translatedText, detectedLang, audioUrls }) {
  return (
    <div className="p-4 border rounded-lg bg-white">
      <h3 className="text-lg font-semibold mb-3">Results</h3>

      <div className="mb-3">
        <div className="text-xs text-gray-500">Detected language</div>
        <div className="text-sm font-medium">{detectedLang || "-"}</div>
      </div>

      <div className="mb-3">
        <div className="text-xs text-gray-500">Original Text</div>
        <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded">{originalText || "-"}</pre>
      </div>

      <div className="mb-3">
        <div className="text-xs text-gray-500">Translated Text</div>
        <pre className="whitespace-pre-wrap text-sm bg-gray-50 p-3 rounded">{translatedText || "-"}</pre>
      </div>

      <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
        <AudioPlayer src={audioUrls?.original} label="Original Speech" />
        <AudioPlayer src={audioUrls?.translated} label="Translated Speech" />
      </div>
    </div>
  );
}

// --------------------- App.js (orchestrator) ---------------------
export default function App() {
  const [selectedFile, setSelectedFile] = useState(null);
  const [originalText, setOriginalText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [detectedLang, setDetectedLang] = useState("");
  const [targetLang, setTargetLang] = useState("en");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [audioUrls, setAudioUrls] = useState({ original: null, translated: null });

  // Generic helper: upload file to backend (for /ocr or /pipeline)
  async function uploadImage(file) {
    const fd = new FormData();
    fd.append("image", file);
    // Optional flag: process pipeline on server
    return axios.post("/pipeline", fd, {
      headers: { "Content-Type": "multipart/form-data" },
      onUploadProgress: (evt) => {
        // can use evt.loaded / evt.total for progress bar
      },
    });
  }

  async function handleProcessImage(file) {
    setLoading(true);
    setError(null);
    setOriginalText("");
    setTranslatedText("");
    setDetectedLang("");
    setAudioUrls({ original: null, translated: null });

    try {
      // 1) Upload and run OCR on backend. Backend should return { text, lang } or similar.
      const ocrResp = await axios.post("/ocr", (() => { const fd = new FormData(); fd.append("image", file); fd.append("target", targetLang); return fd; })(), {
        headers: { "Content-Type": "multipart/form-data" },
      });

      // Expected: { text: "...", lang: "xx" }
      const { text = "", lang = "" } = ocrResp.data;
      setOriginalText(text);
      setDetectedLang(lang || "auto");

      // 2) Translate (if needed)
      let finalTranslatedText = text;
      if (targetLang && targetLang !== "auto") {
        const tResp = await axios.post("/translate", { text, source: lang || "auto", target: targetLang });
        const { translated = "" } = tResp.data;
        finalTranslatedText = translated;
        setTranslatedText(translated);
      } else {
        setTranslatedText(text);
      }

      // 3) Request TTS for both original and translated
      // Expecting endpoints to return either binary audio or URL. We'll request url via responseType blob then createObjectURL

      // Original TTS
      try {
        const origTts = await axios.post(
          "/tts",
          { text: text, lang: lang || "auto", voice: "default" },
          { responseType: "blob" }
        );
        const origBlob = new Blob([origTts.data], { type: "audio/wav" });
        const origUrl = window.URL.createObjectURL(origBlob);

        // Translated TTS - use finalTranslatedText instead of state value
        const transTts = await axios.post(
          "/tts",
          { text: targetLang === "auto" ? text : finalTranslatedText, lang: targetLang || "en", voice: "default" },
          { responseType: "blob" }
        );
        const transBlob = new Blob([transTts.data], { type: "audio/wav" });
        const transUrl = window.URL.createObjectURL(transBlob);

        setAudioUrls({ original: origUrl, translated: transUrl });
      } catch (ttsErr) {
        // If TTS failed, continue but inform the user
        console.warn("TTS error", ttsErr);
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Processing failed");
    } finally {
      setLoading(false);
    }
  }

  // Handler when user selects an image file from Upload or Camera
  function onFileSelected(file) {
    setSelectedFile(file);
  }

  // Handler to run full pipeline (OCR -> Translate -> TTS)
  async function runPipeline() {
    try {
      setLoading(true);
      setError(null);
  
      const res = await axios.get(
        "/capture?target_lang=" + targetLang
      );
  
      setOriginalText(res.data.original_text);
      setDetectedLang(res.data.detected_lang);
      setTranslatedText(res.data.translated_text);
  
      // Use the audio endpoints from the backend
      setAudioUrls({
        original: "/audio/original",
        translated: "/audio/translated"
      });
  
    } catch (err) {
      console.error(err);
      setError("Failed to process image.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">VisionX - Translator</h1>
            <p className="text-sm text-gray-600">Upload image or capture from camera — OCR, translate and TTS</p>
          </div>

          <div className="flex gap-3 items-center">
            <LanguageSelector value={targetLang} onChange={setTargetLang} />
            <button
              onClick={runPipeline}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md"
              disabled={loading}
            >
              {loading ? "Processing..." : "Run Pipeline"}
            </button>
          </div>
        </header>

        <main className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-4">
            <UploadImage onFileSelected={onFileSelected} />
            <CameraCapture onCapture={onFileSelected} />

            <div className="p-4 border rounded-lg bg-white">
              <h3 className="font-medium mb-2">Selected File</h3>
              {selectedFile ? (
                <div className="text-sm text-gray-700">{selectedFile.name}</div>
              ) : (
                <div className="text-sm text-gray-400">No file chosen</div>
              )}
            </div>

            <div className="p-4 border rounded-lg bg-white">
              <h3 className="font-medium mb-2">Status</h3>
              {error && <div className="text-sm text-red-600">{error}</div>}
              {!error && !loading && <div className="text-sm text-gray-600">Idle</div>}
              {loading && <div className="text-sm text-gray-600">Working... please wait</div>}
            </div>
          </div>

          <div className="md:col-span-2 space-y-4">
            <ResultSection
              originalText={originalText}
              translatedText={translatedText}
              detectedLang={detectedLang}
              audioUrls={audioUrls}
            />

            <div className="p-4 border rounded-lg bg-white">
              <h3 className="font-medium mb-2">Debug / Raw Output</h3>
              <div className="text-xs text-gray-500 mb-2">(useful while testing locally)</div>
              <pre className="whitespace-pre-wrap text-xs bg-gray-50 p-3 rounded">{JSON.stringify({ detectedLang, originalText, translatedText, audioUrls }, null, 2)}</pre>
            </div>
          </div>
        </main>

        <footer className="mt-8 text-center text-sm text-gray-500">
          Built with React + Tailwind. Connects to /ocr, /translate, /tts and /pipeline endpoints on the same host.
        </footer>
      </div>
    </div>
  );
}
