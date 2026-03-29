import { useMemo, useState } from "react";
import { generateKeyPair, parseArmoredKey } from "../../crypto/openpgpService";
import { encryptPrivateKey } from "../../utils/cryptoVault";

const steps = ["Identity", "Crypto", "Expiry", "Passphrase", "Confirm"];

const strengthCopy = (bits, label) => {
  if (!bits) return "Standard";
  return `${label} (${bits}-bit)`;
};

export const KeyManager = ({
  keys,
  onAddKey,
  onDeleteKey,
  onUpdateKey,
  onToggleStorage,
  vaultPassword,
  canSync,
}) => {
  const [mode, setMode] = useState("list");
  const [step, setStep] = useState(0);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [passphrase, setPassphrase] = useState("");
  const [rsaBits, setRsaBits] = useState(3072);
  const [expiresInDays, setExpiresInDays] = useState(365);
  const [importText, setImportText] = useState("");
  const [importMeta, setImportMeta] = useState(null);
  const [importLabel, setImportLabel] = useState("");
  const [importMode, setImportMode] = useState("local");
  const [status, setStatus] = useState("");
  const [labelEdits, setLabelEdits] = useState({});

  const summary = useMemo(
    () => ({ name, email, rsaBits, expiresInDays }),
    [name, email, rsaBits, expiresInDays],
  );

  const handleGenerate = async () => {
    if (!vaultPassword) {
      setStatus("Set a vault password first.");
      return;
    }

    setStatus("Generating...");

    const { publicKey, privateKey, fingerprint } = await generateKeyPair({
      name,
      email,
      passphrase,
      rsaBits: Number(rsaBits),
      expiresInDays: Number(expiresInDays),
    });

    const encryptedPayload = await encryptPrivateKey(vaultPassword, privateKey);

    onAddKey({
      id: crypto.randomUUID(),
      label: `${name} <${email}>`,
      publicKey,
      encryptedPrivateKey: JSON.stringify(encryptedPayload),
      fingerprint,
      algorithm: "RSA",
      strengthLabel: "Good",
      rsaBits,
      owner: `${name} <${email}>`,
      usage: "Encrypt & Sign",
      trustLevel: "own",
      expiresAt: new Date(
        Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
      ).toISOString(),
      storageMode: canSync ? "server" : "local",
    });

    setStatus("Key generated.");
    setPassphrase("");
    setMode("list");
    setStep(0);
  };

  const parseImport = async (text) => {
    if (!text.trim()) {
      setStatus("Paste a key to import.");
      return;
    }

    try {
      const meta = await parseArmoredKey(text);
      if (meta.isPrivate && !vaultPassword) {
        setStatus("Vault password required to store a private key.");
      }
      setImportMeta(meta);
      setImportLabel(meta.owner || "Imported key");
      setStatus(
        meta.isPrivate ? "Private key detected." : "Public key detected.",
      );
    } catch (err) {
      setImportMeta(null);
      setStatus("Invalid key format.");
    }
  };

  const handleImportFile = async (file) => {
    if (!file) return;
    const text = await file.text();
    setImportText(text);
    await parseImport(text);
  };

  const handleImport = async () => {
    if (!importText.trim() || !importMeta) {
      setStatus("Provide a valid key to import.");
      return;
    }

    if (importMeta.isPrivate && !vaultPassword) {
      setStatus("Vault password required to store a private key.");
      return;
    }

    let encryptedPrivateKey = null;
    if (importMeta.isPrivate) {
      const encryptedPayload = await encryptPrivateKey(
        vaultPassword,
        importMeta.privateKeyArmored,
      );
      encryptedPrivateKey = JSON.stringify(encryptedPayload);
    }

    const storageMode = importMode === "server" && canSync ? "server" : "local";

    onAddKey({
      id: crypto.randomUUID(),
      label: importLabel || importMeta.owner || "Imported key",
      publicKey: importMeta.publicKeyArmored,
      encryptedPrivateKey,
      fingerprint: importMeta.fingerprint,
      algorithm: importMeta.algorithm || "RSA",
      rsaBits: importMeta.rsaBits,
      strengthLabel: importMeta.strengthLabel,
      owner: importMeta.owner,
      usage: importMeta.isPrivate ? "Encrypt & Sign" : "Encrypt",
      trustLevel: importMeta.isPrivate ? "own" : "imported",
      storageMode,
    });

    setImportText("");
    setImportMeta(null);
    setMode("list");
    setStatus("Key imported successfully.");
  };

  const handleDelete = (id) => {
    if (window.prompt("Type DELETE to confirm.") === "DELETE") {
      onDeleteKey(id);
    }
  };

  const exportPublicKey = (key) => {
    const blob = new Blob([key.publicKey], { type: "application/pgp-keys" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${key.label || "public"}.asc`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportPrivateKey = (key) => {
    if (!key.encryptedPrivateKey) return;
    if (window.prompt("Type EXPORT to confirm.") !== "EXPORT") return;
    const blob = new Blob([key.encryptedPrivateKey], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${key.label || "private"}.encrypted.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const statusBadge = (key) => {
    if (key.trustLevel === "revoked")
      return { label: "Revoked", tone: "danger" };
    if (key.trustLevel === "expired")
      return { label: "Expired", tone: "danger" };
    if (key.encryptedPrivateKey || key.trustLevel === "own")
      return { label: "Own", tone: "success" };
    if (key.trustLevel === "trusted") return { label: "Trusted", tone: "info" };
    return { label: "Imported", tone: "warning" };
  };

  const onlineKeys = keys.filter((key) => key.storageMode === "server");
  const offlineKeys = keys.filter((key) => key.storageMode !== "server");

  const renderKeyList = (items, emptyCopy) => (
    <div className="key-list">
      {items.length === 0 && <p className="hint">{emptyCopy}</p>}
      {items.map((key) => {
        const badge = statusBadge(key);
        const isOnline = key.storageMode === "server";
        return (
          <article key={key.id} className="key-card">
            <div className="key-card-header">
              <input
                className="inline-input key-title"
                value={labelEdits[key.id] ?? key.label ?? ""}
                onChange={(e) =>
                  setLabelEdits((prev) => ({
                    ...prev,
                    [key.id]: e.target.value,
                  }))
                }
              />
              <div className="key-badges">
                <span className={`badge ${badge.tone}`}>{badge.label}</span>
                <span
                  className={`pill ${isOnline ? "pill-online" : "pill-offline"}`}
                >
                  {isOnline ? "Online" : "Offline"}
                </span>
              </div>
            </div>
            <div className="key-meta">
              <span>Owner: {key.owner || "Unknown"}</span>
              <span>Usage: {key.usage || "Encrypt"}</span>
              <span>
                Strength: {strengthCopy(key.rsaBits, key.algorithm || "RSA")}
              </span>
              {key.expiresAt && (
                <span>
                  Expires: {new Date(key.expiresAt).toLocaleDateString()}
                </span>
              )}
            </div>
            <div className="key-meta">
              <span className="mono">{key.fingerprint}</span>
              <button
                className="ghost"
                onClick={() => navigator.clipboard.writeText(key.fingerprint)}
              >
                Copy fingerprint
              </button>
            </div>
            <div className="key-actions">
              <button
                className="ghost"
                onClick={() =>
                  onUpdateKey(key.id, {
                    label: labelEdits[key.id] ?? key.label,
                  })
                }
              >
                Save label
              </button>
              <button className="ghost" onClick={() => exportPublicKey(key)}>
                Export public
              </button>
              {key.encryptedPrivateKey && (
                <button
                  className="ghost"
                  onClick={() => exportPrivateKey(key)}
                >
                  Export private
                </button>
              )}
              <button
                className="ghost"
                onClick={() => {
                  if (window.prompt("Type REVOKE to confirm.") === "REVOKE") {
                    onUpdateKey(key.id, { trustLevel: "revoked" });
                  }
                }}
              >
                Revoke
              </button>
              <button
                className="ghost"
                onClick={() => onToggleStorage(key.id)}
                disabled={!canSync}
              >
                {isOnline ? "Move offline" : "Move online"}
              </button>
              <button className="danger" onClick={() => handleDelete(key.id)}>
                Delete
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );

  return (
    <section className="panel page keys-panel">
      <div className="page-header">
        <div>
          <h2>Key Management</h2>
          <p className="page-subtitle">
            Organize keys across online and offline storage.
          </p>
        </div>
        <div className="toolbar">
          <button onClick={() => setMode("generate")}>+ Generate</button>
          <button onClick={() => setMode("import")} className="ghost">
            + Import
          </button>
        </div>
      </div>

      {mode === "generate" && (
        <div className="card">
          <div className="stepper">
            {steps.map((label, i) => (
              <button
                key={label}
                className={`step ${i === step ? "active" : ""}`}
                onClick={() => setStep(i)}
              >
                {i + 1}. {label}
              </button>
            ))}
          </div>

          {step === 0 && (
            <div className="form">
              <input
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
              <input
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <p className="hint">This identifies the owner of the key.</p>
            </div>
          )}

          {step === 1 && (
            <div className="form">
              <label>
                Key strength
                <input
                  type="range"
                  min="2048"
                  max="4096"
                  step="1024"
                  value={rsaBits}
                  onChange={(e) => setRsaBits(Number(e.target.value))}
                />
                <span className="hint">{strengthCopy(rsaBits, "RSA")}</span>
              </label>
              <p className="hint">Higher strength is more secure but slower.</p>
            </div>
          )}

          {step === 2 && (
            <div className="form">
              <label>
                Expiry
                <input
                  type="number"
                  value={expiresInDays}
                  onChange={(e) => setExpiresInDays(Number(e.target.value))}
                />
              </label>
              <p className="hint">Set to 365 for annual rotation.</p>
            </div>
          )}

          {step === 3 && (
            <div className="form">
              <input
                type="password"
                placeholder="Key passphrase"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
              />
              <p className="hint">Used only to unlock this key during use.</p>
            </div>
          )}

          {step === 4 && (
            <div className="summary">
              <p>
                <strong>Key owner:</strong> {summary.name || "—"}
              </p>
              <p>
                <strong>Owner email:</strong> {summary.email || "—"}
              </p>
              <p>
                <strong>Key strength:</strong>{" "}
                {strengthCopy(summary.rsaBits, "RSA")}
              </p>
              <p>
                <strong>Expiry:</strong> {summary.expiresInDays} days
              </p>
            </div>
          )}

          <div className="actions">
            <button
              className="ghost"
              onClick={() => setStep((s) => Math.max(0, s - 1))}
            >
              Back
            </button>
            {step < steps.length - 1 ? (
              <button onClick={() => setStep((s) => s + 1)}>Next</button>
            ) : (
              <button onClick={handleGenerate}>Generate</button>
            )}
          </div>
        </div>
      )}

      {mode === "import" && (
        <div className="card">
          <label
            className="dropzone"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleImportFile(e.dataTransfer.files?.[0]);
            }}
          >
            <input
              type="file"
              accept=".asc,.txt"
              onChange={(e) => handleImportFile(e.target.files?.[0])}
            />
            <div>
              <strong>Drop .asc file here</strong>
              <span>or click to browse</span>
            </div>
          </label>
          <textarea
            rows="6"
            placeholder="Paste armored key"
            value={importText}
            onChange={(e) => {
              setImportText(e.target.value);
              parseImport(e.target.value);
            }}
          />
          {importMeta && (
            <div className="card">
              <h3>Import summary</h3>
              <p>
                <strong>Key owner:</strong> {importMeta.owner}
              </p>
              <p>
                <strong>Fingerprint:</strong>{" "}
                <span className="mono">{importMeta.fingerprint}</span>
              </p>
              <p>
                <strong>Key type:</strong>{" "}
                {importMeta.isPrivate ? "Private" : "Public"}
              </p>
              <p>
                <strong>Key strength:</strong>{" "}
                {strengthCopy(
                  importMeta.rsaBits,
                  importMeta.algorithm || "RSA",
                )}
              </p>
            </div>
          )}
          <label>
            Key label
            <input
              placeholder="Work Email Key"
              value={importLabel}
              onChange={(e) => setImportLabel(e.target.value)}
            />
          </label>
          <label>
            Storage mode
            <select
              value={importMode}
              onChange={(e) => setImportMode(e.target.value)}
            >
              <option value="local">Local-only</option>
              <option value="server">Server-synced</option>
            </select>
          </label>
          {!canSync && importMode === "server" && (
            <p className="hint">Server sync requires login and server mode.</p>
          )}
          <div className="actions">
            <button onClick={handleImport}>Import</button>
            <button className="ghost" onClick={() => setMode("list")}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {mode === "list" && (
        <div className="keys-columns">
          <section className="keys-column">
            <div className="keys-column-header">
              <div>
                <h3>Online keys</h3>
                <p className="hint">Stored in your account for sync.</p>
              </div>
              <span className="badge info">{onlineKeys.length}</span>
            </div>
            {renderKeyList(onlineKeys, "No online keys yet.")}
          </section>
          <section className="keys-column">
            <div className="keys-column-header">
              <div>
                <h3>Offline keys</h3>
                <p className="hint">Stored only in this browser.</p>
              </div>
              <span className="badge muted">{offlineKeys.length}</span>
            </div>
            {renderKeyList(offlineKeys, "No offline keys yet.")}
          </section>
        </div>
      )}

      {status && <p className="hint">{status}</p>}
    </section>
  );
};
