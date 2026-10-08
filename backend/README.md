# SIH Diagnostic Training System - Backend

## Installation

```bash
cd backend
python -m venv .venv
```

Windows:
```powershell
.venv\Scripts\Activate.ps1
```

Linux/macOS:
```bash
source .venv/bin/activate
```

Install dependencies:
```bash
pip install -r requirements.txt
```

## Running the Application

```bash
uvicorn app.main:app --reload
```

API is available at:
`http://127.0.0.1:8000`

Swagger UI documentation is available at:
`http://127.0.0.1:8000/docs`

## Testing

Run tests with pytest:
```bash
python -m pytest
```
