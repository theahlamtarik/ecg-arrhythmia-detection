@echo off
echo ============================================================
echo    ECG Arrhythmia Detection - Professional Interface
echo    ResNet-18 + CBAM Deep Learning Model
echo ============================================================
echo.

cd /d "%~dp0"

echo [1/4] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed or not in PATH
    pause
    exit /b 1
)

echo [2/4] Creating virtual environment...
if not exist "venv" (
    python -m venv venv
    echo Virtual environment created.
) else (
    echo Virtual environment already exists.
)

echo [3/4] Activating virtual environment...
call venv\Scripts\activate.bat

echo [4/4] Installing dependencies...
cd backend
pip install -r requirements.txt

echo [5/5] Starting server...
echo.
echo ============================================================
echo    Server starting at: http://localhost:5000
echo    Open this URL in your browser
echo    Press Ctrl+C to stop the server
echo ============================================================
echo.

python app.py

pause
