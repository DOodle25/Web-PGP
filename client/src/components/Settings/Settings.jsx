export const Settings = ({
  browserOnly,
  onToggleBrowserOnly,
  autoLockMinutes,
  setAutoLockMinutes,
}) => {
  return (
    <section className="panel">
      <h2>Settings</h2>
      <div className="grid">
        <div className="card">
          <h3>Security</h3>
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
          <p className="hint">Keys lock automatically after inactivity.</p>
          <p className="hint">
            Auto-lock clears decrypted key material from memory.
          </p>
        </div>
        <div className="card">
          <h3>Privacy</h3>
          <button className="ghost">Clear audit logs</button>
          <p className="hint">Removes local history only.</p>
        </div>
        <div className="card">
          <h3>Account</h3>
          <p className="hint">
            Manage password and 2FA in the account section.
          </p>
          <button>Manage account</button>
        </div>
        <div className="card">
          <h3>Advanced</h3>
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
