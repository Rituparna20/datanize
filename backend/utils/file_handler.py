import os
import shutil
from fastapi import UploadFile

def save_uploaded_file(file: UploadFile):
    os.makedirs("uploads", exist_ok=True)
    file_path = os.path.join("uploads", file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    return file_path