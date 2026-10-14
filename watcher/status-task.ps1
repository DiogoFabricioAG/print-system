#Requires -Version 5.1
<#
.SYNOPSIS
    Comprueba el estado de la tarea PrintSystemWatcher, su log y la conexión API.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\status-task.ps1
    powershell -ExecutionPolicy Bypass -File .\status-task.ps1 -TaskName PrintSystemWatcher
#>
[CmdletBinding()]
param(
    [string]$TaskName = "PrintSystemWatcher"
)

$ErrorActionPreference = "Continue"

function Read-DotEnv([string]$Path) {
    $values = @{}
    if (-not (Test-Path -LiteralPath $Path)) {
        return $values
    }

    foreach ($line in Get-Content -LiteralPath $Path) {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
            $name = $Matches[1]
            $value = $Matches[2].Trim()
            if ($value.Length -ge 2 -and $value.StartsWith('"') -and $value.EndsWith('"')) {
                $value = $value.Substring(1, $value.Length - 2)
            } elseif ($value.Length -ge 2 -and $value.StartsWith("'") -and $value.EndsWith("'")) {
                $value = $value.Substring(1, $value.Length - 2)
            }
            $values[$name] = $value
        }
    }
    return $values
}

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if (-not $task) {
    Write-Host "NO INSTALADA: no existe la tarea '$TaskName'." -ForegroundColor Red
    Write-Host "Regístrala con install-task.ps1."
    exit 1
}

$info = Get-ScheduledTaskInfo -TaskName $TaskName -ErrorAction SilentlyContinue
$action = $task.Actions | Select-Object -First 1
$workingDir = $action.WorkingDirectory

if (-not $workingDir -and $action.Execute) {
    $workingDir = Split-Path -Parent $action.Execute
}
if (-not $workingDir) {
    $workingDir = (Get-Location).Path
}

$envPath = Join-Path $workingDir ".env"
$settings = Read-DotEnv $envPath
$watchRoot = $settings["WATCH_ROOT"]
if (-not $watchRoot) {
    $watchRoot = "C:\PrintSystem\ventas"
}
$watchFolder = $settings["WATCH_FOLDER"]
if (-not $watchFolder) {
    $watchFolder = Join-Path $watchRoot "entrada"
}
$apiUrl = $settings["API_URL"]
if (-not $apiUrl) {
    $apiUrl = "https://functions.diogofabricio17.workers.dev/api"
}
$apiKey = $settings["API_KEY"]
$logPath = Join-Path (Join-Path $watchRoot "logs") "watcher.log"
$heartbeatPath = Join-Path (Join-Path $watchRoot "logs") "watcher.heartbeat"
$heartbeatInterval = 30
if ($settings["HEARTBEAT_INTERVAL_SECONDS"]) {
    try { $heartbeatInterval = [int]$settings["HEARTBEAT_INTERVAL_SECONDS"] } catch { }
}
$heartbeatStaleSeconds = [Math]::Max(90, $heartbeatInterval * 3)

Write-Host "Tarea       : $TaskName"
Write-Host "Estado      : $($task.State)"
Write-Host "Ejecutable  : $($action.Execute)"
Write-Host "Carpeta .env: $workingDir"
Write-Host "Monitoreo   : $watchFolder"
Write-Host "Log         : $logPath"
Write-Host "Heartbeat   : $heartbeatPath"
if ($info) {
    Write-Host "Última vez  : $($info.LastRunTime)"
    Write-Host "Resultado   : $($info.LastTaskResult)"
}

$taskRunning = $task.State -eq "Running"
if ($taskRunning) {
    Write-Host "Watcher     : CORRIENDO" -ForegroundColor Green
} else {
    Write-Host "Watcher     : DETENIDO" -ForegroundColor Yellow
}

$heartbeatOk = $false
if (Test-Path -LiteralPath $heartbeatPath) {
    $heartbeatAge = [int]((Get-Date) - (Get-Item -LiteralPath $heartbeatPath).LastWriteTime).TotalSeconds
    $heartbeatOk = $heartbeatAge -le $heartbeatStaleSeconds
    $heartbeatColor = if ($heartbeatOk) { "Green" } else { "Red" }
    Write-Host "Pulso       : $(if ($heartbeatOk) { 'ACTIVO' } else { 'VENCIDO' }) hace ${heartbeatAge}s" -ForegroundColor $heartbeatColor
} elseif ($taskRunning -and $info -and ((Get-Date) - $info.LastRunTime).TotalSeconds -lt 90) {
    $heartbeatOk = $true
    Write-Host "Pulso       : iniciando (gracia de arranque)" -ForegroundColor Yellow
} else {
    Write-Host "Pulso       : NO ENCONTRADO" -ForegroundColor Red
}

if (Test-Path -LiteralPath $logPath) {
    Write-Host "`n--- Últimas líneas del log ---" -ForegroundColor Cyan
    Get-Content -LiteralPath $logPath -Tail 12
} else {
    Write-Host "`nAún no existe el log. Revisa WATCH_ROOT o inicia el watcher." -ForegroundColor Yellow
}

$apiOk = $false
if (-not $apiKey) {
    Write-Host "`nAPI         : SIN API_KEY en $envPath" -ForegroundColor Red
} else {
    try {
        $response = Invoke-RestMethod `
            -Uri "$($apiUrl.TrimEnd('/'))/clientes" `
            -Headers @{ "X-API-Key" = $apiKey } `
            -TimeoutSec 12
        if ($response.success) {
            $count = @($response.data).Count
            Write-Host "`nAPI         : CONECTADA ($count clientes)" -ForegroundColor Green
            $apiOk = $true
        } else {
            Write-Host "`nAPI         : respondió sin success=true" -ForegroundColor Red
        }
    } catch {
        Write-Host "`nAPI         : ERROR ($($_.Exception.Message))" -ForegroundColor Red
    }
}

if ($taskRunning -and $heartbeatOk -and $apiOk -and (Test-Path -LiteralPath $logPath)) {
    Write-Host "`nESTADO GENERAL: OPERATIVO" -ForegroundColor Green
    exit 0
}

Write-Host "`nESTADO GENERAL: REVISAR lo indicado arriba" -ForegroundColor Yellow
exit 1
