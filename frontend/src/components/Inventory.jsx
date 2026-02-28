import { useState } from "react";

const expiryColor = (item) => {
  if (item.neverExpires || item.lastDay === null) return "#2563eb";
  if (item.lastDay <= 2) return "#dc2626";
  if (item.lastDay <= 5) return "#ea580c";
  return "#16a34a";
};

function EditableCell({ value, type = "text", min, onCommit, format }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  const start = () => {
    setDraft(String(value));
    setEditing(true);
  };

  const commit = () => {
    const parsed = type === "number" ? parseFloat(draft) : draft.trim();
    if (type === "number" && (isNaN(parsed) || parsed <= 0)) {
      setEditing(false);
      return;
    }
    if (type === "text" && !draft.trim()) {
      setEditing(false);
      return;
    }
    onCommit(parsed);
    setEditing(false);
  };

  if (editing) {
    return (
      <input
        className="cell-input"
        type={type}
        min={min}
        value={draft}
        autoFocus
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") commit();
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  return (
    <span className="editable-cell" onClick={start} title="Click to edit">
      {format ? format(value) : value}
    </span>
  );
}

export default function Inventory({ items, onRemove, onEdit }) {
  if (!items.length) return null;
  const totalCal = items.reduce((s, f) => s + f.totalCal, 0);

  const update = (item, field, value) => {
    const updated = { ...item, [field]: value };
    if (field === "quantity" || field === "calPerUnit") {
      updated.totalCal = updated.quantity * updated.calPerUnit;
    }
    if (field === "lastDay") {
      updated.neverExpires = false;
    }
    onEdit(updated);
  };

  return (
    <div className="card">
      <h2>
        Inventory — {items.length} item{items.length !== 1 ? "s" : ""}
        &nbsp;·&nbsp;{Math.round(totalCal).toLocaleString()} cal total
      </h2>
      <p className="edit-hint">Click any value to edit it</p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Quantity</th><th>Cal / unit</th>
              <th>Total cal</th><th>last_day</th><th></th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const color = expiryColor(item);
              return (
                <tr key={item.id} className="inventory-row">
                  <td>
                    <EditableCell value={item.name}
                      onCommit={(v) => update(item, "name", v)} />
                  </td>
                  <td>
                    <EditableCell value={item.quantity} type="number" min="1"
                      format={(v) => v.toLocaleString()}
                      onCommit={(v) => update(item, "quantity", v)} />
                  </td>
                  <td>
                    <EditableCell value={item.calPerUnit} type="number" min="1"
                      format={(v) => v.toLocaleString()}
                      onCommit={(v) => update(item, "calPerUnit", v)} />
                  </td>
                  <td style={{ fontWeight: 600 }}>
                    {Math.round(item.totalCal).toLocaleString()}
                  </td>
                  <td>
                    <span className="tag"
                      style={{ background: color + "18", color, border: `1px solid ${color}44`, cursor: "pointer" }}
                      title="Click to edit expiry day"
                      onClick={() => {
                        const d = prompt(
                          "Enter expiry day (leave blank for never expires):",
                          item.neverExpires ? "" : String(item.lastDay)
                        );
                        if (d === null) return; // cancelled
                        if (d.trim() === "") {
                          onEdit({ ...item, lastDay: null, neverExpires: true });
                        } else {
                          const n = parseInt(d);
                          if (!isNaN(n) && n > 0)
                            onEdit({ ...item, lastDay: n, neverExpires: false });
                        }
                      }}>
                      {item.neverExpires || item.lastDay === null ? "None" : `Day ${item.lastDay}`}
                    </span>
                  </td>
                  <td>
                    <button className="btn-remove" onClick={() => onRemove(item.id)}>Remove</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}