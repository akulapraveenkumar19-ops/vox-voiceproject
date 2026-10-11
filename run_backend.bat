@echo off
title VoxWeb Backend Server (Port 8000)
echo ========================================================
echo        Starting VoxWeb Voice AI Backend Server
echo ========================================================

set PYTHON_CMD=

:: 1. Check Python 3.12 default install path
if exist "%LOCALAPPDATA%\Programs\Python\Python312\python.exe" (
    set "PYTHON_CMD=%LOCALAPPDATA%\Programs\Python\Python312\python.exe"
)

:: 2. Check py launcher
if "%PYTHON_CMD%"=="" (
    where py >nul 2>&1
    if not errorlevel 1 set "PYTHON_CMD=py"
)

:: 3. Check system python
if "%PYTHON_CMD%"=="" (
    where python >nul 2>&1
    if not errorlevel 1 set "PYTHON_CMD=python"
)

if "%PYTHON_CMD%"=="" (
    echo [ERROR] Python not found. Please install Python 3.10+ from python.org.
    pause
    exit /b 1
)

echo Using Python: %PYTHON_CMD%
cd /d "%~dp0backend"
"%PYTHON_CMD%" -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
pause
