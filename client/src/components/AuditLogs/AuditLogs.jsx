export const AuditLogs = ({ entries = [] }) => {
  return (
    <section className="panel page">
      <div className="page-header">
        <div>
          <h2>Audit Logs</h2>
          <p className="page-subtitle">
            Latest 100 events from your workspace.
          </p>
        </div>
      </div>
      <div className="card">
        {entries.length === 0 ? (
          <p className="hint">No activity recorded yet.</p>
        ) : (
          <div className="log-list">
            {entries.map((entry) => (
              <div key={entry._id || entry.id} className="log-item">
                <div>
                  <strong>{entry.action}</strong>
                  <span className="log-meta">
                    {new Date(entry.createdAt).toLocaleString()}
                  </span>
                </div>
                <span className="badge muted">{entry.ip || "local"}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
