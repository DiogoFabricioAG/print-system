#Requires -Version 5.1
<#
.SYNOPSIS
    Elimina la tarea programada del watcher EDA.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\uninstall-task.ps1
#>
[CmdletBinding()]
param(
    [string]$TaskName = "PrintSystemWatcher"
)

$ErrorActionPreference = "Stop"

$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if (-not $task) {
    Write-Host "La tarea '$TaskName' no existe. Nada que hacer."
    exit 0
}

$running = Get-ScheduledTask -TaskName $TaskName | Get-ScheduledTaskInfo
if ($running.LastTaskResult -eq 267009) {
    Stop-ScheduledTask -TaskName $TaskName
}

Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
Write-Host "Tarea '$TaskName' eliminada." -ForegroundColor Green
