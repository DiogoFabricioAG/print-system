#Requires -Version 5.1
<#
.SYNOPSIS
    Registra el watcher EDA como tarea programada al iniciar sesión del usuario.

.DESCRIPTION
    La tarea ejecuta `pythonw.exe watcher.py` en la carpeta del watcher. Se
    registra "Al iniciar sesión" porque los diálogos Tkinter solo pueden
    mostrarse en una sesión interactiva.

    Si la máquina destino no tiene Python, construye el ejecutable portable con
    build-exe.ps1 y pasa su ruta con -ExePath (el .env debe estar junto al .exe).

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\install-task.ps1
    powershell -ExecutionPolicy Bypass -File .\install-task.ps1 -Force

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\install-task.ps1 -ExePath "C:\PrintSystemWatcher\PrintSystemWatcher.exe"
#>
[CmdletBinding()]
param(
    [string]$TaskName = "PrintSystemWatcher",
    [string]$PythonPath = "",
    [string]$ExePath = "",
    [switch]$Force
)

$ErrorActionPreference = "Stop"

$watcherDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$scriptPath = Join-Path $watcherDir "watcher.py"

if ($ExePath) {
    if (-not (Test-Path -LiteralPath $ExePath)) {
        throw "No se encontró el ejecutable: '$ExePath'."
    }
    $ExePath = (Resolve-Path -LiteralPath $ExePath).Path
    $workingDir = Split-Path -Parent $ExePath
    if (-not (Test-Path -LiteralPath (Join-Path $workingDir ".env"))) {
        Write-Warning "No existe '.env' junto al ejecutable ('$workingDir\.env'). Créalo antes de usar la tarea (API_KEY, WATCH_ROOT/WATCH_FOLDER de esta máquina)."
    }
} else {
    if (-not (Test-Path -LiteralPath $scriptPath)) {
        throw "No se encontró watcher.py en '$watcherDir'."
    }

    if (-not $PythonPath) {
        $pythonw = Get-Command pythonw.exe -ErrorAction SilentlyContinue
        if ($pythonw) {
            $PythonPath = $pythonw.Source
        } else {
            $python = Get-Command python.exe -ErrorAction SilentlyContinue
            if (-not $python) {
                throw "No se encontró Python en el PATH. Instala Python 3.10+ (con Tkinter) y vuelve a intentarlo, o usa el ejecutable portable: build-exe.ps1 + install-task.ps1 -ExePath."
            }
            $PythonPath = $python.Source
            Write-Warning "No se encontró pythonw.exe; se usará python.exe (se abrirá una consola)."
        }
    }

    if (-not (Test-Path -LiteralPath (Join-Path $watcherDir ".env"))) {
        Write-Warning "No existe '$watcherDir\.env'. Copia .env.example a .env y configura API_KEY antes de usar la tarea."
    }
    $workingDir = $watcherDir
}

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    if (-not $Force) {
        throw "La tarea '$TaskName' ya existe. Usa -Force para reemplazarla."
    }
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
}

if ($ExePath) {
    $action = New-ScheduledTaskAction -Execute $ExePath -WorkingDirectory $workingDir
} else {
    $action = New-ScheduledTaskAction -Execute $PythonPath -Argument "`"$scriptPath`"" -WorkingDirectory $workingDir
}
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -RestartCount 5 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit ([TimeSpan]::Zero)
$principal = New-ScheduledTaskPrincipal -UserId "$env:USERDOMAIN\$env:USERNAME" -LogonType Interactive -RunLevel Limited

try {
    Register-ScheduledTask `
        -TaskName $TaskName `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Description "Print System: registra ventas al detectar PNG nuevos en la carpeta de entrada." | Out-Null
} catch {
    throw "No se pudo registrar la tarea (¿permisos?). Ejecuta PowerShell como administrador e inténtalo de nuevo. Detalle: $_"
}

Write-Host ""
Write-Host "Tarea '$TaskName' registrada correctamente." -ForegroundColor Green
if ($ExePath) {
    Write-Host "  Programa : $ExePath"
    Write-Host "  Datos    : $workingDir  (.env junto al ejecutable)"
} else {
    Write-Host "  Programa : $PythonPath"
    Write-Host "  Script   : $scriptPath"
}
Write-Host "  Disparo  : al iniciar sesión de $env:USERDOMAIN\$env:USERNAME (necesario para los popups Tkinter)"
Write-Host ""
Write-Host "Iniciar ahora      : Start-ScheduledTask -TaskName $TaskName"
Write-Host "Ver estado         : Get-ScheduledTask -TaskName $TaskName | Get-ScheduledTaskInfo"
Write-Host "Desinstalar        : .\uninstall-task.ps1"
