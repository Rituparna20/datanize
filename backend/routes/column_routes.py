# column_routes.py
from fastapi import APIRouter, Query
import pandas as pd
import os

router = APIRouter(prefix="/columns")

@router.get("/")
def get_columns(file_path: str = Query(...)):
    if not os.path.exists(file_path):
        return {"error": "File not found", "file_path": file_path}

    try:
        # Check file extension and read accordingly
        if file_path.endswith(".xlsx") or file_path.endswith(".xls") or file_path.endswith(".csv"):
            df = pd.read_excel(file_path)
        else:
            df = pd.read_csv(file_path)

        columns = list(df.columns)
        return {"columns": columns}
    
    except Exception as e:
        return {"error": f"Failed to read file: {str(e)}", "file_path": file_path}
