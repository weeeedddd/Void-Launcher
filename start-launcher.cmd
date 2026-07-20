@echo off
setlocal
cd /d "%~dp0"

if not exist "src-tauri\target\debug\void-launcher.exe" (
  echo Void Launcher wurde noch nicht gebaut.
  echo Starte zuerst start-dev.cmd oder fuehre npm.cmd run tauri build -- --debug --no-bundle aus.
  pause
  exit /b 1
)

start "Void Launcher" "src-tauri\target\debug\void-launcher.exe"
