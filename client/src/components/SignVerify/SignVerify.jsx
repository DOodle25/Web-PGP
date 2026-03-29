import { useState } from "react";
import { decryptPrivateKey } from "../../utils/cryptoVault";
import { signText, verifyText } from "../../crypto/openpgpService";

export const SignVerify = ({ keys, vaultPassword }) => {
  const [message, setMessage] = useState("");
  const [signature, setSignature] = useState("");
  const [privateKeyId, setPrivateKeyId] = useState("");
  const [publicKeyId, setPublicKeyId] = useState("");
  const [keyPassphrase, setKeyPassphrase] = useState("");
  const [tab, setTab] = useState("sign");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState("");

  const handleSign = async () => {
    const key = keys.find((item) => item.id === privateKeyId);
    if (!key || !vaultPassword || !key.encryptedPrivateKey) {
      setStatus("Select a private key and set vault password.");
      return;
    }

    const payload = JSON.parse(key.encryptedPrivateKey);
    const privateKey = await decryptPrivateKey(vaultPassword, payload);
    const signed = await signText({
      message,
      privateKeyArmored: privateKey,
      passphrase: keyPassphrase,
    });
    setSignature(signed);
    setStatus("Signed.");
  };

  const handleVerify = async () => {
    const key = keys.find((item) => item.id === publicKeyId);
    if (!key) {
      setStatus("Select a public key.");
      return;
    }

    try {
      await verifyText({ message, signature, publicKeyArmored: key.publicKey });
      setResult("valid");
      setStatus("Signature verified.");
    } catch (err) {
      setResult("invalid");
      setStatus("Signature invalid.");
    }
  };

  return (
    <section className="panel page">
      <div className="page-header">
        <div>
          <h2>Sign / Verify</h2>
          <p className="page-subtitle">
            Create signatures with your private key or verify authenticity.
          </p>
        </div>
        <div className="tabs">
          <button
            className={tab === "sign" ? "active" : "ghost"}
            onClick={() => setTab("sign")}
          >
            Sign
          </button>
          <button
            className={tab === "verify" ? "active" : "ghost"}
            onClick={() => setTab("verify")}
          >
            Verify
          </button>
        </div>
      </div>

      {tab === "sign" && (
        <div className="split-grid">
          <div className="card">
            <div className="card-header">
              <h3>Sign a message</h3>
              <span className="hint">Use your private key to sign text.</span>
            </div>
            <div className="form-grid">
              <label>
                Message
                <textarea
                  rows="8"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  title="Plaintext stays in your browser."
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
                title="Only used to unlock this key for signing."
              />
            </div>
            <p className="hint">
              Key passphrase is different from account and vault passwords.
            </p>
            <div className="actions">
              <button onClick={handleSign}>Sign</button>
              <button className="ghost" onClick={() => setMessage("")}>
                Clear
              </button>
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h3>Signature output</h3>
              <span className="hint">
                Share this signature with the recipient.
              </span>
            </div>
            {signature ? (
              <textarea rows="12" value={signature} readOnly className="mono" />
            ) : (
              <p className="hint">No signature yet.</p>
            )}
          </div>
        </div>
      )}

      {tab === "verify" && (
        <div className="split-grid">
          <div className="card">
            <div className="card-header">
              <h3>Verify a signature</h3>
              <span className="hint">Paste the message and signature.</span>
            </div>
            <div className="form-grid">
              <label>
                Message
                <textarea
                  rows="8"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  title="Use the original unsigned message."
                />
              </label>
              <label>
                Signature
                <textarea
                  rows="6"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                />
              </label>
              <label>
                Public key
                <select
                  value={publicKeyId}
                  onChange={(e) => setPublicKeyId(e.target.value)}
                >
                  <option value="">Select</option>
                  {keys.map((key) => (
                    <option key={key.id} value={key.id}>
                      {key.label || key.fingerprint}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="actions">
              <button onClick={handleVerify}>Verify</button>
              <button className="ghost" onClick={() => setSignature("")}>
                Clear
              </button>
            </div>
          </div>
          <div className="card">
            <div className="card-header">
              <h3>Verification result</h3>
              <span className="hint">Signature status appears here.</span>
            </div>
            {result ? (
              <span
                className={`status-pill ${result === "valid" ? "success" : "danger"}`}
              >
                {result === "valid" ? "Signature valid" : "Signature invalid"}
              </span>
            ) : (
              <p className="hint">No verification yet.</p>
            )}
          </div>
        </div>
      )}

      {status && <p className="hint">{status}</p>}
    </section>
  );
};
