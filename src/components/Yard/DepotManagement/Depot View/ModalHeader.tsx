import React from 'react';
import { Building, X } from 'lucide-react';
import { Yard } from '../../../../types';

interface Props {
  depot: Yard;
  onClose: () => void;
}

export const ModalHeader: React.FC<Props> = ({ depot, onClose }) => (
  <header className="flex items-center justify-between px-8 py-5 border-b border-gray-200">
    <div className="flex items-center gap-4">
      <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-cyan-500/30">
        <Building className="h-7 w-7 text-white" />
      </div>
      <div>
        <h2 id="depot-modal-title" className="text-2xl font-bold tracking-tight text-gray-800">
          {depot.name}
        </h2>
        <p className="text-sm text-gray-600">{depot.code}</p>
      </div>
      <StatusPill active={depot.isActive} />
    </div>
    <button
      onClick={onClose}
      aria-label="Close modal"
      className="p-2 rounded-full text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition"
    >
      <X className="h-6 w-6" />
    </button>
  </header>
);

const StatusPill: React.FC<{ active: boolean }> = ({ active }) => (
  <span
    className={`px-3 py-1 text-xs font-semibold rounded-full ${
      active ? 'bg-green-500/20 text-green-500' : 'bg-red-500/20 text-red-500'
    }`}
  >
    {active ? 'Active' : 'Inactive'}
  </span>
);
