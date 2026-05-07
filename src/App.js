import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API = "http://healthcare-inventory-agent-production.up.railway.app";

export default function App() {
  const [summary, setSummary] = useState(null);
  const [belowPar, setBelowPar] = useState([]);
  const [orders, setOrders] = useState([]);
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [tab, setTab] = useState("overview");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const responseRef = useRef(null);

  useEffect(() => {
    axios.get(`${API}/inventory/summary`).then(r => setSummary(r.data));
    axios.get(`${API}/inventory/below-par?limit=100`).then(r => setBelowPar(r.data));
    axios.get(`${API}/orders?limit=20`).then(r => setOrders(r.data));
  }, []);

  const askAgent = async () => {
    if (!query.trim() || streaming) return;
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
        const lines = chunk.split("\n");
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6);
            if (data === "[DONE]") break;
            if (!data.startsWith("[Error:")) {
              setResponse(prev => prev + data);
            }
          }
        }
      }
    } catch (e) {
      setResponse("Error: " + e.message);
    }
    setStreaming(false);
  };

  const suggestions = [
    { label: "Critical stock in ICU-1", query: "What items are critically low in ICU-1?" },
    { label: "Expiring pharmaceuticals", query: "Which pharmaceuticals expire within 30 days in ICU-1?" },
    { label: "PPE ABC Analysis", query: "Run ABC analysis for PPE" },
    { label: "Compliance check", query: "Check controlled substance compliance" },
  ];

  const categories = ["all", "surgical", "pharmaceutical", "ppe", "medical_device", "lab", "nutrition", "radiology"];
  const filtered = categoryFilter === "all" ? belowPar : belowPar.filter(i => i.category === categoryFilter);

  const card = (title, value, color, subtitle, icon) => (
    <div style={{ background: "#1e2533", borderRadius: 16, padding: "24px 28px", borderLeft: `4px solid ${color}`, flex: 1, minWidth: 160 }}>
      <div style={{ color: "#8892a4", fontSize: 12, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1 }}>{icon} {title}</div>
      <div style={{ color: color, fontSize: 36, fontWeight: 800 }}>{value ?? "—"}</div>
      <div style={{ color: "#8892a4", fontSize: 12, marginTop: 6 }}>{subtitle}</div>
    </div>
  );

  return (
    <div style={{ background: "#0d1117", minHeight: "100vh", color: "#e2e8f0", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: "#1a2235", borderBottom: "1px solid #1e2d3d", padding: "16px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 100 }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, color: "#63b3ed" }}>🏥 Healthcare Inventory Agent</div>
          <div style={{ fontSize: 12, color: "#4a5568", marginTop: 2 }}>SSM Health · 4,000 SKUs · AI-powered supply chain</div>
        </div>
        <div style={{ fontSize: 12, color: "#48bb78", background: "#1a3a2a", padding: "8px 16px", borderRadius: 20, border: "1px solid #2f6a4a" }}>● API Connected</div>
      </div>

      <div style={{ display: "flex", gap: 8, padding: "20px 32px 0" }}>
        {[["overview","📊 O["below-par","⚠️ Below PAR"],["orders","📋 Orders"],["ai-agent","🤖 AI Agent"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ background: tab === id ? "#3182ce" : "transparent", color: tab === id ? "#fff" : "#8892a4", border: tab === id ? "none" : "1px solid #2d3748", borderRadius: 10, padding: "10px 22px", cursor: "pointer", fontSize: 14, fontWeight: tab === id ? 600 : 400 }}>{label}</button>
        ))}
      </div>

      <div style={{ padding: "24px 32px" }}>

        {tab === "overview" && (
          <div>
            <div style={{ display: "flex", gap: 16, marginBottom: 28, flexWrap: "wrap" }}>
              {card("Total SKUs", summary?.total_skus?.toLocaleString(), "#63b3ed", "Active items", "📦")}
              {card("Below PAR", summary?.below_par_count?.toLocaleString(), "#f6ad55", "Need reorder", "⚠️")}
              {card("Stockouts", summary?.out_of_stock_count?.toLocaleString(), "#fc8181", "Zero inventory", "🔴")}
              {card("Exmary?.expiring_30d_count?.toLocaleString(), "#f687b3", "Needs FIFO action", "⏰")}
            </div>
            <div style={{ background: "#1e2533", borderRadius: 16, padding: 28, border: "1px solid #2d3748" }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "#63b3ed" }}>⚡ Quick Actions</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                {suggestions.map(s => (
                  <button key={s.query} onClick={() => { setTab("ai-agent"); setQuery(s.query); }} style={{ background: "#2d3748", border: "1px solid #4a5568", color: "#e2e8f0", borderRadius: 12, padding: "14px 18px", cursor: "pointer", fontSize: 13, textAlign: "left", fontWeight: 500 }}>{s.label}</button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "below-par" && (
          <div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "w }}>
              {categories.map(c => (
                <button key={c} onClick={() => setCategoryFilter(c)} style={{ background: categoryFilter === c ? "#3182ce" : "#1e2533", color: categoryFilter === c ? "#fff" : "#8892a4", border: "1px solid #2d3748", borderRadius: 20, padding: "6px 14px", cursor: "pointer", fontSize: 12 }}>{c}</button>
              ))}
            </div>
            <div style={{ background: "#1e2533", borderRadius: 16, overflow: "hidden", border: "1px solid #2d3748" }}>
              <div style={{ padding: "16px 20px", borderBottom: "1px solid #2d3748", fontSize: 15, fontWeight: 600 }}>⚠️ Below PAR — {filtered.length} items</div>
              <div style={{ overflowX: "auto", maxHeight: "60vh", overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead style={{ position: "sticky", top: 0, background: "#2d3748" }}>
                    <tr>{["SKU","Name","Category","Class","On Hand","PAR","Gap","Loca.map(h => <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#8892a4", fontWeight: 600, fontSize: 12 }}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {filtered.map((item, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #1a2235", background: i % 2 === 0 ? "#1e2533" : "#1a2235" }}>
                        <td style={{ padding: "10px 16px", color: "#63b3ed", fontFamily: "monospace", fontSize: 12 }}>{item.sku_id}</td>
                        <td style={{ padding: "10px 16px" }}>{item.name}</td>
                        <td style={{ padding: "10px 16px", color: "#8892a4" }}>{item.category}</td>
                        <td style={{ padding: "10px 16px" }}><span style={{ background: item.abc_class === "A" ? "#2f4a1a" : item.abc_class === "B" ? "#3a3420" : "#2a2f3a", color: item.abc_class === "A" ? "#68d391" : item.abc_class === "B" ? "#f6e05e" : "#8892a4", padding: "3px 10px", borderRadius: 20, fontSize: 12, fontWeight: 700 }}>{item.abc_class}</span></td>
                        <td style={{ padding: "10px 16px", color: item.quantity_on_hand === 0 ? "#fc8181" : "#f6ad55", fontWeight: 600 }}>{item.quantity_on_hand === 0 ? "🔴 0" : `🟡 ${item.quantity_on_hand}`}</td>
                        <td style={{ padding: "10px 16px", color: "#8892a4" }}>{item.reorder_point}</td>
                        <td style={{ padding: "10px 16px", color: "#fc8181", fontWeight: 700 }}>−{item.gap}</td>
                        <td style={{ padding: "10px 16px", color: "#8892a4", fontSize: 12 }}>{item.location_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "orders" && (
          <div style={{ background: "#1e2533", borderRadius: 16, overflow: "hidden", border: "1px solid #2d3748" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #2d3748", fontSize: 15, fontWeight: 600 }}>chase Orders ({orders.length})</div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead><tr style={{ background: "#2d3748" }}>{["PO Number","Supplier","Status","Total Value","Expected","Created"].map(h => <th key={h} style={{ padding: "12px 16px", textAlign: "left", color: "#8892a4", fontWeight: 600, fontSize: 12 }}>{h}</th>)}</tr></thead>
              <tbody>
                {orders.map((o, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #1a2235", background: i % 2 === 0 ? "#1e2533" : "#1a2235" }}>
                    <td style={{ padding: "12px 16px", color: "#63b3ed", fontFamily: "monospace", fontSize: 12 }}>{o.id}</td>
                    <td style={{ padding: "12px 16px", color: "#8892a4" }}>{o.supplier_id}</td>
                    <td style={{ padding: "12px 16px" }}><span style={{ background: "#3a2f1a", color: "#f6ad55", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{o.status.toUpperCase()}</span></td>
                    <td style={{ padding: "12px 16px", color: "#68d391", fontWeight: 700 }}>${parseFloat(o.total_value).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: "12px 16px", color: "#8892a4" }}>{o.expected_delivery ?? "—"}</td>
                    <td style={{ padding: "12px 16px", color: "#8892a4" }}>{o.requested_at?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "ai-agent" && (
          <div style={{ maxWidth: 900, margin: "0 auto" }}>
            <div style={{ background: "#1e2533", borderRadius: 16, padding: 28, marginBottom: 16, border: "1px solid #2d3748" }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 20, color: "#63b3ed" }}>🤖 Ask the AI Agent</div>
              <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <input value={query} onChange={e => setQuery(e.target.e)} onKeyDown={e => e.key === "Enter" && askAgent()} placeholder="e.g. What items are critically low in ICU-1?" style={{ flex: 1, background: "#0d1117", border: "1px solid #4a5568", borderRadius: 12, padding: "14px 18px", color: "#e2e8f0", fontSize: 14, outline: "none" }} />
                <button onClick={askAgent} disabled={streaming} style={{ background: streaming ? "#2d3748" : "#3182ce", color: "#fff", border: "none", borderRadius: 12, padding: "14px 28px", cursor: streaming ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, minWidth: 120 }}>{streaming ? "⟳ Thinking..." : "Ask →"}</button>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {suggestions.map(s => (
                  <button key={s.query} onClick={() => setQuery(s.query)} style={{ background: "#2d3748", border: "1px solid #4a5568", color: "#8892a4", borderRadius: 20, padding: "6px 14px", cursor: "pointer", fontSize: 12 }}>{s.label}</button>
                ))}
          </div>
            </div>
            {(response || streaming) && (
              <div style={{ background: "#1e2533", borderRadius: 16, padding: 28, border: "1px solid #2d3748" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontSize: 13, color: "#8892a4", fontWeight: 600 }}>Agent response</div>
                  {streaming && <div style={{ color: "#63b3ed", fontSize: 13 }}>● streaming...</div>}
                </div>
                <pre ref={responseRef} style={{ color: "#e2e8f0", fontSize: 13, lineHeight: 1.8, whiteSpace: "pre-wrap", margin: 0, maxHeight: "50vh", overflowY: "auto" }}>
                  {response}{streaming && <span style={{ color: "#63b3ed" }}>▋</span>}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
