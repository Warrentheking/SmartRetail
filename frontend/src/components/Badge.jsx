const TONES = {
  good: "bg-green-50 text-status-good ring-1 ring-inset ring-green-100",
  info: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100",
  warning: "bg-amber-50 text-status-warning ring-1 ring-inset ring-amber-100",
  critical: "bg-red-50 text-status-critical ring-1 ring-inset ring-red-100",
  violet: "bg-violet-50 text-chart-violet ring-1 ring-inset ring-violet-100",
  neutral: "bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-200",
};

export function Badge({ tone = "neutral", children, className = "" }) {
  return (
    <span
      className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${TONES[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

const SEGMENT_TONES = {
  Champion: "good",
  Loyal: "info",
  "At Risk": "critical",
  Occasional: "neutral",
  New: "violet",
};

export function SegmentBadge({ label }) {
  return <Badge tone={SEGMENT_TONES[label] || "neutral"}>{label}</Badge>;
}
