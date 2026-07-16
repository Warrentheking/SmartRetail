import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import {
  FileText,
  MessageCircle,
  Clock3,
  ListChecks,
  CalendarClock,
  Send,
  FileX,
  Wallet,
  ShoppingCart,
  Users,
  Receipt,
  TrendingUp,
} from "lucide-react";
import api from "../api/client";
import AppShell from "../components/AppShell";
import Card from "../components/Card";
import StatTile from "../components/StatTile";
import { Badge } from "../components/Badge";
import LoadingScreen from "../components/LoadingScreen";

const SCHEDULE = [
  { type: "daily", label: "Daily Summary", time: "Every day at 9:00 PM" },
  { type: "weekly", label: "Weekly Summary", time: "Every Sunday at 8:00 PM" },
  { type: "monthly", label: "Monthly Summary", time: "1st of every month at 9:00 PM" },
];

function parseReportStats(text) {
  if (!text) return null;
  const revenueMatch = text.match(/Revenue:\s*GHS\s*([\d,]+\.\d{2})\s*\((\d+)\s*sale/);
  if (!revenueMatch) return null;
  const customersMatch = text.match(/Active customers:\s*(\d+)/);
  const revenue = parseFloat(revenueMatch[1].replace(/,/g, ""));
  const sales = parseInt(revenueMatch[2], 10);
  return {
    revenue,
    sales,
    activeCustomers: customersMatch ? parseInt(customersMatch[1], 10) : 0,
    avgSale: sales > 0 ? revenue / sales : 0,
  };
}

export default function Reports() {
  const [reports, setReports] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generatingType, setGeneratingType] = useState(null);
  const [error, setError] = useState("");

  async function loadReports() {
    const { data } = await api.get("/reports/");
    setReports(data);
    setLoading(false);
  }

  useEffect(() => {
    loadReports();
    api.get("/reports/revenue-trend").then((res) => setRevenueTrend(res.data));
  }, []);

  async function handleGenerate(type) {
    setGeneratingType(type);
    setError("");
    try {
      await api.post(`/reports/generate/${type}`);
      await loadReports();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not generate report.");
    } finally {
      setGeneratingType(null);
    }
  }

  if (loading) {
    return <LoadingScreen label="Loading reports..." />;
  }

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const reportsThisMonth = reports.filter((r) => new Date(r.sent_at) >= monthStart).length;
  const lastReport = reports[0];
  const lastReportStats = lastReport ? parseReportStats(lastReport.content_summary) : null;

  return (
    <AppShell title="Automated Reports" subtitle="Daily, weekly, and monthly summaries via WhatsApp">
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile label="Reports sent this month" value={reportsThisMonth} icon={ListChecks} accent="blue" />
          <StatTile label="Delivery channel" value="WhatsApp" icon={MessageCircle} accent="good" />
          <StatTile
            label="Last report sent"
            value={lastReport ? new Date(lastReport.sent_at).toLocaleDateString() : "Never"}
            sub={lastReport ? new Date(lastReport.sent_at).toLocaleTimeString() : undefined}
            icon={Clock3}
            accent="violet"
          />
          <StatTile label="Total reports logged" value={reports.length} icon={FileText} accent="blue" />
        </div>

        <Card title="Schedule">
          <div className="space-y-1">
            {SCHEDULE.map((s) => (
              <div key={s.type} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <CalendarClock className="w-4.5 h-4.5" strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{s.label}</p>
                  <p className="text-xs text-gray-400">{s.time}</p>
                </div>
                <button
                  onClick={() => handleGenerate(s.type)}
                  disabled={generatingType === s.type}
                  className="inline-flex items-center gap-1.5 text-sm bg-blue-50 hover:bg-blue-100 disabled:opacity-50 text-blue-700 font-medium px-3 py-1.5 rounded-lg transition-colors shrink-0"
                >
                  <Send className="w-3.5 h-3.5" strokeWidth={2} />
                  {generatingType === s.type ? "Sending..." : "Send now"}
                </button>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Revenue over the last 6 months">
          {revenueTrend.every((m) => m.revenue === 0) ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <TrendingUp className="w-8 h-8 mb-2" strokeWidth={1.5} />
              <p className="text-sm">No revenue recorded yet.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={revenueTrend} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="0" stroke="#e2e1da" vertical={false} />
                <XAxis
                  dataKey="month"
                  tick={{ fontSize: 11, fill: "#898781" }}
                  axisLine={{ stroke: "#cecdc3" }}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: "#898781" }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(value) => `GHS ${Number(value).toFixed(2)}`}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e2e1da",
                    boxShadow: "0 8px 24px -4px rgba(15,14,13,0.16)",
                    fontSize: 13,
                  }}
                />
                <Bar dataKey="revenue" fill="#2a78d6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {lastReport && (
          <Card title="Latest report preview">
            <div className="space-y-4">
              {lastReportStats && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <StatTile
                    label="Revenue"
                    value={`GHS ${lastReportStats.revenue.toFixed(2)}`}
                    icon={Wallet}
                    accent="good"
                  />
                  <StatTile label="Sales" value={lastReportStats.sales} icon={ShoppingCart} accent="blue" />
                  <StatTile
                    label="Active customers"
                    value={lastReportStats.activeCustomers}
                    icon={Users}
                    accent="violet"
                  />
                  <StatTile
                    label="Avg. sale value"
                    value={`GHS ${lastReportStats.avgSale.toFixed(2)}`}
                    icon={Receipt}
                    accent="blue"
                  />
                </div>
              )}
              <pre className="text-sm text-gray-700 bg-gray-50 rounded-xl p-4 whitespace-pre-wrap font-sans border border-gray-100">
                {lastReport.content_summary}
              </pre>
            </div>
          </Card>
        )}

        <Card title="Report history">
          {reports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <FileX className="w-8 h-8 mb-2" strokeWidth={1.5} />
              <p className="text-sm">No reports sent yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="pb-3 px-2 font-medium">Type</th>
                    <th className="pb-3 px-2 font-medium">Channel</th>
                    <th className="pb-3 px-2 font-medium">Sent at</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {reports.map((r) => (
                    <tr key={r.report_id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="py-3 px-2 text-gray-900 capitalize">{r.report_type}</td>
                      <td className="py-3 px-2">
                        <Badge tone="good" className="capitalize">
                          {r.sent_via}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-gray-400">{new Date(r.sent_at).toLocaleString()}</td>
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
