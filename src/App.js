import { useState, useEffect } from "react";
import axios from "axios";

const API = "https://healthcare-inventory-agent-production.up.railway.app";

function StatCard({ title, value, color, subtitle }) {
  return (
    <div style={{
      background: "#1e2533", borderRadius: 12, padding: "20px 24px",
      borderLeft: `4px solid ${color}`, flex: 1, minWidth: 160
    }}>
      <div style={{ color: "#8892a4", fontSize: 13, marginBottom: 6 }}>{title}</div>
      <div style={{ color: color, fontSize: 32, fontWeight: 700 }}>{value}</div>
      {subtitle && <div style={{ color: "#8892a4", fontSize: 12, marginTop: 4 }}>{subtitle}</div>}
    </div>
  );
}

export default function App() {
  const [summary, setSummary] = useState(null);
  const [belowPar, setBelowPar] = useState([]);
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("overview");

  useEffect(() => {
    axios.get(`${API}/inventory/summary`).then(r => setSummary(r.data));
    axios.get(`${API}/inventory/below-par?limit=50`).then(r => setBelowPar(r.data));
    axios.get(`${API}/orders?limit=20`).then(r => setOrders(r.data));
  }, []);

  const askAgent = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResponse("");
    try {
      const r = await axios.post(`${API}/query`, { query });
      setResponse(r.data.response);
    } catch (e) {
      setResponse("Error: " + e.message);
    }
    setLoading(false);
  };

  const suggestions = [
    "Which pharmaceuticals expire within 30 days?",
    "Run ABC analysis for PPE",
    "Check controlled substance compliance",
    "What is critically low in the ED?",
  ];

  return (
    <div style={{ background: "#131929", minHeight: "100vh", color: "#e2e8f0", fontFamily: "system-ui, sans-serif" }}>

      <div style={{ background: "#1a2235", borderBottom: "1px solid #2d3748", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "#63b3ed" }}>🏥 Healthcare Inventory Agent</div>
          <div style={{ fontSize: 12, color: "#8892a4", marginTop: 2 }}>SSM Health · 4,000 SKUs · AI-powered supply chain</div>
        </div>
        <div style={{ fontSize: 12, color: "#48bb78", background: "#1a3a2a", padding: "6px 14px", borderRadius: 20, border: "1px solid #2f6a4a" }}>
          ● API Connected
        </div>
      </div>

      <div style={{ display: "flex", gap: 4, padding: "16px 32px 0", borderBottom: "1px solid #2d3748" }}>
        {["overview", "below-par", "orders", "ai-agent"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            background: tab === t ? "#2d3748" : "transparent",
            color: tab === t ? "#63b3ed" : "#8892a4",
            border: "none", borderRadius: "8px 8px 0 0", padding: "10px 20px",
            cursor: "pointer", fontSize: 14, fontWeight: tab === t ? 600 : 400,
            borderBottom: tab === t ? "2px solid #63b3ed" : "none"
          }}>
            {t === "overview" ? "📊 Overview" : t === "below-par" ? "⚠️ Below PAR" : t === "orders" ? "📋 Purchase Orders" : "🤖 AI Agent"}
          </button>
        ))}
      </div>

      <div style={{ padding: "24px 32px" }}>

        {tab === "overview" && (
          <div>
            <div style={{ display: "flex", gap: 16, marginBottom: 32, flexWrap: "wrap" }}>
              <StatCard title="Total SKUs" value={summary?.total_skus ?? "—"} color="#63b3ed" subtitle="Active items" />
              <StatCard title="Below PAR" value={summary?.below_par_count ?? "—"} color="#f6ad55" subtitle="Need reorder" />
              <StatCard title="Stockouts" value={summary?.out_of_stock_count ?? "—"} color="#fc8181" subtitle="Zero inventory" />
              <StatCard title="Expiring (30d)" value={summary?.expiring_30d_count ?? "—"} color="#f687b3" subtitle="Needs FIFO action" />
            </div>
            <div style={{ background: "#1e2533", borderRadius: 12, padding: 24 }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 16, color: "#63b3ed" }}>Quick Actions</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {suggestions.map(s => (
                  <button key={s} onClick={() => { setTab("ai-agent"); setQuery(s); }} style={{
                    background: "#2d3748", border: "1px solid #4a5568", color: "#e2e8f0",
                    borderRadius: 8, padding: "10px 16px", cursor: "pointer", fontSize: 13
                  }}>{s}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "below-par" && (
          <div style={{ background: "#1e2533", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #2d3748", fontSize: 15, fontWeight: 600 }}>
              ⚠️ Items Below PAR Level ({belowPar.length})
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "#2d3748" }}>
                    {["SKU", "Name", "Category", "Class", "On Hand", "PAR", "Gap"].map(h => (
                      <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#8892a4", fontWeight: 500 }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {belowPar.map((item, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #2d3748", background: i % 2 === 0 ? "#1e2533" : "#1a2235" }}>
                      <td style={{ padding: "10px 16px", color: "#63b3ed" }}>{item.sku_id}</td>
                      <td style={{ padding: "10px 16px" }}>{item.name}</td>
                      <td style={{ padding: "10px 16px", color: "#8892a4" }}>{item.category}</td>
                      <td style={{ padding: "10px 16px" }}>
                        <span style={{
                          background: item.abc_class === "A" ? "#2f4a1a" : item.abc_class === "B" ? "#3a3420" : "#2a2f3a",
                          color: item.abc_class === "A" ? "#68d391" : item.abc_class === "B" ? "#f6e05e" : "#8892a4",
                          padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600
                        }}>{item.abc_class}</span>
                      </td>
                      <td style={{ padding: "10px 16px", color: item.quantity_on_hand === 0 ? "#fc8181" : "#f6ad55" }}>
                        {item.quantity_on_hand === 0 ? "🔴 0" : `🟡 ${item.quantity_on_hand}`}
                      </td>
                      <td style={{ padding: "10px 16px" }}>{item.reorder_point}</td>
                      <td style={{ padding: "10px 16px", color: "#fc8181", fontWeight: 600 }}>-{item.gap}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "orders" && (
          <div style={{ background: "#1e2533", borderRadius: 12, overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #2d3748", fontSize: 15, fontWeight: 600 }}>
              📋 Purchase Orders ({orders.length})
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#2d3748" }}>
                  {["PO Number", "Supplier", "Status", "Total Value", "Expected Delivery", "Created"].map(h => (
                    <th key={h} style={{ padding: "10px 16px", textAlign: "left", color: "#8892a4", fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #2d3748", background: i % 2 === 0 ? "#1e2533" : "#1a2235" }}>
                    <td style={{ padding: "10px 16px", color: "#63b3ed", fontFamily: "monospace" }}>{o.id}</td>
                    <td style={{ padding: "10px 16px", color: "#8892a4" }}>{o.supplier_id}</td>
                    <td style={{ padding: "10px 16px" }}>
                      <span style={{ background: "#3a2f1a", color: "#f6ad55", padding: "2px 10px", borderRadius: 12, fontSize: 12, fontWeight: 600 }}>
                        {o.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ padding: "10px 16px", color: "#68d391", fontWeight: 600 }}>
                      ${parseFloat(o.total_value).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </td>
                    <td style={{ padding: "10px 16px", color: "#8892a4" }}>{o.expected_delivery ?? "—"}</td>
                    <td style={{ padding: "10px 16px", color: "#8892a4" }}>{o.requested_at?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "ai-agent" && (
          <div>
            <div style={{ background: "#1e2533", borderRadius: 12, padding: 24, marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 16, color: "#63b3ed" }}>🤖 Ask the AI Agent</div>
              <div style={{ display: "flex", gap: 12 }}>
                <input
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && askAgent()}
                  placeholder="e.g. Which pharmaceuticals expire within 30 days?"
                  style={{
                    flex: 1, background: "#131929", border: "1px solid #4a5568",
                    borderRadius: 8, padding: "12px 16px", color: "#e2e8f0",
                    fontSize: 14, outline: "none"
                  }}
                />
                <button onClick={askAgent} disabled={loading} style={{
                  background: loading ? "#2d3748" : "#3182ce", color: "#fff",
                  border: "none", borderRadius: 8, padding: "12px 24px",
                  cursor: loading ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600
                }}>
                  {loading ? "Thinking..." : "Ask →"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                {suggestions.map(s => (
                  <button key={s} onClick={() => setQuery(s)} style={{
                    background: "#2d3748", border: "1px solid #4a5568", color: "#8892a4",
                    borderRadius: 20, padding: "4px 12px", cursor: "pointer", fontSize: 12
                  }}>{s}</button>
                ))}
              </div>
            </div>
            {response && (
              <div style={{ background: "#1e2533", borderRadius: 12, padding: 24 }}>
                <div style={{ fontSize: 13, color: "#8892a4", marginBottom: 12 }}>Agent response:</div>
                <pre style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 }}>
                  {response}
                </pre>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}