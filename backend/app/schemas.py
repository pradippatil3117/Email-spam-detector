from pydantic import BaseModel
from typing import List

class EmailInput(BaseModel):
    subject: str
    body: str
    sender: str

class PredictionOutput(BaseModel):
    prediction: str
    confidence: float
    spam_score: float
    suspicious_keywords: List[str]
    reasons: List[str]
