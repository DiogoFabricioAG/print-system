#Requires -Version 5.1
# Funciones separadas para probar instalación y recuperación sin tareas reales.
function Read-WatcherSettings([string]$EnvPath) {
    $values = @{}
    foreach ($line in Get-Content -LiteralPath $EnvPath) {
        if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$') {
            $values[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
        }
    }
    return $values
}

function Assert-WatcherHash([string]$Path, [string]$Expected) {
    if ($Expected -notmatch '^[a-fA-F0-9]{64}$' -or (Get-FileHash -LiteralPath $Path -Algorithm SHA256).Hash -ne $Expected) {
        throw 'El archivo descargado no coincide con su SHA256. No se reemplazará el listener.'
    }
}

function Stop-WatcherExecutable([string]$TaskName, [string]$ExePath) {
    Stop-ScheduledTask -TaskName $TaskName -ErrorAction Stop
    # PyInstaller puede dejar un proceso hijo: limitar la limpieza a esta ruta exacta.
    foreach ($process in Get-CimInstance Win32_Process) {
        if ($process.ExecutablePath -and [string]::Equals($process.ExecutablePath, $ExePath, [StringComparison]::OrdinalIgnoreCase)) {
            Stop-Process -Id $process.ProcessId -Force -ErrorAction Stop
        }
    }
}

function Wait-WatcherHeartbeat([string]$TaskName, [string]$Heartbeat, [datetime]$Since, [int]$TimeoutSeconds = 60) {
    $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
    do {
        $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop
        if ($task.State -eq 'Running' -and (Test-Path -LiteralPath $Heartbeat) -and
            (Get-Item -LiteralPath $Heartbeat).LastWriteTimeUtc -ge $Since.ToUniversalTime()) { return }
        Start-Sleep -Seconds 1
    } while ((Get-Date) -lt $deadline)
    throw 'El watcher no confirmó su arranque mediante un heartbeat nuevo.'
}

function Install-WatcherBinary {
    param(
        [string]$TaskName, [string]$ExePath, [string]$DownloadPath,
        [string]$ManifestPath, [string]$Heartbeat, [int]$TimeoutSeconds = 60
    )
    $manifest = Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json
    Assert-WatcherHash $DownloadPath $manifest.sha256
    $backup = "$ExePath.previous"
    $versionPath = Join-Path (Split-Path -Parent $ExePath) '.watcher-version.json'
    $versionBackup = "$versionPath.previous"
    $hadVersion = Test-Path -LiteralPath $versionPath
    $backupReady = $false
    try {
        Copy-Item -LiteralPath $ExePath -Destination $backup -Force
        $backupReady = $true
        if ($hadVersion) { Copy-Item -LiteralPath $versionPath -Destination $versionBackup -Force }
        Copy-Item -LiteralPath $DownloadPath -Destination $ExePath -Force
        Assert-WatcherHash $ExePath $manifest.sha256
        $since = Get-Date
        Start-ScheduledTask -TaskName $TaskName -ErrorAction Stop
        Wait-WatcherHeartbeat $TaskName $Heartbeat $since $TimeoutSeconds
        Copy-Item -LiteralPath $ManifestPath -Destination $versionPath -Force
    } catch {
        $failure = $_
        Stop-WatcherExecutable $TaskName $ExePath
        if ($backupReady) { Copy-Item -LiteralPath $backup -Destination $ExePath -Force }
        if ($hadVersion -and (Test-Path -LiteralPath $versionBackup)) {
            Copy-Item -LiteralPath $versionBackup -Destination $versionPath -Force
        } elseif (Test-Path -LiteralPath $versionPath) {
            Remove-Item -LiteralPath $versionPath
        }
        $since = Get-Date
        Start-ScheduledTask -TaskName $TaskName -ErrorAction Stop
        Wait-WatcherHeartbeat $TaskName $Heartbeat $since $TimeoutSeconds
        throw "Actualización fallida; se restauró y arrancó la versión anterior. $failure"
    }
}
