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
    <section className="panel">
      <div className="panel-header">
        <h2>Sign / Verify</h2>
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
        <div className="card">
          <label>
            Message
            <textarea
              rows="6"
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
          <p className="hint">
            Key passphrase is different from account and vault passwords.
          </p>
          <div className="actions">
            <button onClick={handleSign}>Sign</button>
            <button className="ghost" onClick={() => setMessage("")}>
              Clear
            </button>
          </div>
          {signature && (
            <textarea rows="6" value={signature} readOnly className="mono" />
          )}
        </div>
      )}

      {tab === "verify" && (
        <div className="card">
          <label>
            Message
            <textarea
              rows="6"
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
          <div className="actions">
            <button onClick={handleVerify}>Verify</button>
            <button className="ghost" onClick={() => setSignature("")}>
              Clear
            </button>
          </div>
          {result && (
            <span
              className={`badge ${result === "valid" ? "success" : "danger"}`}
            >
              {result === "valid" ? "Valid" : "Invalid"}
            </span>
          )}
        </div>
      )}

      {status && <p className="hint">{status}</p>}
    </section>
  );
};
