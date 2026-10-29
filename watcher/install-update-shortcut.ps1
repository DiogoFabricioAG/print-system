#Requires -Version 5.1
[CmdletBinding()]
param()
$ErrorActionPreference = 'Stop'
$launcher = Join-Path $PSScriptRoot 'Actualizar Watcher.cmd'
$shell = New-Object -ComObject WScript.Shell
$shortcut = $shell.CreateShortcut((Join-Path ([Environment]::GetFolderPath('Desktop')) 'Actualizar Print System.lnk'))
$shortcut.TargetPath = $launcher
$shortcut.WorkingDirectory = $PSScriptRoot
$shortcut.Description = 'Actualiza el repositorio y el listener de Print System'
$shortcut.Save()
Write-Host 'Acceso directo creado: Actualizar Print System' -ForegroundColor Green
