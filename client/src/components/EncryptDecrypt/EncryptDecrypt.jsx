import { useEffect, useState } from "react";
import { decryptPrivateKey } from "../../utils/cryptoVault";
import {
  decryptText,
  decryptAndVerifyText,
  encryptAndSignText,
  encryptText,
  signText,
  verifyText,
} from "../../crypto/openpgpService";

export const EncryptDecrypt = ({ keys, vaultPassword, mode }) => {
  const [selectedRecipients, setSelectedRecipients] = useState([]);
  const [plaintext, setPlaintext] = useState("");
  const [ciphertext, setCiphertext] = useState("");
  const [privateKeyId, setPrivateKeyId] = useState("");
  const [signingKeyId, setSigningKeyId] = useState("");
  const [keyPassphrase, setKeyPassphrase] = useState("");
  const [signingPassphrase, setSigningPassphrase] = useState("");
  const [signature, setSignature] = useState("");
  const [signMode, setSignMode] = useState("none");
  const [status, setStatus] = useState("");
  const [showOutput, setShowOutput] = useState(true);
  const [verifyMode, setVerifyMode] = useState("none");
  const [verifyKeyId, setVerifyKeyId] = useState("");
  const [verifySignature, setVerifySignature] = useState("");
  const [verifyResult, setVerifyResult] = useState("");

  useEffect(() => {
    if (!ciphertext) {
      setSignature("");
      setVerifyResult("");
      return undefined;
    }
    const timer = setTimeout(
      () => {
        setCiphertext("");
        setSignature("");
        setVerifyResult("");
      },
      5 * 60 * 1000,
    );
    return () => clearTimeout(timer);
  }, [ciphertext]);

  const handleEncrypt = async () => {
    const recipients = keys.filter((key) =>
      selectedRecipients.includes(key.id),
    );
    if (!recipients.length) {
      setStatus("Select recipients.");
      return;
    }
    let signingKey = null;

    if (signMode !== "none") {
      const signer = keys.find((item) => item.id === signingKeyId);
      if (!signer || !vaultPassword || !signer.encryptedPrivateKey) {
        setStatus("Select a signing key and set vault password.");
        return;
      }

      const payload = JSON.parse(signer.encryptedPrivateKey);
      signingKey = await decryptPrivateKey(vaultPassword, payload);
    }

    if (signMode === "sign-then-encrypt") {
      const encrypted = await encryptAndSignText({
        message: plaintext,
        publicKeys: recipients.map((key) => key.publicKey),
        privateKeyArmored: signingKey,
        passphrase: signingPassphrase,
      });
      setCiphertext(encrypted);
      setSignature("");
      setStatus("Signed then encrypted.");
      return;
    }

    const encrypted = await encryptText({
      message: plaintext,
      publicKeys: recipients.map((key) => key.publicKey),
    });

    if (signMode === "encrypt-then-sign") {
      const signed = await signText({
        message: encrypted,
        privateKeyArmored: signingKey,
        passphrase: signingPassphrase,
      });
      setSignature(signed);
      setStatus("Encrypted then signed.");
    } else {
      setSignature("");
      setStatus("Encrypted.");
    }

    setCiphertext(encrypted);
  };

  const handleDecrypt = async () => {
    const key = keys.find((item) => item.id === privateKeyId);
    if (!key || !vaultPassword || !key.encryptedPrivateKey) {
      setStatus("Select a private key and set vault password.");
      return;
    }

    const verifier = keys.find((item) => item.id === verifyKeyId);
    if (verifyMode !== "none" && !verifier) {
      setStatus("Select a sender public key to verify.");
      return;
    }

    if (verifyMode === "encrypt-then-sign" && !verifySignature) {
      setStatus("Paste the detached signature to verify.");
      return;
    }

    const payload = JSON.parse(key.encryptedPrivateKey);
    const privateKey = await decryptPrivateKey(vaultPassword, payload);

    if (verifyMode === "encrypt-then-sign") {
      try {
        await verifyText({
          message: ciphertext,
          signature: verifySignature,
          publicKeyArmored: verifier.publicKey,
        });
        setVerifyResult("valid");
      } catch (err) {
        setVerifyResult("invalid");
        setStatus("Signature invalid.");
        return;
      }
    }

    const decrypted =
      verifyMode === "sign-then-encrypt"
        ? await decryptAndVerifyText({
            message: ciphertext,
            privateKeyArmored: privateKey,
            passphrase: keyPassphrase,
            publicKeyArmored: verifier.publicKey,
          })
        : await decryptText({
            message: ciphertext,
            privateKeyArmored: privateKey,
            passphrase: keyPassphrase,
          });

    if (verifyMode === "sign-then-encrypt") {
      setVerifyResult("valid");
      setStatus("Decrypted and verified.");
    } else if (verifyMode === "encrypt-then-sign") {
      setStatus("Verified then decrypted.");
    } else {
      setStatus("Decrypted.");
    }

    setPlaintext(decrypted);
  };

  return (
    <section className="panel page">
      <div className="page-header">
        <div>
          <h2>{mode === "decrypt" ? "Decrypt Message" : "Encrypt Message"}</h2>
          <p className="page-subtitle">
            {mode === "decrypt"
              ? "Paste encrypted text and unlock it with your private key."
              : "Encrypt messages for recipients with optional signing."}
          </p>
        </div>
        <div className="toolbar">
          <button className="ghost" onClick={() => setShowOutput((prev) => !prev)}>
            {showOutput ? "Hide output" : "Show output"}
          </button>
        </div>
      </div>

      {mode !== "decrypt" && (
        <div className="split-grid">
          <div className="card">
            <div className="card-header">
              <h3>Compose</h3>
              <span className="hint">Choose recipients and sign options.</span>
            </div>
            <div className="form-grid">
              <label>
                Recipients
                <select
                  multiple
                  value={selectedRecipients}
                  onChange={(e) =>
                    setSelectedRecipients(
                      Array.from(e.target.selectedOptions).map((opt) => opt.value),
                    )
                  }
                  title="Choose public keys allowed to decrypt this message."
                >
                  {keys.map((key) => (
                    <option key={key.id} value={key.id}>
                      {key.label || key.fingerprint}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Message
                <textarea
                  rows="8"
                  value={plaintext}
                  onChange={(e) => setPlaintext(e.target.value)}
                  title="Plaintext is encrypted in your browser."
                />
              </label>
              <label>
                Sign order
                <select
                  value={signMode}
                  onChange={(e) => setSignMode(e.target.value)}
                  title="Use your private key and the recipient's public key."
                >
                  <option value="none">No signing</option>
                  <option value="sign-then-encrypt">Sign then encrypt</option>
                  <option value="encrypt-then-sign">Encrypt then sign</option>
                </select>
              </label>
              {signMode !== "none" && (
                <>
                  <label>
                    Signing key
                    <select
                      value={signingKeyId}
                      onChange={(e) => setSigningKeyId(e.target.value)}
                      title="Use your private key to sign."
                    >
                      <option value="">Select</option>
                      {keys.map((key) => (
                        <option key={key.id} value={key.id}>
                          {key.label || key.fingerprint}
                        </option>
                      ))}
                    </select>
                  </label>
                  <input
                    type="password"
                    placeholder="Signing key passphrase"
                    value={signingPassphrase}
                    onChange={(e) => setSigningPassphrase(e.target.value)}
                    title="Only used to unlock this key for signing."
                  />
                </>
              )}
            </div>
            <p className="hint">Encrypted output clears automatically after 5 minutes.</p>
            <div className="actions">
              <button onClick={handleEncrypt}>Encrypt</button>
              <button className="ghost" onClick={() => setPlaintext("")}>
                Clear
              </button>
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h3>Encrypted output</h3>
              <span className="hint">Share only with intended recipients.</span>
            </div>
            {showOutput ? (
              <div className="form-grid">
                <label>
                  Ciphertext
                  <textarea rows="8" value={ciphertext} readOnly className="mono" />
                </label>
                {signature && (
                  <label>
                    Detached signature
                    <textarea rows="6" value={signature} readOnly className="mono" />
                  </label>
                )}
              </div>
            ) : (
              <p className="hint">Output hidden. Use the toggle to reveal it.</p>
            )}
          </div>
        </div>
      )}

      {mode === "decrypt" && (
        <div className="split-grid">
          <div className="card">
            <div className="card-header">
              <h3>Decrypt</h3>
              <span className="hint">Paste ciphertext and select your key.</span>
            </div>
            <div className="form-grid">
              <label>
                Encrypted message
                <textarea
                  rows="8"
                  value={ciphertext}
                  onChange={(e) => setCiphertext(e.target.value)}
                  title="Paste PGP armored text or ciphertext."
                />
              </label>
              <label>
                Private key
                <select
                  value={privateKeyId}
                  onChange={(e) => setPrivateKeyId(e.target.value)}
                  title="Vault password unlocks your private key first."
                >
                  <option value="">Select</option>
                  {keys.map((key) => (
                    <option key={key.id} value={key.id}>
                      {key.label || key.fingerprint}
                    </option>
                  ))}
                </select>
              </label>
              <input
                type="password"
                placeholder="Key passphrase"
                value={keyPassphrase}
                onChange={(e) => setKeyPassphrase(e.target.value)}
                title="Only used to unlock this key for decryption."
              />
              <label>
                Verify order
                <select
                  value={verifyMode}
                  onChange={(e) => setVerifyMode(e.target.value)}
                  title="Verify with the sender's public key."
                >
                  <option value="none">No verification</option>
                  <option value="sign-then-encrypt">Sign then encrypt</option>
                  <option value="encrypt-then-sign">Encrypt then sign</option>
                </select>
              </label>
              {verifyMode !== "none" && (
                <label>
                  Sender public key
                  <select
                    value={verifyKeyId}
                    onChange={(e) => setVerifyKeyId(e.target.value)}
                    title="Use the sender's public key to verify."
                  >
                    <option value="">Select</option>
                    {keys.map((key) => (
                      <option key={key.id} value={key.id}>
                        {key.label || key.fingerprint}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {verifyMode === "encrypt-then-sign" && (
                <label>
                  Detached signature
                  <textarea
                    rows="4"
                    value={verifySignature}
                    onChange={(e) => setVerifySignature(e.target.value)}
                  />
                </label>
              )}
            </div>
            <p className="hint">Key passphrase is separate from your vault password.</p>
            <div className="actions">
              <button onClick={handleDecrypt}>Decrypt</button>
              <button className="ghost" onClick={() => setCiphertext("")}>
                Clear
              </button>
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h3>Decrypted output</h3>
              <span className="hint">Plaintext appears here after decrypting.</span>
            </div>
            {showOutput ? (
              <div className="form-grid">
                <label>
                  Plaintext
                  <textarea rows="10" value={plaintext} readOnly />
                </label>
                {verifyResult && (
                  <span
                    className={`status-pill ${
                      verifyResult === "valid" ? "success" : "danger"
                    }`}
                  >
                    {verifyResult === "valid"
                      ? "Signature valid"
                      : "Signature invalid"}
                  </span>
                )}
              </div>
            ) : (
              <p className="hint">Output hidden. Use the toggle to reveal it.</p>
            )}
          </div>
        </div>
      )}

      {status && <p className="hint">{status}</p>}
    </section>
  );
};
