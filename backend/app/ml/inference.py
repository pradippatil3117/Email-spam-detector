import joblib
import os

class InferenceService:
    def __init__(self, model_path='trained_models/model.pkl'):
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model not found at {model_path}. Run trainer.py first.")
        self.model = joblib.load(model_path)
        
    def predict(self, text):
        # The pipeline already includes vectorization
        prediction = self.model.predict([text])[0]
        confidence = self.model.predict_proba([text])[0].max()
        
        # Simple heuristic for demonstration of 'reasons' and 'keywords'
        # In production, this would be more sophisticated (e.g., analyzing feature weights)
        suspicious_keywords = ["win", "million", "urgent", "account", "locked"]
        detected = [word for word in suspicious_keywords if word in text.lower()]
        
        reasons = []
        if detected:
            reasons.append(f"Detected suspicious keywords: {', '.join(detected)}")
        if confidence > 0.9:
            reasons.append("High confidence in classification.")
            
        return {
            "prediction": "Spam" if prediction == 1 else "Safe",
            "confidence": float(confidence),
            "spam_score": float(confidence) if prediction == 1 else float(1 - confidence),
            "suspicious_keywords": detected,
            "reasons": reasons
        }
