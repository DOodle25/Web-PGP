import { useState } from "react";
import { decryptPrivateKey } from "../../utils/cryptoVault";
import { decryptFile, encryptFile } from "../../crypto/openpgpService";

export const FileCrypto = ({ keys, vaultPassword }) => {
  const [file, setFile] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [privateKeyId, setPrivateKeyId] = useState("");
  const [keyPassphrase, setKeyPassphrase] = useState("");
  const [status, setStatus] = useState("");

  const handleEncrypt = async () => {
    if (!file) {
      setStatus("Select a file.");
      return;
    }

    const selected = keys.filter((key) => recipients.includes(key.id));
    if (!selected.length) {
      setStatus("Select recipients.");
      return;
    }

    const encrypted = await encryptFile({
      file,
      publicKeys: selected.map((key) => key.publicKey),
    });
    const url = URL.createObjectURL(encrypted);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${file.name}.pgp`;
    link.click();
    URL.revokeObjectURL(url);
    setStatus("File encrypted.");
  };

  const handleDecrypt = async () => {
    if (!file) {
      setStatus("Select a file.");
      return;
    }

    const key = keys.find((item) => item.id === privateKeyId);
    if (!key || !vaultPassword || !key.encryptedPrivateKey) {
      setStatus("Select a private key and set vault password.");
      return;
    }

    const payload = JSON.parse(key.encryptedPrivateKey);
    const privateKey = await decryptPrivateKey(vaultPassword, payload);
    const decrypted = await decryptFile({
      file,
      privateKeyArmored: privateKey,
      passphrase: keyPassphrase,
    });
    const url = URL.createObjectURL(decrypted);
    const link = document.createElement("a");
    link.href = url;
    link.download = file.name.replace(/\.pgp$/, "") || "decrypted";
    link.click();
    URL.revokeObjectURL(url);
    setStatus("File decrypted.");
  };

  return (
    <section className="panel">
      <h2>File Encryption</h2>
      <div className="grid">
        <div className="card">
          <label className="dropzone">
            <input type="file" onChange={(e) => setFile(e.target.files[0])} />
            <div>
              <strong>{file ? file.name : "Drop file here"}</strong>
              <span>
                {file
                  ? `${(file.size / 1024).toFixed(1)} KB`
                  : "Drag & drop or click to browse"}
              </span>
            </div>
          </label>
          <p className="hint">
            Files are encrypted in your browser before upload/download.
          </p>
          <label>
            Recipients
            <select
              multiple
              value={recipients}
              onChange={(e) =>
                setRecipients(
                  Array.from(e.target.selectedOptions).map((opt) => opt.value),
                )
              }
            >
              {keys.map((key) => (
                <option key={key.id} value={key.id}>
                  {key.label || key.fingerprint}
                </option>
              ))}
            </select>
          </label>
          <button onClick={handleEncrypt}>Encrypt File</button>
        </div>
        <div className="card">
          <label>
            Private key
            <select
              value={privateKeyId}
              onChange={(e) => setPrivateKeyId(e.target.value)}
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
          />
          <button onClick={handleDecrypt}>Decrypt File</button>
        </div>
      </div>
      {status && <p className="hint">{status}</p>}
    </section>
  );
};
