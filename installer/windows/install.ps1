$ErrorActionPreference = "Stop"

$InstallRoot = Join-Path $env:LOCALAPPDATA "SummarizeThis"
$StartMenuDir = Join-Path $env:APPDATA "Microsoft\Windows\Start Menu\Programs\Summarize This"
$PowerShellPath = Join-Path $env:SystemRoot "System32\WindowsPowerShell\v1.0\powershell.exe"

$RuntimeFiles = @(
  "manifest.json",
  "connector.html",
  "connector.js",
  "popup.html",
  "settings-powerup.html",
  "trello-setup.html",
  "privacy.html",
  "terms.html",
  "update.json",
  "trello-admin-config.js",
  "attachment-processor.js",
  "summarizer-core.js",
  "card-intelligence-ledger.js",
  "icon.svg",
  "index.html",
  "index-original.html",
  "settings.html",
  "popup-999-accuracy.html",
  "popup-enhanced.html",
  "popup-nextgen.html",
  "popup-original.html",
  "Start-SummarizeThis.ps1",
  "uninstall.ps1"
)

New-Item -ItemType Directory -Force -Path $InstallRoot | Out-Null
New-Item -ItemType Directory -Force -Path $StartMenuDir | Out-Null

foreach ($file in $RuntimeFiles) {
  $source = Join-Path $PSScriptRoot $file
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
    throw "Installer package is missing $file"
  }

  Copy-Item -LiteralPath $source -Destination (Join-Path $InstallRoot $file) -Force
}

function New-AppShortcut {
  param(
    [string]$ShortcutPath,
    [string]$Target,
    [string]$Arguments,
    [string]$WorkingDirectory
  )

  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($ShortcutPath)
  $shortcut.TargetPath = $Target
  $shortcut.Arguments = $Arguments
  $shortcut.WorkingDirectory = $WorkingDirectory
  $shortcut.Description = "Start Summarize This"
  $shortcut.Save()
}

$launchScript = Join-Path $InstallRoot "Start-SummarizeThis.ps1"
$launchArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$launchScript`""
$setupArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$launchScript`" -Setup"
$uninstallScript = Join-Path $InstallRoot "uninstall.ps1"
$uninstallArgs = "-NoProfile -ExecutionPolicy Bypass -File `"$uninstallScript`""

New-AppShortcut -ShortcutPath (Join-Path $StartMenuDir "Summarize This.lnk") -Target $PowerShellPath -Arguments $launchArgs -WorkingDirectory $InstallRoot
New-AppShortcut -ShortcutPath (Join-Path $StartMenuDir "Configure Trello Power-Up.lnk") -Target $PowerShellPath -Arguments $setupArgs -WorkingDirectory $InstallRoot
New-AppShortcut -ShortcutPath (Join-Path $StartMenuDir "Uninstall Summarize This.lnk") -Target $PowerShellPath -Arguments $uninstallArgs -WorkingDirectory $InstallRoot

$uninstallKey = "HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\SummarizeThis"
New-Item -Path $uninstallKey -Force | Out-Null
Set-ItemProperty -Path $uninstallKey -Name DisplayName -Value "Summarize This"
Set-ItemProperty -Path $uninstallKey -Name DisplayVersion -Value "1.0.1"
Set-ItemProperty -Path $uninstallKey -Name Publisher -Value "Summarize This Team"
Set-ItemProperty -Path $uninstallKey -Name InstallLocation -Value $InstallRoot
Set-ItemProperty -Path $uninstallKey -Name UninstallString -Value "`"$PowerShellPath`" $uninstallArgs"
Set-ItemProperty -Path $uninstallKey -Name NoModify -Value 1 -Type DWord
Set-ItemProperty -Path $uninstallKey -Name NoRepair -Value 1 -Type DWord

Start-Process -FilePath $PowerShellPath -ArgumentList @("-NoProfile", "-ExecutionPolicy", "Bypass", "-File", $launchScript) -WorkingDirectory $InstallRoot
Write-Host "Summarize This installed to $InstallRoot"
