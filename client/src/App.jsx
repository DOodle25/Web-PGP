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

const OFFLINE_STORAGE_KEY = "kleo_keys_offline";
const VAULT_VERIFIER_KEY = "kleo_vault_verifier";

const loadOfflineKeys = () => {
  const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
  if (!stored) return [];
  return JSON.parse(stored)
    .filter((key) => key.storageMode !== "server")
    .map((key) => ({
      ...key,
      storageMode: "local",
    }));
};

const saveOfflineKeys = (keys) => {
  const offline = keys.filter((key) => key.storageMode !== "server");
  localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(offline));
};

const loadVaultVerifier = () => {
  const raw = localStorage.getItem(VAULT_VERIFIER_KEY);
  return raw ? JSON.parse(raw) : null;
};

const saveVaultVerifier = (payload) => {
  localStorage.setItem(VAULT_VERIFIER_KEY, JSON.stringify(payload));
};

function App() {
  const [keys, setKeys] = useState(loadOfflineKeys());
  const [vaultPassword, setVaultPassword] = useState("");
  const [browserOnly, setBrowserOnly] = useState(false);
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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
      { id: "account", label: "Account", icon: "👤" },
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
    saveOfflineKeys(keys);
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
        const onlineKeys = remoteKeys.map((key) => ({
          id: key._id,
          label: key.label,
          publicKey: key.publicKey,
          encryptedPrivateKey: key.encryptedPrivateKey,
          fingerprint: key.fingerprint,
          algorithm: key.algorithm,
          storageMode: "server",
        }));
        setKeys((prev) => {
          const offlineKeys = prev.filter(
            (key) => key.storageMode !== "server",
          );
          return [...onlineKeys, ...offlineKeys];
        });
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
    const shouldSync = key.storageMode === "server" && canSync;
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
            item.id === key.id
              ? { ...item, id: saved._id, storageMode: "server" }
              : item,
          ),
        );
      } catch (err) {
        setStatus(err.message);
      }
    }
  };

  const handleUpdateKey = async (id, updates) => {
    const target = keys.find((key) => key.id === id);
    setKeys((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updates } : item)),
    );
    if (target?.storageMode === "server" && canSync) {
      try {
        await api.updateKey(token, id, updates);
      } catch (err) {
        setStatus(err.message);
      }
    }
  };

  const handleDeleteKey = async (id) => {
    const target = keys.find((key) => key.id === id);
    setKeys((prev) => prev.filter((key) => key.id !== id));
    setLastActivity(new Date().toLocaleString());
    if (target?.storageMode === "server" && !browserOnly && token) {
      try {
        await api.deleteKey(token, id);
      } catch (err) {
        setStatus(err.message);
      }
    }
  };

  const handleToggleKeyStorage = async (id) => {
    const target = keys.find((key) => key.id === id);
    if (!target) return;

    if (target.storageMode === "server") {
      if (!canSync) {
        setStatus("Login to move keys offline.");
        return;
      }
      try {
        await api.deleteKey(token, id);
        setKeys((prev) =>
          prev.map((item) =>
            item.id === id
              ? {
                  ...item,
                  id: crypto.randomUUID(),
                  storageMode: "local",
                }
              : item,
          ),
        );
        setStatus("Key moved offline.");
      } catch (err) {
        setStatus(err.message);
      }
      return;
    }

    if (!canSync) {
      setStatus("Login to move keys online.");
      return;
    }

    try {
      const saved = await api.saveKey(token, {
        publicKey: target.publicKey,
        encryptedPrivateKey: target.encryptedPrivateKey,
        fingerprint: target.fingerprint,
        algorithm: target.algorithm,
        label: target.label,
      });
      setKeys((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, id: saved._id, storageMode: "server" }
            : item,
        ),
      );
      setStatus("Key moved online.");
    } catch (err) {
      setStatus(err.message);
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
    setKeys((prev) => prev.filter((key) => key.storageMode !== "server"));
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
          <button
            className="icon-button"
            type="button"
            onClick={() => setSidebarCollapsed((prev) => !prev)}
            aria-pressed={sidebarCollapsed}
            aria-label="Toggle navigation"
          >
            Menu
          </button>
          <span className="logo">K</span>
          <div>
            <strong>Web-PGP</strong>
            <span className="muted">Workspace: Web-PGP Vault</span>
          </div>
        </div>
        <div className="topbar-actions">
          <div className="topbar-profile">
            <span className="topbar-user">{user?.email || "Guest"}</span>
            <span className="muted">Account</span>
          </div>
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

      <div className={`layout ${sidebarCollapsed ? "collapsed" : ""}`}>
        <aside className={`sidebar ${sidebarCollapsed ? "collapsed" : ""}`}>
          {navigation.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${activeView === item.id ? "active" : ""}`}
              onClick={() => setActiveView(item.id)}
              title={item.label}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
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
              onToggleStorage={handleToggleKeyStorage}
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
          {activeView === "account" && (
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
          )}
          {activeView === "settings" && (
            <Settings
              browserOnly={browserOnly}
              onToggleBrowserOnly={setBrowserOnly}
              autoLockMinutes={autoLockMinutes}
              setAutoLockMinutes={setAutoLockMinutes}
            />
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
