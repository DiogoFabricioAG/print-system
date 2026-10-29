#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
. (Join-Path $PSScriptRoot 'update-core.ps1')

# Solo archivos dentro de .updates y funciones simuladas; no modifica tareas del equipo.
$testRoot = Join-Path $PSScriptRoot ('.updates\test-' + [guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $testRoot -Force | Out-Null
$exe = Join-Path $testRoot 'PrintSystemWatcher.exe'
$download = Join-Path $testRoot 'download.exe'
$manifest = Join-Path $testRoot 'manifest.json'
$heartbeat = Join-Path $testRoot 'heartbeat'
$envFile = Join-Path $testRoot '.env'
Set-Content -LiteralPath $exe -Value 'old-version'
Set-Content -LiteralPath $download -Value 'new-version'
Set-Content -LiteralPath $envFile -Value 'API_KEY=keep-local'
$envHash = (Get-FileHash $envFile).Hash
@{ sha256 = (Get-FileHash $download -Algorithm SHA256).Hash; commit = 'test' } | ConvertTo-Json | Set-Content $manifest
$script:startCount = 0
$script:failNew = $false
function Stop-ScheduledTask { param($TaskName) }
function Get-CimInstance { param($ClassName) return @() }
function Get-ScheduledTask { param($TaskName) return [pscustomobject]@{ State = 'Running' } }
function Start-ScheduledTask {
    param($TaskName)
    $script:startCount++
    if ($script:failNew -and (Get-Content $exe -Raw).Trim() -eq 'new-version') { return }
    Set-Content -LiteralPath $heartbeat -Value 'ready'
    [IO.File]::SetLastWriteTimeUtc($heartbeat, [datetime]::UtcNow.AddSeconds(1))
}

Install-WatcherBinary 'FakeTask' $exe $download $manifest $heartbeat 1
if ((Get-Content $exe -Raw).Trim() -ne 'new-version') { throw 'No instaló la versión nueva' }
if ((Get-Content "$exe.previous" -Raw).Trim() -ne 'old-version') { throw 'No conservó la versión anterior' }
if ((Get-FileHash $envFile).Hash -ne $envHash) { throw 'Modificó el .env' }
Write-Host 'OK instalación, respaldo, heartbeat y .env conservado'

Set-Content -LiteralPath $exe -Value 'old-version'
Remove-Item -LiteralPath $heartbeat
$script:failNew = $true
$failure = $null
try { Install-WatcherBinary 'FakeTask' $exe $download $manifest $heartbeat 1 } catch { $failure = $_ }
if (-not $failure -or (Get-Content $exe -Raw).Trim() -ne 'old-version') { throw 'No recuperó la versión anterior' }
Write-Host 'OK recuperación y arranque de la versión anterior si falla el heartbeat'

$script:startCount = 0
Set-Content -LiteralPath $download -Value 'tampered'
$failure = $null
try { Install-WatcherBinary 'FakeTask' $exe $download $manifest $heartbeat 1 } catch { $failure = $_ }
if (-not $failure -or $script:startCount -ne 0 -or (Get-Content $exe -Raw).Trim() -ne 'old-version') { throw 'Aceptó un hash incorrecto' }
Write-Host 'OK descarga alterada rechazada antes de instalar'

foreach ($file in Get-ChildItem -LiteralPath $PSScriptRoot -Filter '*.ps1') {
    $parseErrors = $null
    $null = [Management.Automation.Language.Parser]::ParseFile($file.FullName, [ref]$null, [ref]$parseErrors)
    if ($parseErrors.Count) { throw "Error de sintaxis en $($file.Name): $parseErrors" }
}
Write-Host 'OK sintaxis PowerShell'
