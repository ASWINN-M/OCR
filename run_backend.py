"""
Backend startup script - ensures imports work correctly
Run this from the project root: python run_backend.py
"""
import os
import sys
from pathlib import Path

if not os.getenv("GROQ_API_KEY"):
    raise SystemExit(
        "Missing GROQ_API_KEY. Set it in your environment or a .env file before starting the backend."
    )

# Add backend directory to path so api_call.py can import capture_logic
backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

# Now import and run
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.frontend_routes:app", host="0.0.0.0", port=9000, reload=True)

