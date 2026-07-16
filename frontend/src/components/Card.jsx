export default function Card({ title, action, children, className = "" }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-150 shadow-card p-6 ${className}`}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-4">
          {title && <h3 className="font-semibold text-gray-900">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}
