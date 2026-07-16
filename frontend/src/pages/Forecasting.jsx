import { useEffect, useMemo, useState } from "react";
import {
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Package, Wallet, Clock, Sparkles, LineChart as LineChartIcon, Boxes, PieChart as PieChartIcon } from "lucide-react";
import api from "../api/client";
import AppShell from "../components/AppShell";
import Card from "../components/Card";
import StatTile from "../components/StatTile";
import { SkeletonStatTile, SkeletonChart } from "../components/Skeleton";
import { CHART_COLORS } from "../lib/chartColors";

export default function Forecasting() {
  const [products, setProducts] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [forecast, setForecast] = useState(null);
  const [categoryDemand, setCategoryDemand] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");

  function loadCategoryDemand() {
    api.get("/forecast/category-demand").then((res) => setCategoryDemand(res.data));
  }

  useEffect(() => {
    api.get("/products/").then((res) => {
      setProducts(res.data);
      if (res.data.length > 0) setSelectedId(String(res.data[0].product_id));
      setLoading(false);
    });
    loadCategoryDemand();
  }, []);

  useEffect(() => {
    if (!selectedId) return;
    setError("");
    api.get(`/forecast/${selectedId}`).then((res) => setForecast(res.data));
  }, [selectedId]);

  async function handleGenerate() {
    setGenerating(true);
    setError("");
    try {
      await api.post(`/forecast/${selectedId}/generate`);
      const { data } = await api.get(`/forecast/${selectedId}`);
      setForecast(data);
      loadCategoryDemand();
    } catch (err) {
      setError(err.response?.data?.detail || "Could not generate a forecast.");
    } finally {
      setGenerating(false);
    }
  }

  const chartData = useMemo(() => {
    if (!forecast) return [];
    const byDate = {};
    for (const a of forecast.actuals) {
      byDate[a.date] = { date: a.date, actual: a.quantity };
    }
    for (const f of forecast.forecast) {
      byDate[f.forecast_date] = {
        ...(byDate[f.forecast_date] || { date: f.forecast_date }),
        predicted: Number(f.predicted_quantity),
      };
    }
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [forecast]);

  const predictedRevenueTotal = useMemo(() => {
    if (!forecast) return 0;
    return forecast.forecast.reduce((sum, f) => sum + Number(f.predicted_revenue), 0);
  }, [forecast]);

  const totalPredictedUnits = useMemo(
    () => categoryDemand.reduce((sum, c) => sum + c.predicted_units, 0),
    [categoryDemand]
  );

  return (
    <AppShell
      title="Sales Forecasting"
      subtitle="Prophet-based 90-day demand prediction"
      actions={
        <div className="flex items-center gap-2">
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="px-3 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500"
          >
            {products.map((p) => (
              <option key={p.product_id} value={p.product_id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleGenerate}
            disabled={generating || !selectedId}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium px-3.5 py-2 rounded-xl text-sm transition-colors shadow-card whitespace-nowrap"
          >
            <Sparkles className="w-4 h-4" strokeWidth={2} />
            {generating ? "Generating..." : "Generate forecast"}
          </button>
        </div>
      }
    >
      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonStatTile key={i} />
            ))}
          </div>
          <SkeletonChart height={340} />
          <SkeletonChart />
        </div>
      ) : (
      <div className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 text-sm px-4 py-3 rounded-xl">{error}</div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile label="Product" value={forecast?.product_name || "—"} icon={Package} accent="blue" />
          <StatTile
            label="Predicted 90-day revenue"
            value={`GHS ${predictedRevenueTotal.toFixed(2)}`}
            icon={Wallet}
            accent="good"
          />
          <StatTile
            label="Predicted units (all products)"
            value={totalPredictedUnits.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            icon={Boxes}
            accent="violet"
          />
          <StatTile
            label="Last generated"
            value={forecast?.generated_at ? new Date(forecast.generated_at).toLocaleDateString() : "Never"}
            sub={forecast?.generated_at ? new Date(forecast.generated_at).toLocaleTimeString() : undefined}
            icon={Clock}
            accent="violet"
          />
        </div>

        <Card title="Actual vs. forecast demand (units/day)">
          {chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <LineChartIcon className="w-8 h-8 mb-2" strokeWidth={1.5} />
              <p className="text-sm">No sales history yet for this product.</p>
              <p className="text-xs mt-0.5">Sell a few units, then generate a forecast.</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={340}>
              <LineChart data={chartData} margin={{ top: 4, right: 8, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="0" stroke="#e2e1da" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "#898781" }}
                  minTickGap={30}
                  axisLine={{ stroke: "#cecdc3" }}
                  tickLine={false}
                />
                <YAxis tick={{ fontSize: 11, fill: "#898781" }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e2e1da",
                    boxShadow: "0 8px 24px -4px rgba(15,14,13,0.16)",
                    fontSize: 13,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
                <Line
                  type="monotone"
                  dataKey="actual"
                  name="Actual"
                  stroke="#2a78d6"
                  dot={false}
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  name="Forecast"
                  stroke="#eb6834"
                  strokeDasharray="5 5"
                  dot={false}
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <Card title="Demand by category (predicted units, 90 days)">
          {categoryDemand.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <PieChartIcon className="w-8 h-8 mb-2" strokeWidth={1.5} />
              <p className="text-sm">No forecasts generated yet.</p>
              <p className="text-xs mt-0.5">Generate a forecast for a product to see category-level demand.</p>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-8">
              <ResponsiveContainer width="100%" height={260} className="md:!w-1/2">
                <PieChart>
                  <Pie
                    data={categoryDemand}
                    dataKey="predicted_units"
                    nameKey="category"
                    innerRadius={64}
                    outerRadius={100}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {categoryDemand.map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => `${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })} units`}
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e1da",
                      boxShadow: "0 8px 24px -4px rgba(15,14,13,0.16)",
                      fontSize: 13,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="w-full md:w-1/2 space-y-2.5">
                {categoryDemand.map((c, i) => (
                  <div key={c.category} className="flex items-center gap-3">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }}
                    />
                    <span className="text-sm text-gray-700 flex-1 truncate">{c.category}</span>
                    <span className="text-sm font-medium text-gray-900 tabular-nums">
                      {c.predicted_units.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    <span className="text-xs text-gray-400 w-12 text-right tabular-nums">
                      {totalPredictedUnits > 0 ? Math.round((c.predicted_units / totalPredictedUnits) * 100) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>
      </div>
      )}
    </AppShell>
  );
}
