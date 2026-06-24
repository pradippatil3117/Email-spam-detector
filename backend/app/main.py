from fastapi import FastAPI
from .api import router as api_router

app = FastAPI(title="Email Security Dashboard API")

app.include_router(api_router, prefix="/api")

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}
