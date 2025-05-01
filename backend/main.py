from fastapi import FastAPI
from routes import (
    fileupload_routes,
    preprocess_routes,
    feature_routes,
    image_routes,
    split_routes,
    column_routes,
    viz_routes,
    label_routes,
)
from config import setup_cors
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os

app = FastAPI()
setup_cors(app)  # Use the CORS configuration from config.py

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import logging
logging.basicConfig(level=logging.DEBUG)

# Ensure uploads directory exists
os.makedirs("uploads", exist_ok=True)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include Routes
app.include_router(fileupload_routes.router)
app.include_router(preprocess_routes.router)
app.include_router(feature_routes.router)
app.include_router(image_routes.router)
app.include_router(split_routes.router)
app.include_router(column_routes.router)
app.include_router(viz_routes.router)
app.include_router(label_routes.router, prefix="/label", tags=["label"])

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
