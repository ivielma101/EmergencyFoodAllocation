export default function MissionConfig({ cfg, onChange, onSolve, onLoadExample, totalInventoryCal, loading, error }) {
    const D = parseInt(cfg.people || 0) * parseFloat(cfg.calPerPerson || 0);
    const upperBound = D > 0 ? Math.floor(totalInventoryCal / D) : 0;
  
    return (
      <div className="card">
        <div className="card-row">
          <h2>Mission Parameters</h2>
          <button className="btn-ghost" onClick={onLoadExample}>Load example</button>
        </div>
  
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
        <div className="field">
          <label>Horizon H (max days to search)</label>
          <input type="number" min="1" value={cfg.H} placeholder="365"
            onChange={(e) => onChange("H", e.target.value)} />
        </div>
  
        {cfg.people && cfg.calPerPerson && (
          <div className="info-box gray">
            <div><span className="dim">D = </span><strong>{Math.round(D).toLocaleString()} cal/day</strong></div>
            {totalInventoryCal > 0 && <>
              <div><span className="dim">Total inventory: </span><strong>{Math.round(totalInventoryCal).toLocaleString()} cal</strong></div>
              <div><span className="dim">Upper bound (ignoring expiry): </span><strong>~{upperBound} days</strong></div>
            </>}
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