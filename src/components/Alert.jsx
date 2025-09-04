export default function Alert({ type = 'info', message, onDismiss }) {
  if (!message) return null;
  const styles = {
    success: 'bg-green-50 border-green-300 text-green-800',
    error: 'bg-red-50 border-red-300 text-red-800',
    info: 'bg-blue-50 border-blue-300 text-blue-800',
  };
  return (
    <div className={`mb-4 rounded border p-3 ${styles[type] || styles.info}`} role="status">
      <div className="flex items-start justify-between gap-4">
        <span className="text-sm">{message}</span>
        {onDismiss && (
          <button
            aria-label="Dismiss"
            className="text-xs px-2 py-1 rounded border hover:bg-white/50"
            onClick={onDismiss}
          >
            Close
          </button>
        )}
      </div>
    </div>
  );
}

