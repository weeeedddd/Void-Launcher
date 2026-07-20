@echo off
setlocal
set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
cd /d "%~dp0"
npm.cmd run tauri dev
if errorlevel 1 pause
