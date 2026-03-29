export const Settings = ({
  browserOnly,
  onToggleBrowserOnly,
  autoLockMinutes,
  setAutoLockMinutes,
}) => {
  return (
    <section className="panel page">
      <div className="page-header">
        <div>
          <h2>Settings</h2>
          <p className="page-subtitle">Control security, privacy, and advanced options.</p>
        </div>
      </div>
      <div className="card-grid settings-grid">
        <div className="card">
          <div className="card-header">
            <h3>Security</h3>
            <span className="hint">Lockdown and vault behavior.</span>
          </div>
          <label className="toggle">
            <input
              type="checkbox"
              checked={browserOnly}
              onChange={(e) => onToggleBrowserOnly(e.target.checked)}
            />
            Local-only keys
          </label>
          <label>
            Auto-lock (minutes)
            <input
              type="number"
              min="1"
              value={autoLockMinutes}
              onChange={(e) => setAutoLockMinutes(Number(e.target.value))}
            />
          </label>
          <p className="hint">Auto-lock clears decrypted key material from memory.</p>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>Privacy</h3>
            <span className="hint">Audit history and local data.</span>
          </div>
          <button className="ghost">Clear audit logs</button>
          <p className="hint">Removes local history only.</p>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>Account</h3>
            <span className="hint">Passwords, 2FA, and sessions.</span>
          </div>
          <p className="hint">Manage password and 2FA in the account section.</p>
          <button>Manage account</button>
        </div>
        <div className="card">
          <div className="card-header">
            <h3>Advanced</h3>
            <span className="hint">Power-user defaults.</span>
          </div>
          <label className="toggle">
            <input type="checkbox" />
            Show raw PGP blocks
          </label>
          <label className="toggle">
            <input type="checkbox" />
            ASCII armor by default
          </label>
        </div>
      </div>
    </section>
  );
};
