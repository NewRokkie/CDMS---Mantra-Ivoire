import React from 'react';

interface Props {
  value: number;
}

export const RadialGauge: React.FC<Props> = ({ value }) => {
  const r = 50;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;

  return (
    <div className="flex justify-center">
      <div className="relative w-40 h-40">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r={r} strokeWidth="10" stroke="rgba(0,0,0,0.1)" fill="none" />
          <circle
            cx="60"
            cy="60"
            r={r}
            strokeWidth="10"
            stroke="url(#gaugeGradient)"
            fill="none"
            strokeDasharray={c}
            strokeDashoffset={offset}
            strokeLinecap="round"
            className="transition-all duration-700"
          />
          <defs>
            <linearGradient id="gaugeGradient">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 grid place-items-center text-2xl font-bold text-gray-800">
          {value.toFixed(1)}%
        </div>
      </div>
    </div>
  );
};
