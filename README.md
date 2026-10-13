# Agri-Ledger

Agricultural Ledger and Farmer Settlement Management System.

## Project Overview

Agri-Ledger is a database management project designed to manage agricultural records, including farmers, fields, crop seasons, inputs, harvests, market sales, transportation, deductions, interest, and final farmer settlements.

## Database

The project uses MySQL.

The complete database export is available in:

database/agri_ledger.sql

## Main Modules

- Farmers
- Fields
- Crop Seasons
- Products
- Input Purchases
- Labour Expenses
- Harvests
- Transport Records
- Market Sales
- Sale Deductions
- Interest Charges
- Settlements
- Farmer Payments

## Quick Start (Development)

### 1. Backend Setup
```bash
# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate   # Windows
# source venv/bin/activate # Linux/macOS

# Install dependencies
pip install -r backend/requirements.txt  # or backend/requirements_dev.txt

# Configure environment
cp .env.example .env
# Edit .env with your MySQL credentials

# Run development server
python -m backend.app
# Server runs on http://127.0.0.1:5000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# Vite runs on http://localhost:5173 (or 5174)
```

## Running Tests
```bash
# Backend unit & integration test suite (109 tests)
.\venv\Scripts\python.exe -m unittest discover -s backend/tests

# Frontend production build
cd frontend
npm run build
```

## Production Deployment Commands

### Production Configuration
Set `FLASK_ENV=production` and generate a strong secret:
```bash
# Set AGRILEDGER_SECRET_KEY (min 32 characters)
export AGRILEDGER_SECRET_KEY=$(python -c "import secrets; print(secrets.token_hex(32))")
export FLASK_ENV=production
export CORS_ORIGINS="https://your-frontend-domain.com"
```

### WSGI Startup
Using Gunicorn (Linux):
```bash
gunicorn "backend.app:create_app()" --bind 0.0.0.0:5000 --workers 4 --threads 2
```

Using Waitress (Windows / Cross-platform):
```bash
waitress-serve --listen=127.0.0.1:5000 backend.app:app
```

## Author

Tharun Goud
