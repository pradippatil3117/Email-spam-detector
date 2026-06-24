# Production Deployment Guide

This guide documents the procedures for deploying the Aegis Email Security Console to a production environment.

## Docker Deployment (Recommended)

The easiest way to run Aegis in a production environment is using Docker Compose. This deploys a two-service isolated network.

### 1. Build and Run Container Services
From the project root directory, execute a single command to build both the frontend and backend images and launch the containers:
```bash
docker-compose up --build -d
```

This starts:
- **aegis-backend** container on port `8000`.
- **aegis-frontend** container on port `3000`.

### 2. Verify Health Status
Verify that both containers are running and healthy:
```bash
docker-compose ps
```
The health check configurations will periodically verify that:
- FastAPI health check returns status code `200` at `/api/health`.
- Node.js Express proxy successfully handles calls at `/api/health`.

### 3. Docker Volume Persistence
Scan logs and ML database states are written to SQLite (`/app/sql_app.db` in the backend container). The named volume `aegis-data` is mapped to `/app` in the backend container to ensure that scan logs and SQLite files persist across container restarts.

---

## Direct Host Deployment (Without Docker)

If you prefer to run the application directly on a host machine, follow these steps:

### 1. Build Client Assets
Compile the React static files and bundle the Express gateway server:
```bash
npm install
npm run build
```
This produces a `dist/` directory containing:
- Static HTML/CSS/JS bundles for the frontend.
- `dist/server.cjs`: The bundled Express gateway server file.

### 2. Prepare Production Virtual Environment
In the `backend` folder, install the requirements into a virtual environment or directly into the global python environment:
```bash
cd backend
pip install -r requirements.txt
cd ..
```

### 3. Configure Production Environment Variables
Set the following environment variables in your deployment shell or systemd service configurations:
```bash
# Force Express to run in production mode
export NODE_ENV=production

# Define port
export PORT=3000

# Instruct Express not to spawn FastAPI locally, assuming FastAPI is started separately
export SPAWN_BACKEND=false

# Point Express to the FastAPI backend host
export BACKEND_URL=http://localhost:8000
```

### 4. Daemonize with Process Manager (e.g. PM2 & systemd)
To ensure the applications restart automatically:

#### Startup backend FastAPI:
```bash
# Activate backend virtual environment and launch using uvicorn
cd backend
uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 4
```

#### Startup Express proxy using PM2:
```bash
pm2 start dist/server.cjs --name "aegis-frontend"
```

---

## Production Checklist

- [ ] **Secrets Management**: Verify that `.env` contains a unique `GEMINI_API_KEY` (if AI studio parameters are used) and is never committed to GitHub.
- [ ] **Port Security**: Ensure port `8000` is blocked by a firewall for external connections, allowing public access ONLY to port `3000` (Express proxy serves as the secure entry point).
- [ ] **HTTPS / SSL**: Place port `3000` behind a reverse proxy like Nginx or Cloudflare Tunnel to handle SSL/TLS certificate termination.
- [ ] **Persistent Backup**: Schedule periodic backups of the SQLite database (`sql_app.db`) stored inside the persistent Docker volume.
- [ ] **Rate Limiting**: Add rate-limiting on Nginx or the Express gateway for the `/api/predict` endpoint to prevent brute-force API spamming.
