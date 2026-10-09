#Requires -Version 5.1
<#
.SYNOPSIS
    Construye un ejecutable portable del watcher (sin necesidad de Python en la
    máquina destino) usando PyInstaller.

.DESCRIPTION
    Genera dist\PrintSystemWatcher.exe. En la máquina destino solo necesitas
    copiar ese .exe junto con tu archivo .env (en la misma carpeta) y registrar
    la tarea con:
        powershell -ExecutionPolicy Bypass -File .\install-task.ps1 -ExePath "C:\ruta\PrintSystemWatcher.exe"

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\build-exe.ps1
    powershell -ExecutionPolicy Bypass -File .\build-exe.ps1 -Clean
#>
[CmdletBinding()]
param(
    [string]$PythonPath = "",
    [switch]$Clean
)

$ErrorActionPreference = "Stop"

$watcherDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $watcherDir

if (-not $PythonPath) {
    $venvPython = Join-Path $watcherDir ".venv\Scripts\python.exe"
    if (Test-Path -LiteralPath $venvPython) {
        $PythonPath = $venvPython
    } else {
        $python = Get-Command python.exe -ErrorAction SilentlyContinue
        if (-not $python) {
            throw "No se encontró Python. Instálalo (3.10+) o usa -PythonPath."
        }
        $PythonPath = $python.Source
    }
}

if ($Clean) {
    Remove-Item -Recurse -Force (Join-Path $watcherDir "build"), (Join-Path $watcherDir "dist") -ErrorAction SilentlyContinue
}

Write-Host "Instalando dependencias (requirements + pyinstaller)..."
& $PythonPath -m pip install --disable-pip-version-check -q -r requirements.txt pyinstaller

Write-Host "Construyendo PrintSystemWatcher.exe (puede tardar 1-3 minutos)..."
& $PythonPath -m PyInstaller `
    --noconfirm `
    --onefile `
    --noconsole `
    --name PrintSystemWatcher `
    --distpath (Join-Path $watcherDir "dist") `
    --workpath (Join-Path $watcherDir "build") `
    --specpath (Join-Path $watcherDir "build") `
    --hidden-import resolver_gui `
    --hidden-import watchdog.observers.winapi `
    watcher.py

$exe = Join-Path $watcherDir "dist\PrintSystemWatcher.exe"
if (-not (Test-Path -LiteralPath $exe)) {
    throw "No se generó el ejecutable."
}

Write-Host ""
Write-Host "Ejecutable generado: $exe" -ForegroundColor Green
Write-Host ""
Write-Host "Pasos para la máquina destino (sin Python):"
Write-Host "  1. Copia PrintSystemWatcher.exe y tu archivo .env a la MISMA carpeta"
Write-Host "     (el .env debe quedar junto al .exe; ajusta WATCH_ROOT/WATCH_FOLDER de esa máquina)."
Write-Host "  2. Registra la tarea:"
Write-Host "     powershell -ExecutionPolicy Bypass -File .\install-task.ps1 -ExePath `"C:\ruta\PrintSystemWatcher.exe`""
Write-Host ""
Write-Host "Notas:"
Write-Host "  - El arranque de un .exe onefile tarda 1-3 segundos."
Write-Host "  - Algunos antivirus pueden marcarlo al inicio; agrega una excepción si pasa."
Write-Host "  - Para actualizar: reconstruye aquí y reemplaza el .exe en la máquina destino."
