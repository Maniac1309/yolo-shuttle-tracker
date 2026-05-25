from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from ultralytics import YOLO
import shutil
import os
import glob

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

    # Save uploaded file
    file_path = os.path.join(UPLOAD_DIR, file.filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Run YOLO inference
    results = model.predict(
        source=file_path,
        save=True,
        conf=0.25
    )

    # Output path
    output_path = os.path.join(
        results[0].save_dir,
        file.filename
    )

    return FileResponse(output_path)


# ---------------- TRACK ENDPOINT ---------------- #

@app.post("/track")
async def track(file: UploadFile = File(...)):

    try:

        print("1. Request received")

        # Save uploaded file
        file_path = os.path.join(UPLOAD_DIR, file.filename)

        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        print("2. File saved:", file_path)

        # Run YOLO tracking
        model.track(
            source=file_path,
            save=True,
            conf=0.25
        )

        print("3. Tracking completed")

        # Find latest tracking folder
        track_dirs = glob.glob("runs/detect/track*")

        print("4. Track dirs:", track_dirs)

        latest_dir = max(track_dirs, key=os.path.getctime)

        print("5. Latest dir:", latest_dir)

        # Find AVI files
        avi_files = glob.glob(os.path.join(latest_dir, "*.avi"))

        print("6. AVI files:", avi_files)

        if not avi_files:
            return {"error": "No AVI files found"}

        avi_path = avi_files[0]

        print("7. AVI path:", avi_path)

        # Output MP4 path
        mp4_path = os.path.join(latest_dir, "tracked_output.mp4")

        print("8. MP4 path:", mp4_path)

        # Convert AVI → MP4
        ffmpeg_command = (
            f'ffmpeg -y -i "{avi_path}" '
            f'-vcodec libx264 "{mp4_path}"'
        )

        print("9. Running ffmpeg")

        ffmpeg_status = os.system(ffmpeg_command)

        print("10. FFmpeg status:", ffmpeg_status)

        # Verify MP4 exists
        if not os.path.exists(mp4_path):
           
            print("11. MP4 NOT FOUND")

            return {"error": "MP4 conversion failed"}

        print("12. Returning MP4")

        return FileResponse(
            path=mp4_path,
            media_type="video/mp4",
            filename="tracked_output.mp4"
        )

    except Exception as e:

        print("ERROR:", str(e))

        return {"error": str(e)}