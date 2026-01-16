import React, { useState, useRef, useEffect } from "react";
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


export function UploadImage({ onFileSelected, selectedFile }) {
  const fileRef = useRef(null);

  function handleFile(e) {
    const file = e.target.files[0];
    if (file) {
      // Always call onFileSelected to update the state
      onFileSelected(file);
    }
    // Reset the input value immediately after reading to allow selecting the same file again
    // This ensures onChange fires even if the same file is selected next time
    if (fileRef.current) {
      fileRef.current.value = '';
    }
  }

  // Clear file input when selectedFile is cleared
  useEffect(() => {
    if (!selectedFile && fileRef.current) {
      fileRef.current.value = '';
    }
  }, [selectedFile]);

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

// --------------------- StoredImages.js ---------------------
export function StoredImages({ onImageSelected }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);

  async function loadStoredImages() {
    setLoading(true);
    try {
      const res = await axios.get("/stored-images");
      setImages(res.data.images || []);
    } catch (err) {
      console.error("Failed to load stored images:", err);
    } finally {
      setLoading(false);
    }
  }

  // Load images on mount
  useEffect(() => {
    loadStoredImages();
  }, []);

  async function handleImageSelect(imagePath) {
    try {
      // Fetch the image and convert to File object
      const response = await axios.get(imagePath, { responseType: "blob" });
      const blob = response.data;
      const file = new File([blob], imagePath.split("/").pop(), { type: "image/jpeg" });
      onImageSelected(file);
    } catch (err) {
      console.error("Failed to load image:", err);
    }
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">Stored Images</h3>
        <button
          onClick={loadStoredImages}
          className="px-2 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
          disabled={loading}
        >
          {loading ? "Loading..." : "Refresh"}
        </button>
      </div>
      
      {images.length === 0 ? (
        <p className="text-sm text-gray-500 italic">No stored images yet. Upload or capture images to save them here.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto">
          {images.map((img) => (
            <div
              key={img.filename}
              className="relative cursor-pointer border rounded overflow-hidden hover:border-blue-500 transition"
              onClick={() => handleImageSelect(img.path)}
            >
              <img
                src={img.path}
                alt={img.filename}
                className="w-full h-24 object-cover"
              />
              <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                {new Date(img.timestamp * 1000).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


export function CameraCapture({ onCapture }) {
  const videoRef = useRef(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState(null);
  const frameIntervalRef = useRef(null);
  const streamingRef = useRef(false); // Use ref to track streaming state in intervals
  
  // Use backend endpoint that serves individual frames
  const esp32FrameUrl = "/esp32-frame";

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
    };
  }, []);

  async function startCamera() {
    setError(null);
    try {
      console.log("Starting ESP32 camera...");
      
      // Stop any existing stream first
      stopCamera();
      
      // Set both state and ref
      streamingRef.current = true;
      setStreaming(true);
      
      // Small delay to ensure state is set and image element is rendered
      setTimeout(() => {
        if (!videoRef.current) {
          setError("Image element not found. Please try again.");
          streamingRef.current = false;
          setStreaming(false);
          return;
        }
        
        // Function to update frame continuously
        const updateFrame = () => {
          // Check streaming state using ref (avoids closure issues)
          if (!streamingRef.current || !videoRef.current) {
            if (frameIntervalRef.current) {
              clearInterval(frameIntervalRef.current);
              frameIntervalRef.current = null;
            }
            return;
          }
          
          try {
            // Add timestamp to prevent caching
            const timestamp = new Date().getTime();
            const frameUrl = `${esp32FrameUrl}?t=${timestamp}`;
            
            // Set src directly - browser will handle loading
            videoRef.current.src = frameUrl;
          } catch (err) {
            console.error("Frame update error:", err);
            // Only set error if we're still supposed to be streaming
            if (streamingRef.current) {
              const errorMsg = err.message || "Unknown error";
              if (errorMsg.includes("503") || errorMsg.includes("Service Unavailable")) {
                setError("ESP32 camera is not accessible. Check: 1) ESP32 is powered on, 2) Network connection, 3) IP address (default: 172.21.9.93:81)");
              } else {
                setError(`Failed to load frame: ${errorMsg}`);
              }
            }
          }
        };
        
        // Update frame immediately
        updateFrame();
        
        // Update frame every 100ms (10 FPS) - balanced performance
        frameIntervalRef.current = setInterval(updateFrame, 100);
        
      }, 100);
      
    } catch (e) {
      console.error("Start camera error:", e);
      setError(`Unable to access ESP32 camera: ${e.message}`);
      streamingRef.current = false;
      setStreaming(false);
    }
  }

  function stopCamera() {
    console.log("Stopping ESP32 camera...");
    // Set ref first to stop interval immediately
    streamingRef.current = false;
    // Clear interval
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }
    // Clear image source
    if (videoRef.current) {
      videoRef.current.src = "";
      videoRef.current.onload = null;
      videoRef.current.onerror = null;
    }
    setStreaming(false);
  }

  function capturePhoto() {
    if (!videoRef.current) return;

    const img = videoRef.current;
    
    // Check if image is loaded
    if (!img.complete || img.naturalWidth === 0) {
      console.error("ESP32 image not loaded yet");
      setError("Please wait for ESP32 stream to load before capturing");
      return;
    }

    const canvas = document.createElement("canvas");

    // Use naturalWidth/Height for img elements
    canvas.width = img.naturalWidth || img.width || 640;
    canvas.height = img.naturalHeight || img.height || 480;

    console.log(`Capturing image: ${canvas.width}x${canvas.height}`);

    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob && blob.size > 0) {
        console.log(`Captured image size: ${blob.size} bytes`);
        const file = new File([blob], "captured_image.jpg", { type: "image/jpeg" });

        // send image to parent
        onCapture(file);

        // auto-stop camera after capture
        stopCamera();
      } else {
        console.error("Failed to capture image blob");
        setError("Failed to capture image. Please try again.");
      }
    }, "image/jpeg", 0.9);
  }

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium">ESP32 Camera</h3>
        {!streaming ? (
          <button
            onClick={startCamera}
            className="px-3 py-1 bg-green-600 text-white rounded"
          >
            Connect ESP32
          </button>
        ) : (
          <button
            onClick={stopCamera}
            className="px-3 py-1 bg-red-600 text-white rounded"
          >
            Disconnect
          </button>
        )}
      </div>

      {error && <div className="mb-2 text-sm text-red-600">{error}</div>}
      
      <div className="mb-2 text-xs text-gray-500">
        ESP32 Stream (via backend proxy)
      </div>

      <div className="w-full h-64 bg-black rounded overflow-hidden flex items-center justify-center relative">
        <img 
          ref={videoRef}
          src=""
          alt="ESP32 Camera Stream"
          className={`w-full h-full object-cover ${streaming ? 'block' : 'hidden'}`}
          style={{ minHeight: '256px' }}
            onError={(e) => {
              console.error("Image load error:", e);
              const img = e.target;
              console.error("Failed to load image from:", img.src);
              setError("Cannot connect to ESP32 camera. Please check: 1) ESP32 is powered on, 2) ESP32 is on the same network, 3) IP address is correct (default: 172.21.9.93:81). Check backend logs for details.");
            }}
          onLoad={() => {
            console.log("Frame loaded successfully");
            setError(null);
          }}
        />
        {!streaming && (
          <div className="absolute text-white text-sm">Click "Connect ESP32" to start stream</div>
        )}
        {streaming && !error && (
          <div className="absolute bottom-2 right-2 text-xs text-green-400 bg-black bg-opacity-50 px-2 py-1 rounded">
            Streaming...
          </div>
        )}
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
  return (
    <div className="p-3 border rounded-md bg-white">
      <div className="text-sm text-gray-600 mb-2">{label}</div>
      {src ? (
        <audio controls src={src} className="w-full" />
      ) : (
        <div className="text-xs text-gray-400 italic">Audio not available</div>
      )}
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

      // Only generate TTS if we have text - run in parallel for speed
      if (text && text.trim()) {
        try {
          const textToTranslate = targetLang === "auto" ? text : finalTranslatedText;
          
          // Generate both TTS in parallel for faster processing
          const ttsPromises = [
            axios.post(
              "/tts",
              { text: text, lang: lang || "auto", voice: "Fritz-PlayAI" },
              { responseType: "blob" }
            ),
            textToTranslate && textToTranslate.trim() 
              ? axios.post(
                  "/tts",
                  { text: textToTranslate, lang: targetLang === "auto" ? lang || "en" : targetLang, voice: "Fritz-PlayAI" },
                  { responseType: "blob" }
                )
              : Promise.resolve(null)
          ];
          
          const [origTts, transTts] = await Promise.all(ttsPromises);
          
          const origBlob = new Blob([origTts.data], { type: "audio/wav" });
          const origUrl = window.URL.createObjectURL(origBlob);
          
          let transUrl = null;
          if (transTts && transTts.data) {
            const transBlob = new Blob([transTts.data], { type: "audio/wav" });
            transUrl = window.URL.createObjectURL(transBlob);
          }
          
          setAudioUrls({ original: origUrl, translated: transUrl });
        } catch (ttsErr) {
          // If TTS failed, log the error but don't block the UI
          console.error("TTS error:", ttsErr);
          const ttsErrorMsg = "TTS failed: " + (ttsErr.response?.data?.detail || ttsErr.message || "Unknown error");
          setError(prev => prev ? prev + " | " + ttsErrorMsg : ttsErrorMsg);
        }
      } else {
        setAudioUrls({ original: null, translated: null });
      }
      
      // Clear the selected file after successful processing
      setSelectedFile(null);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || err.message || "Processing failed");
    } finally {
      setLoading(false);
    }
  }

  // Handler when user selects an image file from Upload or Camera
  function onFileSelected(file) {
    // Always update the selected file immediately
    // Use a timestamp to force React to recognize it as a new selection
    if (file) {
      setSelectedFile(file);
      // Force a re-render by updating a timestamp (stored in file object if needed)
      // The file object itself should be sufficient for React to detect the change
    } else {
      setSelectedFile(null);
    }
    // Clear any previous error when selecting a new file
    setError(null);
  }

  // Handler to run full pipeline (OCR -> Translate -> TTS)
  async function runPipeline() {
    if (!selectedFile) {
      setError("Please select or capture an image first.");
      return;
    }
    await handleProcessImage(selectedFile);
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">VisionX</h1>
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
            <UploadImage onFileSelected={onFileSelected} selectedFile={selectedFile} />
            <CameraCapture onCapture={onFileSelected} />
            <StoredImages onImageSelected={onFileSelected} />

            <div className="p-4 border rounded-lg bg-white">
              <h3 className="font-medium mb-2">Selected File</h3>
              {selectedFile ? (
                <div className="text-sm text-gray-700">
                  {selectedFile.name || selectedFile.filename || "Image selected"}
                  {selectedFile.size && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({(selectedFile.size / 1024).toFixed(1)} KB)
                    </span>
                  )}
                </div>
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
