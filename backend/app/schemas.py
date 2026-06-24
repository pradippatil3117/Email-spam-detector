from pydantic import BaseModel
from typing import List

class EmailInput(BaseModel):
    subject: str
    body: str
    sender: str

from typing import Optional, Dict, Any

class PredictionOutput(BaseModel):
    prediction: str
    confidence: float
    spam_score: float
    suspicious_keywords: List[str]
    reasons: List[str]
    threat_summary: Optional[Dict[str, Any]] = None
    threat_score: Optional[int] = None
    threat_categories: Optional[Dict[str, List[str]]] = None
    ioc_summary: Optional[Dict[str, int]] = None
    domain_analysis: Optional[Dict[str, Any]] = None
    brand_detection: Optional[Dict[str, Any]] = None
    social_engineering: Optional[List[str]] = None
    social_engineering_evidence: Optional[Dict[str, str]] = None
    confidence_explanation: Optional[str] = None
    recommended_actions: Optional[List[str]] = None
    risk_breakdown: Optional[List[Dict[str, Any]]] = None
    safe_email_explanation: Optional[List[str]] = None
    feature_attribution: Optional[Dict[str, Any]] = None
