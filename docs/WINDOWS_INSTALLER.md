# Windows 11 Installer

The repository now includes a Windows 11 `.exe` installer build path.

Build it with:

```powershell
npm run build:windows-installer
```

Output:

```text
dist\windows-installer\SummarizeThisSetup.exe
```

The installer:

- Installs the runtime files to `%LOCALAPPDATA%\SummarizeThis`.
- Creates Start Menu shortcuts for launch, Trello Power-Up configuration, and uninstall.
- Registers a per-user uninstall entry.
- Starts a lightweight local launcher at `http://127.0.0.1:17117`.
- Avoids Electron and external dependencies.
- Builds as a self-extracting .NET Framework executable using the Windows framework compiler.
- Bundles `update.json` so the installed popup can manually compare the current version with the GitHub update manifest.

The Start Menu shortcut named `Configure Trello Power-Up` opens a setup assistant with GitHub Pages, Netlify, Vercel, and custom HTTPS presets. It validates that the hosted URL is suitable for Trello, prepares the exact iframe connector URL, app metadata, manifest URL, privacy URL, terms URL, icon URL, capabilities, and admin field map for Trello's Power-Up Admin Portal, and provides a safe admin autofill bookmarklet that can populate matching Trello admin fields and capability checkboxes. The bookmarklet runs only on Trello's Power-Up admin page, uses the same field map shown in the setup assistant, reports filled and missing fields, and does not save or submit the admin page.

The popup's **Installed app updates** panel checks GitHub only when the user presses **Check for updates**. It does not poll, download, install, or run updates automatically, and it does not send Trello card data or API keys.

Important:

- The installer is for easy standalone Windows use.
- Trello Power-Up use inside Trello still requires hosting the static files on an HTTPS URL and configuring that connector URL in Trello.
