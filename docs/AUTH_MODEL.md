# Authentication Model and Session Security

Date: 2026-07-23 (Phase 007)

## Power-Up Authentication (Browser)

The static Power-Up uses Trello's built-in OAuth flow:

1. The Power-Up registers `authorization-status` and `show-authorization` capabilities.
2. `connector.js` calls `t.getRestApi()` to get the Trello REST API handle.
3. `rest.getToken()` returns the user's Trello OAuth token if authorized.
4. The token is used only for REST API calls (fetching comments, posting comments).
5. The token is never stored in member-private storage — it is obtained fresh per-session.

**Token scope:** Read access to card, comments, attachments. Write access to card comments (for posting only).

**Token lifetime:** Per Trello OAuth session. The Power-Up re-requests if the token is missing.

## Backend Authentication (Local Development Only)

The backend uses a lightweight JWT-based auth model:

### Registration and Login

```
POST /api/auth/register  { email, password, name }  → { user, token }
POST /api/auth/login     { email, password }          → { user, token }
```

Tokens are signed with `JWT_SECRET` and contain `{ userId, email, role, iat, exp }`.

Token format: `st_<base64(userId:nonce)>.<signature-suffix>` (custom scheme, not standard JWT — designed for local use only).

### Token Verification

All protected endpoints call `requireAuth(req, res)` which:
1. Reads `Authorization: Bearer <token>`
2. Validates the token structure
3. Looks up the user in the in-memory store
4. Returns `401` if invalid or missing

### Admin Authentication

Separate admin token flow via `/api/admin/auth/login`. Admin tokens include `{ role: "admin" }` and are checked by `requireAdmin(req, res)`.

## Security Gaps (Not Production-Safe)

| Gap | Risk | Required Fix |
|---|---|---|
| Passwords stored in plaintext | Critical | Add bcrypt or argon2 hashing |
| Custom token scheme (not standard JWT) | Medium | Use jsonwebtoken or jose library |
| No token expiry enforcement | Medium | Add `exp` claim verification |
| In-memory session store | Medium | Add Redis or DB-backed session store |
| No refresh token flow | Low | Add refresh token endpoint |

## Trello Power-Up Security Boundary

- Card data is fetched inside Trello's iframe sandbox.
- The Power-Up cannot access other Trello boards or cards without explicit Trello permission.
- Member-private storage is isolated per Trello member and Power-Up key.
