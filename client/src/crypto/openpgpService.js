import * as openpgp from "openpgp";

const secondsFromDays = (days) => Math.max(1, Math.floor(days * 24 * 60 * 60));

export const generateKeyPair = async ({
  name,
  email,
  passphrase,
  rsaBits = 3072,
  expiresInDays = 365,
}) => {
  const { privateKey, publicKey, revocationCertificate } =
    await openpgp.generateKey({
      type: "rsa",
      rsaBits,
      userIDs: [{ name, email }],
      passphrase,
      keyExpirationTime: secondsFromDays(expiresInDays),
      format: "armored",
    });

  const parsedPublic = await openpgp.readKey({ armoredKey: publicKey });
  const fingerprint = parsedPublic.getFingerprint();

  return { privateKey, publicKey, revocationCertificate, fingerprint };
};

export const readPublicKey = (armoredKey) => openpgp.readKey({ armoredKey });
export const readPrivateKey = (armoredKey) =>
  openpgp.readPrivateKey({ armoredKey });

export const encryptText = async ({ message, publicKeys }) => {
  const encryptionKeys = await Promise.all(
    publicKeys.map((key) => readPublicKey(key)),
  );
  const pgpMessage = await openpgp.createMessage({ text: message });
  return openpgp.encrypt({ message: pgpMessage, encryptionKeys });
};

export const encryptAndSignText = async ({
  message,
  publicKeys,
  privateKeyArmored,
  passphrase,
}) => {
  const encryptionKeys = await Promise.all(
    publicKeys.map((key) => readPublicKey(key)),
  );
  const privateKey = await readPrivateKey(privateKeyArmored);
  const signingKey = await openpgp.decryptKey({ privateKey, passphrase });
  const pgpMessage = await openpgp.createMessage({ text: message });
  return openpgp.encrypt({
    message: pgpMessage,
    encryptionKeys,
    signingKeys: signingKey,
  });
};

export const decryptText = async ({
  message,
  privateKeyArmored,
  passphrase,
}) => {
  const privateKey = await readPrivateKey(privateKeyArmored);
  const decryptionKey = await openpgp.decryptKey({ privateKey, passphrase });
  const pgpMessage = await openpgp.readMessage({ armoredMessage: message });
  const { data } = await openpgp.decrypt({
    message: pgpMessage,
    decryptionKeys: decryptionKey,
  });
  return data;
};

export const decryptAndVerifyText = async ({
  message,
  privateKeyArmored,
  passphrase,
  publicKeyArmored,
}) => {
  const privateKey = await readPrivateKey(privateKeyArmored);
  const decryptionKey = await openpgp.decryptKey({ privateKey, passphrase });
  const verificationKey = await readPublicKey(publicKeyArmored);
  const pgpMessage = await openpgp.readMessage({ armoredMessage: message });
  const { data, signatures } = await openpgp.decrypt({
    message: pgpMessage,
    decryptionKeys: decryptionKey,
    verificationKeys: verificationKey,
  });
  if (signatures?.length) {
    const { verified } = signatures[0];
    await verified;
  }
  return data;
};

export const signText = async ({ message, privateKeyArmored, passphrase }) => {
  const privateKey = await readPrivateKey(privateKeyArmored);
  const signingKey = await openpgp.decryptKey({ privateKey, passphrase });
  const pgpMessage = await openpgp.createMessage({ text: message });
  return openpgp.sign({
    message: pgpMessage,
    signingKeys: signingKey,
    detached: true,
  });
};

export const verifyText = async ({ message, signature, publicKeyArmored }) => {
  const verificationKey = await readPublicKey(publicKeyArmored);
  const pgpMessage = await openpgp.createMessage({ text: message });
  const sig = await openpgp.readSignature({ armoredSignature: signature });
  const verification = await openpgp.verify({
    message: pgpMessage,
    signature: sig,
    verificationKeys: verificationKey,
  });
  const { verified } = verification.signatures[0];
  await verified;
  return true;
};

export const encryptFile = async ({ file, publicKeys }) => {
  const encryptionKeys = await Promise.all(
    publicKeys.map((key) => readPublicKey(key)),
  );
  const data = new Uint8Array(await file.arrayBuffer());
  const message = await openpgp.createMessage({ binary: data });
  const encrypted = await openpgp.encrypt({
    message,
    encryptionKeys,
    format: "binary",
  });
  return new Blob([encrypted], { type: "application/octet-stream" });
};

export const decryptFile = async ({ file, privateKeyArmored, passphrase }) => {
  const privateKey = await readPrivateKey(privateKeyArmored);
  const decryptionKey = await openpgp.decryptKey({ privateKey, passphrase });
  const data = new Uint8Array(await file.arrayBuffer());
  const message = await openpgp.readMessage({ binaryMessage: data });
  const { data: decrypted } = await openpgp.decrypt({
    message,
    decryptionKeys: decryptionKey,
    format: "binary",
  });
  return new Blob([decrypted], { type: "application/octet-stream" });
};

const strengthLabel = (rsaBits) => {
  if (!rsaBits) return "Standard";
  if (rsaBits >= 4096) return "Strong";
  if (rsaBits >= 3072) return "Good";
  return "Basic";
};

export const parseArmoredKey = async (armoredKey) => {
  const trimmed = armoredKey.trim();

  let isPrivate = false;
  let key;

  try {
    key = await openpgp.readPrivateKey({ armoredKey: trimmed });
    isPrivate = true;
  } catch (err) {
    key = await openpgp.readKey({ armoredKey: trimmed });
  }

  const publicKey = isPrivate ? key.toPublic() : key;
  const fingerprint = publicKey.getFingerprint();
  const userIDs = publicKey.getUserIDs();
  const primaryUser = userIDs?.[0] || "Unknown owner";
  const algorithmInfo = publicKey.getAlgorithmInfo?.() || {};
  const rsaBits = algorithmInfo.bits;
  const algorithm = algorithmInfo.algorithm || "RSA";

  return {
    isPrivate,
    fingerprint,
    userIDs,
    owner: primaryUser,
    algorithm,
    rsaBits,
    strengthLabel: strengthLabel(rsaBits),
    publicKeyArmored: publicKey.armor(),
    privateKeyArmored: isPrivate ? key.armor() : null,
  };
};
