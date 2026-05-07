import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API = "http://healthcare-inventory-agent-production.up.railway.app";

function StatCard({ title, value, color, subtitle, icon, trend }) {
  return (
    <div style={{ background: "#111827", borderRadius: 20, padding: "24px 28px", borderTop: "3px solid " + color, flex: 1, minWidth: 180, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", right: 20, top: 20, fontSize: 36, opacity: 0.1 }}>{icon}</div>
      <div style={{ color: "#6b7280", fontSize: 11, marginBottom: 8, textTransform: "uppercase", letterSpacing: 1.5, fontWeight: 600 }}>{title}</div>
      <div style={{ color: "#f9fafb", fontSize: 40, fontWeight: 800, lineHeight: 1, marginBottom: 8 }}>{value ?? "loading..."}</div>
      <div style={{ color: "#6b7280", fontSize: 12 }}>{subtitle}</div>
      {trend && <div style={{ marginTop: 8, fontSize: 12, color: color, fontWeight: 600 }}>{trend}</div>}
    </div>
  );
}

function Badge({ value }) {
  const colors = { A: { bg: "#064e3b", color: "#6ee7b7" }, B: { bg: "#78350f", color: "#fcd34d" }, C: { bg: "#1f2937", color: "#9ca3af" } };
  const c = colors[value] || colors.C;
  return <span style={{ background: c.bg, color: c.color, padding: "3px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{value}</span>;
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
    axios.get(API + "/inventory/summary").then(r => setSummary(r.data)).catch(() => {});
    axios.get(API + "/inventory/below-par?limit=200").then(r => setBelowPar(r.data)).catch(() => {});
    axios.get(API + "/orders?limit=20").then(r => setOrders(r.data)).catch(() => {});
  }, []);

  const askAgent = async () => {
    if (!query.trim() || streaming) return;
    setStreaming(true);
    setResponse("");
    try {
      const res = await fetch(API + "/query/stream", {
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

  const categoryData = categories.slice(1).map(c => ({
    name: c.replace("_", " "),
    count: belowPar.filter(i => i.category === c).length,
  })).filter(d => d.count > 0).sort((a, b) => b.count - a.count);

  const abcCounts = {
    A: belowPar.filter(i => i.abc_class === "A").length,
    B: belowPar.filter(i => i.abc_class === "B").length,
    C: belowPar.filter(i => i.abc_class === "C").length,
  };

  const suggestions = [
    "What items are critically low in ICU-1?",
    "Which pharmaceuticals expire within 30 days in ICU-1?",
    "Run ABC analysis for PPE",
    "Check controlled substance compliance",
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
    <div style={{ background: "#0a0f1a", minHeight: "100vh", color: "#f9fafb", fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif" }}>

      <div style={{ background: "#0d1424", borderBottom: "1px solid #1f2937", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 64, position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 36, height: 36, background: "linear-gradient(135deg, #1d4ed8, #7c3aed)", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>H</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#f9fafb" }}>Healthcare Inventory Agent</div>
            <div style={{ fontSize: 11, color: "#4b5563" }}>SSM Health · 4,000 SKUs · Powered by Groq AI</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRads: "50%", background: "#10b981" }} />
          <span style={{ fontSize: 12, color: "#10b981", fontWeight: 600 }}>Live</span>
        </div>
      </div>

      <div style={{ padding: "16px 32px", display: "flex", gap: 8, overflowX: "auto", borderBottom: "1px solid #1f2937", background: "#0d1424" }}>
        {[["overview","Overview"],["below-par","Below PAR"],["charts","Analytics"],["orders","Orders"],["ai-agent","AI Agent"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={tabStyle(id)}>{label}</button>
        ))}
      </div>

      <div style={{ padding: "28px 32px", maxWidth: 1400, margin: "0 auto" }}>

        {tab === "overview" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
              <StatCard icon="P" title="Total SKUs" value={summary?.total_skus?.toLocaleString()} color="#3b82f6" subtitle="Active catalog items" trend="4,000 managed" />
              <StatCard icon="W" title="Below PAR" value={summary?.below_par_count?.toLocaleString()} color="#f59e0b" subtitle="Items needing reorder" trend="Need reorder" />
              <StatCard icon="S" title="Stockouts" value={summary?.out_of_stock_count?.toLocaleString()} color="#ef4444" subtitle="Zero inventory" trend="Immediate action" />
              <StatCard icon="E" title="Expiring Soon" value={summary?.expiring_30d_count?.toLocaleString()} color="#ec4899" subtitle="Within 30 days" trend="FIFO required" />
            </div>

            <div style={{ background: "#111827", borderRadius: 20, padding: 24, border: "1px solid #1f2937", marginBottom: 20 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>ABC Class — Below PAR</div>
              <div style={{ display: "flex", gap: 16 }}>
                {[["A", "#10b981", abcCounts.A], ["B", "#f59e0b", abcCounts.B], ["C", "#6b7280", abcCounts.C]].map(([cls, color, coun) => (
                  <div key={cls} style={{ flex: 1, background: "#1f2937", borderRadius: 12, padding: 20, textAlign: "center", borderTop: "3px solid " + color }}>
                    <div style={{ fontSize: 28, fontWeight: 800, color: color }}>{count}</div>
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>Class {cls}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ background: "#111827", borderRadius: 20, padding: 24, border: "1px solid #1f2937" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 16, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Quick Actions</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
                {suggestions.map(s => (
                  <button key={s} onClick={() => { setTab("ai-agent"); setQuery(s); }} style={{ background: "#1f2937", border: "1px solid #374151", color: "#d1d5db", borderRadius: 12, padding: "12px 16px", cursor: "pointer", fontSize: 12, textAlign: "left" }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {tab === "below-par" && (
          <div>
            <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search SKU or name..." style={{ background: "#111827", border: "1px solid #374151", borderRadius: 10, padding: "10px 16px", color: "#f9fafb", fontSize: 13, outline: "none", width: 220 }} />
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {categories.map(c => (
                  <button key={c} onClick={() => setCategoryFilter(c)} style={{ background: categoryFilter === c ? "#1d4ed8" : "#111827", color: categoryFilter === c ? "#fff" : "#6b7280", border: "1px solid " + (categoryFilter === c ? "#1d4ed8" : "#374151"), borderRadius: 20, padding: "6px 14px", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>{c}</button>
                ))}
              </div>
            </div>

            <div style={{ background: "#111827", borderRadius: 20, overflow: "hidden", border: "1px solid #1f2937" }}>
              <div style={{ padding: "16px 24px", borderBottom: "1px solid #1f2937", display: "flex", justifyContent: "space-between" }}>
                <span style={{ fontWeight: 700 }}>{filtered.length} items below PAR</span>
                <span style={{ color: "#6b7280", fontSize: 12 }}>click headers to sort</span>
              </div>
              <div style={{ overflowX: "auto", maxHeight: "65vh", overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead style={{ position: "sticky", top: 0, background: "#1f2937", zIndex: 1 }}>
                    <tr>
                      {[["SKU","sku"],["Name","name"],["Category","cat"],["Class","cls"],["On Hand","qty"],["PAR","par"],["Gap","gap"],["Location","loc"]].map(([label, field]) => (
                        <th key={field} onClick={() => ["name","qty","gap"].includes(field) && sort(field)} style={{ padding: "12px 16px", textAlign: "left", color: "#6b7280", fontWeight: 600, fontSize: 11, textTransform: "uppercase", cursor: "pointer" }}>
                          {label} {sortField === field ? (sortDir === "desc" ? "v" : "^") : ""}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((item, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #1f2937" }}>
                        <td style={{ padding: "10px 16px", color: "#60a5fa", fontFamily: "monospace", fontSize: 11 }}>{item.sku_id}</td>
                        <td style={{ padding: "10px 16px", fontWeight: 500 }}>{item.name}</td>
                        <td style={{ padding: "10px 16px", color: "#9ca3af", fontSize: 11 }}>{item.category}</td>
                        <td style={{ padding: "10px 16px" }}><Badge value={item.abc_class} /></td>
                        <td style={{ padding: "10px 16px", color: item.quantity_on_hand === 0 ? "#ef4444" : "#f59e0b", fontWeight: 600 }}>{item.quantity_on_hand === 0 ? "STOCKOUT" : item.quantity_on_hand}</td>
                        <td style={{ padding: "10px 16px", color: "#6b7280" }}>{item.reorder_point}</td>
                        <td style={{ padding: "10px 16px", color: "#ef4444", fontWeight: 700 }}>-{item.gap}</td>
                        <td style={{ padding: "10px 16px", color: "#6b7280", fontSize: 11 }}>{item.location_id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab === "charts" && (
          <div style={{ display: "grid", gap: 20 }}>
            <div style={{ background: "#111827", borderRadius: 20, padding: 28, border: "1px solid #1f2937" }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Stockout Risk by Category</div>
              <div style={{ display: "flex", gap: 8, alignItems: "flex-end", height: 200 }}>
                {categoryData.map((d, i) => {
                  const maxCount = Math.max(...categoryData.map(x => x.count));
                  const barColors = ["#3b82f6","#8b5cf6","#10b981","#f59e0b","#ef4444","#ec4899","#06b6d4"];
                  return (
                    <div key={d.name} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                      <div style={{ fontSize: 11, color: "#9ca3af", fontWeight: 600 }}>{d.count}</div>
                      <div style={{ width: "100%", height: (d.count / maxCount * 160) + "px", background: barColors[i % 7], borderRadius: "6px 6px 0 0", minHeight: 4 }} />
                      <div style={{ fontSize: 10, color: "#6b7280", textAlign: "center", transform: "rotate(-30deg)", transformOrigin: "center" }}>{d.name}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
              <div style={{ background: "#111827", borderRadius: 20, padding: 28, border: "1px solid #1f2937" }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>ABC Distribution</div>
                {[["A", "#10b981", abcCounts.A], ["B", "#f59e0b", abcCounts.B], ["C", "#6b7280", abcCounts.C]].map(([cls, color, count]) => {
                  const total = abcCounts.A + abcCounts.B + abcCounts.C || 1;
                  return (
                    <div key={cls} style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ color: "#9ca3af", fontSize: 13 }}>Class {cls}</span>
                        <span style={{ color: "#f9fafb", fontWeight: 600 }}>{count} ({Math.round(count/total*100)}%)</span>
                      </div>
                      <div style={{ background: "#1f2937", borderRadius: 6, height: 8 }}>
                        <div style={{ width: (count/total*100) + "%", height: "100%", background: color, borderRadius: 6 }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div style={{ background: "#111827", borderRadius: 20, padding: 28, border: "1px solid #1f2937" }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 20, color: "#9ca3af", textTransform: "uppercase", letterSpacing: 1 }}>Inventory Health</div>
                {[
                  ["In Stock", (summary?.total_skus || 0) - (summary?.below_par_count || 0), "#10b981"],
                  ["Below PAR", summary?.below_par_count || 0, "#f59e0b"],
                  ["Stockouts", summary?.out_of_stock_count || 0, "#ef4444"],
                ].map(([label, value, color]) => {
                  const total = summary?.total_skus || 1;
                  return (
                    <div key={label} style={{ marginBottom: 16 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ color: "#9ca3af", fontSize: 13 }}>{label}</span>
                        <span style={{ color: "#f9fafb", fontWeight: 600 }}>{value?.toLocaleString()}</span>
                      </div>
                      <div style={{ background: "#1f2937", borderRadius: 6, height: 8 }}>
                        <div style={{ width: (value/total*100) + "%", height: "100%", background: color, borderRadius: 6 }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {tab === "orders" && (
          <div style={{ background: "#111827", borderRadius: 20, overflow: "hidden", border: "1px solid #1f2937" }}>
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #1f2937", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Purchase Orders ({orders.length})</span>
              <span style={{ color: "#34d399", fontWeight: 700, fontSize: 15 }}>Total: ${orders.reduce((s, o) => s + parseFloat(o.total_value || 0), 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "#1f2937" }}>
                  {["PO Number","Supplier","Status","Total Value","Expected","Created"].map(h => (
                    <th key={h} style={{ padding: "12px 20px", textAlign: "left", color: "#6b7280", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {orders.map((o, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #1f2937" }}>
                    <td style={{ padding: "14px 20px", color: "#60a5fa", fontFamily: "monospace", fontSize: 11 }}>{o.id}</td>
                    <td style={{ padding: "14px 20px", color: "#9ca3af" }}>{o.supplier_id}</td>
                    <td style={{ padding: "14px 20px" }}><span style={{ background: "#451a03", color: "#fbbf24", padding: "4px 12px", borderRadius: 20, fontSize: 11, fontWeight: 700 }}>DRAFT</span></td>
                    <td style={{ padding: "14px 20px", color: "#34d399", fontWeight: 700 }}>${parseFloat(o.total_value).toLocaleString("en-US", { minimumFractionDigits: 2 })}</td>
                    <td style={{ padding: "14px 20px", color: "#6b7280" }}>{o.expected_delivery ?? "TBD"}</td>
                    <td style={{ padding: "14px 20px", color: "#6b7280" }}>{o.requested_at?.slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {tab === "ai-agent" && (
          <div style={{ maxWidth: 860, margin: "0 auto" }}>
            <div style={{ background: "#111827", borderRadius: 20, padding: 28, marginBottom: 16, border: "1px solid #1f2937" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
                <div style={{ width: 32, height: 32, background: "linear-gradient(135deg, #1d4ed8, #7c3aed)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700 }}>AI</div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>Ask the AI Agent</div>
                <div style={{ marginLeft: "auto", fontSize: 11, color: "#10b981", background: "#064e3b", padding: "4px 10px", borderRadius: 20, fontWeight: 600 }}>Groq llama-4-scout</div>
              </div>
              <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
                <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && askAgent()} placeholder="Ask anything about inventory, compliance, forecasts..." style={{ flex: 1, background: "#0a0f1a", border: "1px solid #374151", borderRadius: 12, padding: "14px 18px", color: "#f9fafb", fontSize: 14, outline: "none" }} />
                <button onClick={askAgent} disabled={streaming} style={{ background: streaming ? "#1f2937" : "#1d4ed8", color: "#fff", border: "none", borderRadius: 12, padding: "14px 24px", cursor: streaming ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 700, minWidth: 110 }}>
                  {streaming ? "..." : "Ask"}
                </button>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {suggestions.map(s => (
                  <button key={s} onClick={() => setQuery(s)} style={{ background: "#1f2937", border: "1px solid #374151", color: "#6b7280", borderRadius: 20, padding: "5px 12px", cursor: "pointer", fontSize: 11 }}>{s}</button>
                ))}
              </div>
            </div>
            {(response || streaming) && (
              <div style={{ background: "#111827", borderRadius: 20, padding: 28, border: "1px solid #1f2937" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>Agent Response</div>
                  {streaming && <div style={{ color: "#3b82f6", fontSize: 12 }}>Processing...</div>}
                </div>
                <pre ref={responseRef} style={{ color: "#e5e7eb", fontSize: 13, lineHeight: 1.9, whiteSpace: "pre-wrap", margin: 0, maxHeight: "55vh", overflowY: "auto" }}>
                  {response}{streaming && <span style={{ color: "#3b82f6" }}>|</span>}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>

      <style>{"@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}"}</style>
    </div>
  );
}
