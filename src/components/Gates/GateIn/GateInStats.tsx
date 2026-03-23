import React from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { CardSkeleton } from '../../Common/CardSkeleton';

interface GateInStatsProps {
  todayGateIns: number;
  yesterdayGateIns?: number;
  pendingOperations: number;
  containersProcessed: number;
  damagedContainers: number;
  loading?: boolean;
}

export const GateInStats: React.FC<GateInStatsProps> = ({
  todayGateIns,
  yesterdayGateIns = 0,
  pendingOperations,
  containersProcessed,
  damagedContainers,
  loading = false
}) => {
  const calculateGrowth = () => {
    if (yesterdayGateIns === 0) {
      return todayGateIns > 0 ? 100 : 0;
    }
    return Math.round(((todayGateIns - yesterdayGateIns) / yesterdayGateIns) * 100);
  };

  const growth = calculateGrowth();
  const isPositive = growth >= 0;

  if (loading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"><CardSkeleton count={4} /></div>;
  }
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {/* Stat 1: Today's Gate Ins */}
      <div className="bg-white p-6 rounded-2xl shadow-[0_10px_30px_-5px_rgba(25,28,30,0.04)] flex flex-col justify-between group hover:bg-slate-50 transition-colors border border-slate-100">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-emerald-50 rounded-xl">
            <CheckCircle className="h-6 w-6 text-emerald-600" />
          </div>
          <span className={`text-xs font-bold ${isPositive ? 'text-emerald-600 bg-emerald-50' : 'text-amber-600 bg-amber-50'} px-2.5 py-1 rounded-full tracking-wide font-inter antialiased`}>
            {isPositive ? '+' : ''}{growth}% Today
          </span>
        </div>
        <div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Today's Gate Ins</p>
          <h3 className="text-4xl font-bold text-slate-900 tracking-tight">{todayGateIns}</h3>
        </div>
      </div>

      {/* Stat 2: Pending */}
      <div className="bg-white p-6 rounded-2xl shadow-[0_10px_30px_-5px_rgba(25,28,30,0.04)] flex flex-col justify-between hover:bg-slate-50 transition-colors border border-slate-100">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-amber-50 rounded-xl">
            {/* <ClipboardClock className="h-6 w-6 text-amber-600" /> */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-clipboard-clock-icon lucide-clipboard-clock h-6 w-6 text-amber-600"><path d="M16 14v2.2l1.6 1" /><path d="M16 4h2a2 2 0 0 1 2 2v.832" /><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h2" /><circle cx="16" cy="16" r="6" /><rect x="8" y="2" width="8" height="4" rx="1" /></svg>
          </div>
          <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full tracking-wide font-inter antialiased">High Priority</span>
        </div>
        <div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Pending Operations</p>
          <h3 className="text-4xl font-bold text-slate-900 tracking-tight">{pendingOperations}</h3>
        </div>
      </div>

      {/* Stat 3: Processed */}
      <div className="bg-white p-6 rounded-2xl shadow-[0_10px_30px_-5px_rgba(25,28,30,0.04)] flex flex-col justify-between hover:bg-slate-50 transition-colors border border-slate-100">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-blue-50 rounded-xl">
            {/* <FileCheckCorner className="h-6 w-6 text-blue-600" /> */}
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-file-check-corner-icon lucide-file-check-corner h-6 w-6 text-blue-600"><path d="M10.5 22H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.706.706l3.588 3.588A2.4 2.4 0 0 1 20 8v6" /><path d="M14 2v5a1 1 0 0 0 1 1h5" /><path d="m14 20 2 2 4-4" /></svg>
          </div>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full tracking-wide font-inter antialiased">Total TEU</span>
        </div>
        <div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Processed Containers</p>
          <h3 className="text-4xl font-bold text-slate-900 tracking-tight">{containersProcessed}</h3>
        </div>
      </div>

      {/* Stat 4: Damaged */}
      <div className="bg-white p-6 rounded-2xl shadow-[0_10px_30px_-5px_rgba(25,28,30,0.04)] flex flex-col justify-between hover:bg-slate-50 transition-colors border border-slate-100">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 bg-orange-100 rounded-xl">
            <AlertTriangle className="h-6 w-6 text-orange-600" />
          </div>
          <span className="text-xs font-bold text-orange-600 bg-orange-100 px-2.5 py-1 rounded-full tracking-wide font-inter antialiased">Requires Attention</span>
        </div>
        <div>
          <p className="text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">Damaged Containers</p>
          <h3 className="text-4xl font-bold text-slate-900 tracking-tight">{damagedContainers}</h3>
        </div>
      </div>
    </div>
  );
};
