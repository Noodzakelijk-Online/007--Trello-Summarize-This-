# Storage, Files, Uploads, and Media Safety

Date: 2026-07-23 (Phase 015)

## Attachment URL Safety

All attachment URLs are validated before any fetch attempt:

1. URLs must use `https://` scheme (or `http://127.0.0.1` / `http://localhost` for local dev).
2. Only URLs from `attachments.trello.com` or `trello.com` are trusted for content fetching.
3. External attachment URLs from unknown domains are treated as metadata-only.
4. `safeAttachmentUrl()` / `safeTrelloCardUrl()` in `summarizer-core.js` enforce these rules.

## Binary File Handling

PDF, Word, Excel, and image files are treated as **metadata-only** in the shipped flow:

- File name, MIME type, and size are always available and safe to include.
- File content is **not** fetched or parsed in the browser without explicit user approval.
- `extractionStatus: "metadata-only"` is set for binary files in the attachment summary.

## Text and CSV Extraction (Optional)

Plain text (`.txt`) and CSV files may be extracted with bounded limits:

- Maximum character limit enforced per file.
- User must enable `extractTextAttachments` in settings.
- Sensitive card gating: extraction blocked on cards matching sensitive signal patterns unless explicitly approved.

## Upload Safety

The static Power-Up does not accept file uploads. The backend has a `/api/admin/files/upload` stub endpoint that returns `202 Accepted` but does not process multipart content.

## Path Traversal Protection

The local dev server (`local-dev-server.js`) uses `path.normalize()` and verifies that the resolved path starts with the server's root directory before serving any file. Verified in `adversarial.test.js`.

## HTTPS Enforcement

- All AI provider calls use `https://` endpoints.
- Proxy endpoint must be HTTPS (localhost exception for development).
- Update check manifest URL must be from `raw.githubusercontent.com`.
- Attachment content fetches require HTTPS (no plain HTTP for external hosts).
