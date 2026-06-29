# Windows 11 Installer

Build the installer from the repository root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\installer\windows\build-installer.ps1
```

The installer is written to:

```text
dist\windows-installer\SummarizeThisSetup.exe
```

The installer is a self-extracting .NET Framework executable, so it does not need Electron, Node modules, NSIS, or network downloads. It installs the static runtime files into the current user's LocalAppData folder, creates Start Menu shortcuts, registers an uninstall entry for the current user, and starts a lightweight local browser launcher on `127.0.0.1`.

The installed payload includes the active popup helpers (`attachment-processor.js`, `summarizer-core.js`, and `card-intelligence-ledger.js`) plus the Trello setup assistant and admin configuration helper. The repository test suite checks that the build payload and install-copy list stay aligned.

It also installs a `Configure Trello Power-Up` shortcut. That shortcut opens a setup assistant that prepares host-specific deployment steps, the iframe connector URL, app metadata, privacy URL, terms URL, icon URL, and capability list for Trello's Power-Up Admin Portal. The assistant can copy a deployment guide, readiness checklist, or JSON setup package with exact admin values, validation state, safety notes, manual steps, and a no-submit autofill helper.

This Windows launcher is for the standalone/local version of the tool. For Trello Power-Up use inside Trello, the same static files still need to be hosted on an HTTPS URL and configured in Trello's Power-Up admin page.
