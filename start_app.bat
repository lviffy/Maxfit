@echo off
echo ==========================================
echo Starting Gym Management System Services...
echo ==========================================

echo [0/2] Preparing Backend Python Environment...
cd backend
if not exist .venv (
  echo .venv not found. Creating virtual environment...
  python -m venv .venv
)
if exist .venv\Scripts\activate.bat (
  call .venv\Scripts\activate.bat
  echo Installing backend dependencies...
  pip install flask flask-cors mysql-connector-python razorpay werkzeug python-dotenv
) else (
  echo WARNING: Could not activate .venv. Backend may fail if dependencies are missing.
)
cd /d ..

echo [1/2] Starting Flask Backend...
cd backend
start "Gym Backend Server" cmd /k "if exist .venv\\Scripts\\activate.bat (call .venv\\Scripts\\activate.bat) && python app.py"
cd /d ..

echo [2/2] Starting React Frontend...
cd frontend
start "Gym Frontend Server" cmd /k "if not exist node_modules npm install && npm run dev"
cd /d ..
echo ==========================================
echo Both servers have been launched!
echo The backend is running on http://localhost:5000
echo The frontend will be available at http://localhost:3000
echo ==========================================
