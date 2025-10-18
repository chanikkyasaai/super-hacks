@echo off
REM Deploy the CDK stack (Windows)
set PY=%~dp0\.venv\Scripts\python.exe
n%PY% -m pip install -r requirements.txt
n%PY% -m pip install -r requirements-dev.txt
ncdk synth
ncdk deploy --require-approval never
pause
