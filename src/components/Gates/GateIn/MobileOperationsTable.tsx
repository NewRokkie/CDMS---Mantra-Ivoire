import React, { useState } from 'react';
import { Wifi, WifiOff, Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';

interface Operation {
  id: string;
  date: Date;
  createdAt: Date;
  containerNumber: string;
  secondContainerNumber?: string;
  containerSize: string;
  containerType?: string;
  clientCode: string;
  clientName: string;
  truckNumber?: string;
  vehicleNumber?: string;
  driverName: string;
  transportCompany: string;
  operationStatus: 'pending' | 'completed';
  assignedLocation?: string;
  bookingReference?: string;
  status: 'pending' | 'in_process' | 'completed' | 'cancelled';
  classification?: 'divers' | 'alimentaire';
  completedAt?: Date;
  ediTransmitted?: boolean;
  ediLogId?: string;
  ediErrorMessage?: string;
}

interface MobileOperationsTableProps {
  operations: Operation[];
  searchTerm: string;
  selectedFilter: string;
  onClearSearch?: () => void;
  onClearFilter?: () => void;
  onSearchChange?: (val: string) => void;
  onFilterChange?: (val: string) => void;
  onExport?: () => void;
  totalOperations?: number;
}

export const MobileOperationsTable: React.FC<MobileOperationsTableProps> = ({
  operations,
  searchTerm,
  selectedFilter,
  onClearSearch,
  onClearFilter,
  onSearchChange,
  onFilterChange,
  onExport,
  totalOperations
}) => {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const totalPages = Math.ceil(operations.length / itemsPerPage);

  const currentOperations = operations.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusStyle = (status?: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-50 text-emerald-600';
      case 'in_process': return 'bg-blue-50 text-blue-600';
      case 'cancelled': return 'bg-red-50 text-red-600';
      case 'pending':
      default:
        return 'bg-amber-50 text-amber-600';
    }
  };

  const getContainerLeftBorderColor = (status?: string, type?: string) => {
    if (type === 'alimentaire') return 'bg-emerald-500';
    if (status === 'completed') return 'bg-blue-600';
    return 'bg-amber-400';
  };

  const getEDIStatusBadge = (operation: Operation) => {
    if (operation.status !== 'completed') {
      return (
        <span className="inline-block px-3 py-1 rounded-full text-[10px] font-bold tracking-wide bg-slate-50 text-slate-400 font-inter antialiased">
          Pending
        </span>
      );
    }

    if (operation.ediTransmitted === true) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide bg-emerald-50 text-emerald-600 font-inter antialiased">
          <Wifi className="h-3.5 w-3.5" /> EDI Sent
        </span>
      );
    } else if (operation.ediTransmitted === false) {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide bg-red-50 text-red-600 font-inter antialiased">
          <WifiOff className="h-3.5 w-3.5" /> EDI Failed
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide bg-slate-100 text-slate-500 font-inter antialiased">
          <WifiOff className="h-3.5 w-3.5" /> No EDI
        </span>
      );
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-[0_10px_30px_-5px_rgba(25,28,30,0.04)] overflow-hidden border border-gray-100 dark:bg-gray-800 dark:border-gray-700">
      <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 xl:items-end dark:border-gray-700">
        <div>
          <h4 className="text-xl font-bold text-gray-900 tracking-tight dark:text-white">Recent Operations</h4>
          <p className="text-gray-500 text-sm">Gate In</p>
        </div>
        <div className="relative group w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <input
            className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200/30 rounded-[2rem] text-xs focus:ring-2 focus:ring-blue-500 w-full sm:w-64 transition-all font-display placeholder:text-gray-400 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 font-inter antialiased"
            placeholder="Search container, truck or client..."
            value={searchTerm}
            onChange={(e) => onSearchChange?.(e.target.value)}
            type="text"
          />
        </div>
        <div className="flex bg-gray-50 p-1 rounded-xl dark:bg-gray-700 w-full sm:w-auto overflow-x-auto no-scrollbar">
          {['all', 'pending', 'completed', 'alimentaire', 'divers'].map(filter => (
            <button
              key={filter}
              onClick={() => onFilterChange?.(filter)}
              className={`px-4 py-1.5 text-xs transition-colors whitespace-nowrap font-inter antialiased ${selectedFilter === filter ? 'font-bold rounded-[3rem] bg-white shadow-sm text-blue-600 dark:bg-gray-600 dark:text-blue-400' : 'font-medium rounded-[3rem] text-gray-500 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'}`}
            >
              {filter.charAt(0).toUpperCase() + filter.slice(1)}
            </button>
          ))}
          <button onClick={onExport} className="px-4 py-1.5 text-xs font-bold rounded-[3rem] bg-[#A0C800] text-white shadow-sm hover:bg-[#8eb100] transition-colors flex items-center gap-1.5 ml-1 font-inter antialiased">
            <Download className="h-4 w-4" /> Excel
          </button>
        </div>
      </div>

      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 dark:bg-gray-700/50">
            <tr>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 font-inter antialiased">Container</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 font-inter antialiased">Client</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 font-inter antialiased">Truck / Driver</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 font-inter antialiased">Entry Date</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 text-center font-inter antialiased">Status</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 font-inter antialiased">Location</th>
              <th className="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-gray-500 dark:text-gray-400 text-center font-inter antialiased">EDI Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
            {currentOperations.map((operation) => {
              const borderCol = getContainerLeftBorderColor(operation.status, operation.classification);
              const opDate = operation.completedAt ? new Date(operation.completedAt) : (operation.createdAt ? new Date(operation.createdAt) : new Date(operation.date));
              return (
                <tr key={operation.id} className="hover:bg-slate-50 transition-colors group dark:hover:bg-gray-700/50 font-inter antialiased">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-8 ${borderCol} rounded-full`}></div>
                      <div className="flex flex-col items-start">
                        <span className="font-bold text-gray-900 dark:text-white">{operation.containerNumber}</span>
                        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider dark:text-gray-400">{operation.containerSize} {operation.containerType ? operation.containerType.substring(0, 3) : ''}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-700 dark:text-gray-300">{operation.clientName}</td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 font-inter antialiased">
                    <div className='flex flex-col'>
                      <span className="font-bold text-gray-900 dark:text-white">{operation.truckNumber}</span>
                      <span className="text-[12px] text-emerald-700 font-bold dark:text-gray-400 font-inter antialiased">{operation.driverName}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 font-inter antialiased">
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900 dark:text-white font-inter antialiased">
                        {opDate.toLocaleDateString('fr-FR')}
                      </span>
                      <span className="text-[12px] text-emerald-700 font-bold dark:text-gray-400 font-inter antialiased">
                        {opDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-block px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide font-inter antialiased ${getStatusStyle(operation.status)}`}>
                      {operation.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 font-inter antialiased">{operation.assignedLocation || 'Pending'}</td>
                  <td className="px-6 py-4 text-center">
                    {getEDIStatusBadge(operation)}
                  </td>
                </tr>
              );
            })}
            {currentOperations.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                  No operations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Card-based View */}
      <div className="sm:hidden divide-y divide-gray-100 dark:divide-gray-700">
        {currentOperations.map((operation) => {
          const borderCol = getContainerLeftBorderColor(operation.status, operation.classification);
          const opDate = operation.completedAt ? new Date(operation.completedAt) : (operation.createdAt ? new Date(operation.createdAt) : new Date(operation.date));

          return (
            <div key={operation.id} className="p-4 hover:bg-gray-50 transition-colors active:bg-gray-100/50 dark:hover:bg-gray-700/30">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-1.5 h-10 ${borderCol} rounded-full`}></div>
                  <div>
                    <h5 className="font-gilroy-bold text-base font-black text-gray-900 dark:text-white font-inter antialiased tracking-tight">
                      {operation.containerNumber}
                    </h5>
                    <div className="flex items-center gap-2">
                      <span className="font-gilroy text-[10px] font-bold text-gray-400 uppercase tracking-widest">{operation.containerSize} {operation.containerType}</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider font-gilroy antialiased ${getStatusStyle(operation.status)}`}>
                    STATUS : {operation.status}
                  </span>
                  <div className="font-gilroy text-[10px] font-bold text-gray-400 antialiased">
                    {opDate.toLocaleDateString('fr-FR')} - {opDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="font-gilroy text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Client</label>
                  <p className="font-gilroy text-xs font-semibold text-gray-700 dark:text-gray-300 truncate">{operation.clientName}</p>
                </div>
                <div>
                  <label className="font-gilroy text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Location</label>
                  <p className="font-gilroy text-xs font-black text-blue-600 dark:text-blue-400">{operation.assignedLocation || 'Pending'}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <div className="flex flex-col">
                    <span className="font-gilroy text-[11px] font-bold text-gray-900 dark:text-white">Camion : {operation.truckNumber}</span>
                    <span className="font-gilroy text-[10px] font-medium text-emerald-600">Chauffeur : {operation.driverName}</span>
                  </div>
                </div>
                <div className="font-gilroy scale-90 origin-right">
                  EDI Status : {getEDIStatusBadge(operation)}
                </div>
              </div>
            </div>
          );
        })}
        {currentOperations.length === 0 && (
          <div className="p-8 text-center text-gray-400 font-gilroy text-sm">
            No operations found.
          </div>
        )}
      </div>

      <div className="p-6 bg-gray-50/30 border-t border-gray-50 flex justify-center dark:bg-gray-800 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 w-full">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Showing <span className="font-bold text-gray-900 dark:text-white">{operations.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> to <span className="font-bold text-gray-900 dark:text-white">{Math.min(currentPage * itemsPerPage, operations.length)}</span> of <span className="font-bold text-gray-900 dark:text-white">{operations.length}</span> operations
          </p>

          {totalPages > 0 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center justify-center p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed dark:hover:bg-gray-700"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>

              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = i + 1;
                if (totalPages > 5 && currentPage > 3) {
                  pageNum = currentPage - 2 + i;
                  if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                }

                const isActive = currentPage === pageNum;
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-[32px] h-8 flex items-center justify-center rounded-lg text-xs transition-colors ${isActive ? 'font-bold bg-blue-600 text-white shadow-sm' : 'font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'}`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              {totalPages > 5 && currentPage < totalPages - 2 && (
                <>
                  <span className="px-1 text-gray-500 text-xs">...</span>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    className="min-w-[32px] h-8 flex items-center justify-center rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    {totalPages}
                  </button>
                </>
              )}

              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center justify-center p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed dark:hover:bg-gray-700"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
