import { useState } from "react";

const emailValid = (value) => /.+@.+\..+/.test(value);

export const AuthPanel = ({
  email,
  password,
  setEmail,
  setPassword,
  onLogin,
  onRegister,
  onLogout,
  onLogoutAll,
  status,
  user,
  sessionExpiresAt,
  locked,
  onUnlock,
}) => {
  const [authMode, setAuthMode] = useState("login");
  const emailError = email && !emailValid(email) ? "Enter a valid email." : "";
  const passwordError =
    password && password.length < 8 ? "Use at least 8 characters." : "";

  const timeLeft = sessionExpiresAt
    ? Math.max(0, Math.floor((sessionExpiresAt - Date.now()) / 60000))
    : null;

  return (
    <section className="panel page">
      <div className="page-header">
        <div>
          <h2>Account & Vault</h2>
          <p className="page-subtitle">
            Manage sign-in details and unlock your local vault.
          </p>
        </div>
        {user ? (
          <span className="status-pill success">Signed in</span>
        ) : (
          <span className="status-pill warning">Signed out</span>
        )}
      </div>
      <div className="card-grid">
        {!user && (
          <div className="card">
            <div className="card-header">
              <h3>{authMode === "login" ? "Login" : "Create account"}</h3>
              <span className="hint">Use your email to access sync.</span>
            </div>
            <p className="hint">
              Your account password signs you in and syncs public metadata. It
              does not unlock private keys.
            </p>
            <input
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {emailError && <span className="inline-error">{emailError}</span>}
            <input
              placeholder="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {passwordError && (
              <span className="inline-error">{passwordError}</span>
            )}
            <div className="actions">
              <button
                onClick={authMode === "login" ? onLogin : onRegister}
                disabled={!!emailError || !!passwordError}
              >
                {authMode === "login" ? "Login" : "Signup"}
              </button>
              <button
                className="ghost"
                onClick={() =>
                  setAuthMode((prev) => (prev === "login" ? "signup" : "login"))
                }
              >
                {authMode === "login" ? "Need an account?" : "Have an account?"}
              </button>
            </div>
            {status && <p className="hint">{status}</p>}
          </div>
        )}
        {user && (
          <div className="card">
            <div className="card-header">
              <h3>Profile</h3>
              <span className="hint">Session and device controls.</span>
            </div>
            <p className="hint">Signed in as {user.email}</p>
            <div className="actions">
              <button className="danger" onClick={onLogout}>
                Logout
              </button>
              <button className="ghost" onClick={onLogoutAll}>
                Logout all devices
              </button>
            </div>
            {sessionExpiresAt && (
              <span className="muted">Session expires in {timeLeft} min</span>
            )}
            {status && <p className="hint">{status}</p>}
          </div>
        )}
        <div className="card">
          <div className="card-header">
            <h3>Vault unlock</h3>
            <span className="hint">Private keys stay local.</span>
          </div>
          <p className="hint">
            The vault password decrypts your private keys locally. The server
            never sees it.
          </p>
          <div className="actions">
            <button onClick={onUnlock}>
              {locked ? "Unlock vault" : "Lock vault"}
            </button>
            <span className={`status-pill ${locked ? "warning" : "success"}`}>
              {locked ? "Locked" : "Unlocked"}
            </span>
          </div>
          <p className="hint">Auto-lock removes decrypted keys from memory.</p>
        </div>
      </div>
    </section>
  );
};
