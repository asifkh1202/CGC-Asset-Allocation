import { useState } from 'react';
import BaselineDashboard from './BaselineDashboard';

const tools = ['Cube', 'AD', 'DC', 'KES', 'DLP'];

export default function DynamicBaseline() {
  const [selectedTool, setSelectedTool] = useState('Cube');

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <h2 className="text-lg font-semibold text-white">Select Baseline:</h2>
        <div className="flex gap-2">
          {tools.map((tool) => (
            <button
              key={tool}
              onClick={() => setSelectedTool(tool)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedTool === tool
                  ? 'bg-primary-600 text-white'
                  : 'bg-dark-800 text-dark-300 hover:bg-dark-700 border border-dark-600'
              }`}
            >
              {tool}
            </button>
          ))}
        </div>
      </div>

      {/* Re-use BaselineDashboard with simulated params */}
      <DynamicBaselineContent tool={selectedTool} />
    </div>
  );
}

function DynamicBaselineContent({ tool }) {
  // This wraps BaselineDashboard's logic inline for the dynamic selector
  return <BaselineDashboard key={tool} />;
}
