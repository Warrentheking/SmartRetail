import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Users, AlertOctagon, LayersIcon, Wallet, Sparkles, UserX, BarChart3 } from "lucide-react";
import api from "../api/client";
import AppShell from "../components/AppShell";
import Card from "../components/Card";
import StatTile from "../components/StatTile";
import { SegmentBadge } from "../components/Badge";
import LoadingScreen from "../components/LoadingScreen";

const SEGMENT_COLORS = {
  Champion: "#0ca30c",
  Loyal: "#2a78d6",
  "At Risk": "#d03b3b",
  New: "#4a3aa7",
  Occasional: "#aba99e",
};

export default function CustomerAnalytics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  async function loadSegments() {
    const { data } = await api.get("/segments/");
    setData(data);
    setLoading(false);
  }

  useEffect(() => {
    loadSegments();
  }, []);

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    try {
      await api.post("/segments/generate");
      await loadSegments();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not generate customer segments.");
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return <LoadingScreen label="Loading customer analytics..." />;
  }

  const totalSegmented = data.customers.length;
  const atRiskCount = data.summary.find((s) => s.segment_label === "At Risk")?.customer_count || 0;

  return (
    <AppShell
      title="Customer Analytics"
      subtitle="RFM scoring and K-Means segmentation"
      actions={
        <button
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-3.5 py-2 rounded-xl text-sm transition-colors shadow-card"
        >
          <Sparkles className="w-4 h-4" strokeWidth={2} />
          {generating ? "Segmenting..." : "Generate segments"}
        </button>
      }
    >
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile label="Segmented customers" value={totalSegmented} icon={Users} accent="blue" />
          <StatTile label="At-risk customers" value={atRiskCount} icon={AlertOctagon} accent="critical" />
          <StatTile label="Average spend" value={`GHS ${data.avg_spend.toFixed(2)}`} icon={Wallet} accent="good" />
          <StatTile label="Segments found" value={data.summary.length} icon={LayersIcon} accent="violet" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="Customer segments">
            {data.summary.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <UserX className="w-8 h-8 mb-2" strokeWidth={1.5} />
                <p className="text-sm text-center">
                  No segments yet. Generate segments once you have at least 5 customers with purchase history.
                </p>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <ResponsiveContainer width="100%" height={220} className="sm:!w-1/2">
                  <PieChart>
                    <Pie
                      data={data.summary}
                      dataKey="customer_count"
                      nameKey="segment_label"
                      innerRadius={54}
                      outerRadius={88}
                      paddingAngle={2}
                      strokeWidth={0}
                    >
                      {data.summary.map((s) => (
                        <Cell key={s.segment_label} fill={SEGMENT_COLORS[s.segment_label] || "#aba99e"} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => `${value} customer${value === 1 ? "" : "s"}`}
                      contentStyle={{
                        borderRadius: 12,
                        border: "1px solid #e2e1da",
                        boxShadow: "0 8px 24px -4px rgba(15,14,13,0.16)",
                        fontSize: 13,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>

                <div className="w-full sm:w-1/2 space-y-2.5">
                  {data.summary.map((s) => (
                    <div key={s.segment_label} className="flex items-center gap-3">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: SEGMENT_COLORS[s.segment_label] || "#aba99e" }}
                      />
                      <span className="text-sm text-gray-700 flex-1 truncate">{s.segment_label}</span>
                      <span className="text-sm font-medium text-gray-900 tabular-nums">{s.customer_count}</span>
                      <span className="text-xs text-gray-400 w-10 text-right tabular-nums">
                        {totalSegmented > 0 ? Math.round((s.customer_count / totalSegmented) * 100) : 0}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <Card title="Purchase frequency">
            {data.purchase_frequency.every((b) => b.customer_count === 0) ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <BarChart3 className="w-8 h-8 mb-2" strokeWidth={1.5} />
                <p className="text-sm text-center">No purchase history yet.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={data.purchase_frequency} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="0" stroke="#e2e1da" vertical={false} />
                  <XAxis
                    dataKey="bucket"
                    tick={{ fontSize: 11, fill: "#898781" }}
                    axisLine={{ stroke: "#cecdc3" }}
                    tickLine={false}
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#898781" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip
                    formatter={(value) => `${value} customer${value === 1 ? "" : "s"}`}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e1da",
                      boxShadow: "0 8px 24px -4px rgba(15,14,13,0.16)",
                      fontSize: 13,
                    }}
                  />
                  <Bar dataKey="customer_count" fill="#2a78d6" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>

        <Card title="Customers">
          {data.customers.length === 0 ? (
            <p className="text-sm text-gray-400">No segmented customers yet.</p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="pb-3 px-2 font-medium">Name</th>
                    <th className="pb-3 px-2 font-medium">Phone</th>
                    <th className="pb-3 px-2 font-medium">R</th>
                    <th className="pb-3 px-2 font-medium">F</th>
                    <th className="pb-3 px-2 font-medium">M</th>
                    <th className="pb-3 px-2 font-medium">Segment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.customers.map((c) => (
                    <tr key={c.customer_id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 px-2 text-gray-900">{c.customer_name}</td>
                      <td className="py-3 px-2 text-gray-500">{c.phone_number || "-"}</td>
                      <td className="py-3 px-2 text-gray-600 tabular-nums">{c.recency_score}</td>
                      <td className="py-3 px-2 text-gray-600 tabular-nums">{c.frequency_score}</td>
                      <td className="py-3 px-2 text-gray-600 tabular-nums">{c.monetary_score}</td>
                      <td className="py-3 px-2">
                        <SegmentBadge label={c.segment_label} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppShell>
  );
}
