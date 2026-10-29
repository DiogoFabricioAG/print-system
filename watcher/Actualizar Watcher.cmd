@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0update-watcher.ps1" -RepoPath "%~dp0.."
if errorlevel 1 (
  echo.
  echo No se completo la actualizacion. Revisa el mensaje anterior.
)
pause
