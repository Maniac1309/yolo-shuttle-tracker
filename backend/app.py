from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from ultralytics import YOLO
import shutil
import os
import glob
import lap

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load trained model
model = YOLO("best.pt")

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


# ---------------- PREDICT ENDPOINT ---------------- #

@app.post("/predict")
async def predict(file: UploadFile = File(...)):

    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    results = model.predict(
        source=file_path,
        save=True,
        conf=0.25,
        imgsz=320,
        device="cpu"
    )

    # DEBUG
    print("SAVE DIR:", results[0].save_dir)

    # CORRECT OUTPUT PATH
    output_path = os.path.join(
        str(results[0].save_dir),
        os.path.basename(file.filename)
    )

    print("OUTPUT PATH:", output_path)

    # VERIFY FILE EXISTS
    if not os.path.exists(output_path):
        return {"error": f"Output file not found: {output_path}"}

    return FileResponse(output_path)


# ---------------- TRACK ENDPOINT ---------------- #

@app.post("/track")
async def track(file: UploadFile = File(...)):

    try:

        # Save uploaded file
        file_path = os.path.join(UPLOAD_DIR, file.filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        print("1. File saved:", file_path)

        # Run YOLO tracking
        results = model.track(
            source=file_path,
            save=True,
            conf=0.25,
            imgsz=320,
            device="cpu",
            vid_stride = 3,
            stream = True
        )
        for r in results:
            pass

# Find latest track folder
        track_dirs = glob.glob("runs/detect/track*")
        latest_dir = max(track_dirs, key=os.path.getctime)

    # Find generated video
        video_files = glob.glob(os.path.join(latest_dir, "*"))
        output_path = video_files[0]

        return FileResponse(output_path)