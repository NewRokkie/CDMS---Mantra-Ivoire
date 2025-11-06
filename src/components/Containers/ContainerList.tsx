import React, { useState, useEffect } from 'react';
import { Search, Filter, Download, Eye, Edit, CreditCard, AlertTriangle, Package } from 'lucide-react';
import { Container } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';
import { useYard } from '../../hooks/useYard';
import { containerService, reportService } from '../../services/api';
import { clientPoolService } from '../../services/clientPoolService';
import { ContainerViewModal } from './ContainerViewModal';
import { ContainerEditModal } from './ContainerEditModal';
import { DesktopOnlyMessage } from '../Common/DesktopOnlyMessage';
import { DatePicker } from '../Common/DatePicker';
import { ClientSearchField } from '../Common/ClientSearchField';

// Helper function to format container number for display (adds hyphens)
const formatContainerNumberForDisplay = (containerNumber?: string | null): string => {
  const num = containerNumber ?? '';
  if (num.length === 11) {
    const letters = num.substring(0, 4);
    const numbers1 = num.substring(4, 10);
    const numbers2 = num.substring(10, 11);
    return `${letters}-${numbers1}-${numbers2}`;
  }
  return num;
};

// REMOVED: Mock data now managed by global store

export const ContainerList: React.FC = () => {
  const [allContainers, setAllContainers] = useState<Container[]>([]);
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadContainers() {
      try {
        setLoading(true);
        const data = await containerService.getAll().catch(err => { console.error('Error loading containers:', err); return []; });
        setAllContainers(data || []);
        setContainers(data || []);
      } catch (error) {
        console.error('Error loading containers:', error);
        // Set empty arrays to prevent infinite loading
        setAllContainers([]);
        setContainers([]);
      } finally {
        setLoading(false);
      }
    }
    loadContainers();
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [startDate, setStartDate] = useState<string>(''); // ISO date yyyy-mm-dd
  const [endDate, setEndDate] = useState<string>(''); // ISO date yyyy-mm-dd
  const [clientExportFilter, setClientExportFilter] = useState<string>('all');
  const [selectedExportClientId, setSelectedExportClientId] = useState<string>('');
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);
  const { t } = useLanguage();
  const { user, canViewAllData, getClientFilter, hasModuleAccess } = useAuth();
  const { currentYard } = useYard();

  React.useEffect(() => {
    // Dev-time warning to help detect incomplete container records that may cause runtime errors
    const incomplete = containers.filter(c => !c.number || !c.clientName || !c.location);
    if (incomplete.length > 0) {
      console.warn('[ContainerList] Found containers with missing critical fields:', incomplete.map(c => ({ id: c.id, number: c.number, clientName: c.clientName, location: c.location })));
    }
  }, [containers]);

  const clientOptions = React.useMemo(() => {
    const map = new Map<string, { id?: string; name: string; code?: string }>();
    containers.forEach(c => {
      const key = c.clientCode || c.clientName || 'unknown';
      if (!map.has(key)) map.set(key, { id: c.clientId, name: c.clientName, code: c.clientCode });
    });
    return Array.from(map.entries()).map(([key, v]) => ({ key, ...v }));
  }, [containers]);

  // Handler that adapts ClientSearchField's client id -> clientExportFilter (keeps existing filtering logic)
  const handleExportClientSelect = (clientId: string) => {
    const opt = clientOptions.find(c => c.id === clientId);
    setSelectedExportClientId(clientId);
    setClientExportFilter(opt ? (opt.code || opt.name || opt.key) : 'all');
  };

  const getStatusBadge = (status: Container['status']) => {
    const statusConfig = {
      in_depot: { color: 'bg-green-100 text-green-800', label: 'In Depot' },
      out_depot: { color: 'bg-blue-100 text-blue-800', label: 'Out Depot' },
      in_service: { color: 'bg-yellow-100 text-yellow-800', label: 'In Service' },
      maintenance: { color: 'bg-red-100 text-red-800', label: 'Maintenance' },
      cleaning: { color: 'bg-purple-100 text-purple-800', label: 'Cleaning' }
    };

    const cfg = status ? (statusConfig as any)[status] : undefined;
    const final = cfg ?? { color: 'bg-gray-100 text-gray-800', label: status ? String(status).replace(/_/g, ' ') : 'Unknown' };
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${final.color}`}>
        {final.label}
      </span>
    );
  };

  // Filter containers based on user permissions and UI filters (date range + client)
  const getFilteredContainers = () => {
    let filtered = containers;

    // Filter by current yard first
    if (currentYard) {
      console.log('[ContainerList] Filtering by yard:', currentYard.id, 'Containers before filter:', filtered.length);
      filtered = filtered.filter(container => {
        const matches = container.yardId === currentYard.id;
        console.log('[ContainerList] Container', container.id, 'yardId:', container.yardId, 'matches:', matches);
        return matches;
      });
      console.log('[ContainerList] Containers after yard filter:', filtered.length);
    } else {
      console.log('[ContainerList] No current yard, showing all containers:', filtered.length);
    }

    // Apply client filter for client users (internal permission)
    const clientFilter = getClientFilter();
    if (clientFilter) {
      // Use client pool service to filter containers by assigned stacks
      let clientStacks = clientPoolService.getClientStacks(clientFilter);
      if (!Array.isArray(clientStacks)) {
        console.warn('[ContainerList] clientPoolService.getClientStacks returned non-array for', clientFilter, clientStacks);
        clientStacks = [];
      }
      filtered = filtered.filter(container => {
        // Check if container is in client's assigned stacks
        const location = container.location ?? '';
        const containerStackMatch = location.match(/Stack S(\d+)/);
        if (containerStackMatch) {
          const stackNumber = parseInt(containerStackMatch[1], 10);
          const stackId = `stack-${stackNumber}`;
          return clientStacks.includes(stackId);
        }

        // Fallback to original filtering
        const clientName = container.clientName ?? '';
        return container.clientCode === clientFilter ||
               clientName === user?.company ||
               clientName.toLowerCase().includes(clientFilter.toLowerCase());
      });
    }

    // Apply UI filters: search, status, date range, clientExportFilter
    filtered = filtered.filter(container => {
      const searchLower = searchTerm.toLowerCase();
      const number = container.number ?? '';
      const clientName = container.clientName ?? '';
      const matchesSearch = number.toLowerCase().includes(searchLower) ||
                            clientName.toLowerCase().includes(searchLower);
      const matchesStatus = statusFilter === 'all' || container.status === statusFilter;

      // Date range filter (based on gateInDate / gateOutDate)
      let matchesDate = true;
      const compareDate = container.gateInDate || container.arrivalDate;
      if (startDate) {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          if (!compareDate || new Date(compareDate) < start) matchesDate = false;
        }
      }
      if (endDate && matchesDate) {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999);
          if (!compareDate || new Date(compareDate) > end) matchesDate = false;
        }
      }

      // Client filter (for export/preview)
      const matchesClient = clientExportFilter === 'all' || container.clientCode === clientExportFilter || container.clientName === clientExportFilter;

      return matchesSearch && matchesStatus && matchesDate && matchesClient;
    });

    return filtered;
  };

  console.log('[ContainerList] Current yard:', currentYard?.id, 'Total containers:', containers.length);
  const filteredContainers = getFilteredContainers();
  console.log('[ContainerList] Filtered containers:', filteredContainers.length);
  const canEditContainers = user?.role === 'admin' || user?.role === 'supervisor';
  const canAccessEDI = hasModuleAccess('edi');

  const addAuditLog = (containerId: string, action: string, details: string = '') => {
    setContainers(prevContainers =>
      prevContainers.map(container =>
        container.id === containerId
          ? {
              ...container,
              auditLogs: [
                ...(container.auditLogs || []),
                {
                  timestamp: new Date(),
                  user: user?.name || 'Unknown User',
                  action,
                  details
                }
              ]
            }
          : container
      )
    );
  };

  const handleViewContainer = (container: Container) => {
    addAuditLog(container.id, 'viewed', 'Container details viewed');
    setSelectedContainer(container);
    setShowViewModal(true);
  };

  const handleEditContainer = (container: Container) => {
    addAuditLog(container.id, 'edit_started', 'Edit modal opened');
    setSelectedContainer(container);
    setShowEditModal(true);
  };

  const handleUpdateContainer = (updatedContainer: Container) => {
    // Update the container in state
    setContainers(prevContainers =>
      prevContainers.map(c => c.id === updatedContainer.id ? updatedContainer : c)
    );
    // Add audit log for edit
    addAuditLog(updatedContainer.id, 'edited', 'Container information updated');
    setShowEditModal(false);
    setSelectedContainer(null);
    alert('Container updated successfully!');
  };

  // --------------------------
  // Export helpers
  // --------------------------
  const formatDate = (d?: Date) => (d ? new Date(d).toLocaleString() : '');

  const generateExportRows = (rows: Container[]) => {
    return rows.map(c => ({
      number: c.number,
      size: c.size,
      type: c.type,
      fullEmpty: c.status === 'in_depot' ? 'FULL' : (c.status === 'out_depot' ? 'EMPTY' : 'UNKNOWN'),
      inOut: c.status === 'in_depot' ? 'In Depot' : (c.status === 'out_depot' ? 'Out Depot' : c.status.replace('_', ' ')),
      gateIn: c.gateInDate ? c.gateInDate.toISOString() : '',
      gateOut: c.gateOutDate ? c.gateOutDate.toISOString() : '',
      client: c.clientName,
      clientCode: c.clientCode || ''
    }));
  };

  const downloadFile = (content: string | Blob, filename: string, mime?: string) => {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const exportCSV = (rows: Container[]) => {
    const data = generateExportRows(rows);
    const headers = ['Container Number', 'Size', 'Type', 'Full/Empty', 'In/Out', 'Gate In', 'Gate Out', 'Client', 'Client Code'];
    const csv = [
      headers.join(','),
      ...data.map(r => {
        const keyMap: Record<string, string> = {
          'Container Number': 'number',
          'Size': 'size',
          'Type': 'type',
          'Full/Empty': 'fullEmpty',
          'In/Out': 'inOut',
          'Gate In': 'gateIn',
          'Gate Out': 'gateOut',
          'Client': 'client',
          'Client Code': 'clientCode'
        };
        return headers.map(h => {
          const key = keyMap[h] || 'clientCode';
          const v = (r as any)[key] ?? '';
          // escape CSV cells
          return `"${String(v).replace(/"/g, '""')}"`;
        }).join(',');
      }).join('\n')
    ].join('\n');
    downloadFile(csv, `containers_export_${new Date().toISOString().slice(0,10)}.csv`, 'text/csv;charset=utf-8');
  };

  const exportExcel = (rows: Container[]) => {
    // Simple Excel: serve CSV with .xls extension for quick compatibility
    const data = generateExportRows(rows);
    const headers = ['Container Number', 'Size', 'Type', 'Full/Empty', 'In/Out', 'Gate In', 'Gate Out', 'Client', 'Client Code'];
    const csv = [
      headers.join('\t'),
      ...data.map(r => {
        const keyMap: Record<string, string> = {
          'Container Number': 'number',
          'Size': 'size',
          'Type': 'type',
          'Full/Empty': 'fullEmpty',
          'In/Out': 'inOut',
          'Gate In': 'gateIn',
          'Gate Out': 'gateOut',
          'Client': 'client',
          'Client Code': 'clientCode'
        };
        return headers.map(h => {
          const key = keyMap[h] || 'clientCode';
          const v = (r as any)[key] ?? '';
          return String(v).replace(/\t/g, ' ');
        }).join('\t');
      }).join('\n')
    ].join('\n');
    downloadFile(csv, `containers_export_${new Date().toISOString().slice(0,10)}.xls`, 'application/vnd.ms-excel');
  };

  const exportHTML = (rows: Container[]) => {
    const data = generateExportRows(rows);
    const stats = {
      total: rows.length,
      inDepot: rows.filter(r => r.status === 'in_depot').length
    };
    const html = `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<title>Containers Export</title>
<meta name="viewport" content="width=device-width,initial-scale=1" />
<style>
  body{font-family:Inter, ui-sans-serif, system-ui; padding:20px; color:#111827}
  .card{display:inline-block;padding:12px;border-radius:8px;background:#f8fafc;border:1px solid #e6edf3;margin-right:10px}
  table{width:100%;border-collapse:collapse;margin-top:16px}
  th,td{padding:8px;border:1px solid #e5e7eb;text-align:left}
  th{background:#f3f4f6;position:sticky;top:0}
  input.filter{width:100%;box-sizing:border-box;padding:6px;border:1px solid #d1d5db;border-radius:4px}
  .stats{margin-bottom:12px}
</style>
</head>
<body>
  <h1>Containers Export</h1>
  <div class="stats">
    <div class="card"><strong>Total</strong><div>${rows.length}</div></div>
    <div class="card"><strong>In Depot</strong><div>${rows.filter(r => r.status === 'in_depot').length}</div></div>
  </div>

  <table id="exportTable">
    <thead>
      <tr>
        <th>Container Number<br/><input class="filter" oninput="filterTable()" placeholder="Filter number" data-col="0" /></th>
        <th>Size<br/><input class="filter" oninput="filterTable()" placeholder="Filter size" data-col="1" /></th>
        <th>Type<br/><input class="filter" oninput="filterTable()" placeholder="Filter type" data-col="2" /></th>
        <th>Full/Empty<br/><input class="filter" oninput="filterTable()" placeholder="Filter" data-col="3" /></th>
        <th>In/Out<br/><input class="filter" oninput="filterTable()" placeholder="Filter" data-col="4" /></th>
        <th>Gate In<br/><input class="filter" oninput="filterTable()" placeholder="Filter" data-col="5" /></th>
        <th>Gate Out<br/><input class="filter" oninput="filterTable()" placeholder="Filter" data-col="6" /></th>
        <th>Client<br/><input class="filter" oninput="filterTable()" placeholder="Filter" data-col="7" /></th>
      </tr>
    </thead>
    <tbody>
      ${data.map(r => `<tr>
        <td>${r.number}</td>
        <td>${r.size}</td>
        <td>${r.type}</td>
        <td>${r.fullEmpty}</td>
        <td>${r.inOut}</td>
        <td>${r.gateIn ? new Date(r.gateIn).toLocaleString() : ''}</td>
        <td>${r.gateOut ? new Date(r.gateOut).toLocaleString() : ''}</td>
        <td>${r.client} ${r.clientCode ? '('+r.clientCode+')' : ''}</td>
      </tr>`).join('')}
    </tbody>
  </table>

<script>
function filterTable(){
  const inputs = Array.from(document.querySelectorAll('input.filter'));
  const table = document.getElementById('exportTable');
  const trs = Array.from(table.tBodies[0].rows);
  trs.forEach(tr => {
    let show = true;
    inputs.forEach(inp => {
      const col = parseInt(inp.getAttribute('data-col'));
      if (inp.value.trim() !== '') {
        const cell = tr.cells[col];
        if(!cell || cell.innerText.toLowerCase().indexOf(inp.value.toLowerCase()) === -1) show = false;
      }
    });
    tr.style.display = show ? '' : 'none';
  });
}
</script>
</body>
</html>`;
    downloadFile(html, `containers_export_${new Date().toISOString().slice(0,10)}.html`, 'text/html;charset=utf-8');
  };

  const handleExport = (type: 'csv' | 'excel' | 'html') => {
    const rows = getFilteredContainers();
    if (type === 'csv') exportCSV(rows);
    else if (type === 'excel') exportExcel(rows);
    else exportHTML(rows);
  };

  const regenerateEDI = (container: Container) => {
    // Simulate EDI regeneration/update: add audit log and notify user
    addAuditLog(container.id, 'edi_regenerated', `EDI regenerated for container ${container.number}`);
    alert(`EDI regenerated for ${container.number} (will reuse existing EDI id where applicable).`);
  };

  // Show client restriction notice
  const showClientNotice = !canViewAllData() && user?.role === 'client';

  const DesktopContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('containers.title')}</h2>
          {showClientNotice && (
            <div className="flex items-center mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-blue-600 mr-2" />
              <p className="text-sm text-blue-800">
                You are viewing containers for <strong>{user?.company}</strong> only.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Container View Modal */}
      {showViewModal && selectedContainer && (
        <ContainerViewModal
          container={selectedContainer}
          onClose={() => {
            setShowViewModal(false);
            setSelectedContainer(null);
          }}
        />
      )}

      {/* Container Edit Modal */}
      {showEditModal && selectedContainer && (
        <ContainerEditModal
          container={selectedContainer}
          onClose={() => {
            setShowEditModal(false);
            setSelectedContainer(null);
          }}
          onSave={handleUpdateContainer}
        />
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-lg">📦</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">
                {showClientNotice ? 'Your Containers' : 'Total Containers'}
              </p>
              <p className="text-lg font-semibold text-gray-900">{filteredContainers.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-lg">✅</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">In Depot</p>
              <p className="text-lg font-semibold text-gray-900">
                {filteredContainers.filter(c => c.status === 'in_depot').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <span className="text-lg">🔧</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">In Service</p>
              <p className="text-lg font-semibold text-gray-900">
                {filteredContainers.filter(c => c.status === 'in_service' || c.status === 'maintenance').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <span className="text-lg">⚠️</span>
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">With Damage</p>
              <p className="text-lg font-semibold text-gray-900">
                {filteredContainers.filter(c => c.damage && c.damage.length > 0).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder={showClientNotice ? "Search your containers..." : t('containers.search')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="in_depot">In Depot</option>
              <option value="out_depot">Out Depot</option>
              <option value="in_service">In Service</option>
              <option value="maintenance">Maintenance</option>
              <option value="cleaning">Cleaning</option>
            </select>
          </div>

          <div className="flex items-center space-x-2 relative">
            <div className="flex items-center space-x-2">
              <label className="text-xs text-gray-500">From</label>
              <div className="w-40">
                <DatePicker
                  value={startDate}
                  onChange={(d) => setStartDate(d)}
                  placeholder="Start date"
                  className=""
                  compact={true}
                />
              </div>
              <label className="text-xs text-gray-500">To</label>
              <div className="w-40">
                <DatePicker
                  value={endDate}
                  onChange={(d) => setEndDate(d)}
                  placeholder="End date"
                  className=""
                  compact={true}
                />
              </div>

              <div className="w-64">
                <ClientSearchField
                  clients={clientOptions.map(c => ({ id: c.id || c.key, code: c.code || '', name: c.name || c.key }))}
                  selectedClientId={selectedExportClientId}
                  onClientSelect={handleExportClientSelect}
                  placeholder="Filter by client..."
                  compact={true}
                />
              </div>
            </div>

            <div className="flex items-center space-x-2 ml-2">
              <button className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors" onClick={() => setShowExportOptions(prev => !prev)}>
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>

              {showExportOptions && (
                <div className="absolute right-0 mt-12 bg-white border border-gray-200 rounded shadow-lg z-50">
                  <button className="block w-full text-left px-4 py-2 hover:bg-gray-50" onClick={() => { handleExport('csv'); setShowExportOptions(false); }}>Export CSV</button>
                  <button className="block w-full text-left px-4 py-2 hover:bg-gray-50" onClick={() => { handleExport('excel'); setShowExportOptions(false); }}>Export Excel</button>
                  <button className="block w-full text-left px-4 py-2 hover:bg-gray-50" onClick={() => { handleExport('html'); setShowExportOptions(false); }}>Export HTML</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Container Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Container
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type & Size
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                {canViewAllData() && (<th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>)}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gate In</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gate Out</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Full / Empty</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredContainers.map((container) => (
                <tr key={container.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <span className="text-lg">📦</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{formatContainerNumberForDisplay(container.number)}</div>
                        {container.damage && container.damage.length > 0 && (
                          <div className="text-xs text-red-600 flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            {container.damage.length} damage(s) reported
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {container.type ? container.type.charAt(0).toUpperCase() + container.type.slice(1) : '-'}
                    </div>
                    <div className="text-sm text-gray-500">{container.size}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(container.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <strong>{container.location}</strong>
                  </td>
                  {canViewAllData() && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium">{container.clientName}</div>
                        {container.clientCode && (
                          <div className="text-xs text-gray-500">{container.clientCode}</div>
                        )}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {container.gateInDate ? new Date(container.gateInDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {container.gateOutDate ? new Date(container.gateOutDate).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {container.status === 'in_depot' ? 'FULL' : (container.status === 'out_depot' ? 'EMPTY' : '-')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleViewContainer(container)}
                        className="text-blue-600 hover:text-blue-900 p-1 rounded"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      {canEditContainers && (
                        <button
                          onClick={() => handleEditContainer(container)}
                          className="text-gray-600 hover:text-gray-900 p-1 rounded"
                          title="Edit Container"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                      {canAccessEDI && (
                        <button
                          onClick={() => regenerateEDI(container)}
                          className="text-purple-600 hover:text-purple-900 p-1 rounded"
                          title="Regenerate EDI for this container"
                        >
                          <CreditCard className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredContainers.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <span className="text-4xl">📦</span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No containers found</h3>
            <p className="text-gray-600">
              {showClientNotice
                ? "No containers found for your company. Contact the depot if you expect to see containers here."
                : "Try adjusting your search criteria or filters."
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading containers...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop Only Message for Mobile */}
      <div className="lg:hidden">
        <DesktopOnlyMessage
          moduleName="Containers"
          reason="Managing detailed container inventory, statuses, locations, and comprehensive filtering requires extensive data tables optimized for desktop."
        />
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block">
        <DesktopContent />
      </div>
    </>
  );
};
