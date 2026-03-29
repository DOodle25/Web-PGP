export const Dashboard = ({
  keyCount,
  auditCount,
  browserOnly,
  onQuickAction,
  locked,
  lastActivity,
  expiringCount,
}) => {
  return (
    <section className="panel page">
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p className="page-subtitle">
            Overview of your vault, keys, and recent activity.
          </p>
        </div>
        <div className="toolbar">
          <button className="ghost" onClick={() => onQuickAction("keys")}>
            Manage keys
          </button>
          <button onClick={() => onQuickAction("encrypt")}>Encrypt text</button>
        </div>
      </div>
      {keyCount === 0 && (
        <div className="card callout">
          <h3>You do not have any keys yet</h3>
          <p className="hint">
            Generate your first key or import one from another PGP tool.
          </p>
          <div className="actions">
            <button onClick={() => onQuickAction("keys")}>Generate key</button>
            <button className="ghost" onClick={() => onQuickAction("keys")}>
              Import key
            </button>
          </div>
        </div>
      )}
      <div className="card-grid stats-grid">
        <div className="card stat-card">
          <h3>Key status</h3>
          <p className="stat-value">{keyCount}</p>
          <span className="stat-label">
            Active keys{expiringCount ? ` · ${expiringCount} expiring soon` : ""}
          </span>
        </div>
        <div className="card stat-card">
          <h3>Security</h3>
          <span className={`status-pill ${locked ? "warning" : "success"}`}>
            {locked ? "Vault locked" : "Vault unlocked"}
          </span>
          <span className="stat-label">
            Last activity: {lastActivity || "—"}
          </span>
        </div>
        <div className="card stat-card">
          <h3>Mode</h3>
          <p className="stat-value">{browserOnly ? "Local-only" : "Server sync"}</p>
          <span className="stat-label">Audit entries: {auditCount}</span>
        </div>
      </div>
      <div className="card">
        <div className="card-header">
          <h3>Quick actions</h3>
          <span className="hint">Jump straight into common tasks.</span>
        </div>
        <div className="actions">
          <button onClick={() => onQuickAction("encrypt")}>Encrypt text</button>
          <button className="ghost" onClick={() => onQuickAction("files")}>
            Encrypt file
          </button>
          <button className="ghost" onClick={() => onQuickAction("keys")}>
            Manage keys
          </button>
        </div>
      </div>
    </section>
  );
};
