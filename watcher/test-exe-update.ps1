#Requires -Version 5.1
[CmdletBinding()]
param([string]$ExePath = (Join-Path $PSScriptRoot 'dist\PrintSystemWatcher.exe'))
$ErrorActionPreference = 'Stop'
$testRoot = Join-Path $PSScriptRoot ('.updates\exe-test-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testRoot -Force | Out-Null
$testExe = Join-Path $testRoot 'PrintSystemWatcher.exe'
$data = Join-Path $testRoot 'data'
$heartbeat = Join-Path $data 'logs\watcher.heartbeat'
$request = Join-Path $data 'logs\watcher.update-request'
Copy-Item -LiteralPath $ExePath -Destination $testExe
@("WATCH_ROOT=$data", 'API_KEY=local-test-no-production', 'API_URL=http://127.0.0.1:1/api', 'GUI_ENABLED=false') |
    Set-Content -LiteralPath (Join-Path $testRoot '.env') -Encoding ASCII
$process = Start-Process -FilePath $testExe -WorkingDirectory $testRoot -WindowStyle Hidden -PassThru
try {
    $deadline = (Get-Date).AddSeconds(45)
    while (-not (Test-Path -LiteralPath $heartbeat)) {
        if ($process.HasExited -or (Get-Date) -gt $deadline) { throw 'El ejecutable no inició el heartbeat' }
        Start-Sleep -Milliseconds 500
    }
    Set-Content -LiteralPath $request -Value 'test-update' -Encoding ASCII
    if (-not $process.WaitForExit(20000)) { throw 'No terminó ante la solicitud de actualización' }
    if ($process.ExitCode -ne 0) { throw "Cierre incorrecto: $($process.ExitCode)" }
    if (Test-Path -LiteralPath $heartbeat) { throw 'No limpió el heartbeat al cerrar' }
    Write-Host 'OK ejecutable real: arranque y cierre ordenado para actualización'
} finally {
    foreach ($child in Get-CimInstance Win32_Process) {
        if ($child.ExecutablePath -eq $testExe) { Stop-Process -Id $child.ProcessId -Force -ErrorAction SilentlyContinue }
    }
}
