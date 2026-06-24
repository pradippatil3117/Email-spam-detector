# Local Development Guide

This guide outlines the local development setup, prerequisites, folder structure, and build commands for Aegis.

## Prerequisites

Ensure you have the following installed on your developer workstation:
- **Node.js**: `v20.x` or higher
- **npm**: `v10.x` or higher
- **Python**: `3.13.x` or higher
- **Virtual Environment Tool**: `venv` (usually bundled with Python)

## Folder Structure

```
├── .env.example            # Environment configurations template
├── Dockerfile.frontend     # Frontend build file
├── Dockerfile.backend      # Backend build file
├── docker-compose.yml      # Multi-container topology orchestrator
├── server.ts               # Production Express gateway code
├── vite.config.ts          # Vite bundler options
├── backend/                # Python FastAPI services
│   ├── app/                # Application code
│   │   ├── api.py          # API endpoint routes
│   │   ├── database.py     # SQLite session initialization
│   │   ├── main.py         # App declaration
│   │   ├── models.py       # SQL schemas
│   │   ├── schemas.py      # Pydantic schemas
│   │   └── ml/             # NLP & ML training module
│   └── requirements.txt    # Python package dependencies
└── src/                    # Frontend React 19 codebase
    ├── App.tsx             # Route declarations and React Suspense
    ├── components/         # Page screens and layouts
    ├── context/            # Global state context (Settings, Health status)
    ├── hooks/              # Reusable React hooks
    └── main.tsx            # DOM entry point
```

## Quick Start Development Setup

Follow these steps to run the frontend and backend concurrently in development mode:

### 1. Clone & Set Up Directory
Clone the repository and install frontend dependencies:
```bash
npm install
```

### 2. Configure Python Virtual Environment
Initialize a Python virtual environment inside the `backend` folder and install Python dependencies:
```bash
# Navigate to backend
cd backend

# Initialize venv
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Return to root directory
cd ..
```

### 3. Setup Environment File
Copy the example environment configurations:
```bash
cp .env.example .env
```

### 4. Start Development Server
Run the unified dev command at the project root. This command uses `concurrently` to launch both the FastAPI uvicorn server and the Vite development server in parallel:
```bash
npm run dev
```

The application will be accessible at:
- **Frontend Console**: `http://localhost:5173` (Vite dev server)
- **API Swagger Documentation**: `http://localhost:8000/docs` (FastAPI Swagger UI)

## Key Script Commands

Run these scripts from the project root directory:
- `npm run dev`: Concurrent local dev (frontend + backend).
- `npm run lint`: Strict typescript checks using `tsc --noEmit`.
- `npm run build`: Bundles the React assets into `dist/` and compiles the Express gateway server file to `dist/server.cjs` via `esbuild`.
- `npm run start`: Runs the compiled Node.js Express server which automatically serves static files and proxies API requests.
- `npm run clean`: Cleans up the `dist/` folder and compiled files.
