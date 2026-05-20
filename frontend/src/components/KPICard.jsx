import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function KPICard({ title, value, subtitle, trend, trendValue, icon: Icon, color = 'primary' }) {
  const colorMap = {
    primary: 'from-primary-600 to-primary-800',
    green: 'from-emerald-600 to-emerald-800',
    amber: 'from-amber-600 to-amber-800',
    red: 'from-red-600 to-red-800',
    blue: 'from-blue-600 to-blue-800',
    purple: 'from-purple-600 to-purple-800',
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-dark-400';

  return (
    <div className="bg-dark-800 rounded-xl border border-dark-700 p-6 hover:border-primary-500/50 transition-all duration-300 animate-fade-in">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-dark-400 uppercase tracking-wide">{title}</h3>
        {Icon && (
          <div className={`p-2 rounded-lg bg-gradient-to-br ${colorMap[color]} bg-opacity-20`}>
            <Icon className="w-5 h-5 text-white" />
          </div>
        )}
      </div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-3xl font-bold text-white">{value}</p>
          {subtitle && <p className="text-sm text-dark-400 mt-1">{subtitle}</p>}
        </div>
        {trendValue !== undefined && (
          <div className={`flex items-center gap-1 ${trendColor}`}>
            <TrendIcon className="w-4 h-4" />
            <span className="text-sm font-medium">{trendValue}%</span>
          </div>
        )}
      </div>
    </div>
  );
}
