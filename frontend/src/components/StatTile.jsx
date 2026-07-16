import { ArrowDownRight, ArrowUpRight } from "lucide-react";

/**
 * label: sentence case, no trailing colon
 * value: pre-formatted string (compact where applicable)
 * icon: lucide icon component
 * delta: { value: string, direction: "up" | "down", goodDirection?: "up" | "down" }
 */
export default function StatTile({ label, value, sub, icon: Icon, delta, accent = "blue" }) {
  const accentClasses = {
    blue: "bg-blue-50 text-blue-600",
    good: "bg-green-50 text-status-good",
    critical: "bg-red-50 text-status-critical",
    violet: "bg-violet-50 text-chart-violet",
  };

  let deltaColor = "text-gray-500";
  if (delta) {
    const isGood = delta.direction === (delta.goodDirection || "up");
    deltaColor = isGood ? "text-status-good" : "text-status-critical";
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-150 shadow-card p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-gray-500">{label}</p>
        {Icon && (
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${accentClasses[accent]}`}>
            <Icon className="w-4 h-4" strokeWidth={2.25} />
          </div>
        )}
      </div>
      <p className="text-2xl font-semibold text-gray-900 tracking-tight">{value}</p>
      {(sub || delta) && (
        <div className="flex items-center gap-1.5 mt-1.5">
          {delta && (
            <span className={`flex items-center gap-0.5 text-xs font-medium ${deltaColor}`}>
              {delta.direction === "up" ? (
                <ArrowUpRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" strokeWidth={2.5} />
              )}
              {delta.value}
            </span>
          )}
          {sub && <span className="text-xs text-gray-400">{sub}</span>}
        </div>
      )}
    </div>
  );
}
