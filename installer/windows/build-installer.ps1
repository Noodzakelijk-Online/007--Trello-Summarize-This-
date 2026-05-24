$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$DistDir = Join-Path $RepoRoot "dist\windows-installer"
$StagingDir = Join-Path $DistDir "staging"
$OutputExe = Join-Path $DistDir "SummarizeThisSetup.exe"
$SedPath = Join-Path $DistDir "SummarizeThisSetup.sed"
$IExpress = Join-Path $env:SystemRoot "System32\iexpress.exe"

if (-not (Test-Path -LiteralPath $IExpress -PathType Leaf)) {
  $IExpress = Join-Path $env:SystemRoot "SysWOW64\iexpress.exe"
}

if (-not (Test-Path -LiteralPath $IExpress -PathType Leaf)) {
  throw "IExpress was not found on this Windows installation."
}

$RuntimeFiles = @(
  "manifest.json",
  "connector.js",
  "popup.html",
  "settings-powerup.html",
  "trello-setup.html",
  "summarizer-core.js",
  "icon.svg",
  "index.html",
  "index-original.html",
  "settings.html",
  "popup-999-accuracy.html",
  "popup-enhanced.html",
  "popup-nextgen.html",
  "popup-original.html"
)

$InstallerFiles = @(
  "install.ps1",
  "Start-SummarizeThis.ps1",
  "uninstall.ps1"
)

if (Test-Path -LiteralPath $StagingDir) {
  Remove-Item -LiteralPath $StagingDir -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $StagingDir | Out-Null
New-Item -ItemType Directory -Force -Path $DistDir | Out-Null

foreach ($file in $RuntimeFiles) {
  $source = Join-Path $RepoRoot $file
  if (-not (Test-Path -LiteralPath $source -PathType Leaf)) {
    throw "Missing runtime file: $file"
  }

  Copy-Item -LiteralPath $source -Destination (Join-Path $StagingDir $file) -Force
}

foreach ($file in $InstallerFiles) {
  Copy-Item -LiteralPath (Join-Path $PSScriptRoot $file) -Destination (Join-Path $StagingDir $file) -Force
}

$PackageFiles = @($InstallerFiles + $RuntimeFiles)
$SourceFileEntries = for ($i = 0; $i -lt $PackageFiles.Count; $i++) {
  "%FILE$i%="
}
$StringEntries = for ($i = 0; $i -lt $PackageFiles.Count; $i++) {
  "FILE$i=`"$($PackageFiles[$i])`""
}

$SedContent = @"
[Version]
Class=IEXPRESS
SEDVersion=3
[Options]
PackagePurpose=InstallApp
ShowInstallProgramWindow=0
HideExtractAnimation=1
UseLongFileName=1
InsideCompressed=0
CAB_FixedSize=0
CAB_ResvCodeSigning=0
RebootMode=N
InstallPrompt=
DisplayLicense=
FinishMessage=Summarize This has been installed.
TargetName=$OutputExe
FriendlyName=Summarize This
AppLaunched=powershell.exe -NoProfile -ExecutionPolicy Bypass -File install.ps1
PostInstallCmd=<None>
AdminQuietInstCmd=
UserQuietInstCmd=
SourceFiles=SourceFiles
[SourceFiles]
SourceFiles0=$StagingDir\
[SourceFiles0]
$($SourceFileEntries -join "`r`n")
[Strings]
$($StringEntries -join "`r`n")
"@

Set-Content -LiteralPath $SedPath -Value $SedContent -Encoding ASCII
& $IExpress /N $SedPath

if (-not (Test-Path -LiteralPath $OutputExe -PathType Leaf)) {
  throw "Installer build did not produce $OutputExe"
}

Get-Item -LiteralPath $OutputExe | Select-Object FullName, Length
