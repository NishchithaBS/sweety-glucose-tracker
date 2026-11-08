import { useEffect, useMemo, useState } from "react";
import { api } from "./api.js";

const SLOTS = ["Morning (fasting)", "After breakfast", "After lunch", "After dinner"];
const today = () => new Date().toLocaleDateString("en-CA");
const emptyForm = () => ({ date: today(), slot: SLOTS[0], value: "" });

function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await api(`/auth/${mode}`, {
        method: "POST",
        body: JSON.stringify(form)
      });
      onLogin(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return <main className="auth-wrap">
    <section className="auth-card">
      <div className="brand-mark">S</div>
      <p className="eyebrow">YOUR HEALTH, ONE DAY AT A TIME</p>
      <h1>Welcome to Sweety</h1>
      <p className="muted">A simple place to track your blood glucose readings.</p>
      <div className="tabs">
        <button className={mode === "login" ? "tab active" : "tab"} onClick={() => { setMode("login"); setError(""); }}>Log in</button>
        <button className={mode === "register" ? "tab active" : "tab"} onClick={() => { setMode("register"); setError(""); }}>Create account</button>
      </div>
      <form onSubmit={submit} className="form-stack">
        {mode === "register" && <label>Full name<input required maxLength="100" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Your name" /></label>}
        <label>Email address<input required type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" /></label>
        <label>Password<input required minLength="8" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="At least 8 characters" /></label>
        {error && <p className="error">{error}</p>}
        <button className="primary full" disabled={busy}>{busy ? "Please wait..." : mode === "login" ? "Log in" : "Create account"}</button>
      </form>
      <p className="tiny muted">Your readings are private to your account.</p>
    </section>
  </main>;
}

function Stat({ label, value, suffix = "" }) {
  return <div className="stat"><span>{label}</span><strong>{value ?? "—"}{value !== null && value !== undefined ? suffix : ""}</strong></div>;
}

function ReportCard({ title, range, data }) {
  return <section className="panel report-card">
    <div><h3>{title}</h3><p className="muted small">{range}</p></div>
    <div className="stats-grid">
      <Stat label="Highest" value={data.highest} suffix={data.highest == null ? "" : " mg/dl"} />
      <Stat label="Lowest" value={data.lowest} suffix={data.lowest == null ? "" : " mg/dl"} />
      <Stat label="Average" value={data.average} suffix={data.average == null ? "" : " mg/dl"} />
      <Stat label="Readings" value={data.count} />
    </div>
  </section>;
}

export default function App() {
  const [session, setSession] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sweety_session") || "null"); } catch { return null; }
  });
  const [readings, setReadings] = useState([]);
  const [report, setReport] = useState(null);
  const [selectedDate, setSelectedDate] = useState(today());
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  const token = session?.token;
  const selectedLabel = useMemo(() => new Date(`${selectedDate}T00:00:00`).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric"
  }), [selectedDate]);

  function login(result) {
    localStorage.setItem("sweety_session", JSON.stringify(result));
    setSession(result);
  }

  function logout() {
    localStorage.removeItem("sweety_session");
    setSession(null);
    setReadings([]);
    setReport(null);
  }

  async function loadData() {
    if (!token) return;
    setLoading(true);
    try {
      const [readingData, reportData] = await Promise.all([
        api("/readings", { token }),
        api(`/reports?date=${selectedDate}`, { token })
      ]);
      setReadings(readingData.readings);
      setReport(reportData);
      setError("");
    } catch (err) {
      setError(err.message);
      if (err.message.toLowerCase().includes("session")) logout();
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, [token, selectedDate]);

  async function saveReading(e) {
    e.preventDefault();
    setError("");
    setNotice("");
    try {
      const path = editingId ? `/readings/${editingId}` : "/readings";
      await api(path, {
        token,
        method: editingId ? "PUT" : "POST",
        body: JSON.stringify({ ...form, value: Number(form.value) })
      });
      setNotice(editingId ? "Reading updated successfully." : "Reading saved successfully.");
      setForm(emptyForm());
      setEditingId(null);
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  function editReading(reading) {
    setEditingId(reading.id);
    setForm({ date: reading.date, slot: reading.slot, value: String(reading.value) });
    window.scrollTo({ top: 0, behavior: "smooth" });
    setError("");
    setNotice("");
  }

  async function deleteReading(id) {
    if (!window.confirm("Delete this reading?")) return;
    try {
      await api(`/readings/${id}`, { token, method: "DELETE" });
      setNotice("Reading deleted.");
      await loadData();
    } catch (err) { setError(err.message); }
  }

  if (!session) return <AuthScreen onLogin={login} />;

  return <div className="app-shell">
    <header className="topbar">
      <div className="brand"><span className="brand-mark small-mark">S</span><span>Sweety</span></div>
      <div className="user-area"><span>Hi, {session.user?.name || "there"}</span><button className="ghost" onClick={logout}>Log out</button></div>
    </header>

    <main className="container">
      <section className="welcome">
        <div><p className="eyebrow">BLOOD GLUCOSE TRACKER</p><h1>Your daily health snapshot</h1><p className="muted">Record your readings and follow your trends over time.</p></div>
        <div className="date-picker"><label htmlFor="report-date">Report date</label><input id="report-date" type="date" max={today()} value={selectedDate} onChange={e => setSelectedDate(e.target.value)} /></div>
      </section>

      {error && <div className="alert error-alert">{error}</div>}
      {notice && <div className="alert success-alert">{notice}</div>}

      <div className="main-grid">
        <section className="panel form-panel">
          <div className="panel-heading"><div><p className="eyebrow">DAILY ENTRY</p><h2>{editingId ? "Edit reading" : "Add a reading"}</h2></div><span className="pill">{editingId ? "Editing" : "Up to 4 per day"}</span></div>
          <form onSubmit={saveReading} className="form-stack">
            <label>Date<input type="date" max={today()} required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></label>
            <label>Time slot<select value={form.slot} onChange={e => setForm({ ...form, slot: e.target.value })}>{SLOTS.map(slot => <option key={slot}>{slot}</option>)}</select></label>
            <label>Glucose value (mg/dl)<input type="number" min="40" max="600" step="1" required value={form.value} onChange={e => setForm({ ...form, value: e.target.value })} placeholder="e.g. 110" /></label>
            <div className="button-row"><button className="primary" disabled={loading}>{editingId ? "Update reading" : "Save reading"}</button>{editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setForm(emptyForm()); }}>Cancel</button>}</div>
          </form>
          <p className="tiny muted">Enter a whole number between 40 and 600 mg/dl.</p>
        </section>

        <section className="panel daily-panel">
          <div className="panel-heading"><div><p className="eyebrow">DAILY REPORT</p><h2>{selectedLabel}</h2></div><span className="pill">{report?.daily?.count || 0} / 4 readings</span></div>
          {report?.daily?.count ? <div className="stats-grid daily-stats">
            <Stat label="Highest" value={report.daily.highest} suffix=" mg/dl" />
            <Stat label="Lowest" value={report.daily.lowest} suffix=" mg/dl" />
            <Stat label="Average" value={report.daily.average} suffix=" mg/dl" />
          </div> : <div className="empty-state"><div className="empty-icon">♡</div><strong>No readings for this date yet</strong><p className="muted small">Add a reading to see your daily summary.</p></div>}
          <div className="daily-list">
            {(report?.daily?.readings || []).map(item => <div className="reading-row" key={item.id}>
              <div><strong>{item.slot}</strong><span className="muted tiny">{item.date}</span></div>
              <strong>{item.value} <small>mg/dl</small></strong>
              <div className="actions"><button className="link-button" onClick={() => editReading(item)}>Edit</button><button className="link-button danger-text" onClick={() => deleteReading(item.id)}>Delete</button></div>
            </div>)}
          </div>
        </section>
      </div>

      <section className="reports-section">
        <div className="section-heading"><div><p className="eyebrow">YOUR PROGRESS</p><h2>Reports & insights</h2></div><span className="muted small">Based on your saved readings</span></div>
        {report && <div className="report-grid">
          <ReportCard title="Month to date" range={`${new Date(`${report.monthToDate.from}T00:00:00`).toLocaleDateString("en-IN",{day:"numeric",month:"short"})} – ${selectedLabel}`} data={report.monthToDate} />
          <ReportCard title="Previous month" range={`${new Date(`${report.previousMonth.from}T00:00:00`).toLocaleDateString("en-IN",{day:"numeric",month:"short"})} – ${new Date(`${report.previousMonth.to}T00:00:00`).toLocaleDateString("en-IN",{day:"numeric",month:"short",year:"numeric"})}`} data={report.previousMonth} />
        </div>}
      </section>

      <section className="panel history-panel">
        <div className="panel-heading"><div><p className="eyebrow">ALL ENTRIES</p><h2>Reading history</h2></div><span className="pill">{readings.length} total</span></div>
        {readings.length ? <div className="table-wrap"><table><thead><tr><th>Date</th><th>Time slot</th><th>Value</th><th>Actions</th></tr></thead><tbody>
          {readings.map(item => <tr key={item.id}><td>{new Date(`${item.date}T00:00:00`).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})}</td><td>{item.slot}</td><td><strong>{item.value} mg/dl</strong></td><td><button className="link-button" onClick={() => editReading(item)}>Edit</button><button className="link-button danger-text" onClick={() => deleteReading(item.id)}>Delete</button></td></tr>)}
        </tbody></table></div> : <p className="muted empty-history">No saved readings yet.</p>}
      </section>
      <footer>Made with care · Sweety Blood Glucose Tracker</footer>
    </main>
  </div>;
}
