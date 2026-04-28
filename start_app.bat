@echo off
echo ==========================================
echo Starting Gym Management System Services...
echo ==========================================

echo [1/2] Starting Flask Backend...
cd gym_project
start "Gym Backend Server" cmd /k "python app.py"
cd ..

echo [2/2] Starting React Frontend...
cd frontend
start "Gym Frontend Server" cmd /k "pnpm run dev"
cd ..
https://github.com/adisingh592/Maxfit
echo ==========================================
echo Both servers have been launched!
echo The backend is running on http://127.0.0.1:5000
echo The frontend will be available at http://localhost:3000
echo ==========================================
