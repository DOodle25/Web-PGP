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
  const emailError = email && !emailValid(email) ? "Enter a valid email." : "";
  const passwordError = password && password.length < 8 ? "Use at least 8 characters." : "";

  const timeLeft = sessionExpiresAt
    ? Math.max(0, Math.floor((sessionExpiresAt - Date.now()) / 60000))
    : null;

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Account & Vault</h2>
        {user ? (
          <span className="badge success">Logged in</span>
        ) : (
          <span className="badge warning">Not signed in</span>
        )}
      </div>
      <div className="grid">
        <div className="card">
          <h3>Step 1 · Account access</h3>
          <p className="hint">
            Your account password signs you in and syncs public metadata. It does not unlock private keys.
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
          {passwordError && <span className="inline-error">{passwordError}</span>}
          <div className="actions">
            <button onClick={onLogin} disabled={!!emailError || !!passwordError}>
              Login
            </button>
            <button className="ghost" onClick={onRegister} disabled={!!emailError || !!passwordError}>
              Signup
            </button>
            <button className="danger" onClick={onLogout}>
              Logout
            </button>
          </div>
          <div className="actions">
            <button className="ghost" onClick={onLogoutAll} disabled={!user}>
              Logout all devices
            </button>
            {sessionExpiresAt && (
              <span className="muted">Session expires in {timeLeft} min</span>
            )}
          </div>
          {status && <p className="hint">{status}</p>}
        </div>
        <div className="card">
          <h3>Step 2 · Vault unlock</h3>
          <p className="hint">
            The vault password decrypts your private keys locally. The server never sees it.
          </p>
          <div className="actions">
            <button onClick={onUnlock}>{locked ? "Unlock vault" : "Lock vault"}</button>
            <span className={`badge ${locked ? "warning" : "success"}`}>
              {locked ? "Locked" : "Unlocked"}
            </span>
          </div>
          <p className="hint">Auto-lock removes decrypted keys from memory.</p>
        </div>
      </div>
    </section>
  );
};
