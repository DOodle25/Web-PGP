const encoder = new TextEncoder();
const decoder = new TextDecoder();

const toBase64 = (buffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buffer)));
const fromBase64 = (value) =>
  Uint8Array.from(atob(value), (c) => c.charCodeAt(0));

export const deriveKey = async (password, salt) => {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt,
      iterations: 200000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

export const encryptPrivateKey = async (password, plaintext) => {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(plaintext),
  );

  return {
    cipherText: toBase64(encrypted),
    salt: toBase64(salt),
    iv: toBase64(iv),
  };
};

export const decryptPrivateKey = async (password, payload) => {
  const salt = fromBase64(payload.salt);
  const iv = fromBase64(payload.iv);
  const key = await deriveKey(password, salt);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    fromBase64(payload.cipherText),
  );
  return decoder.decode(decrypted);
};

const VERIFIER_TEXT = "kleo-vault-check";

export const createVaultVerifier = async (password) => {
  return encryptPrivateKey(password, VERIFIER_TEXT);
};

export const verifyVaultPassword = async (password, payload) => {
  try {
    const decrypted = await decryptPrivateKey(password, payload);
    return decrypted === VERIFIER_TEXT;
  } catch (err) {
    return false;
  }
};
