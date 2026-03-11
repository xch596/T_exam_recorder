@echo off
echo Starting Exam Recorder AI Server...
echo Please do not close this window while using the "Remove Handwriting" feature.
echo Server is running on http://127.0.0.1:8001
cd /d "%~dp0"
python server/main.py
pause
