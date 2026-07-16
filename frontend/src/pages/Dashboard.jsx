import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Wallet, CalendarDays, TrendingUp, Users, AlertTriangle, Package, Plus, Ban } from "lucide-react";
import api from "../api/client";
import { useToast } from "../context/ToastContext";
import AppShell from "../components/AppShell";
import StatTile from "../components/StatTile";
import Card from "../components/Card";
import { Badge } from "../components/Badge";
import ConfirmDialog from "../components/ConfirmDialog";
import LoadingScreen from "../components/LoadingScreen";

const fmt = (n) => `GHS ${Number(n).toFixed(2)}`;

export default function Dashboard() {
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pendingVoid, setPendingVoid] = useState(null);
  const [voiding, setVoiding] = useState(false);
  const [voidError, setVoidError] = useState("");

  function loadDashboard() {
    api.get("/dashboard/").then((res) => {
      setData(res.data);
      setLoading(false);
    });
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  async function confirmVoid() {
    setVoiding(true);
    setVoidError("");
    try {
      await api.post(`/transactions/${pendingVoid.transaction_id}/void`);
      showToast(`Transaction #${pendingVoid.transaction_id} voided and stock restored`);
      setPendingVoid(null);
      loadDashboard();
    } catch (err) {
      setVoidError(err.response?.data?.detail || "Could not void this transaction.");
      setPendingVoid(null);
    } finally {
      setVoiding(false);
    }
  }

  if (loading) {
    return <LoadingScreen label="Loading dashboard..." />;
  }

  return (
    <AppShell
      title="Dashboard"
      subtitle="Today's business at a glance"
      actions={
        <Link
          to="/pos"
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-3.5 py-2 rounded-lg transition-colors shadow-card"
        >
          <Plus className="w-4 h-4" strokeWidth={2.5} />
          New Sale
        </Link>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile
            label="Revenue today"
            value={fmt(data.sales.today.revenue)}
            sub={`${data.sales.today.count} sale${data.sales.today.count === 1 ? "" : "s"}`}
            icon={Wallet}
            accent="blue"
          />
          <StatTile
            label="Revenue this week"
            value={fmt(data.sales.this_week.revenue)}
            sub={`${data.sales.this_week.count} sale${data.sales.this_week.count === 1 ? "" : "s"}`}
            icon={CalendarDays}
            accent="blue"
          />
          <StatTile
            label="Revenue this month"
            value={fmt(data.sales.this_month.revenue)}
            sub={`${data.sales.this_month.count} sale${data.sales.this_month.count === 1 ? "" : "s"}`}
            icon={TrendingUp}
            accent="blue"
          />
          <StatTile label="Total customers" value={data.total_customers} icon={Users} accent="violet" />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card
            title="Low stock alerts"
            action={data.low_stock_products.length > 0 && <Badge tone="critical">{data.low_stock_products.length}</Badge>}
          >
            {data.low_stock_products.length === 0 ? (
              <p className="text-sm text-gray-400">All products are well stocked.</p>
            ) : (
              <ul className="space-y-1">
                {data.low_stock_products.map((p) => (
                  <li key={p.product_id} className="flex items-center gap-3 py-2 first:pt-0">
                    <div className="w-8 h-8 rounded-lg bg-red-50 text-status-critical flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-4 h-4" strokeWidth={2} />
                    </div>
                    <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{p.name}</span>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-status-critical">{p.stock_quantity} left</p>
                      <p className="text-xs text-gray-400">
                        {p.days_until_stockout != null
                          ? `~${Math.round(p.days_until_stockout)} day${Math.round(p.days_until_stockout) === 1 ? "" : "s"} left`
                          : "Not enough sales history"}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card title="Top products this month">
            {data.top_products.length === 0 ? (
              <p className="text-sm text-gray-400">No sales recorded yet.</p>
            ) : (
              <ul className="space-y-1">
                {data.top_products.map((p, i) => (
                  <li key={p.product_id} className="flex items-center gap-3 py-2 first:pt-0">
                    <div className="w-6 h-6 rounded-md bg-gray-100 text-gray-500 text-xs font-semibold flex items-center justify-center shrink-0">
                      {i + 1}
                    </div>
                    <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{p.name}</span>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-medium text-gray-900">{fmt(p.total_revenue)}</p>
                      <p className="text-xs text-gray-400">{p.total_sold} units sold</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <Card title="Recent transactions">
          {voidError && (
            <div className="mb-3 bg-red-50 border border-red-100 text-red-600 text-sm px-3.5 py-2.5 rounded-xl">
              {voidError}
            </div>
          )}
          {data.recent_transactions.length === 0 ? (
            <p className="text-sm text-gray-400 flex items-center gap-2">
              <Package className="w-4 h-4" /> No transactions recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="pb-3 px-2 font-medium">#</th>
                    <th className="pb-3 px-2 font-medium">Amount</th>
                    <th className="pb-3 px-2 font-medium">Payment</th>
                    <th className="pb-3 px-2 font-medium">Customer</th>
                    <th className="pb-3 px-2 font-medium">Date</th>
                    <th className="pb-3 px-2 font-medium" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {data.recent_transactions.map((t) => (
                    <tr key={t.transaction_id} className={`hover:bg-gray-50/60 transition-colors ${t.voided ? "opacity-50" : ""}`}>
                      <td className="py-3 px-2 text-gray-400">#{t.transaction_id}</td>
                      <td className="py-3 px-2 font-medium text-gray-900">{fmt(t.total_amount)}</td>
                      <td className="py-3 px-2">
                        <Badge tone="info" className="capitalize">
                          {t.payment_method.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-gray-500">
                        {t.customer_id ? `Customer #${t.customer_id}` : "Walk-in"}
                      </td>
                      <td className="py-3 px-2 text-gray-400">{new Date(t.created_at).toLocaleString()}</td>
                      <td className="py-3 px-2 text-right">
                        {t.voided ? (
                          <Badge tone="critical">Voided</Badge>
                        ) : (
                          <button
                            onClick={() => setPendingVoid(t)}
                            aria-label={`Void transaction ${t.transaction_id}`}
                            className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-red-600 hover:bg-red-50 px-2 py-1 rounded-md transition-colors"
                          >
                            <Ban className="w-3.5 h-3.5" strokeWidth={2} />
                            Void
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={!!pendingVoid}
        title={`Void transaction #${pendingVoid?.transaction_id}?`}
        description={`This restores the sold stock and removes ${pendingVoid ? fmt(pendingVoid.total_amount) : ""} from revenue. This can't be undone.`}
        confirmLabel={voiding ? "Voiding..." : "Void transaction"}
        onConfirm={confirmVoid}
        onCancel={() => setPendingVoid(null)}
      />
    </AppShell>
  );
}
