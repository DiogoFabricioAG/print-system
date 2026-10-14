#Requires -Version 5.1
<#
.SYNOPSIS
    Supervisa la tarea del watcher y la reinicia si se detiene o deja de emitir heartbeat.

.EXAMPLE
    powershell -ExecutionPolicy Bypass -File .\watcher-heartbeat.ps1 -IntervalMinutes 5 -StaleMinutes 3
    powershell -ExecutionPolicy Bypass -File .\watcher-heartbeat.ps1 -Once
#>
[CmdletBinding()]
param(
    [string]$TaskName = "PrintSystemWatcher",
    [int]$IntervalMinutes = 5,
    [int]$StaleMinutes = 3,
    [int]$StartupGraceSeconds = 90,
    [switch]$Once
)

$ErrorActionPreference = "Continue"
if ($IntervalMinutes -lt 1) { throw "IntervalMinutes debe ser al menos 1." }
if ($StaleMinutes -lt 1) { throw "StaleMinutes debe ser al menos 1." }

function Read-DotEnv([string]$Path) {
    $values = @{}
    if (-not (Test-Path -LiteralPath $Path)) { return $values }
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

function Write-HeartbeatLog([string]$Path, [string]$Message) {
    try {
        $parent = Split-Path -Parent $Path
        New-Item -ItemType Directory -Path $parent -Force | Out-Null
        Add-Content -LiteralPath $Path -Encoding UTF8 -Value "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $Message"
    } catch {
        Write-Warning "No se pudo escribir el log del heartbeat: $_"
    }
}

function Stop-WatcherProcesses($Task, [string]$WorkingDirectory) {
    $action = $Task.Actions | Select-Object -First 1
    if (-not $action.Execute) { return }

    $exePath = [Environment]::ExpandEnvironmentVariables([string]$action.Execute)
    $exeName = [System.IO.Path]::GetFileName($exePath)
    $scriptPath = Join-Path $WorkingDirectory "watcher.py"

    try {
        $processes = Get-CimInstance Win32_Process -ErrorAction Stop
        foreach ($process in $processes) {
            $matchesWatcher = $false
            if ($exeName -match '^PrintSystemWatcher\.exe$') {
                $matchesWatcher = $process.ExecutablePath -and
                    ([string]::Equals($process.ExecutablePath, $exePath, [StringComparison]::OrdinalIgnoreCase))
            } elseif ($exeName -match '^pythonw?\.exe$') {
                $matchesWatcher = $process.ExecutablePath -and
                    ([string]::Equals($process.ExecutablePath, $exePath, [StringComparison]::OrdinalIgnoreCase)) -and
                    $process.CommandLine -and
                    ($process.CommandLine -like "*$scriptPath*")
            }

            if ($matchesWatcher) {
                Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
            }
        }
    } catch {
        Write-HeartbeatLog $script:logPath "WARN no se pudieron limpiar procesos del watcher: $_"
    }
}

$taskAtStartup = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if (-not $taskAtStartup) {
    Write-Error "No existe la tarea '$TaskName'. Instálala con install-task.ps1 primero."
    exit 1
}

$taskAction = $taskAtStartup.Actions | Select-Object -First 1
$workingDir = $taskAction.WorkingDirectory
if (-not $workingDir) { $workingDir = Split-Path -Parent $taskAction.Execute }
$envValues = Read-DotEnv (Join-Path $workingDir ".env")
$watchRoot = $envValues["WATCH_ROOT"]
if (-not $watchRoot) { $watchRoot = "C:\PrintSystem\ventas" }
$logPath = Join-Path (Join-Path $watchRoot "logs") "watcher-heartbeat.log"
$script:logPath = $logPath
$heartbeatPath = Join-Path (Join-Path $watchRoot "logs") "watcher.heartbeat"

Write-HeartbeatLog $logPath "Supervisor iniciado: tarea=$TaskName intervalo=${IntervalMinutes}m stale=${StaleMinutes}m heartbeat=$heartbeatPath"
if (-not $Once) {
    # Da tiempo a la tarea del watcher para arrancar en el mismo inicio de sesión.
    Start-Sleep -Seconds $StartupGraceSeconds
}

do {
    $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
    if (-not $task) {
        Write-HeartbeatLog $logPath "ERROR no existe la tarea '$TaskName'"
        $healthy = $false
    } else {
        $info = Get-ScheduledTaskInfo -TaskName $TaskName -ErrorAction SilentlyContinue
        $healthy = $false

        if ($task.State -eq "Running" -and (Test-Path -LiteralPath $heartbeatPath)) {
            $heartbeat = Get-Item -LiteralPath $heartbeatPath
            $ageSeconds = ((Get-Date) - $heartbeat.LastWriteTime).TotalSeconds
            if ($ageSeconds -le ($StaleMinutes * 60)) {
                $healthy = $true
                Write-HeartbeatLog $logPath "OK tarea corriendo; heartbeat hace $([int]$ageSeconds)s"
            } elseif ($info -and ((Get-Date) - $info.LastRunTime).TotalSeconds -lt $StartupGraceSeconds) {
                $healthy = $true
                Write-HeartbeatLog $logPath "INFO watcher iniciando; todavía no hay heartbeat reciente"
            } else {
                Write-HeartbeatLog $logPath "WARN heartbeat vencido ($([int]$ageSeconds)s); reiniciando watcher"
            }
        } elseif ($task.State -eq "Running" -and $info -and ((Get-Date) - $info.LastRunTime).TotalSeconds -lt $StartupGraceSeconds) {
            $healthy = $true
            Write-HeartbeatLog $logPath "INFO watcher iniciando; heartbeat aún no creado"
        } else {
            Write-HeartbeatLog $logPath "WARN tarea en estado $($task.State); intentando arrancar/reiniciar"
        }

        if (-not $healthy) {
            if ($task.State -eq "Running") {
                Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
                Start-Sleep -Seconds 3
            }
            Stop-WatcherProcesses $task $workingDir
            Start-Sleep -Seconds 1
            try {
                Start-ScheduledTask -TaskName $TaskName -ErrorAction Stop
                Write-HeartbeatLog $logPath "RESTART tarea iniciada"
            } catch {
                Write-HeartbeatLog $logPath "ERROR no se pudo iniciar la tarea: $_"
            }
        }
    }

    if ($Once) { break }
    Start-Sleep -Seconds ($IntervalMinutes * 60)
} while ($true)

Write-HeartbeatLog $logPath "Supervisor terminó"
