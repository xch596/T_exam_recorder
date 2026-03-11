# from erasenet_handler import EraseNetHandler
from baidu_handler import BaiduHandler
import os
import cv2
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import io
import uvicorn
import base64

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration for Baidu API
# Please replace these with your actual API Key and Secret Key
BAIDU_API_KEY = os.getenv("BAIDU_API_KEY", "o0rI1Teb7tlptP9o7IncqYqh")
BAIDU_SECRET_KEY = os.getenv("BAIDU_SECRET_KEY", "9ndXhFBPsuAECVTdGV6XhncT0ej0FxmU")

_baidu_handler = None

def get_baidu_handler():
    global _baidu_handler
    if _baidu_handler is None:
        if BAIDU_API_KEY == "YOUR_API_KEY_HERE" or BAIDU_SECRET_KEY == "YOUR_SECRET_KEY_HERE":
            raise ValueError("Please configure BAIDU_API_KEY and BAIDU_SECRET_KEY in main.py")
        _baidu_handler = BaiduHandler(BAIDU_API_KEY, BAIDU_SECRET_KEY)
    return _baidu_handler

def remove_handwriting_logic(image_bytes):
    try:
        handler = get_baidu_handler()
        # handler.remove_handwriting returns raw image bytes (PNG/JPG)
        result_bytes = handler.remove_handwriting(image_bytes)
        
        # Convert to base64 for frontend
        base64_str = base64.b64encode(result_bytes).decode('utf-8')
        
        mime = "image/png"
        if result_bytes[:3] == b"\xff\xd8\xff":
            mime = "image/jpeg"
        elif result_bytes.startswith(b"\x89PNG\r\n\x1a\n"):
            mime = "image/png"

        return {"image_base64": f"data:{mime};base64," + base64_str}
        
    except ValueError as e:
        return {"error": str(e)}
    except Exception as e:
        print(f"Baidu OCR Error: {e}")
        import traceback
        traceback.print_exc()
        return {"error": f"Baidu OCR Error: {str(e)}"}

@app.post("/remove-handwriting")
async def remove_handwriting(file: UploadFile = File(...)):
    contents = await file.read()
    try:
        return remove_handwriting_logic(contents)
    except Exception as e:
        return {"error": str(e)}

@app.get("/")
def read_root():
    return {"message": "Exam Recorder AI Server is Running (Baidu OCR Mode)"}

if __name__ == "__main__":
    print("Starting Uvicorn server...")
    # Listen on all interfaces
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
