@echo off
title VoxWeb AI Assistant
echo ========================================================
echo        Starting VoxWeb AI Full-Stack Application
echo ========================================================

echo 1. Launching Backend on Port 8000...
start "VoxWeb Backend" "%~dp0run_backend.bat"

echo 2. Launching Frontend on Port 5173...
cd /d "%~dp0frontend"
start "VoxWeb Frontend" cmd /k "npm run dev"

echo ========================================================
echo VoxWeb services launched!
echo Backend:  http://127.0.0.1:8000
echo Frontend: http://localhost:5173
echo ========================================================
