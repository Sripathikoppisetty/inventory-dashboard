import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

const API = "http://healthcare-inventory-agent-production.up.railway.app";

const COLORS = { A: "#48bb78", B: "#f6ad55", C: "#8892a4" };
const STATUS_COLORS = { critical: "#fc8181", low: "#f6ad55", ok: "#48bb78" };

function StatCard({ title, value, color, subtitle, icon, trend }) {
  return (
    <div style={{ background: "#111827", borderRadius: 20, padding: "24px 28px", borderTop: `3px solid ${color}`, flex: 1, minWidth: 180, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", right: 20, top: 20, fontSize: 36, opacity: 0.1 }}>{icon}</div>
      <div style={{ color: "#6b7280", fontSize: 11, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600 }}>{title}</div>
      <div style={{ color: "#f9fafb", fontSize: 40, fontWeight: 800, lineHeight: 1, marginBottom: 8 }}>{value ?? "—"}</div>
      <div style={{ color: "#6b7280", fontSize: 12 }}>{subtitle}</div>
      {trend && <div style={{ marginTop: 8, fontSize: 12, color: color, fontWeight: 600 }}>{trend}</div>}
    </div>
  );
}

function Badge({ value, type }) {
  const colors = { A: { bg: "#064e3b", color: "#6ee7b7" }, B: { bg: "#78350f", color: "#fcd34d" }, C: { bg: "#1f2937", color: "#9ca3af" } };
  const c = colors[value] || colors.C;
  return <span style={{ background: c.bg, color: c.color, padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 0.5 }}>{value}</span>;
}

function StatusBadge({ qty, par }) {
  if (qty === 0) return <span style={{ color: "#fc8181", fontWeight: 700 }}>🔴 STOCKOUT</span>;
  if (qty < par) return <span style={{ color: "#f6ad55", fontWeight: 600 }}>🟡 {qty}</span>;
   <span style={{ color: "#48bb78" }}>🟢 {qty}</span>;
}

export default function App() {
  const [summary, setSummary] = useState(null);
  const [belowPar, setBelowPar] = useState([]);
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [tab, setTab] = useState("overview");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sortField, setSortField] = useState("gap");
  const [sortDir, setSortDir] = useState("desc");
  const [search, setSearch] = useState("");
  const responseRef = useRef(null);

  useEffect(() => {
    axios.get(`${API}/inventory/summary`).then(r => setSummary(r.data)).catch(() => {});
    axios.get(`${API}/inventory/below-par?limit=200`).then(r => setBelowPar(r.data)).catch(() => {});
    axios.get(`${API}/orders?limit=20`).then(r => setOrders(r.data)).catch(() => {});
  }, []);

  const askAgent = async () => {
    if (!query.im() || streaming) return;
    setStreaming(true);
    setResponse("");
    try {
      const res = await fetch(`${API}/query/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split("\n")) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            if (!data.startsWith("[Error:")) setResponse(prev => prev + data);
          }
        }
      }
    } catch (e) {
      setResponse("Error: " + e.message);
    }
    setStreaming(false);
  };

  const categories = ["all", "surgical", "pharmaceutical", "ppe", "medical_device", "lab", "nutrition", "radiology"];

  const filtered = belowPar
    .filter(i => categoryFilter === "all" || i.category === categoryFilter)
    .filter(i => search === "" || i.name.toLowerCase().includes(search.toLowerCase()) || i.sku_id.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const mul = sortDir === "desc" ? -1 : 1;
      if (sortField === "gap") return mul * (a.gap - b.gap);
      if (sortField === "name") return mul * a.name.localeCompare(b.name);
      if (sortField === "qty") return mul * (a.quantity_on_hand - b.quantity_on_hand);
      return 0;
    });

  const abcData = [
    { name: "Class A", value: belowPar.filter(i => i.abc_class === "A").length, color: "#48bb78" },
    { name: "Class B", value: belowPar.filter(i => i.abc_class === "B").length, color: "#f6ad55" },
    { name: "Class C", value: belowPar.filter(i => i.abc_class === "C").length, color: "#6b7280" },
  ];

  const categoryData = categories.slice(1).map(c => ({
    name: c.replace("_", " "),
    count: belowPar.filter(i => i.category === c).length,
  })).filter(d => d.count > 0).sort((a, b) => b.count - a.count);

  const suggestions = [
    "What items are critically low in ICU-1?",
    "Which pharmaceuticals expire within 30 days in ICU-1?",
    "Run ABC analysis for PPE",
    "Check controlled substance compliance",
    "What is the demand forecast for SKU-00301?",
  ];

  const sort = (field) => {
    if (sortField === field) setSortDir(d => d === "desc" ? "asc" : "desc");
    else { setSortField(field); setSortDir("desc"); }
  };

  const tabStyle = (id) => ({
    background: tab === id ? "#1d4ed8" : "transparent",
    color: tab === id ? "#fff" : "#6b7280",
    border: tab === id ? "none" : "1px solid #1f2937",
    borderRadius: 12, padding: "10px 20px",
    cursor: "pointer", fontSize: 13, fontWeight: tab === id ? 700 : 400,
    transition: "all 0.2s", whiteSpace: "nowrap",
  });

  return (
    <div style={{ background: "#0a0f1a", minHeight: "100vh", color: "#f9fafb", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

      {/* Header */}
      <div style={{ background: "#0d1424", borderBottom: "1px solid #1f2937", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #1d4ed8, #7c3aed)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>🏥</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#f9fafb", letterSpacing: -0.5 }}>Healthcare Inventory Agent</div>
            <div style={{ fontSize: 11, color: "#4b5563" }}>SSM Health · 4,000 SKUs · Powered by Groq AI</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981" }} />
          <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>Live</span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ padding: "16px 32px", display: "flex", gap: 8, overflowX: "auto", borderBottom: "1px solid #1f2937", background: "#0d1424" }}>
        {[["overview","📊 Overview"],["below-par","⚠️ Below PAR"],["charts","📈 Analytics"],["orders","📋 Orders"],["ai-agent","🤖 AI Agent"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={tabStyle(id)}>{label}</button>
        ))}
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>

        {/* Overview */}
        {tab === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
              <StatCard icon="📦" title="Total SKUs" value={summary?.total_skus?.toLocaleString()} color="#3b82f6" subtitle="Active catalog items" trend="↑ 4,000 managed" />
              <StatCard icon="⚠" title="Below PAR" value={summary?.below_par_count?.toLocaleString()} color="#f59e0b" subtitle="Items needing reorder" trend={`${summary ? Math.round(summary.below_par_count/summary.total_skus*100) : 0}% of catalog`} />
              <StatCard icon="🔴" title="Stockouts" value={summary?.out_of_stock_count?.toLocaleString()} color="#ef4444" subtitle="Zero inventory" trend="Immediate action needed" />
              <StatCard icon="⏰" title="Expiring Soon" value={summary?.expiring_30d_count?.toLocaleString()} color="#ec4899" subtitle="Within 30 days" trend="FIFO action required" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
              <div style={{ background: "#111827", borderRadius: 20, padding: 24, border: "1px solid #1f2937" }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Below PAR by ABC Class               <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={abcData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                      {abcData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#1f2937", border: "none", borderRadius: 8, color: "#f9fafb" }} />
                    <Legend formatter={(value) => <span style={{ color: "#9ca3af", fontSize: 12 }}>{value}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background: "#111827", borderRadius: 20, padding: 24, border: "1px solid #1f2937" }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Below PAR by Category</div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={categoryData} layout="vertical">
                    <XAxis type="number" tick={{ fill: "#6b7280", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fill: "#9ca3af", fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip contentStyle={{ background: "#1f2937", border: "none", borderRadius: 8, color: "#f9fafb" }} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div style={{ background: "#111827", borderRadius: 20, padding: 24, border: "1px solid #1f2937" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Quick Actions</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                {suggestions.map(s => (
                  <button key={s} onClick={() => { setTab("ai-agent"); setQuery(s); }} style={{ background: "#1f2937", border: "1px solid #374151", color: "#d1d5db", borderRadius: 12, padding: "12px 16px", cursor: "pointer", fontSize: 12, textAlign: "left", transition: "all 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = "#374151"; e.currentTarget.style.color = "#d1d5db"; }}
                  >→ {s}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Below PAR */}
        {tab === "below-par" && (
          <div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search SKU or ..." style={{ background: "#111827", border: "1px solid #374151", borderRadius: 10, padding: "10px 16px", color: "#f9fafb", fontSize: 13, outline: "none", width: 220 }} />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {categories.map(c => (
                  <button key={c} onClick={() => setCategoryFilter(c)} style={{ background: categoryFilter === c ? "#1d4ed8" : "#111827", color: categoryFilter === c ? "#fff" : "#6b7280", border: `1px solid ${categoryFilter === c ? "#1d4ed8" : "#374151"}`, borderRadius: 20, padding: "6px 14px", cursor: "pointer", fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{c}</button>
                ))}
              </div>
            </div>

            <div style={{ background: "#111827", borderRadius: 20, overflow: "hidden", border: "1px solid #1f2937" }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid #1f2937", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 700, fontSize: 15 }}>⚠️ {filtered.length} items below PAR</span>
                <span style={{ color: "#6b7280", fontSize: 12 }}>{categoryFilter !== "all" ? categoryFilter : "all categories"} · click headers to sort</span>
              </div>
              <div style={{ overflowX: "auto", maxHeight: "65vh", overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead style={{ position: "sticky", top: 0, background: "#1f2937", zIndex: 1 }}>
                    <tr>
                      {[["SKU ID","sku_id"],["Name","name"],["Cat","cat"],["Class","class"],["On Hand","qty"],["PAR","par"],["Gap ↕","gap"],["Location","loc"]].map(([label, field]) => (
                        <th key={field} onClick={() => ["name","qty","gap"].includes(field) && sort(field)} style={{ padding: "12px 16px", textAlign: "left", color: "#6b7280", fontWeight: 600, fontSize: 11, textTransform: "up", letterSpacing: 0.5, cursor: ["name","qty","gap"].includes(field) ? "pointer" : "default", whiteSpace: "nowrap" }}>
                          {label} {sortField === field ? (sortDir === "desc" ? "↓" : "↑") : ""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #1f2937", transition: "background 0.1s" }}
                        onMouseEnter={e => e.currentTarget.style.background = "#1f2937"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <td style={{ padding: "10px 16px", color: "#60a5fa", fontFamily: "monospace", fontSize: 11 }}>{item.sku_id}</td>
                        <td style={{ padding: "10px 16px", fontWeight: 500, maxWidth: 200 }}>{item.name}</td>
                        <td style={{ padding: "10px 16px><span style={{ background: "#1f2937", color: "#9ca3af", padding: "2px 8px", borderRadius: 6, fontSize: 10, textTransform: "uppercase" }}>{item.category?.slice(0,6)}</span></td>
                        <td style={{ padding: "10px 16px" }}><Badge value={item.abc_class} /></td>
                        <td style={{ padding: "10px 16px" }}><StatusBadge qty={item.quantity_on_hand} par={item.reorder_point} /></td>
                        <td style={{ padding: "10px 16px", color: "#6b7280" }}>{item.reorder_point}</td>
                        <td style={{ padding: "10px 16px", color: "#ef4444", fontWeight: 700 }}>−{item.gap}</td>
                        <td style={{ padding: "10px 16px", color: "#6b7280", fontSize: 11 }}>{item.location_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Charts */}
        {tab === "charts" && (
          <div style={{ display: "grid", gap:  }}>
            <div style={{ background: "#111827", borderRadius: 20, padding: 28, border: "1px solid #1f2937" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 24, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Stockout Risk by Category</div>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData}>
                  <XAxis dataKey="name" tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#6b7280", fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ background: "#1f2937", border: "none", borderRadius: 8, color: "#f9fafb" }} />
                  <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                    {categoryData.map((_, i) => <Cell key={i} fill={["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#ec4899","#06b6d4"][i % 7]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ background: "#111827", borderRadius: 20, padding: 28, border: "1px solid #1f2937" }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 24, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>ABC Class Distribution</div>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={abcData} cx="50%" cy="50%" outerRadius={100} paddingAngle={4} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={{ stroke: "#374151" }}>
                      {abcData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#1f2937", border: "none", borderRadius: 8, color: "#f9fafb" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div style={{ background: "#111827", borderRadius: 20, padding: 28, border: "1px solid #1f2937" }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Inventory Health</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 32 }}>
                  {[
                    { label: "Items in stock", value: (summary?.total_skus - summary?.below_par_count) || 0, total: summary?.total_skus || 1, color: "#10b981" },
                    { label: "Below PAR", value: summary?.below_par_count || 0, total: summary?.total_skus || 1, color: "#f59e0b" },
                    { label: "Stockouts", value: summary?.out_of_stock_count || 0, total: summary?.total_skus || 1, color: "#ef4444" },
                  ].map(({ label, value, total, color }) => (
                    <div key={label}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ color: "#9ca3af", fontSize: 13 }}>{label}</span>
                        <span style={{ color: "#f9fafb", fontSize: 13, fontWeight: 600 }}>{value?.toLocaleString()}</span>
                      </div>
                      <div style={{ background: "#1f2937", borderRadius: 6, height: 8, overflow: "hidden" }}>
                        <div style={{ width: `${(value / total * 100).toFixed(1)}%`, height: "100%", background: color, borderRadius: 6, transition: "width 1s" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Orders */}
        {tab === "orders" && (
          <div style={{ background: "#111827", borderRadius: 20, overflow: "hidden", border: "1px solid #1f2937" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #1f2937", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>📋 Purchase Orders ({orders.length})</span>
              <span style={{ color: "#6b7280", fontSize: 12 }}>All DRAFT — awaiting approval</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#1f2937" }}>
                    {["PO Number","Supplier","Status","Total Value","Expected Delivery","Created"].map(h => (
                      <th key={h} style={{ padding: "12px 20px", textAlign: "left", color: "#6b7280", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #1f2937", transitiobackground 0.1s" }}
                      onMouseEnter={e => e.currentTarget.style.background = "#1f2937"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <td style={{ padding: "14px 20px", color: "#60a5fa", fontFamily: "monospace", fontSize: 11 }}>{o.id}</td>
                      <td style={{ padding: "14px 20px", color: "#9ca3af" }}>{o.supplier_id}</td>
                      <td style={{ padding: "14px 20px" }}><span style={{ background: "#451a03", color: "#fbbf24", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>DRAFT</span></td>
                      <td style={{ padding: "14px 20px", color: "#34d399", fontWeight: 700, fontSize: 15 }}>${parseFloat(o.total_value).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                      <td style={{ padding: "14px 20px", color: "#6b7280" }}>{o.expected_delivery ?? "—"}</td>
                      <td style={{ padding: "14px 20px", color"#6b7280" }}>{o.requested_at?.slice(0, 10)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "16px 24px", borderTop: "1px solid #1f2937", display: "flex", justifyContent: "flex-end" }}>
              <span style={{ color: "#34d399", fontWeight: 700, fontSize: 16 }}>
                Total: ${orders.reduce((sum, o) => sum + parseFloat(o.total_value || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        )}

        {/* AI Agent */}
        {tab === "ai-agent" && (
          <div style={{ maxWidth: 860, margin: "0 auto" }}>
            <div style={{ background: "#111827", borderRadius: 20, padding: 28, marginBottom: 16, border: "1px solid #1f2937" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #1d4ed8, #7c3aed)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>🤖</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Ask the AI Agent</div>
                <div style={{ marginLeft: "auto", fontSize: 11, color: "#10b981", background: "#064e3b", padding: "4px 10px", borderRadius: 20, fontWeight: 600 }}>Groq · llama-4-scout</div>
              </div>

              <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && askAgent()} placeholder="Ask anything about inventory, compliance, forecasts..." style={{ flex: 1, background: "#0a0f1a", border: "1px solid #374151", borderRadius: 12, padding: "14px 18px", color: "#f9fafb", fontSize: 14, outline: "none", transition: "border 0.2s" }}
                  onFocus={e => e.target.style.borderColor = "#3b82f6"}
                  onBlur={e => e.target.style.borderColor =374151"}
                />
                <button onClick={askAgent} disabled={streaming} style={{ background: streaming ? "#1f2937" : "linear-gradient(135deg, #1d4ed8, #7c3aed)", color: "#fff", border: "none", borderRadius: 12, padding: "14px 24px", cursor: streaming ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, minWidth: 110, transition: "all 0.2s" }}>
                  {streaming ? "⟳" : "Ask →"}
                </button>
              </div>

              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {suggestions.map(s => (
                  <button key={s} onClick={() => setQuery(s)} style={{ background: "#1f2937", border: "1px solid #374151", color: "#6b7280", borderRadius: 20, padding: "5px 12px", cursor: "pointer", fontSize: 11, transition: "all 0.15s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#3b82f6"; e.currentTarget.style.color = "#93c5fd"; }}
                    onMouseLeave={e => { e.currentTarget.style.boColor = "#374151"; e.currentTarget.style.color = "#6b7280"; }}
                  >{s}</button>
                ))}
              </div>
            </div>

            {(response || streaming) && (
              <div style={{ background: "#111827", borderRadius: 20, padding: 28, border: "1px solid #1f2937" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Agent Response</div>
                  {streaming && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#3b82f6", fontSize: 12 }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#3b82f6", animation: "pulse 1s infinite" }} />
                      Processing...
                    </div>
                  )}
                </div>
                <pre ref={responseRef} style={{ color: "#e5e7eb", fontSize: 13, lineHeight: 1.9, whiteSpace: "pre-wrap", margin: 0, maxHeight: "55vh", overflowY: "auto", fontFamily: "'SF Mono', 'Fira Code', monospace" }}>
                  {response}{streaming && <span style={{ color: "#3b82f6", animation: "blink 1s infinite" }}>▋</span>}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: #111827; }
        ::-webkit-scrollbar-thumb { background: #374151; border-radius: 3px; }
      `}</style>
    </div>
  );
}
