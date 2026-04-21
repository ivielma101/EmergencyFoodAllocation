import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const fmt        = (n) => Math.round(n).toLocaleString();
const chartMargin  = { top: 4, right: 10, left: 10, bottom: 4 };
const axisTick     = { fill: "#64748b", fontSize: 11 };
const tooltipStyle = { border: "1px solid #e2e8f0", borderRadius: 6, fontSize: 12 };
const kFormatter   = (v) => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v;

function RationCards({ rationResults, activeIdx, onSelect }) {
  return (
    <div className="ration-cards">
      {rationResults.map((r, i) => (
        <button
          key={r.label}
          className={`ration-card${activeIdx === i ? " active" : ""}`}
          onClick={() => onSelect(i)}
        >
          <div className="ration-label">{r.label}</div>
          <div className="ration-days">{r.max_days}</div>
          <div className="ration-sub">days survived</div>
        </button>
      ))}
    </div>
  );
}

// ── Daily plan accordion ──────────────────────────────────────────────
function DayRow({ row, buckets }) {
  const [open, setOpen] = useState(false);
  const breakdown = buckets.filter((b) => (row[b.name] || 0) > 0.01);

  return (
    <>
      <div className={`day-row${open ? " open" : ""}`} onClick={() => setOpen((p) => !p)}>
        <span className="day-chevron">{open ? "▾" : "▸"}</span>
        <span className="day-label">Day {row.day}</span>
        <span className="day-total">— {fmt(row.total)} cal</span>
      </div>
      {open && (
        <div className="day-detail">
          {breakdown.length === 0 && <span className="dim">No consumption</span>}
          {breakdown.map((b) => (
            <div key={b.name} className="day-detail-row">
              <span className="day-detail-dot" style={{ background: b.color }} />
              <span className="day-detail-name">{b.name}</span>
              <span className="day-detail-cal">{fmt(row[b.name])} cal</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function DailyPlan({ result, buckets }) {
  const survivedDays = result.schedule.filter((r) => r.survived === 1);
  const gi = result.groupInfo;

  // Build expiry warning map: day → [bucket warnings]
  const expiryWarnings = {};
  buckets.forEach((b) => {
    if (b.last_day === null) return;
    const waste = result.total_waste_by_bucket[b.name] || 0;
    if (!expiryWarnings[b.last_day]) expiryWarnings[b.last_day] = [];
    expiryWarnings[b.last_day].push({ ...b, waste });
  });

  return (
    <div className="daily-plan">
      <div className="daily-plan-header">
        <div>Daily draw: <strong>{fmt(result.D)} cal/day</strong></div>
        {gi?.useGroups ? (
          <div className="daily-plan-groups">
            <span>
              <span className="dim">Group A: </span>
              <strong>{gi.groupA.people}</strong> × {fmt((parseFloat(gi.groupA.calPerPerson) || 0) * result.multiplier)} cal
            </span>
            <span className="dim"> · </span>
            <span>
              <span className="dim">Group B: </span>
              <strong>{gi.groupB.people}</strong> × {fmt((parseFloat(gi.groupB.calPerPerson) || 0) * result.multiplier)} cal
            </span>
          </div>
        ) : gi?.people > 0 && (
          <div className="daily-plan-groups">
            <span className="dim">{gi.people} people × {fmt((gi.calPerPerson || 0) * result.multiplier)} cal/person</span>
          </div>
        )}
      </div>
      <div className="day-list">
        {survivedDays.map((row) => (
          <div key={row.day}>
            <DayRow row={row} buckets={buckets} />
            {expiryWarnings[row.day] && expiryWarnings[row.day].map((b) => (
              <div key={b.name} className="expiry-warning">
                <span className="expiry-icon">⚠</span>
                <span>
                  <strong style={{ color: b.color }}>{b.name}</strong> expires today
                  {b.waste > 0.5
                    ? ` — ${fmt(b.waste)} cal wasted (${Math.round((b.waste / b.calories) * 100)}% of stock)`
                    : " — fully consumed, zero waste"}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Waste summary ─────────────────────────────────────────────────────
function WasteSummary({ result, buckets }) {
  const wasted = buckets.filter((b) => (result.total_waste_by_bucket[b.name] || 0) > 0.5);
  if (!wasted.length) {
    return (
      <div className="card">
        <h2>Waste Summary</h2>
        <div className="zero-waste" style={{ padding: "20px 0" }}>Zero waste — every calorie was consumed</div>
      </div>
    );
  }
  return (
    <div className="card">
      <h2>Waste Summary</h2>
      <table>
        <thead>
          <tr><th>Item</th><th>Expires</th><th>Stock</th><th>Consumed</th><th>Wasted</th><th>Waste %</th></tr>
        </thead>
        <tbody>
          {wasted.map((b) => {
            const waste    = result.total_waste_by_bucket[b.name] || 0;
            const consumed = b.calories - waste;
            const pct      = Math.round((waste / b.calories) * 100);
            return (
              <tr key={b.name}>
                <td>
                  <span style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ width:10, height:10, borderRadius:"50%", background:b.color, flexShrink:0 }} />
                    <strong>{b.name}</strong>
                  </span>
                  <div style={{ fontSize:11, color:"#94a3b8", marginTop:2 }}>{b.items.join(", ")}</div>
                </td>
                <td style={{ color:"#ea580c", fontWeight:600 }}>Day {b.last_day}</td>
                <td>{fmt(b.calories)} cal</td>
                <td style={{ color:"#16a34a", fontWeight:500 }}>{fmt(consumed)} cal</td>
                <td style={{ color:"#dc2626", fontWeight:700 }}>{fmt(waste)} cal</td>
                <td>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <div style={{ flex:1, background:"#fee2e2", borderRadius:4, height:6 }}>
                      <div style={{ width:`${pct}%`, background:"#dc2626", height:"100%", borderRadius:4 }} />
                    </div>
                    <span style={{ color:"#dc2626", fontWeight:600, fontSize:12 }}>{pct}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function Recommendations({ result, buckets }) {
  const D = result.D;
  const wasted = buckets.filter((b) => b.last_day !== null && (result.total_waste_by_bucket[b.name] || 0) > 0.5);
  const extraDays = result.totalWasted > 0 ? Math.floor(result.totalWasted / D) : 0;
  const recs = [];

  wasted.forEach((b) => {
    const waste    = result.total_waste_by_bucket[b.name] || 0;
    const consumed = b.calories - waste;
    const actualPerDay = Math.round(consumed / b.last_day);
    const neededPerDay = Math.ceil(b.calories / b.last_day);
    recs.push({
      type: "waste", color: b.color,
      title: `Increase daily use of "${b.name}" before day ${b.last_day}`,
      detail: `Currently using ~${fmt(actualPerDay)} cal/day but ${fmt(neededPerDay)} cal/day is available across ${b.last_day} days. Consuming all ${fmt(b.calories)} cal before expiry eliminates this waste.`,
    });
  });

  if (extraDays > 0) recs.push({
    type: "gain", color: "#16a34a",
    title: `Eliminating waste could add ~${extraDays} day${extraDays !== 1 ? "s" : ""}`,
    detail: `The ${fmt(result.totalWasted)} cal wasted could sustain the group for ${extraDays} more day${extraDays !== 1 ? "s" : ""}, potentially reaching ${result.max_days + extraDays} days total.`,
  });

  const expiringEarly = buckets.filter((b) => b.last_day !== null && b.last_day <= 3).sort((a,b) => a.last_day - b.last_day);
  if (expiringEarly.length) recs.push({
    type: "priority", color: "#ea580c",
    title: `Prioritize items expiring within the first ${expiringEarly[expiringEarly.length-1].last_day} days`,
    detail: expiringEarly.map((b) => `"${b.name}" — ${fmt(b.calories)} cal, expires day ${b.last_day}`).join(" · "),
  });

  wasted.forEach((b) => {
    const waste = result.total_waste_by_bucket[b.name] || 0;
    if ((waste / b.calories) > 0.5) recs.push({
      type: "reduce", color: "#9333ea",
      title: `Consider reducing "${b.name}" stock by ~${Math.round((waste/b.calories)*100)}%`,
      detail: `Over half this item expires unused. Replacing ~${fmt(waste)} cal with non-expiring food achieves the same survival days with zero waste.`,
    });
  });

  if (!recs.length) return (
    <div className="card">
      <h2>Recommendations</h2>
      <div className="zero-waste" style={{ padding:"20px 0" }}>Allocation is optimal — no adjustments needed</div>
    </div>
  );

  const bg = { waste:"#fff7ed", gain:"#f0fdf4", priority:"#fffbeb", reduce:"#faf5ff" };
  return (
    <div className="card">
      <h2>Recommendations</h2>
      <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
        {recs.map((r, i) => (
          <div key={i} className="rec-item" style={{ borderLeft:`4px solid ${r.color}`, background:bg[r.type] }}>
            <div className="rec-title" style={{ color:r.color }}>{r.title}</div>
            <div className="rec-detail">{r.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Consumption chart ─────────────────────────────────────────────────
function ConsumptionChart({ result, buckets }) {
  const data = result.schedule
    .filter((r) => r.survived === 1)
    .map((row) => {
      const obj = { day: `D${row.day}` };
      buckets.forEach((b) => { if ((row[b.name] || 0) > 0.01) obj[b.name] = Math.round(row[b.name]); });
      return obj;
    });
  return (
    <div style={{ height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={chartMargin}>
          <XAxis dataKey="day" tick={axisTick} axisLine={{ stroke:"#e2e8f0" }} tickLine={false} />
          <YAxis tick={axisTick} axisLine={false} tickLine={false} tickFormatter={kFormatter} />
          <Tooltip formatter={(v, n) => [v.toLocaleString() + " cal", n]} contentStyle={tooltipStyle} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          {buckets.map((b) => <Bar key={b.name} dataKey={b.name} stackId="a" fill={b.color} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const TABS = ["Daily Plan", "Consumption Chart", "Waste & Recommendations"];

export default function Results({ rationResults, buckets }) {
  const [activeRation, setActiveRation] = useState(0);
  const [tab, setTab]                   = useState(0);

  const result = rationResults[activeRation];

  return (
    <>
      {/* Ration scenario cards */}
      <RationCards rationResults={rationResults} activeIdx={activeRation} onSelect={setActiveRation} />

      {/* KPI strip for active ration */}
      <div className="grid-4" style={{ marginBottom: 20 }}>
        {[
          { label: "Days survived",         value: result.max_days,                  color: result.max_days > 0 ? "#1e40af" : "#dc2626", lg: true },
          { label: "Daily draw (D)",         value: fmt(result.D) + " cal",           color: "#0f172a" },
          { label: "Total calories wasted",  value: fmt(result.totalWasted) + " cal", color: result.totalWasted > 0 ? "#ea580c" : "#16a34a" },
          { label: "Utilization",            value: result.totalCal > 0 ? Math.round((1 - result.totalWasted / result.totalCal) * 100) + "%" : "—", color: "#0f172a" },
        ].map((k) => (
          <div key={k.label} className="card kpi">
            <div className={`kpi-val${k.lg ? " lg" : ""}`} style={{ color: k.color }}>{k.value}</div>
            <div className="kpi-lbl">{k.label}</div>
          </div>
        ))}
      </div>

      {/* Tabbed detail */}
      <div className="card">
        <div className="tabs">
          {TABS.map((label, i) => (
            <button key={label} className={`tab${tab === i ? " active" : ""}`} onClick={() => setTab(i)}>
              {label}
            </button>
          ))}
        </div>

        {tab === 0 && <DailyPlan result={result} buckets={buckets} />}
        {tab === 1 && <ConsumptionChart result={result} buckets={buckets} />}
        {tab === 2 && (
          <>
            <WasteSummary result={result} buckets={buckets} />
            <Recommendations result={result} buckets={buckets} />
          </>
        )}
      </div>
    </>
  );
}