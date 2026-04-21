const fmt = (n) => Math.round(n).toLocaleString();

function GroupPanel({ label, group, onChange }) {
  const subtotal = (parseInt(group.people) || 0) * (parseFloat(group.calPerPerson) || 0);
  return (
    <div className="group-panel">
      <div className="group-header">{label}</div>
      <div className="field">
        <label>People</label>
        <input type="number" min="0" value={group.people} placeholder="e.g. 30"
          onChange={(e) => onChange("people", e.target.value)} />
      </div>
      <div className="field">
        <label>Cal / person / day</label>
        <input type="number" min="1" value={group.calPerPerson} placeholder="2000"
          onChange={(e) => onChange("calPerPerson", e.target.value)} />
      </div>
      {subtotal > 0 && (
        <div className="group-subtotal">{fmt(subtotal)} cal/day</div>
      )}
    </div>
  );
}

export default function MissionConfig({ cfg, onChange, onGroupChange, onSolve, onLoadExample, totalInventoryCal, loading, error }) {
  let D;
  if (cfg.useGroups) {
    const pA = parseInt(cfg.groupA.people) || 0;
    const cA = parseFloat(cfg.groupA.calPerPerson) || 0;
    const pB = parseInt(cfg.groupB.people) || 0;
    const cB = parseFloat(cfg.groupB.calPerPerson) || 0;
    D = pA * cA + pB * cB;
  } else {
    D = (parseInt(cfg.people) || 0) * (parseFloat(cfg.calPerPerson) || 0);
  }
  const upperBound = D > 0 ? Math.floor(totalInventoryCal / D) : 0;

  return (
    <div className="card">
      <div className="card-row">
        <h2>Mission Parameters</h2>
        <button className="btn-ghost" onClick={onLoadExample}>Load example</button>
      </div>

      <label className="checkbox-row" style={{ marginBottom: 16 }}>
        <input type="checkbox" checked={cfg.useGroups}
          onChange={(e) => onChange("useGroups", e.target.checked)} />
        Split into two groups
      </label>

      {!cfg.useGroups ? (
        <>
          <div className="field">
            <label>Number of people</label>
            <input type="number" min="1" value={cfg.people} placeholder="e.g. 50"
              onChange={(e) => onChange("people", e.target.value)} />
          </div>
          <div className="field">
            <label>Calories / person / day</label>
            <input type="number" min="1" value={cfg.calPerPerson} placeholder="2000"
              onChange={(e) => onChange("calPerPerson", e.target.value)} />
          </div>
        </>
      ) : (
        <div className="groups-grid">
          <GroupPanel
            label="Group A"
            group={cfg.groupA}
            onChange={(k, v) => onGroupChange("groupA", k, v)}
          />
          <GroupPanel
            label="Group B"
            group={cfg.groupB}
            onChange={(k, v) => onGroupChange("groupB", k, v)}
          />
        </div>
      )}

      {D > 0 && (
        <div className="info-box gray">
          <div><span className="dim">D = </span><strong>{fmt(D)} cal/day</strong></div>
          {totalInventoryCal > 0 && (
            <>
              <div><span className="dim">Total inventory: </span><strong>{fmt(totalInventoryCal)} cal</strong></div>
              <div><span className="dim">Upper bound (ignoring expiry): </span><strong>~{upperBound} days</strong></div>
            </>
          )}
        </div>
      )}

      {error && <p className="error">{error}</p>}
      {loading && <p className="loading">Solving...</p>}
      <button className="btn btn-solve" onClick={onSolve} disabled={loading}>
        {loading ? "Solving..." : "Optimize"}
      </button>
    </div>
  );
}
