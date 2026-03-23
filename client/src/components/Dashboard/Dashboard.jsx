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
    <section className="panel">
      <div className="panel-header">
        <h2>Dashboard</h2>
        <span className="muted">Workspace status</span>
      </div>
      {keyCount === 0 && (
        <div className="card">
          <h3>You don’t have any keys yet</h3>
          <p className="hint">Generate your first key or import one from an existing tool.</p>
          <div className="actions">
            <button onClick={() => onQuickAction("keys")}>Generate key</button>
            <button className="ghost" onClick={() => onQuickAction("keys")}>Import key</button>
            <button className="ghost">Learn how</button>
          </div>
        </div>
      )}
      <div className="grid">
        <div className="card">
          <h3>Key status</h3>
          <p className="metric">{keyCount}</p>
          <span className="hint">
            Active keys{expiringCount ? ` · ${expiringCount} expiring soon` : ""}
          </span>
        </div>
        <div className="card">
          <h3>Security</h3>
          <p className={`badge ${locked ? "warning" : "success"}`}>
            {locked ? "Keys locked" : "Keys unlocked"}
          </p>
          <span className="hint">Last activity: {lastActivity || "—"}</span>
        </div>
        <div className="card">
          <h3>Mode</h3>
          <p className="metric">{browserOnly ? "Local-only" : "Server sync"}</p>
          <span className="hint">Audit entries: {auditCount}</span>
        </div>
      </div>
      <div className="card">
        <h3>Quick actions</h3>
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
