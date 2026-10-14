#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$HeartbeatTaskName = "PrintSystemWatcherHeartbeat"
)

$ErrorActionPreference = "Stop"
$task = Get-ScheduledTask -TaskName $HeartbeatTaskName -ErrorAction SilentlyContinue
if (-not $task) {
    Write-Host "La tarea '$HeartbeatTaskName' no existe. Nada que hacer."
    exit 0
}

Stop-ScheduledTask -TaskName $HeartbeatTaskName -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName $HeartbeatTaskName -Confirm:$false
Write-Host "Supervisor '$HeartbeatTaskName' eliminado." -ForegroundColor Green
