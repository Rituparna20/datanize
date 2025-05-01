from fastapi import APIRouter, HTTPException, Depends
from models.schemas import FeatureSelectRequest
from services.feature_selection import pca_selection, pls_selection, correlation_selection
from state import get_state, State
import logging
from fastapi.responses import FileResponse
import pandas as pd
import tempfile
import os

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/feature")

@router.post("/")
def feature_select(req: FeatureSelectRequest, state: State = Depends(get_state)):
    logger.info(f"Feature selection request received with method: {req.method}")
    try:
        # Use file path from request if provided, otherwise from state
        file_path = req.file_path if req.file_path else state.get_file_path()
        if not file_path:
            raise HTTPException(status_code=400, detail="No file path provided")
            
        logger.info(f"Using file path: {file_path}")
        
        if req.method == "pca":
            logger.info("Starting PCA selection")
            result = pca_selection(file_path)
            # Transform response to match frontend expectations
            return {
                "featureScores": [{"feature": k, "score": v} for k, v in result["feature_scores"].items()],
                "additionalInfo": {
                    "explained_variance": result["explained_variance"]
                }
            }
        elif req.method == "pls":
            logger.info("Starting PLS selection")
            result = pls_selection(file_path)
            return {
                "featureScores": [{"feature": k, "score": v} for k, v in result["feature_scores"].items()],
                "additionalInfo": {
                    "r2_score": result["r2_score"]
                }
            }
        else:
            logger.info("Starting correlation selection")
            result = correlation_selection(file_path)
            return {
                "featureScores": [{"feature": k, "score": v} for k, v in result["feature_scores"].items()]
            }
            
    except Exception as e:
        logger.error(f"Error in feature selection: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/download")
def download_feature_selection(req: FeatureSelectRequest, state: State = Depends(get_state)):
    file_path = req.file_path if req.file_path else state.get_file_path()
    if not file_path:
        raise HTTPException(status_code=400, detail="No file path provided")
    if req.method == "pca":
        result = pca_selection(file_path)
    elif req.method == "pls":
        result = pls_selection(file_path)
    else:
        result = correlation_selection(file_path)

    # Prepare DataFrame for Excel
    df = pd.DataFrame(result["feature_scores"].items(), columns=["Feature", "Score"])
    # Add method info and any additional info
    meta = pd.DataFrame({
        "Method": [result["method"]],
        **({k: [v] for k, v in result.items() if k not in ["feature_scores", "output_path"]})
    })
    # Write to a temporary Excel file
    with tempfile.NamedTemporaryFile(delete=False, suffix=".xlsx") as tmp:
        with pd.ExcelWriter(tmp.name) as writer:
            meta.to_excel(writer, index=False, sheet_name="Meta")
            df.to_excel(writer, index=False, sheet_name="FeatureScores")
        tmp_path = tmp.name

    return FileResponse(tmp_path, filename="feature_selection_result.xlsx", media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")