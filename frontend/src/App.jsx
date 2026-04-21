import { useState, useEffect, useRef, useCallback } from "react";
import "./App.css";
import { optimize } from "./api";
import FoodEntryForm from "./components/FoodEntryForm";
import MissionConfig from "./components/MissionConfig";
import Inventory     from "./components/Inventory";
import Results       from "./components/Results";

const COLORS = ["#2563eb","#16a34a","#dc2626","#9333ea","#ea580c","#0891b2","#ca8a04","#db2777"];

const EXAMPLE_ITEMS = [
  { id:1, name:"Fresh Produce",   quantity:500000, calPerUnit:1, lastDay:1,    neverExpires:false, totalCal:500000 },
  { id:2, name:"Bread & Dairy",   quantity:150000, calPerUnit:1, lastDay:3,    neverExpires:false, totalCal:150000 },
  { id:3, name:"Canned Meals",    quantity:350000, calPerUnit:1, lastDay:7,    neverExpires:false, totalCal:350000 },
  { id:4, name:"Dry Goods",       quantity:500000, calPerUnit:1, lastDay:null, neverExpires:true,  totalCal:500000 },
];
const EXAMPLE_CFG = {
  people: "50", calPerPerson: "2000", H: "60",
  useGroups: false,
  groupA: { people: "30", calPerPerson: "2000" },
  groupB: { people: "20", calPerPerson: "1500" },
};

// Ration scenarios to solve in parallel
const RATIONS = [
  { label: "Full (100%)", multiplier: 1.0 },
  { label: "3/4 Ration",  multiplier: 0.75 },
  { label: "2/3 Ration",  multiplier: 0.667 },
  { label: "1/2 Ration",  multiplier: 0.5 },
];

function buildBuckets(items) {
  const map = {};
  items.forEach((item) => {
    const key = item.neverExpires ? "null" : String(item.lastDay);
    if (!map[key]) map[key] = {
      calories: 0,
      last_day: item.neverExpires ? null : item.lastDay,
      items:    [],
    };
    map[key].calories += item.totalCal;
    map[key].items.push(item.name);
  });
  return Object.values(map)
    .sort((a, b) => {
      if (a.last_day === null) return 1;
      if (b.last_day === null) return -1;
      return a.last_day - b.last_day;
    })
    .map((b, i) => ({ ...b, name: b.items.join(" + "), color: COLORS[i % COLORS.length] }));
}

const MAIN_TABS = ["Food Input", "Parameters", "Output"];

export default function App() {
  const [tab,        setTab]        = useState(0);
  const [items,      setItems]      = useState([]);
  const [cfg,        setCfg]        = useState({
    people: "", calPerPerson: "2000", H: "365",
    useGroups: false,
    groupA: { people: "", calPerPerson: "2000" },
    groupB: { people: "", calPerPerson: "2000" },
  });
  const [rationResults, setRationResults] = useState(null); // array of 4 results
  const [buckets,    setBuckets]    = useState([]);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [autoStatus, setAutoStatus] = useState("");

  const hasResult   = useRef(false);
  const debounceRef = useRef(null);

  const runSolve = useCallback(async (currentItems, currentCfg, silent = false) => {
    const H = parseInt(currentCfg.H) || 365;

    let totalCalPerDay;
    if (currentCfg.useGroups) {
      const pA = parseInt(currentCfg.groupA.people) || 0;
      const cA = parseFloat(currentCfg.groupA.calPerPerson) || 0;
      const pB = parseInt(currentCfg.groupB.people) || 0;
      const cB = parseFloat(currentCfg.groupB.calPerPerson) || 0;
      totalCalPerDay = pA * cA + pB * cB;
      if (!currentItems.length || totalCalPerDay <= 0) return;
    } else {
      const p = parseInt(currentCfg.people);
      const c = parseFloat(currentCfg.calPerPerson);
      if (!currentItems.length || !p || p <= 0 || !c || c <= 0) return;
      totalCalPerDay = p * c;
    }

    const coloredBuckets = buildBuckets(currentItems);
    const bucketPayload  = coloredBuckets.map(({ name, calories, last_day }) => ({ name, calories, last_day }));

    if (!silent) { setLoading(true); setError(""); }
    else setAutoStatus("Updating...");

    // Build groupInfo to carry into results for display
    const groupInfo = currentCfg.useGroups
      ? { useGroups: true, groupA: { ...currentCfg.groupA }, groupB: { ...currentCfg.groupB } }
      : { useGroups: false, people: parseInt(currentCfg.people), calPerPerson: parseFloat(currentCfg.calPerPerson) };

    try {
      // Run all 4 ration scenarios in parallel
      const results = await Promise.all(
        RATIONS.map((r) =>
          optimize({
            buckets:             bucketPayload,
            people:              1,
            calories_per_person: totalCalPerDay * r.multiplier,
            H,
            enforce_no_waste:    true,
          }).then((data) => {
            const D          = totalCalPerDay * r.multiplier;
            const totalCal   = coloredBuckets.reduce((s, b) => s + b.calories, 0);
            const totalWasted= Object.values(data.total_waste_by_bucket).reduce((s, v) => s + v, 0);
            return { ...data, D, totalCal, totalWasted, label: r.label, multiplier: r.multiplier, groupInfo };
          })
        )
      );

      setBuckets(coloredBuckets);
      setRationResults(results);
      hasResult.current = true;
      if (!silent) setTab(2);
      if (silent) setAutoStatus("Results updated");
    } catch (err) {
      if (!silent) setError(err.message || "Solver error. Is the backend running on port 8000?");
    } finally {
      if (!silent) setLoading(false);
      if (silent) setTimeout(() => setAutoStatus(""), 2000);
    }
  }, []);

  useEffect(() => {
    if (!hasResult.current) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSolve(items, cfg, true), 600);
    return () => clearTimeout(debounceRef.current);
  }, [items, cfg, runSolve]);

  const handleAdd    = (item)    => setItems((p) => [...p, { ...item, id: Date.now() }]);
  const handleEdit   = (updated) => setItems((p) => p.map((f) => f.id === updated.id ? updated : f));
  const handleRemove = (id)      => setItems((p) => p.filter((f) => f.id !== id));

  const handleLoadExample = () => {
    setItems(EXAMPLE_ITEMS);
    setCfg(EXAMPLE_CFG);
    setRationResults(null);
    hasResult.current = false;
    setError("");
    setAutoStatus("");
  };

  const handleSolve = () => {
    if (!items.length) return setError("Add at least one food item.");
    if (cfg.useGroups) {
      const pA = parseInt(cfg.groupA.people) || 0;
      const cA = parseFloat(cfg.groupA.calPerPerson) || 0;
      const pB = parseInt(cfg.groupB.people) || 0;
      const cB = parseFloat(cfg.groupB.calPerPerson) || 0;
      if (pA * cA + pB * cB <= 0) return setError("At least one group needs people and calories.");
      if ((pA > 0 && cA <= 0) || (pB > 0 && cB <= 0)) return setError("Enter valid calories for each active group.");
    } else {
      const p = parseInt(cfg.people), c = parseFloat(cfg.calPerPerson);
      if (!p || p <= 0 || !c || c <= 0) return setError("Enter a valid people count and daily calories.");
    }
    runSolve(items, cfg, false);
  };

  const handleGroupChange = (group, k, v) =>
    setCfg((p) => ({ ...p, [group]: { ...p[group], [k]: v } }));

  const totalInventoryCal = items.reduce((s, f) => s + f.totalCal, 0);
  const fullResult = rationResults ? rationResults[0] : null;

  return (
    <div className="app">
      <h1>Food Allocation Optimizer</h1>
      <p>Maximize consecutive days survived </p>

      <div className="main-tabs">
        {MAIN_TABS.map((label, i) => (
          <button key={label} className={`main-tab${tab === i ? " active" : ""}`} onClick={() => setTab(i)}>
            {label}
            {i === 0 && items.length > 0 && <span className="tab-badge">{items.length}</span>}
            {i === 2 && fullResult && <span className="tab-badge green">{fullResult.max_days}d</span>}
          </button>
        ))}
        {autoStatus && <span className="auto-status">{autoStatus}</span>}
      </div>

      <div className="tab-panel">

        {tab === 0 && (
          <>
            <div className="tab-toolbar">
              <button className="btn-ghost" onClick={handleLoadExample}>Load example</button>
            </div>
            <FoodEntryForm onAdd={handleAdd} />
            <Inventory items={items} onRemove={handleRemove} onEdit={handleEdit} />
            {!items.length && (
              <div className="empty-state">
                <p>Add food items to get started</p>
                <p className="dim">Or load the example to try a pre-built scenario</p>
              </div>
            )}
            {items.length > 0 && (
              <div className="tab-nav">
                <button className="btn btn-next" onClick={() => setTab(1)}>Next: Set Parameters →</button>
              </div>
            )}
          </>
        )}

        {tab === 1 && (
          <>
            <MissionConfig
              cfg={cfg}
              onChange={(k, v) => setCfg((p) => ({ ...p, [k]: v }))}
              onGroupChange={handleGroupChange}
              onSolve={handleSolve}
              onLoadExample={handleLoadExample}
              totalInventoryCal={totalInventoryCal}
              loading={loading}
              error={error}
            />
            {rationResults && !loading && (
              <div className="tab-nav">
                <button className="btn btn-next" onClick={() => setTab(2)}>View Results →</button>
              </div>
            )}
          </>
        )}

        {tab === 2 && (
          rationResults
            ? <Results rationResults={rationResults} buckets={buckets} />
            : <div className="empty-state">
                <p>No results yet</p>
                <p className="dim">Go to Parameters and hit Optimize</p>
              </div>
        )}

      </div>
    </div>
  );
}