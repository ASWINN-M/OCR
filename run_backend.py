"""
Backend startup script - ensures imports work correctly
Run this from the project root: python run_backend.py
"""
import os
import sys
from pathlib import Path

# Set GROQ_API_KEY if not already set (use the key from upload_image.py)
if not os.getenv("GROQ_API_KEY"):
    os.environ["GROQ_API_KEY"] = "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"

# Add backend directory to path so api_call.py can import capture_logic
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

# Now import and run
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.frontend_routes:app", host="0.0.0.0", port=9000, reload=True)

