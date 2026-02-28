import { useState } from "react";

const EMPTY = { name: "", quantity: "", calPerUnit: "", lastDay: "", neverExpires: false };

export default function FoodEntryForm({ onAdd }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = () => {
    const { name, quantity, calPerUnit, lastDay, neverExpires } = form;
    if (!name || !quantity || !calPerUnit || (!neverExpires && !lastDay))
      return setError("All fields are required.");

    const q = parseFloat(quantity), c = parseFloat(calPerUnit);
    const d = neverExpires ? null : parseInt(lastDay);
    if (isNaN(q) || q <= 0 || isNaN(c) || c <= 0)
      return setError("Quantity and calories must be positive.");
    if (!neverExpires && (isNaN(d) || d <= 0))
      return setError("Expiry day must be a positive integer.");

    setError("");
    onAdd({ name, quantity: q, calPerUnit: c, lastDay: d, neverExpires, totalCal: q * c });
    setForm(EMPTY);
  };

  const preview = form.quantity && form.calPerUnit
    ? parseFloat(form.quantity) * parseFloat(form.calPerUnit)
    : null;

  return (
    <div className="card">
      <h2>Add Food Item</h2>

      <div className="field">
        <label>Food name</label>
        <input value={form.name} placeholder="e.g. MRE Pack A"
          onChange={(e) => set("name", e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()} />
      </div>

      <div className="grid-2-fields">
        <div className="field">
          <label>Quantity (units)</label>
          <input type="number" min="1" value={form.quantity} placeholder="50"
            onChange={(e) => set("quantity", e.target.value)} />
        </div>
        <div className="field">
          <label>Calories / unit</label>
          <input type="number" min="1" value={form.calPerUnit} placeholder="1000"
            onChange={(e) => set("calPerUnit", e.target.value)} />
        </div>
      </div>

      <label className="checkbox-row">
        <input type="checkbox" checked={form.neverExpires}
          onChange={(e) => set("neverExpires", e.target.checked)} />
        Never expires
      </label>

      {!form.neverExpires && (
        <div className="field">
          <label>Enter last day of expiration</label>
          <input type="number" min="1" value={form.lastDay} placeholder="e.g. 7"
            onChange={(e) => set("lastDay", e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && submit()} />
        </div>
      )}

      {preview !== null && (
        <div className="info-box">
          Bucket total: <strong>{Math.round(preview).toLocaleString()}</strong> cal
          &nbsp;· last_day = {form.neverExpires ? "None" : form.lastDay || "?"}
        </div>
      )}

      {error && <p className="error">{error}</p>}
      <button className="btn btn-blue" onClick={submit}>Add Item</button>
    </div>
  );
}