# Web-PGP Deep Dive

This document is a full, code-focused walkthrough of the repository. It covers architecture, workflows, data flow, and a per-file map of responsibilities. Secrets and credentials are intentionally redacted.

## 1) System Overview

Web-PGP is a MERN-style project with a React + Vite client and an Express + MongoDB API server. The client performs all cryptography locally using openpgp.js and a local vault mechanism for encrypted private keys. The server stores only public key data and encrypted private key blobs (never decrypted server-side) plus audit logs.

High-level principles:

- Keys are generated and encrypted on the client.
- Private keys are encrypted with a vault password and stay encrypted at rest.
- Server sync is optional; local-only mode is supported.
- JWT access tokens are used for API access; refresh tokens are stored as httpOnly cookies.
- All sensitive cryptographic operations happen in the browser.

## 2) Runtime Architecture

Client (browser):

- React UI orchestrates all flows: key lifecycle, encryption/decryption, signing/verification, file crypto, audit views.
- OpenPGP operations use openpgp.js.
- Vault encryption uses Web Crypto (PBKDF2 + AES-GCM).
- Storage: localStorage for keys and auth tokens, in-memory for decrypted keys.
- Network: all API calls go through a single base URL configured via VITE_API_URL.

Server (Node/Express):

- API layer provides authentication, key metadata storage, and audit logging.
- MongoDB stores users, key records, audit logs.
- Security middleware: helmet, rate limiting, CORS control, schema validation.

Service boundaries and responsibilities:

- Client cryptography service: wraps openpgp.js in openpgpService.js and exposes high-level operations (generate, encrypt, decrypt, sign, verify, parse).
- Client vault service: wraps Web Crypto to derive a symmetric key from the vault password and encrypt/decrypt private keys (cryptoVault.js).
- Client API service: request helper that attaches JSON headers and optional Bearer tokens (services/api.js).
- Server auth service: handles user registration, login, refresh, and logout semantics with JWTs and hashed refresh tokens.
- Server key storage service: persists public keys and encrypted private key blobs; server never decrypts them.
- Server audit service: stores user action history and provides user-level and admin-level feeds.

## 3) Security Model Summary

- Vault password is never stored; only a verifier blob is kept in localStorage.
- Private keys are encrypted client-side with AES-GCM and a derived key (PBKDF2 SHA-256, 200k iterations).
- The server never sees the vault password and never decrypts private keys.
- Access tokens are short-lived JWTs; refresh tokens are cookie-bound and hashed server-side.
- Logout-all invalidates tokens by incrementing tokenVersion.

Online vs offline security model:

- Offline mode: keys remain only in localStorage; all crypto runs locally; no network sync needed.
- Online mode: encrypted private keys and public metadata are synced to server; vault password still never leaves the client.
- At no point does the server receive decrypted private keys or vault password material.

## 4) Core Workflows

### 4.1 Vault Password Setup and Verification

- On first unlock, the app creates a verifier payload by encrypting the constant string "kleo-vault-check".
- The verifier payload is stored in localStorage.
- On unlock, the verifier payload is decrypted with the entered password to confirm correctness.
- The vault password lives only in memory and is cleared on manual lock or auto-lock timeout.

Detailed cryptography steps for vault:

- DeriveKey: password is encoded and imported as key material, then PBKDF2 (SHA-256, 200k iterations) derives a 256-bit AES-GCM key.
- EncryptPrivateKey: random salt (16 bytes) and IV (12 bytes) are generated, plaintext is encrypted with AES-GCM, and outputs are Base64 encoded.
- DecryptPrivateKey: salt and IV are decoded from Base64, the same derived key is recreated, and AES-GCM decrypts the payload.

### 4.2 Key Generation

- User enters identity, crypto strength, expiry, and passphrase.
- openpgp.js generates an RSA key pair in armored form.
- The private key is encrypted with the vault password using AES-GCM.
- The encrypted private key is stored locally and optionally synced to the server.

Detailed method flow:

- generateKeyPair: openpgp.generateKey creates RSA keys with an expiry in seconds.
- readKey: public key is parsed to compute fingerprint metadata.
- encryptPrivateKey: vault encryption wraps the armored private key to create a JSON blob with cipherText, salt, and iv.
- onAddKey: key object is persisted to localStorage and optionally POSTed to /api/keys.

### 4.3 Key Import

- User pastes or uploads an armored key.
- openpgp.js parses it and classifies as public or private.
- If private, vault password is required and the key is re-encrypted for storage.
- The key is saved locally and optionally synced.

Import modes:

- Local-only: key is stored only in localStorage and never sent to server.
- Server sync: encrypted private key and public key metadata are sent to the server when authenticated.

### 4.4 Text Encryption / Decryption

- Encrypt: select recipients (public keys) and optionally sign.
- Decrypt: select private key (vault password required) and optionally verify.
- Output auto-clears after 5 minutes in the encrypt view.

Encryption variants:

- Encrypt-only: openpgp.encrypt with recipient public keys.
- Sign-then-encrypt: openpgp.encrypt with signingKeys to embed signature into message.
- Encrypt-then-sign: openpgp.sign on ciphertext to create detached signature.

Decryption variants:

- Decrypt-only: openpgp.decrypt with decrypted private key.
- Decrypt-and-verify: openpgp.decrypt with verificationKeys to validate embedded signature.
- Verify-then-decrypt (detached): verify signature before decryption.

### 4.5 File Encryption / Decryption

- Encrypt: select file and recipients; output is downloaded as .pgp.
- Decrypt: select encrypted file and private key; output is downloaded as plaintext.

File processing details:

- Files are read into ArrayBuffer, converted to Uint8Array, and wrapped as binary PGP messages.
- Encrypted output is written to a Blob and downloaded via a temporary object URL.

### 4.6 Audit Logging

- The server stores audit entries per user and exposes history.
- The client fetches audit logs when synced.

Audit flow details:

- Client emits audit events via POST /api/crypto/audit with action and optional metadata.
- Server stores IP, action, metadata, and timestamps; client reads last 100 entries.

### 4.7 Authentication

- Register/Login returns access token + sets refresh cookie.
- Access token is stored in localStorage with expiry timestamp.
- Refresh endpoint rotates refresh tokens and issues new access tokens.
- Logout clears refresh cookie; logout-all invalidates all tokens.

Token security details:

- Access tokens include user id, role, and tokenVersion.
- Refresh tokens are hashed in the database and compared on refresh.
- Cookie settings use httpOnly and sameSite strict; secure is enabled in production.

## 4.8 Key Sharing and Exchange

Key sharing is built around exporting and importing armored public keys:

- Export public key: from the key list, public keys are downloaded as .asc files.
- Import public key: paste or upload an armored public key to add it to the local key ring.
- Private key sharing: supported only as encrypted JSON blobs; exports are stored as .encrypted.json and require the vault password to use.

Recommended workflow for sharing:

1) Export your public key and share it via a secure channel.
2) Recipient imports the public key and can encrypt messages/files for you.
3) If you must move a private key, export the encrypted private key blob and import it on another device after setting a vault password.

## 5) Data Storage Locations

Client storage:

- localStorage "kleo_keys": array of key records (public keys and encrypted private keys).
- localStorage "kleo_vault_verifier": verifier payload used to validate vault password.
- localStorage "kleo_token" and "kleo_token_exp": access token and expiry.
- In-memory: vault password and decrypted private keys (only while unlocked).

Server storage:

- MongoDB "User": credentials, token state, refresh token hash, metadata.
- MongoDB "Key": public key and encryptedPrivateKey, metadata.
- MongoDB "AuditLog": action history and IPs.

## 6) Repository File Map

This section enumerates every file in the repository and explains its role.

### 6.1 Root

- LICENSE
  - Project license (ISC).
- README.md
  - High-level overview and features. Mentions MERN structure and basic dev commands.
- package.json
  - Root scripts to run client/server concurrently and to build or start each side.
- .gitignore
  - Ignores node_modules, build outputs, env files, IDE artifacts, logs, temp files.

### 6.2 .github

- .github/copilot-instructions.md
  - Copilot task checklist with guidance for scaffolding, compiling, and documenting. Contains embedded HTML comments for internal instructions.

#### Workflows

- .github/workflows/azure-static-web-apps-mango-bush-077d10b00.yml
  - Static Web Apps deployment for the client. Uses Azure Static Web Apps deploy action. Builds from ./client and deploys dist output. Uses a secret token for authentication.
- .github/workflows/azure-app-service-backend.yml
  - App Service deployment for the server. Installs server dependencies, zips the server folder, deploys via webapps-deploy action with publish profile secret.

### 6.3 Client

#### Root and config

- client/package.json
  - Client dependencies (React, openpgp) and dev tooling (Vite, ESLint).
- client/vite.config.js
  - Vite configuration with React plugin.
- client/eslint.config.js
  - ESLint flat config with React hooks and refresh plugin rules.
- client/index.html
  - Static entry point with root div and main script.
- client/README.md
  - Vite template readme with standard guidance; external references omitted in this doc.
- client/.env.production
  - Sets VITE_API_URL for production builds (value present in repo; not repeated here).

#### Assets

- client/src/assets/react.svg
  - Default Vite React logo asset.

#### Entry and styles

- client/src/main.jsx
  - React entry point; mounts App into #root with StrictMode.
- client/src/index.css
  - Global styles: font defaults, dark background, typography settings.
- client/src/App.css
  - App-level layout and component styling for panels, cards, badges, tabs, modal, stepper, sidebar.

#### Core app container

- client/src/App.jsx
  - Main state container. Manages:
    - Key storage and persistence to localStorage.
    - Vault password state and auto-lock timeout.
    - Login/register/logout/refresh flows.
    - Syncing keys and audit logs from server when enabled.
    - Navigation between app views and rendering major components.
    - Vault unlock modal and verifier logic.

#### Services

- client/src/services/api.js
  - API client wrapper. Uses VITE_API_URL base, adds JSON headers and Bearer token. Exposes auth, key, and audit endpoints.
- client/src/services/auth.js
  - Auth helper for storing access token and expiry in localStorage and calling auth endpoints.

#### Crypto modules

- client/src/crypto/openpgpService.js
  - OpenPGP wrapper providing:
    - RSA key generation with expiry.
    - Encrypt/decrypt text with public/private keys.
    - Sign/verify detached signatures.
    - Encrypt/decrypt files (binary PGP).
    - Parse armored keys and derive metadata (fingerprint, algorithm, strength).
- client/src/utils/cryptoVault.js
  - Vault encryption utilities:
    - PBKDF2 key derivation with SHA-256.
    - AES-GCM encrypt/decrypt for private keys.
    - Verifier create/verify for vault password validation.

#### UI Components

- client/src/components/Auth/AuthPanel.jsx
  - Login/register UI with validation and session expiry display. Provides vault lock/unlock actions.
- client/src/components/Dashboard/Dashboard.jsx
  - Status overview: key count, lock status, sync mode, audit count, quick actions.
- client/src/components/KeyManager/KeyManager.jsx
  - Key generation wizard, import flow, key list, label edits, export functions, and delete confirmation.
- client/src/components/EncryptDecrypt/EncryptDecrypt.jsx
  - Text encryption/decryption with optional signing and verification; includes auto-clear logic.
- client/src/components/SignVerify/SignVerify.jsx
  - Detached signature creation and verification using PGP keys.
- client/src/components/FileCrypto/FileCrypto.jsx
  - File encryption/decryption using PGP keys, outputs downloads.
- client/src/components/AuditLogs/AuditLogs.jsx
  - Read-only list of audit events with timestamps and IP badges.
- client/src/components/Settings/Settings.jsx
  - Local-only toggle, auto-lock minutes, privacy placeholders, and advanced toggles.

### 6.4 Server

#### Root and config

- server/package.json
  - Server dependencies: Express, MongoDB, JWT, bcrypt, CORS, Helmet, rate limiting, Zod. Dev script uses nodemon.
- server/src/index.js
  - Server bootstrap, middleware setup, CORS configuration, routes registration, and health check.
- server/src/config/db.js
  - MongoDB connection helper; requires MONGO_URI.

#### Models

- server/src/models/User.js
  - User schema with email, passwordHash, tokenVersion, role, refresh token fields. Includes password hash/compare helpers.
- server/src/models/Key.js
  - Key schema storing publicKey, encryptedPrivateKey, fingerprint, algorithm, trust and expiry metadata.
- server/src/models/AuditLog.js
  - Audit log schema storing action, metadata, IP, user reference.

#### Middleware

- server/src/middleware/auth.js
  - Bearer token auth; verifies JWT and tokenVersion.
- server/src/middleware/requireAdmin.js
  - Role-based admin gate.
- server/src/middleware/validate.js
  - Zod-based request validation with structured error responses.
- server/src/middleware/errorHandler.js
  - Not-found and error handling middleware.

#### Controllers

- server/src/controllers/authController.js
  - Register, login, refresh, logout, logout-all, and me endpoints. Handles refresh token hashing and cookie setup.
- server/src/controllers/keysController.js
  - Key CRUD for authenticated users, scoped by userId.
- server/src/controllers/cryptoController.js
  - Audit log creation and history retrieval.
- server/src/controllers/adminController.js
  - Admin-only list users and list security events.

#### Routes

- server/src/routes/auth.js
  - Auth endpoints with input validation.
- server/src/routes/keys.js
  - Key endpoints with validation and authentication.
- server/src/routes/crypto.js
  - Audit endpoints with validation and authentication.
- server/src/routes/admin.js
  - Admin endpoints with auth and role checks.

#### Utilities

- server/src/utils/token.js
  - JWT access/refresh token generation and expiry calculation.

## 7) Environment Configuration (Redacted)

Expected server environment keys:

- MONGO_URI
- JWT_SECRET
- REFRESH_TOKEN_SECRET
- JWT_EXPIRES_IN
- REFRESH_TOKEN_EXPIRES_IN
- CLIENT_ORIGIN
- PORT
- NODE_ENV

Expected client build-time env key:

- VITE_API_URL

Values are intentionally omitted to avoid leaking secrets.

## 8) What the App Does End-to-End

1) User signs up or logs in.
2) User sets a vault password.
3) User generates or imports keys.
4) Private keys are encrypted locally and stored.
5) User encrypts/decrypts text or files and optionally signs/verifies.
6) If server sync is enabled, key metadata and encrypted private keys are stored in MongoDB.
7) Audit logs are recorded for crypto actions and displayed in the UI.

## 9) Algorithms and Cryptographic Choices

Client crypto (openpgp.js):

- Asymmetric keys: RSA (default 3072-bit; configurable).
- Symmetric operations: OpenPGP default symmetric algorithms as implemented by openpgp.js.
- Signing: detached signatures for sign-only, or embedded signatures for sign-then-encrypt flows.

Vault crypto (Web Crypto):

- Key derivation: PBKDF2 with SHA-256, 200,000 iterations.
- Encryption at rest: AES-GCM with 256-bit key, random 12-byte IV, random 16-byte salt.

Auth crypto (server):

- Password hashing: bcrypt with 12 rounds.
- Token signing: JWT with HMAC secrets from env; access and refresh tokens separated.
- Refresh token storage: SHA-256 hash of token stored in DB for validation.

## 10) Services Exposed by the System

Client-side services:

- Key lifecycle: generate, import, export, delete, update metadata.
- Crypto operations: encrypt/decrypt text, sign/verify messages, encrypt/decrypt files.
- Vault management: lock/unlock, auto-lock, in-memory key material control.

Server-side services:

- Authentication: register, login, refresh, logout, logout-all, me.
- Key storage: CRUD for public keys and encrypted private keys.
- Audit logging: create audit entries and list recent history.
- Admin: list users and security events (admin-only).

## 11) Notes on Extensibility

- Add stronger key types (ECC/Ed25519) by extending openpgpService and UI.
- Implement 2FA toggle behavior currently shown as placeholder in AuthPanel.
- Implement audit-log clearing for server-side records (currently UI placeholder).
- Add error boundary and retry logic in API client for better resilience.
