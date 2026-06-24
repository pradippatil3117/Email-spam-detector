from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
import os
import json
from .schemas import EmailInput, PredictionOutput
from .ml.inference import InferenceService
from .ml.preprocessor import TextPreprocessor

router = APIRouter()
inference_service = InferenceService()
preprocessor = TextPreprocessor()

@router.post("/predict", response_model=PredictionOutput)
async def predict_spam(email: EmailInput):
    # Combine subject and body for analysis
    combined_text = f"{email.subject} {email.body}"
    cleaned_text = preprocessor.clean_text(combined_text)
    
    result = inference_service.predict(cleaned_text)
    return result

@router.get("/model/config")
async def get_model_config():
    config_path = os.path.join("trained_models", "model_config.json")
    if not os.path.exists(config_path):
        raise HTTPException(status_code=404, detail="Model configuration not found. Please train model first.")
    with open(config_path, "r") as f:
        config = json.load(f)
    return config

@router.get("/model/files/{filename}")
async def get_model_file(filename: str):
    # Sanitize filename to prevent directory traversal
    if filename not in ["confusion_matrix.png", "roc_curve.png", "precision_recall_curve.png"]:
        raise HTTPException(status_code=400, detail="Invalid filename requested.")
    
    file_path = os.path.join("trained_models", filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"File {filename} not found.")
    
    return FileResponse(file_path, media_type="image/png")

