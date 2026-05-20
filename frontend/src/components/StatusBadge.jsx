export default function StatusBadge({ status, size = 'sm' }) {
  const statusConfig = {
    green: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Compliant' },
    amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Needs Attention' },
    orange: { bg: 'bg-orange-500/20', text: 'text-orange-400', label: 'Warning' },
    red: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Critical' },
    completed: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Completed' },
    processing: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Processing' },
    failed: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Failed' },
    partial: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Partial' },
    active: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Active' },
    inactive: { bg: 'bg-dark-500/20', text: 'text-dark-400', label: 'Inactive' },
    critical: { bg: 'bg-red-500/20', text: 'text-red-400', label: 'Critical' },
    warning: { bg: 'bg-amber-500/20', text: 'text-amber-400', label: 'Warning' },
    info: { bg: 'bg-blue-500/20', text: 'text-blue-400', label: 'Info' },
    success: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', label: 'Success' },
  };

  const config = statusConfig[status] || statusConfig.info;
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span className={`inline-flex items-center rounded-full font-medium ${config.bg} ${config.text} ${sizeClasses}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.text.replace('text-', 'bg-')} mr-1.5`} />
      {config.label}
    </span>
  );
}
