$ErrorActionPreference = "Stop"

$InstallRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$StartMenuDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Summarize This"
$UninstallKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\SummarizeThis"

if (Test-Path -LiteralPath $StartMenuDir) {
  Remove-Item -LiteralPath $StartMenuDir -Recurse -Force
}

if (Test-Path $UninstallKey) {
  Remove-Item -Path $UninstallKey -Recurse -Force
}

$escapedInstallRoot = $InstallRoot.Replace("'", "''")
$cleanupScript = Join-Path $env:TEMP "SummarizeThis-UninstallCleanup.ps1"
@"
Start-Sleep -Seconds 1
if (Test-Path -LiteralPath '$escapedInstallRoot') {
  Remove-Item -LiteralPath '$escapedInstallRoot' -Recurse -Force
}
Remove-Item -LiteralPath `$MyInvocation.MyCommand.Path -Force
"@ | Set-Content -LiteralPath $cleanupScript -Encoding UTF8

Start-Process -FilePath (Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe") -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $cleanupScript) -WindowStyle Hidden
Write-Host "Summarize This has been removed."
