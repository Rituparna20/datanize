from fastapi import APIRouter, HTTPException, Depends, Request, Form, Query, UploadFile, File
from fastapi.responses import FileResponse
from models.schemas import PreprocessRequest, EncodingRequest, SplitDataRequest
import pandas as pd
from services.preprocessing import (
    handle_missing_values,
    encode_categorical_variables,
    split_data,
    read_data_file,
    get_categorical_fields,
    download_from_supabase
)
from state import get_state, State
import logging
import os
import json
from sklearn.preprocessing import LabelEncoder
from typing import List, Dict, Optional
from pydantic import BaseModel
import numpy as np
from pathlib import Path
import shutil
import tempfile
import zipfile
from urllib.parse import urlparse

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/preprocess")

# Ensure uploads directory exists
UPLOAD_DIR = os.path.join("backend", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)

class MissingValueStrategy(BaseModel):
    variable: str
    strategy: str

class MissingValueRequest(BaseModel):
    file_path: str
    strategies: List[MissingValueStrategy]

@router.get("/missing")
async def get_missing_values(file_path: str = Query(...)):
    try:
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail="File not found")
        
        df = pd.read_csv(file_path)
        missing_info = []
        
        for column in df.columns:
            missing_count = df[column].isnull().sum()
            if missing_count > 0:
                missing_info.append({
                    "variable": column,
                    "data_type": str(df[column].dtype),
                    "missing_count": int(missing_count)
                })
        
        return missing_info
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/handle-missing")
async def handle_missing_values(
    request: MissingValueRequest = None,
    file_path: str = Form(None),
    methods: str = Form(None)
):
    try:
        # Handle both JSON and Form data
        if request:
            # Handle JSON request
            file_path = request.file_path
            strategies_dict = {s.variable: s.strategy for s in request.strategies}
        else:
            # Handle Form data
            if not file_path or not methods:
                raise HTTPException(status_code=400, detail="Missing required form fields")
            methods_list = json.loads(methods)
            strategies_dict = {item['variable']: item['strategy'] for item in methods_list}

        # Download the file from Supabase Storage if it's a URL
        if file_path.startswith('http'):
            import requests
            import tempfile
            response = requests.get(file_path)
            response.raise_for_status()
            
            # Create a temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as tmp:
                tmp.write(response.content)
                local_file_path = tmp.name
        else:
            local_file_path = file_path
            
        # Read and process the file
        df = pd.read_csv(local_file_path)
        rows_before = len(df)
        
        for column, strategy in strategies_dict.items():
            if column not in df.columns:
                continue
            if strategy == "Drop rows":
                df = df.dropna(subset=[column])
            else:
                if pd.api.types.is_numeric_dtype(df[column]):
                    if strategy == "Replace with mean":
                        df[column] = df[column].fillna(df[column].mean())
                    elif strategy == "Replace with median":
                        df[column] = df[column].fillna(df[column].median())
                    elif strategy == "Replace with mode":
                        df[column] = df[column].fillna(df[column].mode()[0])
                    elif strategy == "Replace with zero":
                        df[column] = df[column].fillna(0)
                else:
                     raise ValueError(f"Unknown strategy: {strategy}")
        
        # Save the processed file to a temporary location
        with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as tmp:
            df.to_csv(tmp.name, index=False)
            output_path = tmp.name
        
        return {
            "message": "Missing values handled successfully",
            "output_path": output_path,
            "rows_before": rows_before,
            "rows_after": len(df),
            "columns": list(strategies_dict.keys())
        }
        
    except Exception as e:
        logger.error(f"Error handling missing values: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/available-categorical-fields")
async def get_categorical_fields_endpoint(file_path: str = Query(...)):
    """Get available categorical fields and their unique values."""
    try:
        # Check if the file path is a URL
        if file_path.startswith('http'):
            import requests
            import tempfile
            
            # Download the file from Supabase Storage
            response = requests.get(file_path)
            response.raise_for_status()
            
            # Create a temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as tmp:
                tmp.write(response.content)
                local_file_path = tmp.name
        else:
            # Handle local file
            if not os.path.exists(file_path):
                raise HTTPException(status_code=404, detail=f"File not found: {file_path}")
            local_file_path = file_path
        
        logger.info(f"Getting categorical fields for file: {local_file_path}")
        categorical_fields = get_categorical_fields(local_file_path)
        logger.info(f"Found {len(categorical_fields)} categorical fields")
        return categorical_fields
        
    except Exception as e:
        logger.error(f"Error getting categorical fields: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/encode-labels")
async def encode_labels_endpoint(
    file_path: str = Form(...),
    fields: str = Form(...)
):
    """Encode categorical variables using specified methods."""
    try:
        # Check if the file path is a URL
        if file_path.startswith('http'):
            import requests
            import tempfile
            
            # Download the file from Supabase Storage
            response = requests.get(file_path)
            response.raise_for_status()
            
            # Create a temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as tmp:
                tmp.write(response.content)
                local_file_path = tmp.name
        else:
            # Handle local file
            if not os.path.exists(file_path):
                raise HTTPException(status_code=404, detail="File not found")
            local_file_path = file_path
            
        # Parse the fields JSON string
        fields_dict = json.loads(fields)
        
        # Perform encoding
        result = encode_categorical_variables(local_file_path, fields_dict)
        
        # Clean up temporary file if it was created
        if file_path.startswith('http'):
            try:
                os.unlink(local_file_path)
                logger.info(f"Cleaned up temporary file: {local_file_path}")
            except Exception as e:
                logger.warning(f"Failed to clean up temporary file {local_file_path}: {str(e)}")
        
        return result
    except Exception as e:
        logger.error(f"Error encoding labels: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/split")
def split_data_endpoint(req: SplitDataRequest, state: State = Depends(get_state)):
    try:
        # Use file path from request if provided, otherwise from state
        file_path = req.file_path if req.file_path else state.get_file_path()
        if not file_path:
            raise HTTPException(status_code=400, detail="No file path provided")
            
        if not os.path.exists(file_path):
            raise HTTPException(status_code=404, detail=f"File not found: {file_path}")
            
        logger.info(f"Splitting data for file: {file_path}")
        result = split_data(
            file_path=file_path,
            test_size=req.test_size,
            random_state=req.random_state,
            target_column=req.target_column
        )
        return result
    except ValueError as e:
        logger.error(f"Validation error in data split: {str(e)}")
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"Error in data split: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/download")
async def download_file(file_path: str):
    """Download a file from either the uploads directory or a temporary file."""
    try:
        # Check if the file exists directly
        if os.path.exists(file_path):
            return FileResponse(file_path, filename=os.path.basename(file_path))
        
        # If not, check in the uploads directory
        clean_path = file_path.replace('/', os.sep).replace('\\', os.sep)
        abs_path = os.path.join("uploads", clean_path)
        
        if os.path.exists(abs_path):
            return FileResponse(abs_path, filename=os.path.basename(abs_path))
        
        # If the file is a URL (from Supabase), download it
        if file_path.startswith('http'):
            import requests
            import tempfile
            
            response = requests.get(file_path)
            response.raise_for_status()
            
            # Create a temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.csv') as tmp:
                tmp.write(response.content)
                return FileResponse(tmp.name, filename=os.path.basename(file_path))
        
        raise HTTPException(status_code=404, detail="File not found")
        
    except Exception as e:
        logger.error(f"Error downloading file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/missing-values")
async def get_missing_values(file_path: str):
    try:
        # The file_path is now a Supabase URL, which will be handled by read_data_file
        df = read_data_file(file_path)
        missing_info = {}
        
        for column in df.columns:
            missing_count = df[column].isnull().sum()
            if missing_count > 0:
                missing_info[column] = {
                    "missing_count": int(missing_count),
                    "missing_percentage": float(missing_count / len(df) * 100)
                }
                
        return {
            "columns": missing_info,
            "total_rows": len(df)
        }
        
    except Exception as e:
        logger.error(f"Error in missing values check: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        # Create a unique filename to avoid conflicts
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        
        # Save the file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {
            "message": "File uploaded successfully",
            "file_path": file_path
        }
    except Exception as e:
        logger.error(f"Error uploading file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/columns")
async def get_columns(file_path: str):
    try:
        # The file_path is now a Supabase URL, which will be handled by read_data_file
        df = read_data_file(file_path)
        return {
            "columns": df.columns.tolist()
        }
    except Exception as e:
        logger.error(f"Error getting columns: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    
@router.post("/download-split")
async def download_split_files(request: Request):
    try:
        data = await request.json()
        files = data.get("files", {})
        if not files:
            raise HTTPException(status_code=400, detail="No files provided for download.")

        logger.info(f"Received files for download: {files}")
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=".zip") as tmp:
            with zipfile.ZipFile(tmp.name, "w") as zipf:
                for key, path in files.items():
                    # Clean up file path and ensure it's within uploads directory
                    clean_path = path.replace('/', os.sep).replace('\\', os.sep)
                    if not os.path.exists(clean_path):
                        logger.error(f"File not found: {clean_path}")
                        raise HTTPException(status_code=404, detail=f"File not found: {clean_path}")
                    
                    # Add file to zip with a descriptive name
                    zipf.write(clean_path, arcname=f"{key}_data.csv")
                    logger.info(f"Added {clean_path} to zip as {key}_data.csv")
            tmp_path = tmp.name

        return FileResponse(
            tmp_path,
            filename="train_test_split.zip",
            media_type="application/zip"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating zip file: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

def read_data_file(file_path: str) -> pd.DataFrame:
    try:
        # Check if the file path is a URL
        parsed_url = urlparse(file_path)
        if parsed_url.scheme in ['http', 'https']:
            # Download the file from Supabase
            local_path = download_from_supabase(file_path)
            try:
                # Determine file type and read accordingly
                if local_path.endswith(('.xlsx', '.xls')):
                    df = pd.read_excel(local_path)
                else:
                    df = pd.read_csv(local_path)
            except Exception as e:
                logger.error(f"Error reading downloaded file {local_path}: {str(e)}")
                raise
            finally:
                # Clean up the temporary file
                try:
                    os.unlink(local_path)
                except Exception as e:
                    logger.warning(f"Failed to clean up temporary file {local_path}: {str(e)}")
            return df
        else:
            # Handle local file
            if not os.path.exists(file_path):
                raise FileNotFoundError(f"File not found: {file_path}")
                
            if file_path.endswith(('.xlsx', '.xls')):
                return pd.read_excel(file_path)
            else:
                return pd.read_csv(file_path)
    except Exception as e:
        logger.error(f"Error reading file {file_path}: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
