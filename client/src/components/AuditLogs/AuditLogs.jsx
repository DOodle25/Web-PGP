export const AuditLogs = ({ entries = [] }) => {
  return (
    <section className="panel">
      <div className="panel-header">
        <h2>Audit Logs</h2>
        <span className="muted">Latest 100 entries</span>
      </div>
      <div className="card">
        {entries.length === 0 ? (
          <p className="hint">No activity recorded yet.</p>
        ) : (
          <ul className="list">
            {entries.map((entry) => (
              <li key={entry._id || entry.id} className="list-item">
                <div>
                  <strong>{entry.action}</strong>
                  <span>{new Date(entry.createdAt).toLocaleString()}</span>
                </div>
                <span className="badge muted">{entry.ip || "local"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};
