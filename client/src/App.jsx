import { useEffect, useMemo, useState } from "react";
import "./App.css";
import { Dashboard } from "./components/Dashboard/Dashboard";
import { KeyManager } from "./components/KeyManager/KeyManager";
import { EncryptDecrypt } from "./components/EncryptDecrypt/EncryptDecrypt";
import { SignVerify } from "./components/SignVerify/SignVerify";
import { FileCrypto } from "./components/FileCrypto/FileCrypto";
import { AuditLogs } from "./components/AuditLogs/AuditLogs";
import { Settings } from "./components/Settings/Settings";
import { AuthPanel } from "./components/Auth/AuthPanel";
import { api } from "./services/api";
import {
  clearToken,
  getExpiry,
  getToken,
  login,
  logoutSession,
  refreshSession,
  register,
} from "./services/auth";
import { createVaultVerifier, verifyVaultPassword } from "./utils/cryptoVault";

const STORAGE_KEY = "kleo_keys";
const VAULT_VERIFIER_KEY = "kleo_vault_verifier";

const loadKeys = () => {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
};

const saveKeys = (keys) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(keys));
};

const loadVaultVerifier = () => {
  const raw = localStorage.getItem(VAULT_VERIFIER_KEY);
  return raw ? JSON.parse(raw) : null;
};

const saveVaultVerifier = (payload) => {
  localStorage.setItem(VAULT_VERIFIER_KEY, JSON.stringify(payload));
};

function App() {
  const [keys, setKeys] = useState(loadKeys());
  const [vaultPassword, setVaultPassword] = useState("");
  const [browserOnly, setBrowserOnly] = useState(true);
  const [token, setToken] = useState(getToken());
  const [sessionExpiresAt, setSessionExpiresAt] = useState(getExpiry());
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [activeView, setActiveView] = useState("dashboard");
  const [auditLogs, setAuditLogs] = useState([]);
  const [lastActivity, setLastActivity] = useState(null);
  const [unlockOpen, setUnlockOpen] = useState(false);
  const [unlockValue, setUnlockValue] = useState("");
  const [autoLockMinutes, setAutoLockMinutes] = useState(15);
  const [user, setUser] = useState(null);

  const locked = !vaultPassword;
  const canSync = Boolean(token) && !browserOnly;

  const navigation = useMemo(
    () => [
      { id: "dashboard", label: "Dashboard", icon: "📊" },
      { id: "keys", label: "Keys", icon: "🔑" },
      { id: "encrypt", label: "Encrypt", icon: "🔐" },
      { id: "decrypt", label: "Decrypt", icon: "🗝️" },
      { id: "sign", label: "Sign/Verify", icon: "🖊️" },
      { id: "files", label: "Files", icon: "📁" },
      { id: "audit", label: "Audit Logs", icon: "🧾" },
      { id: "settings", label: "Settings", icon: "⚙️" },
    ],
    [],
  );

  const expiringCount = useMemo(() => {
    const limit = Date.now() + 30 * 24 * 60 * 60 * 1000;
    return keys.filter(
      (key) => key.expiresAt && new Date(key.expiresAt).getTime() < limit,
    ).length;
  }, [keys]);

  useEffect(() => {
    saveKeys(keys);
    if (keys.length) {
      setLastActivity(new Date().toLocaleString());
    }
  }, [keys]);

  useEffect(() => {
    const restoreSession = async () => {
      const expired = sessionExpiresAt && sessionExpiresAt < Date.now();
      if (token && !expired) return;
      try {
        const data = await refreshSession();
        setToken(data.token);
        setSessionExpiresAt(data.expiresAt);
        setUser(data.user);
        setStatus("Session restored.");
      } catch (err) {
        clearToken();
        setToken(null);
        setSessionExpiresAt(null);
      }
    };

    restoreSession();
  }, [sessionExpiresAt, token]);

  useEffect(() => {
    const hydrate = async () => {
      if (browserOnly || !token) return;
      try {
        const me = await api.me(token);
        setUser(me);
        const remoteKeys = await api.listKeys(token);
        setKeys(
          remoteKeys.map((key) => ({
            id: key._id,
            label: key.label,
            publicKey: key.publicKey,
            encryptedPrivateKey: key.encryptedPrivateKey,
            fingerprint: key.fingerprint,
            algorithm: key.algorithm,
          })),
        );
      } catch (err) {
        setStatus(err.message);
      }
    };

    hydrate();
  }, [browserOnly, token]);

  useEffect(() => {
    if (browserOnly || !token) {
      setAuditLogs([]);
      return;
    }

    api
      .getHistory(token)
      .then((data) => setAuditLogs(data))
      .catch(() => undefined);
  }, [browserOnly, token]);

  useEffect(() => {
    if (locked) return undefined;
    const timer = setTimeout(
      () => {
        setVaultPassword("");
        setStatus("Vault locked and decrypted keys cleared from memory.");
      },
      autoLockMinutes * 60 * 1000,
    );
    return () => clearTimeout(timer);
  }, [autoLockMinutes, locked]);

  const handleAddKey = async (key) => {
    setKeys((prev) => [key, ...prev]);
    setLastActivity(new Date().toLocaleString());
    const shouldSync = key.storageMode === "server" ? Boolean(token) : canSync;
    if (shouldSync) {
      try {
        const saved = await api.saveKey(token, {
          publicKey: key.publicKey,
          encryptedPrivateKey: key.encryptedPrivateKey,
          fingerprint: key.fingerprint,
          algorithm: key.algorithm,
          label: key.label,
        });
        setKeys((prev) =>
          prev.map((item) =>
            item.id === key.id ? { ...item, id: saved._id } : item,
          ),
        );
      } catch (err) {
        setStatus(err.message);
      }
    }
  };

  const handleUpdateKey = async (id, updates) => {
    setKeys((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
    if (canSync) {
      try {
        await api.updateKey(token, id, updates);
      } catch (err) {
        setStatus(err.message);
      }
    }
  };

  const handleDeleteKey = async (id) => {
    setKeys((prev) => prev.filter((key) => key.id !== id));
    setLastActivity(new Date().toLocaleString());
    if (!browserOnly && token) {
      try {
        await api.deleteKey(token, id);
      } catch (err) {
        setStatus(err.message);
      }
    }
  };

  const handleLogin = async () => {
    try {
      const data = await login(email, password);
      setUser(data.user);
      setToken(data.token);
      setSessionExpiresAt(data.expiresAt);
      setStatus("Logged in.");
    } catch (err) {
      setStatus(err.message);
    }
  };

  const handleRegister = async () => {
    try {
      const data = await register(email, password);
      setUser(data.user);
      setToken(data.token);
      setSessionExpiresAt(data.expiresAt);
      setStatus("Registered.");
    } catch (err) {
      setStatus(err.message);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutSession();
    } catch (err) {
      setStatus("Logged out.");
    }
    clearToken();
    setToken(null);
    setSessionExpiresAt(null);
    setUser(null);
    setStatus("Logged out.");
  };

  const handleLogoutAll = async () => {
    try {
      await api.logoutAll(token);
      await handleLogout();
    } catch (err) {
      setStatus("Logout all failed.");
    }
  };

  const handleUnlock = () => {
    if (!locked) {
      setVaultPassword("");
      setLastActivity(new Date().toLocaleString());
      return;
    }
    if (unlockValue.trim()) {
      const attempt = unlockValue.trim();
      const verifier = loadVaultVerifier();

      if (!verifier) {
        createVaultVerifier(attempt)
          .then((payload) => {
            saveVaultVerifier(payload);
            setVaultPassword(attempt);
            setUnlockValue("");
            setUnlockOpen(false);
            setLastActivity(new Date().toLocaleString());
            setStatus("Vault password set.");
          })
          .catch(() => setStatus("Failed to set vault password."));
        return;
      }

      verifyVaultPassword(attempt, verifier).then((ok) => {
        if (!ok) {
          setStatus("Vault password incorrect.");
          return;
        }
        setVaultPassword(attempt);
        setUnlockValue("");
        setUnlockOpen(false);
        setLastActivity(new Date().toLocaleString());
      });
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="logo">K</span>
          <div>
            <strong>Web Kleopatra</strong>
            <span className="muted">Workspace: Kleo Vault</span>
          </div>
        </div>
        <div className="topbar-actions">
          <span className="muted">{user?.email || "Guest"}</span>
          {sessionExpiresAt && (
            <span className="badge info">
              Expires in{" "}
              {Math.max(0, Math.floor((sessionExpiresAt - Date.now()) / 60000))}
              m
            </span>
          )}
          <button
            className={locked ? "danger" : "ghost"}
            onClick={() => setUnlockOpen(true)}
          >
            {locked ? "🔒 Locked" : "🔓 Unlocked"}
          </button>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          {navigation.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeView === item.id ? "active" : ""}`}
              onClick={() => setActiveView(item.id)}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </aside>

        <main className="content">
          {activeView === "dashboard" && (
            <Dashboard
              keyCount={keys.length}
              auditCount={auditLogs.length}
              browserOnly={browserOnly}
              locked={locked}
              lastActivity={lastActivity}
              onQuickAction={setActiveView}
              expiringCount={expiringCount}
            />
          )}
          {activeView === "keys" && (
            <KeyManager
              keys={keys}
              onAddKey={handleAddKey}
              onDeleteKey={handleDeleteKey}
              onUpdateKey={handleUpdateKey}
              vaultPassword={vaultPassword}
              canSync={canSync}
            />
          )}
          {activeView === "encrypt" && (
            <EncryptDecrypt
              keys={keys}
              vaultPassword={vaultPassword}
              mode="encrypt"
            />
          )}
          {activeView === "decrypt" && (
            <EncryptDecrypt
              keys={keys}
              vaultPassword={vaultPassword}
              mode="decrypt"
            />
          )}
          {activeView === "sign" && (
            <SignVerify keys={keys} vaultPassword={vaultPassword} />
          )}
          {activeView === "files" && (
            <FileCrypto keys={keys} vaultPassword={vaultPassword} />
          )}
          {activeView === "audit" && <AuditLogs entries={auditLogs} />}
          {activeView === "settings" && (
            <section className="panel">
              <AuthPanel
                email={email}
                password={password}
                setEmail={setEmail}
                setPassword={setPassword}
                onLogin={handleLogin}
                onRegister={handleRegister}
                onLogout={handleLogout}
                onLogoutAll={handleLogoutAll}
                status={status}
                user={user}
                sessionExpiresAt={sessionExpiresAt}
                locked={locked}
                onUnlock={() => (locked ? setUnlockOpen(true) : handleUnlock())}
              />
              <Settings
                browserOnly={browserOnly}
                onToggleBrowserOnly={setBrowserOnly}
                autoLockMinutes={autoLockMinutes}
                setAutoLockMinutes={setAutoLockMinutes}
              />
            </section>
          )}
        </main>
      </div>

      {unlockOpen && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal">
            <h3>Unlock vault</h3>
            <input
              type="password"
              placeholder="Vault password"
              value={unlockValue}
              onChange={(e) => setUnlockValue(e.target.value)}
            />
            <div className="actions">
              <button onClick={handleUnlock}>Unlock</button>
              <button className="ghost" onClick={() => setUnlockOpen(false)}>
                Cancel
              </button>
            </div>
            <p className="hint">Private keys unlock in-memory only.</p>
            <p className="hint">
              If this is your first vault password, it will be set now.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
