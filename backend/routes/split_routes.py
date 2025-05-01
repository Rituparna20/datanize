from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import pandas as pd
from sklearn.model_selection import train_test_split
import os
from typing import Optional
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

class SplitParams(BaseModel):
    input_file: str
    test_size: float
    random_state: Optional[int] = None
    target_column: str

@router.post("/split-data")
async def split_data(params: SplitParams):
    try:
        # Validate test size
        if not 0 < params.test_size < 1:
            raise HTTPException(status_code=400, detail="Test size must be between 0 and 1")
        
        # Read the preprocessed file
        input_file_path = os.path.join("uploads", params.input_file)
        logger.info(f"Reading input file from: {input_file_path}")
        
        if not os.path.exists(input_file_path):
            raise HTTPException(status_code=404, detail=f"Input file not found at {input_file_path}")
        
        df = pd.read_csv(input_file_path)
        logger.info(f"Successfully read input file with shape: {df.shape}")
        
        # Check if target column exists
        if params.target_column not in df.columns:
            raise HTTPException(status_code=400, detail=f"Target column '{params.target_column}' not found in the dataset")
        
        # Split the data
        X = df.drop(columns=[params.target_column])
        y = df[params.target_column]
        
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, 
            test_size=params.test_size,
            random_state=params.random_state
        )
        
        # Create split directory
        base_name = os.path.splitext(params.input_file)[0]
        split_dir = f"{base_name}_split"
        split_dir_path = os.path.join("uploads", split_dir)
        os.makedirs(split_dir_path, exist_ok=True)
        logger.info(f"Created split directory at: {split_dir_path}")
        
        # Define file paths
        X_train_path = os.path.join(split_dir_path, "X_train.csv")
        X_test_path = os.path.join(split_dir_path, "X_test.csv")
        y_train_path = os.path.join(split_dir_path, "y_train.csv")
        y_test_path = os.path.join(split_dir_path, "y_test.csv")
        
        # Save files
        X_train.to_csv(X_train_path, index=False)
        X_test.to_csv(X_test_path, index=False)
        y_train.to_csv(y_train_path, index=False)
        y_test.to_csv(y_test_path, index=False)
        logger.info("Successfully saved all split files")
        
        # Return relative paths for frontend
        return {
            "message": "Data split successfully",
            "files": {
                "X_train": f"{split_dir}/X_train.csv",
                "X_test": f"{split_dir}/X_test.csv",
                "y_train": f"{split_dir}/y_train.csv",
                "y_test": f"{split_dir}/y_test.csv"
            },
            "shapes": {
                "X_train": X_train.shape,
                "X_test": X_test.shape,
                "y_train": y_train.shape,
                "y_test": y_test.shape
            }
        }
        
    except Exception as e:
        logger.error(f"Error in split_data: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e)) 