# Cross-User Isolation Tests

Date: 2026-07-23 (Phase 046)

## Test Architecture

Verified in `adversarial.test.js` using two independent backend user accounts (`User A` and `User B`) on an active test server instance.

## Verified Isolation Invariants

1. **Token Isolation:** User A and User B receive distinct session tokens upon registration.
2. **Profile & PII Isolation:** Requests to `/api/user/profile` with User A's token return only User A's email and profile data; User B's profile data is never returned or leaked.
3. **Credit Isolation:** Credit balances and transaction histories are isolated per token.
4. **Role Isolation:** Non-admin user tokens are rejected (`401/403`) when attempting access to `/api/admin/*` management endpoints.
5. **Member-Private Trello Storage:** Browser-side settings and ledger data use Trello's member-private storage sandbox.
