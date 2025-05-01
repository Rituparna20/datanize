from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, StreamingResponse
from typing import List, Dict, Any
import os
import shutil
from services.yolo_service import yolo_service
from models.schemas import LabelSaveRequest
import logging
from pathlib import Path
import yaml

logger = logging.getLogger(__name__)
router = APIRouter()

# Directory for storing uploaded images and results
BASE_DIR = Path(__file__).resolve().parent.parent
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
IMAGES_DIR = os.path.join(UPLOAD_DIR, "images")
os.makedirs(IMAGES_DIR, exist_ok=True)

# Store labels data in memory (you might want to use a database in production)
labels_data = []

ALLOWED_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.gif', '.bmp'}

def is_valid_image(filename: str) -> bool:
    """Check if the file has a valid image extension."""
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS

@router.post("/upload-images")
async def upload_images(file: UploadFile = File(...)):
    """Upload an image and perform object detection."""
    try:
        if not file:
            raise HTTPException(status_code=400, detail="No file provided")

        if not is_valid_image(file.filename):
            raise HTTPException(status_code=400, detail="Invalid file type")

        # Create a safe filename
        safe_filename = f"image_{Path(file.filename).name}"
        file_path = os.path.join(IMAGES_DIR, safe_filename)

        try:
            # Save the file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            # Perform object detection
            detections = yolo_service.detect_objects(file_path)

            return {
                "image_path": safe_filename,
                "detections": detections
            }

        except Exception as e:
            logger.error(f"Error processing file {file.filename}: {str(e)}")
            raise HTTPException(status_code=500, detail=str(e))

    except Exception as e:
        logger.error(f"Error processing upload: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/detect")
async def detect_objects(file: UploadFile = File(...)):
    """Detect objects in an uploaded image."""
    try:
        if not file:
            raise HTTPException(status_code=400, detail="No file provided")

        if not is_valid_image(file.filename):
            raise HTTPException(status_code=400, detail="Invalid file type")

        # Save the uploaded file temporarily
        temp_path = os.path.join(UPLOAD_DIR, f"temp_{file.filename}")
        try:
            with open(temp_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)

            # Perform detection
            detections = yolo_service.detect_objects(temp_path)

            return {"detections": detections}

        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                os.remove(temp_path)

    except Exception as e:
        logger.error(f"Error detecting objects: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save-labels")
async def save_labels(request: LabelSaveRequest):
    """Save labels for an image."""
    try:
        # Validate image path
        image_path = os.path.join(IMAGES_DIR, request.image_path)
        if not os.path.exists(image_path):
            raise HTTPException(status_code=404, detail="Image not found")

        # Add the labels data to our list
        labels_data.append({
            "image_path": request.image_path,
            "labels": request.labels,
            "detections": request.detections
        })

        # If list gets too large, save to disk and clear
        if len(labels_data) > 1000:
            temp_path = os.path.join(UPLOAD_DIR, "temp_labels.yaml")
            yolo_service.save_to_yaml(temp_path, labels_data)
            labels_data.clear()

        return {"message": "Labels saved successfully"}

    except Exception as e:
        logger.error(f"Error saving labels: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export-yaml")
async def export_yaml():
    """Export all labels to a YAML file."""
    try:
        if not labels_data:
            raise HTTPException(status_code=400, detail="No labels data to export")

        # Create YAML content in memory
        yaml_content = yaml.dump(labels_data, default_flow_style=False)
        
        # Create a temporary file-like object
        from io import BytesIO
        file_like = BytesIO(yaml_content.encode('utf-8'))
        
        # Return the file directly
        return StreamingResponse(
            file_like,
            media_type="application/x-yaml",
            headers={
                "Content-Disposition": "attachment; filename=labels.yaml"
            }
        )

    except Exception as e:
        logger.error(f"Error exporting YAML: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/images/{image_path}")
async def get_image(image_path: str):
    """Serve an image file."""
    try:
        file_path = os.path.join(IMAGES_DIR, image_path)
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="Image not found")
        if not is_valid_image(file_path):
            raise HTTPException(status_code=400, detail="Invalid image file")
        return FileResponse(file_path)
    except Exception as e:
        logger.error(f"Error serving image: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to serve image") 