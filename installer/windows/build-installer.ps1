$ErrorActionPreference = "Stop"

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$DistDir = Join-Path $RepoRoot "dist\windows-installer"
$BuildRoot = Join-Path ([System.IO.Path]::GetTempPath()) "SummarizeThisInstallerBuild"
$StagingDir = Join-Path $BuildRoot "staging"
$PayloadZip = Join-Path $BuildRoot "payload.zip"
$SourcePath = Join-Path $BuildRoot "SummarizeThisSetup.cs"
$OutputExe = Join-Path $DistDir "SummarizeThisSetup.exe"

$RuntimeFiles = @(
  "manifest.json",
  "connector.js",
  "popup.html",
  "settings-powerup.html",
  "trello-setup.html",
  "trello-admin-config.js",
  "summarizer-core.js",
  "card-intelligence-ledger.js",
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

$CompilerCandidates = @(
  (Join-Path $env:SystemRoot "Microsoft.NET\Framework64\v4.0.30319\csc.exe"),
  (Join-Path $env:SystemRoot "Microsoft.NET\Framework\v4.0.30319\csc.exe")
)
$Compiler = $CompilerCandidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1

if (-not $Compiler) {
  throw "The .NET Framework C# compiler was not found. Install .NET Framework 4.x developer tools or build on Windows 11 with the framework compiler available."
}

foreach ($legacyPath in @(
  (Join-Path $DistDir "build"),
  (Join-Path $DistDir "staging"),
  (Join-Path $DistDir "SummarizeThisSetup.sed"),
  (Join-Path $DistDir "~SummarizeThisSetup.DDF")
)) {
  if (Test-Path -LiteralPath $legacyPath) {
    Remove-Item -LiteralPath $legacyPath -Recurse -Force
  }
}

if (Test-Path -LiteralPath $BuildRoot) {
  Remove-Item -LiteralPath $BuildRoot -Recurse -Force
}

New-Item -ItemType Directory -Force -Path $DistDir | Out-Null
New-Item -ItemType Directory -Force -Path $StagingDir | Out-Null

try {
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

  Compress-Archive -Path (Join-Path $StagingDir "*") -DestinationPath $PayloadZip -Force

  $payloadBase64 = [Convert]::ToBase64String([System.IO.File]::ReadAllBytes($PayloadZip))
  $chunks = New-Object System.Collections.Generic.List[string]
  for ($i = 0; $i -lt $payloadBase64.Length; $i += 3000) {
    $length = [Math]::Min(3000, $payloadBase64.Length - $i)
    $chunks.Add('      "' + $payloadBase64.Substring($i, $length) + '"')
  }

  $chunkSource = $chunks -join ",`r`n"
  $source = @"
using System;
using System.Diagnostics;
using System.IO;
using System.IO.Compression;

namespace SummarizeThisInstaller
{
  internal static class Program
  {
    private static readonly string[] PayloadChunks = new[]
    {
$chunkSource
    };

    [STAThread]
    private static int Main()
    {
      string installRoot = Path.Combine(Path.GetTempPath(), "SummarizeThisInstall-" + Guid.NewGuid().ToString("N"));
      Directory.CreateDirectory(installRoot);

      try
      {
        string payloadPath = Path.Combine(installRoot, "payload.zip");
        File.WriteAllBytes(payloadPath, Convert.FromBase64String(string.Concat(PayloadChunks)));
        ZipFile.ExtractToDirectory(payloadPath, installRoot);

        string powershell = Path.Combine(
          Environment.GetFolderPath(Environment.SpecialFolder.System),
          "WindowsPowerShell",
          "v1.0",
          "powershell.exe"
        );
        string installerScript = Path.Combine(installRoot, "install.ps1");

        ProcessStartInfo startInfo = new ProcessStartInfo
        {
          FileName = powershell,
          Arguments = "-NoProfile -ExecutionPolicy Bypass -File \"" + installerScript + "\"",
          WorkingDirectory = installRoot,
          UseShellExecute = false,
          CreateNoWindow = true
        };

        using (Process process = Process.Start(startInfo))
        {
          process.WaitForExit();
          return process.ExitCode;
        }
      }
      catch (Exception error)
      {
        try
        {
          File.WriteAllText(Path.Combine(Path.GetTempPath(), "SummarizeThisInstaller-error.txt"), error.ToString());
        }
        catch
        {
        }

        return 1;
      }
      finally
      {
        try
        {
          Directory.Delete(installRoot, true);
        }
        catch
        {
        }
      }
    }
  }
}
"@

  Set-Content -LiteralPath $SourcePath -Value $source -Encoding UTF8

  if (Test-Path -LiteralPath $OutputExe) {
    Remove-Item -LiteralPath $OutputExe -Force
  }

  & $Compiler `
    /nologo `
    /optimize+ `
    /target:winexe `
    /platform:anycpu `
    "/out:$OutputExe" `
    /reference:System.IO.Compression.dll `
    /reference:System.IO.Compression.FileSystem.dll `
    $SourcePath

  if ($LASTEXITCODE -ne 0) {
    throw "Installer compiler failed with exit code $LASTEXITCODE."
  }

  if (-not (Test-Path -LiteralPath $OutputExe -PathType Leaf)) {
    throw "Installer build did not produce $OutputExe"
  }

  Get-Item -LiteralPath $OutputExe | Select-Object FullName, Length
} finally {
  if (Test-Path -LiteralPath $BuildRoot) {
    Remove-Item -LiteralPath $BuildRoot -Recurse -Force
  }
}
