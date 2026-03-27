# Web Kleopatra (MERN)

A MERN-based PGP tool inspired by Kleopatra with browser-side cryptography using openpgp.js and optional server sync for encrypted key storage.

Frontend : https://mango-bush-077d10b00.1.azurestaticapps.net
Backend : web-pgp-backend-bgb0fxakaudhdufu.westindia-01.azurewebsites.net

## Features Implemented

- PGP key generation (RSA)
- Import public keys
- Encrypt/decrypt text
- Sign/verify text (detached signatures)
- File encryption/decryption
- JWT auth scaffolding
- Encrypted private key storage (client-side vault)
- Key metadata storage server-side
- Audit log endpoints

## Project Structure

- client: React app
- server: Express API with MongoDB

## Environment Variables

Create server/.env from server/.env.example and set values.

## Development

- Root: npm run dev
- Client only: npm run client
- Server only: npm run server

## Notes

Private keys are encrypted in the browser before being sent to the server. The server never decrypts private keys.
