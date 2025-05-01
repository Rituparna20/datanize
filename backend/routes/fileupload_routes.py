# upload_routes.py
from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
import os
import logging
import pandas as pd
from state import get_state, State

router = APIRouter(prefix="/upload")

def validate_file_content(file_path: str) -> tuple[bool, str]:
    """Validate that a file can be read and contains valid data."""
    try:
        # Remove any duplicate 'uploads' in the path
        clean_path = file_path.replace('uploads/uploads', 'uploads')
        clean_path = clean_path.replace('uploads\\uploads', 'uploads')
        
        if not os.path.exists(clean_path):
            return False, f"File not found at path: {clean_path}"
            
        if clean_path.endswith(('.xlsx', '.xls')):
            df = pd.read_excel(clean_path)
        else:
            df = pd.read_csv(clean_path)
            
        if df.empty:
            return False, "File is empty"
            
        if len(df.columns) < 2:
            return False, "File must have at least 2 columns for visualization"
            
        return True, ""
    except Exception as e:
        logging.error(f"File validation error: {str(e)}")
        return False, f"Failed to read file: {str(e)}"

@router.post("/file")
async def upload_file(file: UploadFile = File(...), state: State = Depends(get_state)):
    try:
        # Ensure uploads directory exists
        os.makedirs("uploads", exist_ok=True)
        
        # Create the full file path
        file_path = os.path.join("uploads", file.filename)
        logging.info(f"Attempting to save file to: {file_path}")
        
        # Save the file
        try:
            with open(file_path, "wb") as f:
                content = await file.read()
                f.write(content)
            logging.info(f"Successfully saved file: {file.filename}")
        except Exception as e:
            logging.error(f"Failed to save file: {str(e)}")
            raise HTTPException(status_code=500, detail=f"Failed to save file: {str(e)}")

        # Validate file content
        is_valid, error_message = validate_file_content(file_path)
        if not is_valid:
            try:
                os.remove(file_path)  # Clean up invalid file
            except Exception as e:
                logging.error(f"Failed to remove invalid file: {str(e)}")
            raise HTTPException(status_code=400, detail=error_message)

        # Update the file path in state
        state.set_file_path(file_path)
        
        return {
            "file_path": file_path,
            "message": "File uploaded successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error uploading file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error uploading file: {str(e)}")

@router.get("/validate-file")
async def validate_file(file_path: str = Query(...)):
    """Endpoint to validate if a file can be read properly."""
    try:
        logging.info(f"Validating file at path: {file_path}")
        
        # Remove any duplicate 'uploads' in the path
        clean_path = file_path.replace('uploads/uploads', 'uploads')
        clean_path = clean_path.replace('uploads\\uploads', 'uploads')
        
        if not os.path.exists(clean_path):
            logging.error(f"File not found at path: {clean_path}")
            raise HTTPException(status_code=404, detail=f"File not found at path: {clean_path}")
            
        is_valid, error_message = validate_file_content(clean_path)
        if not is_valid:
            logging.error(f"File validation failed: {error_message}")
            raise HTTPException(status_code=400, detail=error_message)
            
        return {"message": "File is valid", "file_path": clean_path}
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error validating file: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error validating file: {str(e)}")
