from pydantic import BaseModel
from typing import List, Optional, Dict, Any

class FileUploadResponse(BaseModel):
    filename: str
    status: str

class PreprocessRequest(BaseModel):
    file_path: str
    method: str  # mean, median, most_frequent

class EncodingRequest(BaseModel):
    file_path: str
    fields: Dict[str, str]  # field_name -> strategy (label/onehot)

class FeatureSelectRequest(BaseModel):
    method: str  # pca, pls, correlation
    file_path: Optional[str] = None  # Optional file path, will use state if not provided

class VisualizationRequest(BaseModel):
    file_path: str
    x_col: str
    y_col: str
    chart_type: str

class ChartData(BaseModel):
    data: List[Dict[str, Any]]
    x_col: str
    y_col: str

class SplitDataRequest(BaseModel):
    file_path: Optional[str] = None
    test_size: float
    random_state: int
    target_column: str

class ExportToPPTRequest(BaseModel):
    chart_data: List[Dict[str, Any]]
    chart_type: str
    x_column: str
    y_column: str

class Detection(BaseModel):
    label: str
    confidence: float
    bbox: List[float]  # [x1, y1, x2, y2] as percentages

class LabelSaveRequest(BaseModel):
    image_path: str
    labels: Dict[str, str]  # Maps detection index to selected label
    detections: List[Detection]