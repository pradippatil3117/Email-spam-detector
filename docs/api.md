# API Documentation

This document describes the API endpoints exposed by the Python FastAPI backend service.

The API runs on port `8000` by default. Swagger documentation is auto-generated and interactive, accessible at `/docs` when the server is running.

---

## 1. Health Status
Check backend service health and online indicator.

- **Endpoint**: `/api/health`
- **Method**: `GET`
- **Response**: `application/json`

### Success Response (200 OK)
```json
{
  "status": "ok"
}
```

---

## 2. Predict Email Classification
Evaluate email data payloads against the Logistic Regression machine learning model.

- **Endpoint**: `/api/predict`
- **Method**: `POST`
- **Request Body**: `application/json`

### Request Schema (Pydantic model)
```json
{
  "sender": "string (valid email structure)",
  "subject": "string (min length 1, max 150)",
  "body": "string (min length 1, max 50000)"
}
```

### Success Response (200 OK)
```json
{
  "prediction": "Safe" | "Spam",
  "spam_score": 0.1234, // float between 0.0 and 1.0
  "confidence": 0.8766, // float between 0.0 and 1.0 (confidence of classification)
  "keywords_detected": ["lottery", "urgent"],
  "model_metadata": {
    "version": "1.0.0",
    "threshold": 0.72
  }
}
```

---

## 3. Retrieve Model Configurations
Fetch active hyperparameter settings and metadata parameters for the deployed Logistic Regression classifier.

- **Endpoint**: `/api/model/config`
- **Method**: `GET`
- **Response**: `application/json`

### Success Response (200 OK)
```json
{
  "model_version": "1.0.0",
  "algorithm": "Logistic Regression",
  "training_date": "2026-06-24",
  "accuracy": 0.982,
  "precision": 0.985,
  "recall": 0.979,
  "f1_score": 0.982,
  "roc_auc": 0.998,
  "threshold": 0.72,
  "vocabulary_size": 1248,
  "dataset_size": 65
}
```

---

## 4. Retrieve Evaluation Charts (File Download)
Download confusion matrix, ROC curves, or other static evaluation charts.

- **Endpoint**: `/api/model/files/{filename}`
- **Method**: `GET`
- **Response**: `image/png` (binary stream)

### Path Parameters
- `filename`: Filename of the plot to retrieve. Valid options:
  - `confusion_matrix.png`
  - `roc_curve.png`
  - `precision_recall_curve.png`

### Error Responses
- **404 Not Found**: File does not exist in the models directory.
- **500 Internal Error**: Backend filesystem access failed.
