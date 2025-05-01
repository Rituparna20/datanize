from fastapi import APIRouter, UploadFile, File, HTTPException
from pydantic import BaseModel
import os
from typing import List, Dict
from ultralytics import YOLO
from urllib.parse import urlparse
import uuid
import yaml
import shutil
import logging
from pathlib import Path
from datetime import datetime

router = APIRouter(prefix="/image")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create necessary directories with error handling
def ensure_directory(directory: str) -> None:
    """Ensure directory exists and is writable."""
    try:
        os.makedirs(directory, exist_ok=True)
        # Test write permissions by creating a temporary file
        test_file = os.path.join(directory, '.test')
        try:
            with open(test_file, 'w') as f:
                f.write('')
            os.remove(test_file)
        except (IOError, OSError) as e:
            logger.error(f"Directory {directory} is not writable: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Server configuration error: Directory {directory} is not writable"
            )
    except Exception as e:
        logger.error(f"Failed to create directory {directory}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create directory {directory}"
        )

# Initialize directories
UPLOAD_DIR = "uploads"
EXPORTS_DIR = "exports"
for directory in [UPLOAD_DIR, EXPORTS_DIR]:
    ensure_directory(directory)

class DetectionRequest(BaseModel):
    image_url: str

class BoundingBox(BaseModel):
    label: str
    bbox: List[float]
    confidence: float

class SaveLabelsRequest(BaseModel):
    images: List[str]
    labels: Dict[str, List[BoundingBox]]

    @property
    def total_annotations(self) -> int:
        """Calculate total number of annotations."""
        return sum(len(labels) for labels in self.labels.values())

    def validate_data(self) -> None:
        """Validate the request data."""
        if not self.images:
            raise ValueError("No images provided")
        
        for image_url in self.images:
            if not image_url:
                raise ValueError("Empty image URL provided")
            
        for labels in self.labels.values():
            for label in labels:
                if not label.label:
                    raise ValueError("Empty label found")
                if len(label.bbox) != 4:
                    raise ValueError("Invalid bounding box format")
                if not (0 <= label.confidence <= 1):
                    raise ValueError("Confidence score must be between 0 and 1")

# Initialize YOLO model with better error handling
try:
    MODEL_PATH = "yolov8n.pt"
    if not os.path.exists(MODEL_PATH):
        logger.info(f"Downloading YOLO model to {MODEL_PATH}")
    yolo_model = YOLO(MODEL_PATH)
    logger.info("Successfully loaded YOLO model")
except Exception as e:
    logger.error(f"Failed to load YOLO model: {str(e)}")
    yolo_model = None

@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    """Upload an image file."""
    try:
        if not file:
            raise HTTPException(status_code=400, detail="No file provided")

        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")

        # Create a safe filename
        filename = f"{uuid.uuid4().hex}_{file.filename}"
        file_path = os.path.join(UPLOAD_DIR, filename)

        # Save the file
        try:
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            logger.info(f"Successfully saved file: {filename}")
        except Exception as e:
            logger.error(f"Failed to save file: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

        return {
            "file_path": file_path,
            "message": "File uploaded successfully"
        }

    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/detect")
async def detect_objects(file: UploadFile = File(...)):
    """Detect objects in an uploaded image."""
    if yolo_model is None:
        raise HTTPException(status_code=500, detail="YOLO model not initialized")

    try:
        if not file:
            raise HTTPException(status_code=400, detail="No file provided")

        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")

        # Create uploads directory if it doesn't exist
        os.makedirs(UPLOAD_DIR, exist_ok=True)

        # Save the uploaded file temporarily
        temp_path = os.path.join(UPLOAD_DIR, f"temp_{uuid.uuid4().hex}_{file.filename}")
        try:
            # Save file with error handling
            try:
                with open(temp_path, "wb") as buffer:
                    shutil.copyfileobj(file.file, buffer)
                logger.info(f"Saved temporary file for detection: {temp_path}")
            except Exception as e:
                logger.error(f"Failed to save temporary file: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

            # Verify file exists and is readable
            if not os.path.exists(temp_path):
                raise HTTPException(status_code=500, detail="Failed to save uploaded file")

            # Log file details
            file_size = os.path.getsize(temp_path)
            logger.info(f"Processing image file: {temp_path} (size: {file_size} bytes)")

            # Run YOLO detection with explicit error handling
            try:
                results = yolo_model(temp_path, verbose=True)  # Enable verbose mode for debugging
                logger.info(f"YOLO detection completed on {temp_path}")
                
                if not results:
                    logger.warning("No detection results returned by YOLO")
                    return {"boxes": []}

                detections = []
                for r in results:
                    if not r.boxes:
                        logger.info("No boxes detected in this result")
                        continue
                        
                    logger.info(f"Processing {len(r.boxes)} detected boxes")
                    for box in r.boxes:
                        try:
                            # Get coordinates and convert to percentages
                            x1, y1, x2, y2 = box.xyxyn[0].tolist()
                            
                            # Get class label
                            class_id = int(box.cls[0]) if box.cls is not None else -1
                            label = r.names[class_id] if class_id in r.names else "Unknown"
                            
                            # Get confidence
                            confidence = float(box.conf[0]) if box.conf is not None else 0.0
                            
                            detection = {
                                "label": label,
                                "confidence": confidence,
                                "bbox": [
                                    float(x1) * 100,
                                    float(y1) * 100,
                                    float(x2) * 100,
                                    float(y2) * 100
                                ]
                            }
                            logger.info(f"Detected {label} with confidence {confidence:.2f}")
                            detections.append(detection)
                        except Exception as e:
                            logger.error(f"Error processing detection box: {str(e)}")
                            continue

                logger.info(f"Successfully detected {len(detections)} objects")
                return {"boxes": detections}

            except Exception as e:
                logger.error(f"YOLO detection failed: {str(e)}")
                raise HTTPException(status_code=500, detail=f"Detection failed: {str(e)}")

        finally:
            # Clean up temporary file
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                    logger.info(f"Cleaned up temporary file: {temp_path}")
                except Exception as e:
                    logger.error(f"Failed to clean up temporary file: {str(e)}")

    except Exception as e:
        logger.error(f"Detection failed: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/save-labels")
async def save_labels(data: SaveLabelsRequest):
    """Save image labels to a YAML file."""
    try:
        # Validate request data
        try:
            data.validate_data()
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))

        # Create a unique filename for the YAML file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        yaml_filename = f"labels_{timestamp}.yaml"
        yaml_path = os.path.join(UPLOAD_DIR, yaml_filename)

        # Ensure we have write permissions
        if os.path.exists(yaml_path):
            try:
                os.remove(yaml_path)  # Remove if file already exists
            except OSError as e:
                logger.error(f"Failed to remove existing file {yaml_path}: {str(e)}")
                raise HTTPException(
                    status_code=500,
                    detail="Failed to prepare file for writing"
                )

        # Prepare the data structure for YAML
        yaml_data = {
            "dataset_info": {
                "created_at": datetime.now().isoformat(),
                "total_images": len(data.images),
                "total_annotations": data.total_annotations,
                "export_timestamp": timestamp
            },
            "annotations": {}
        }

        for index, image_url in enumerate(data.images):
            try:
                # Extract filename from URL or path
                parsed_url = urlparse(image_url)
                image_name = os.path.basename(parsed_url.path)
                
                # Get labels for this image
                image_labels = data.labels.get(str(index), [])
                
                # Format the labels with detailed information, filtering out N/A, None, NA
                formatted_labels = []
                for label in image_labels:
                    try:
                        if str(label.label).strip().lower() in ["n/a", "none", "na"]:
                            continue
                        formatted_labels.append({
                            "label": label.label,
                            "bbox": {
                                "coordinates": label.bbox,
                                "format": "normalized_xyxy",  # x1,y1,x2,y2 in percentage
                                "width_percent": label.bbox[2] - label.bbox[0],
                                "height_percent": label.bbox[3] - label.bbox[1]
                            },
                            "confidence": label.confidence
                        })
                    except Exception as e:
                        logger.error(f"Error formatting label for {image_name}: {str(e)}")
                        continue
                
                yaml_data["annotations"][image_name] = {
                    "file_info": {
                        "original_url": image_url,
                        "index": index
                    },
                    "objects": formatted_labels
                }
            except Exception as e:
                logger.error(f"Error processing image {image_url}: {str(e)}")
                continue

        # Save to YAML file with proper formatting and error handling
        try:
            temp_path = f"{yaml_path}.tmp"
            with open(temp_path, 'w', encoding='utf-8') as f:
                yaml.safe_dump(
                    yaml_data,
                    f,
                    default_flow_style=False,
                    allow_unicode=True,
                    sort_keys=False,
                    indent=2
                )
            # Atomic rename for safer file writing
            os.replace(temp_path, yaml_path)
            logger.info(f"Successfully saved labels to {yaml_path}")
        except Exception as e:
            if os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except:
                    pass
            logger.error(f"Failed to save YAML file: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to save YAML file: {str(e)}")

        # Return the relative path for frontend access
        try:
            relative_path = os.path.relpath(yaml_path, UPLOAD_DIR)
            return {
                "yaml_path": f"/uploads/{relative_path}",
                "filename": yaml_filename,
                "message": "Labels saved successfully",
                "summary": {
                    "total_images": len(data.images),
                    "total_annotations": yaml_data["dataset_info"]["total_annotations"],
                    "created_at": yaml_data["dataset_info"]["created_at"]
                }
            }
        except Exception as e:
            logger.error(f"Error creating response: {str(e)}")
            raise HTTPException(status_code=500, detail="Failed to process response")

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error saving labels: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
