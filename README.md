# Email Security Dashboard

An enterprise-grade, AI-powered email security dashboard for spam and phishing detection.

## Architecture

This application uses a streamlined full-stack architecture:

1. **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui.
2. **Backend**: Python FastAPI handling all REST APIs, authentication, business logic, and ML inference.
3. **Database**: PostgreSQL (Production) / SQLite (Development) with SQLAlchemy.
4. **DevOps**: Docker & Docker Compose for containerized deployment, GitHub Actions for CI/CD.

## Folder Structure

```
email-security-dashboard/
├── backend/          # Python/FastAPI application
│   ├── app/          # API, Auth, Logic, ML
│   ├── requirements.txt
│   └── ...
├── frontend/         # React 19, TypeScript, Vite
├── datasets/         # Training datasets
├── trained_models/   # Serialized ML models (Joblib)
├── tests/            # Test suite
├── docs/             # Documentation
├── docker-compose.yml
├── .env.example
└── README.md
```
