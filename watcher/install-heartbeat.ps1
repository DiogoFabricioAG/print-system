#Requires -Version 5.1
<#
.SYNOPSIS
    Instala un supervisor que comprueba periódicamente el watcher y lo reinicia
    si la tarea se detiene o deja de actualizar su archivo heartbeat.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\install-heartbeat.ps1
    powershell -ExecutionPolicy Bypass -File .\install-heartbeat.ps1 -IntervalMinutes 2 -StaleMinutes 3 -Force
#>
[CmdletBinding()]
param(
    [string]$HeartbeatTaskName = "PrintSystemWatcherHeartbeat",
    [string]$WatcherTaskName = "PrintSystemWatcher",
    [int]$IntervalMinutes = 5,
    [int]$StaleMinutes = 3,
    [int]$StartupGraceSeconds = 90,
    [switch]$Force
)

$ErrorActionPreference = "Stop"
$scriptPath = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "watcher-heartbeat.ps1"
if (-not (Test-Path -LiteralPath $scriptPath)) {
    throw "No se encontró watcher-heartbeat.ps1 en la carpeta del instalador."
}
if ($IntervalMinutes -lt 1 -or $StaleMinutes -lt 1) {
    throw "IntervalMinutes y StaleMinutes deben ser al menos 1."
}

$powershell = (Get-Command powershell.exe -ErrorAction Stop).Source
$scriptDir = Split-Path -Parent $scriptPath
$arguments = "-NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$scriptPath`" -TaskName `"$WatcherTaskName`" -IntervalMinutes $IntervalMinutes -StaleMinutes $StaleMinutes -StartupGraceSeconds $StartupGraceSeconds"
$action = New-ScheduledTaskAction -Execute $powershell -Argument $arguments -WorkingDirectory $scriptDir
$trigger = New-ScheduledTaskTrigger -AtLogOn -User "$env:USERDOMAIN\$env:USERNAME"
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -RestartCount 5 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -MultipleInstances IgnoreNew `
    -ExecutionTimeLimit ([TimeSpan]::Zero)
$principal = New-ScheduledTaskPrincipal `
    -UserId "$env:USERDOMAIN\$env:USERNAME" `
    -LogonType Interactive `
    -RunLevel Limited

$existing = Get-ScheduledTask -TaskName $HeartbeatTaskName -ErrorAction SilentlyContinue
if ($existing) {
    if (-not $Force) {
        throw "La tarea '$HeartbeatTaskName' ya existe. Usa -Force para reemplazarla."
    }
    Unregister-ScheduledTask -TaskName $HeartbeatTaskName -Confirm:$false
}

Register-ScheduledTask `
    -TaskName $HeartbeatTaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Principal $principal `
    -Description "Supervisa y reinicia Print System Watcher si se detiene." | Out-Null

Write-Host "Supervisor '$HeartbeatTaskName' instalado." -ForegroundColor Green
Write-Host "  Comprueba cada $IntervalMinutes minuto(s); heartbeat vencido tras $StaleMinutes minuto(s)."
Write-Host "  Se inicia al iniciar sesión como $env:USERDOMAIN\$env:USERNAME."
Write-Host "  Iniciar ahora: Start-ScheduledTask -TaskName $HeartbeatTaskName"
Write-Host "  Estado       : powershell -ExecutionPolicy Bypass -File .\status-task.ps1"
