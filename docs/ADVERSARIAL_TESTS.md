# Adversarial Break-the-App Tests

Date: 2026-07-23 (Phase 045)

## Overview

The adversarial test suite (`adversarial.test.js`) executes security, boundary, and input sanitization tests designed to break application assumptions.

## Tested Adversarial Scenarios

1. **Malicious / Invalid Inputs:**
   - Null and undefined card data inputs.
   - 10,000-character card names and description strings.
   - Script injection (`<script>alert(1)</script>`) in card titles and descriptions.
   - Prototype pollution attempts (`__proto__` injection).
   - Prompt injection attempts in custom instructions.

2. **Proxy Security & Sanitization:**
   - Proxy URLs containing embedded HTTP credentials (`http://user:pass@evil.com`) — rejected.
   - Non-HTTPS proxy endpoints — rejected for external hosts.
   - Malicious update manifest domain redirects — scrubbed.

3. **Error Message Redaction:**
   - Verification that API keys, Bearer tokens, and Trello tokens are stripped from error strings before user display.
