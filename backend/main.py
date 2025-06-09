from fastapi import FastAPI, Request
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
from dotenv import load_dotenv
from pathlib import Path
import logging
from fastapi.responses import JSONResponse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get the absolute path to the backend directory
BACKEND_DIR = Path(__file__).parent
ENV_FILE = BACKEND_DIR / '.env'

# Load environment variables from .env file
logger.info(f"Loading environment variables from: {ENV_FILE}")
if ENV_FILE.exists():
    load_dotenv(ENV_FILE)
    logger.info("Successfully loaded .env file")
else:
    logger.error(f".env file not found at: {ENV_FILE}")

# Log environment variables (without sensitive data)
logger.info(f"SUPABASE_URL present: {'yes' if os.getenv('SUPABASE_URL') else 'no'}")
logger.info(f"SUPABASE_KEY present: {'yes' if os.getenv('SUPABASE_KEY') else 'no'}")

app = FastAPI()
setup_cors(app)  # Use the CORS configuration from config.py

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allow all origins for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

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

@app.get("/")
async def root():
    return {"message": "Welcome to Datanize API"}

@app.middleware("http")
async def error_handling_middleware(request: Request, call_next):
    try:
        return await call_next(request)
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"detail": str(e)}
        )

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
