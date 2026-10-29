#Requires -Version 5.1
[CmdletBinding()]
param(
    [string]$RepoPath = (Split-Path -Parent $PSScriptRoot),
    [string]$TaskName = 'PrintSystemWatcher',
    [string]$HeartbeatTaskName = 'PrintSystemWatcherHeartbeat',
    [switch]$CheckOnly
)
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
. (Join-Path $PSScriptRoot 'update-core.ps1')

function Invoke-RepoGit {
    $result = & git -C $RepoPath @args
    if ($LASTEXITCODE -ne 0) { throw "Git no pudo completar: $args" }
    return $result
}

$mutex = New-Object Threading.Mutex($false, 'Local\PrintSystemWatcherUpdater')
if (-not $mutex.WaitOne(0)) { throw 'Ya hay una actualización en curso.' }
$restartSupervisor = $false
$watcherStopped = $false
$requestPath = $null
$exePath = $null
$restoreOnFailure = $false
try {
    if (-not (Get-Command git -ErrorAction SilentlyContinue)) { throw 'Instala Git para Windows para actualizar el repositorio.' }
    $RepoPath = (Resolve-Path -LiteralPath $RepoPath).Path.TrimEnd('\')
    $root = [IO.Path]::GetFullPath((Invoke-RepoGit rev-parse --show-toplevel)).TrimEnd('\')
    if ($root -ne $RepoPath) { throw 'Selecciona la carpeta raíz del repositorio print-system.' }
    if ((Invoke-RepoGit branch --show-current) -ne 'main') { throw 'El repositorio debe estar en la rama main.' }
    if ((Invoke-RepoGit remote get-url origin) -notmatch 'github\.com[:/]DiogoFabricioAG/print-system(?:\.git)?$') { throw 'El origin no corresponde al repositorio Print System.' }
    if (Invoke-RepoGit status --porcelain --untracked-files=no) { throw 'Hay cambios locales sin guardar en Git. Se conserva la instalación; resuélvelos antes de actualizar.' }
    Write-Host '1/4 Actualizando repositorio...' -ForegroundColor Cyan
    Invoke-RepoGit pull --ff-only origin main | Out-Host
    $commit = Invoke-RepoGit log -1 --format=%H -- watcher .github/workflows/watcher-release.yml
    if ($commit -notmatch '^[a-f0-9]{40}$') { throw 'No se pudo identificar la versión del watcher.' }
    $staging = Join-Path $RepoPath "watcher\.updates\$commit"
    New-Item -ItemType Directory -Path $staging -Force | Out-Null
    $manifestPath = Join-Path $staging 'watcher-release.json'
    $download = Join-Path $staging 'PrintSystemWatcher.exe'
    $releaseUrl = "https://github.com/DiogoFabricioAG/print-system/releases/download/watcher-$commit"
    Write-Host '2/4 Descargando y verificando ejecutable...' -ForegroundColor Cyan
    try {
        Invoke-WebRequest -UseBasicParsing -Uri "$releaseUrl/watcher-release.json" -OutFile $manifestPath
        $manifest = Get-Content -LiteralPath $manifestPath -Raw | ConvertFrom-Json
        if ($manifest.commit -ne $commit) { throw 'La versión publicada no corresponde al código.' }
        Invoke-WebRequest -UseBasicParsing -Uri "$releaseUrl/PrintSystemWatcher.exe" -OutFile $download
        Assert-WatcherHash $download $manifest.sha256
    } catch { throw "No se pudo verificar la versión publicada. Si GitHub está compilando, vuelve a intentarlo en unos minutos. $_" }
    if ($CheckOnly) { Write-Host "Verificación correcta: $commit" -ForegroundColor Green; return }

    $task = Get-ScheduledTask -TaskName $TaskName -ErrorAction Stop
    if ($task.State -eq 'Disabled') { throw 'La tarea está deshabilitada. Habilítala antes de actualizar.' }
    $action = $task.Actions | Select-Object -First 1
    $exePath = [IO.Path]::GetFullPath([Environment]::ExpandEnvironmentVariables($action.Execute))
    if ([IO.Path]::GetFileName($exePath) -ne 'PrintSystemWatcher.exe' -or -not (Test-Path -LiteralPath $exePath)) {
        throw 'La tarea debe usar PrintSystemWatcher.exe. Configúrala una vez con install-task.ps1 -ExePath.'
    }
    $installDir = Split-Path -Parent $exePath
    $envPath = Join-Path $installDir '.env'
    if (-not (Test-Path -LiteralPath $envPath)) { throw 'Falta .env junto al ejecutable instalado. No se modificó la tarea.' }
    $values = Read-WatcherSettings $envPath
    $watchRoot = $values['WATCH_ROOT']
    if (-not $watchRoot) { $watchRoot = 'C:\PrintSystem\ventas' }
    $heartbeat = Join-Path $watchRoot 'logs\watcher.heartbeat'
    $requestPath = Join-Path $watchRoot 'logs\watcher.update-request'
    $versionPath = Join-Path $installDir '.watcher-version.json'
    if ((Get-FileHash -LiteralPath $exePath -Algorithm SHA256).Hash -eq $manifest.sha256) {
        Write-Host 'Ya está instalada esta versión.' -ForegroundColor Green
        if ($task.State -ne 'Running') {
            $since = Get-Date
            Start-ScheduledTask -TaskName $TaskName
            Wait-WatcherHeartbeat $TaskName $heartbeat $since
        }
        return
    }
    $supportsGraceful = $false
    if (Test-Path -LiteralPath $versionPath) {
        $installed = Get-Content -LiteralPath $versionPath -Raw | ConvertFrom-Json
        $supportsGraceful = $installed.supports_graceful_update -eq $true
    }
    if (-not $supportsGraceful -and $task.State -eq 'Running') {
        Add-Type -AssemblyName System.Windows.Forms
        $answer = [Windows.Forms.MessageBox]::Show('Primera actualización automática: termina o cancela cualquier venta abierta en Tkinter antes de continuar. ¿Ya terminaste?', 'Actualizar Print System', 'YesNo', 'Question')
        if ($answer -ne 'Yes') { Write-Host 'Actualización cancelada; el listener sigue funcionando.'; return }
    }
    $supervisor = Get-ScheduledTask -TaskName $HeartbeatTaskName -ErrorAction SilentlyContinue
    $restoreOnFailure = $true
    $restartSupervisor = $supervisor -and $supervisor.State -eq 'Running'
    if ($restartSupervisor) { Stop-ScheduledTask -TaskName $HeartbeatTaskName -ErrorAction Stop }
    Write-Host '3/4 Cerrando listener anterior...' -ForegroundColor Cyan
    if ($supportsGraceful -and $task.State -eq 'Running') {
        New-Item -ItemType Directory -Path (Split-Path -Parent $requestPath) -Force | Out-Null
        Set-Content -LiteralPath $requestPath -Value $commit -Encoding ASCII
        $deadline = (Get-Date).AddSeconds(90)
        while ((Get-ScheduledTask -TaskName $TaskName).State -eq 'Running') {
            if ((Get-Date) -gt $deadline) { throw 'Hay una revisión/operación en curso. Termínala y vuelve a actualizar; no se reemplazó el ejecutable.' }
            Start-Sleep -Seconds 1
        }
    }
    Stop-WatcherExecutable $TaskName $exePath
    $watcherStopped = $true
    if (Test-Path -LiteralPath $requestPath) { Remove-Item -LiteralPath $requestPath }
    Write-Host '4/4 Instalando y comprobando nueva versión...' -ForegroundColor Cyan
    Install-WatcherBinary $TaskName $exePath $download $manifestPath $heartbeat
    $watcherStopped = $false
    Write-Host 'Actualización completa. Listener activo y configuración conservada.' -ForegroundColor Green
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    if ($requestPath -and (Test-Path -LiteralPath $requestPath)) { Remove-Item -LiteralPath $requestPath }
    if ($watcherStopped) {
        # Install-WatcherBinary gestiona la recuperación del binario y su arranque.
        Write-Host 'Revisa el estado de la tarea y el archivo .previous antes de reintentar.'
    }
    if ($restoreOnFailure -and $exePath) {
        Start-Sleep -Seconds 2
        if ((Get-ScheduledTask -TaskName $TaskName).State -ne 'Running') {
            Start-ScheduledTask -TaskName $TaskName -ErrorAction Continue
        }
    }
    exit 1
} finally {
    if ($requestPath -and (Test-Path -LiteralPath $requestPath)) { Remove-Item -LiteralPath $requestPath }
    if ($restartSupervisor) { Start-ScheduledTask -TaskName $HeartbeatTaskName -ErrorAction Continue }
    $mutex.ReleaseMutex()
    $mutex.Dispose()
}
