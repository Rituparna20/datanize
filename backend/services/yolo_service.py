import torch
from ultralytics import YOLO
import os
from typing import List, Dict, Any, Optional
import yaml
import logging
from pathlib import Path
import tempfile
import shutil

logger = logging.getLogger(__name__)

class YOLOService:
    def __init__(self):
        self.model: Optional[YOLO] = None
        self.detections_cache = {}
        self.model_path = 'yolov8n.pt'
        self.max_cache_size = 1000  # Maximum number of images to cache

    def ensure_model_loaded(self):
        """Ensure the YOLO model is loaded."""
        if self.model is None:
            try:
                logger.info("Loading YOLO model...")
                self.model = YOLO(self.model_path)
                logger.info("YOLO model loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load YOLO model: {str(e)}")
                raise RuntimeError(f"Failed to load YOLO model: {str(e)}")

    def detect_objects(self, image_path: str) -> List[Dict[str, Any]]:
        """Detect objects in an image using YOLO."""
        try:
            # Validate image path
            if not os.path.exists(image_path):
                raise ValueError(f"Image file not found: {image_path}")

            # Check if results are cached
            if image_path in self.detections_cache:
                return self.detections_cache[image_path]

            # Ensure model is loaded
            self.ensure_model_loaded()

            # Perform detection
            results = self.model(image_path)
            
            # Process results
            detections = []
            for result in results:
                boxes = result.boxes
                for box in boxes:
                    try:
                        # Get normalized coordinates (as percentages)
                        x1, y1, x2, y2 = box.xyxyn[0].tolist()
                        
                        detection = {
                            'label': result.names[int(box.cls[0])],
                            'confidence': float(box.conf[0]),
                            'bbox': [
                                float(x1) * 100,  # Convert to percentage
                                float(y1) * 100,
                                float(x2) * 100,
                                float(y2) * 100
                            ]
                        }
                        detections.append(detection)
                    except Exception as e:
                        logger.warning(f"Error processing detection box: {str(e)}")
                        continue

            # Manage cache size
            if len(self.detections_cache) >= self.max_cache_size:
                # Remove oldest entries
                oldest_keys = list(self.detections_cache.keys())[:100]
                for key in oldest_keys:
                    self.detections_cache.pop(key)

            # Cache the results
            self.detections_cache[image_path] = detections
            return detections

        except Exception as e:
            logger.error(f"Error detecting objects in image {image_path}: {str(e)}")
            raise ValueError(f"Failed to detect objects: {str(e)}")

    def save_to_yaml(self, output_path: str, data: List[Dict[str, Any]]) -> None:
        """Save detection and label data to YAML file, filtering out 'None', 'NA', or 'N/A' labels."""
        try:
            # Filter out objects with label 'None', 'NA', or 'N/A' in each image's detections/labels
            filtered_data = []
            for entry in data:
                filtered_entry = entry.copy()
                # Filter in 'detections' if present
                if 'detections' in filtered_entry:
                    filtered_entry['detections'] = [d for d in filtered_entry['detections'] if d.get('label', '').strip().lower() not in ['none', 'na', 'n/a']]
                # Filter in 'labels' if present (for some formats this may be a dict)
                if 'labels' in filtered_entry:
                    if isinstance(filtered_entry['labels'], dict):
                        filtered_entry['labels'] = {k: v for k, v in filtered_entry['labels'].items() if str(v).strip().lower() not in ['none', 'na', 'n/a']}
                    elif isinstance(filtered_entry['labels'], list):
                        filtered_entry['labels'] = [l for l in filtered_entry['labels'] if str(l).strip().lower() not in ['none', 'na', 'n/a']]
                filtered_data.append(filtered_entry)
            # Create a temporary file first
            with tempfile.NamedTemporaryFile(mode='w', delete=False, suffix='.yaml') as temp_file:
                yaml.dump(filtered_data, temp_file, default_flow_style=False)
                temp_path = temp_file.name
            # Create the directory if it doesn't exist
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            # Move the temporary file to the final location
            shutil.move(temp_path, output_path)
        except Exception as e:
            logger.error(f"Error saving YAML file: {str(e)}")
            # Clean up temporary file if it exists
            if 'temp_path' in locals() and os.path.exists(temp_path):
                try:
                    os.remove(temp_path)
                except:
                    pass
            raise ValueError(f"Failed to save YAML file: {str(e)}")

    def clear_cache(self) -> None:
        """Clear the detections cache."""
        self.detections_cache.clear()

# Initialize the YOLO service
yolo_service = YOLOService() 