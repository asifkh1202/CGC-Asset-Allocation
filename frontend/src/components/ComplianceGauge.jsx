export default function ComplianceGauge({ value, label, size = 120 }) {
  const percentage = Math.min(Math.max(value || 0, 0), 100);
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const getColor = (val) => {
    if (val >= 90) return '#10b981';
    if (val >= 75) return '#f59e0b';
    if (val >= 60) return '#f97316';
    return '#ef4444';
  };

  const color = getColor(percentage);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#1e293b"
            strokeWidth="8"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xl font-bold text-white">{percentage.toFixed(1)}%</span>
        </div>
      </div>
      {label && <span className="text-sm text-dark-400 font-medium">{label}</span>}
    </div>
  );
}
