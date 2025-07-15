import React, { useState, useEffect } from 'react';
import { Search, X, Truck, Package, Clock, User, MapPin, AlertCircle, CheckCircle, XCircle, Filter, Calendar, FileText, Eye } from 'lucide-react';

interface Container {
  id: string;
  number: string;
  type: string;
  size: string;
  status: 'empty' | 'full';
  location?: string;
  client?: string;
  bookingRef?: string;
  weight?: number;
  lastMovement?: string;
}

interface GateInOperation {
  id: string;
  containerNumber: string;
  driverName: string;
  truckNumber: string;
  client: string;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
  notes?: string;
  containerType: string;
  containerSize: string;
  bookingReference?: string;
  weight?: number;
  damageReport?: boolean;
  location?: string;
}

interface PendingOperation {
  id: string;
  containerNumber: string;
  driverName: string;
  truckNumber: string;
  client: string;
  expectedTime: string;
  status: 'pending' | 'in-progress';
  notes?: string;
  containerType: string;
  containerSize: string;
  priority: 'normal' | 'high' | 'urgent';
  assignedTo?: string;
}

const GateIn: React.FC = () => {
  const [activeView, setActiveView] = useState<'operations' | 'pending'>('operations');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOperation, setSelectedOperation] = useState<GateInOperation | null>(null);
  const [operations, setOperations] = useState<GateInOperation[]>([]);
  const [pendingOperations, setPendingOperations] = useState<PendingOperation[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for operations
  const mockOperations: GateInOperation[] = [
    {
      id: '1',
      containerNumber: 'MSKU7834561',
      driverName: 'John Smith',
      truckNumber: 'ABC-123',
      client: 'Maersk Line',
      timestamp: '2024-01-15 14:30:00',
      status: 'completed',
      notes: 'Container inspected, no damage found',
      containerType: '20ft Standard',
      containerSize: '20ft',
      bookingReference: 'MSK-2024-001',
      weight: 18500,
      location: 'A-12-03'
    },
    {
      id: '2',
      containerNumber: 'CSQU3456789',
      driverName: 'Mike Johnson',
      truckNumber: 'XYZ-456',
      client: 'COSCO Shipping',
      timestamp: '2024-01-15 13:45:00',
      status: 'completed',
      notes: 'Minor damage on left side door',
      containerType: '40ft High Cube',
      containerSize: '40ft',
      bookingReference: 'COS-2024-045',
      weight: 25300,
      damageReport: true,
      location: 'B-08-15'
    },
    {
      id: '3',
      containerNumber: 'TEMU9876543',
      driverName: 'Sarah Wilson',
      truckNumber: 'DEF-789',
      client: 'Mediterranean Shipping',
      timestamp: '2024-01-15 12:15:00',
      status: 'failed',
      notes: 'Documentation incomplete - missing customs clearance',
      containerType: '20ft Standard',
      containerSize: '20ft',
      bookingReference: 'MSC-2024-078'
    },
    {
      id: '4',
      containerNumber: 'HLBU2345678',
      driverName: 'David Brown',
      truckNumber: 'GHI-012',
      client: 'Hapag-Lloyd',
      timestamp: '2024-01-15 11:30:00',
      status: 'completed',
      containerType: '40ft Standard',
      containerSize: '40ft',
      weight: 22100,
      location: 'C-15-07'
    }
  ];

  // Mock data for pending operations
  const mockPendingOperations: PendingOperation[] = [
    {
      id: 'p1',
      containerNumber: 'OOLU5678901',
      driverName: 'Robert Garcia',
      truckNumber: 'JKL-345',
      client: 'OOCL',
      expectedTime: '2024-01-15 16:00:00',
      status: 'pending',
      notes: 'Reefer container - temperature monitoring required',
      containerType: '40ft Reefer',
      containerSize: '40ft',
      priority: 'high',
      assignedTo: 'Gate Officer 2'
    },
    {
      id: 'p2',
      containerNumber: 'YMLU8901234',
      driverName: 'Lisa Chen',
      truckNumber: 'MNO-678',
      client: 'Yang Ming',
      expectedTime: '2024-01-15 16:30:00',
      status: 'in-progress',
      notes: 'Driver waiting at gate - documentation being verified',
      containerType: '20ft Standard',
      containerSize: '20ft',
      priority: 'urgent',
      assignedTo: 'Gate Officer 1'
    },
    {
      id: 'p3',
      containerNumber: 'EVGU3456789',
      driverName: 'Tom Anderson',
      truckNumber: 'PQR-901',
      client: 'Evergreen',
      expectedTime: '2024-01-15 17:15:00',
      status: 'pending',
      containerType: '40ft High Cube',
      containerSize: '40ft',
      priority: 'normal'
    }
  ];

  useEffect(() => {
    setOperations(mockOperations);
    setPendingOperations(mockPendingOperations);
  }, []);

  const filteredOperations = operations.filter(op =>
    op.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.truckNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredPendingOperations = pendingOperations.filter(op =>
    op.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.truckNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    op.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const clearSearch = () => {
    setSearchTerm('');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-600" />;
      case 'in-progress':
        return <AlertCircle className="w-5 h-5 text-blue-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'in-progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'normal':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const OperationsView = () => (
    <div className="space-y-4">
      {filteredOperations.map((operation) => (
        <div key={operation.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              {getStatusIcon(operation.status)}
              <div>
                <h3 className="font-semibold text-gray-900">{operation.containerNumber}</h3>
                <p className="text-sm text-gray-600">{operation.containerType}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(operation.status)}`}>
                {operation.status.charAt(0).toUpperCase() + operation.status.slice(1)}
              </span>
              {operation.damageReport && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                  Damage Report
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{operation.driverName}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Truck className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{operation.truckNumber}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{operation.client}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{new Date(operation.timestamp).toLocaleString()}</span>
            </div>
          </div>

          {operation.location && (
            <div className="flex items-center space-x-2 mb-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Location: {operation.location}</span>
            </div>
          )}

          {operation.weight && (
            <div className="flex items-center space-x-2 mb-2">
              <Package className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Weight: {operation.weight.toLocaleString()} kg</span>
            </div>
          )}

          {operation.bookingReference && (
            <div className="flex items-center space-x-2 mb-2">
              <FileText className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Booking: {operation.bookingReference}</span>
            </div>
          )}

          {operation.notes && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">{operation.notes}</p>
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              onClick={() => setSelectedOperation(operation)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Eye className="w-4 h-4" />
              <span>View Details</span>
            </button>
          </div>
        </div>
      ))}

      {filteredOperations.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No operations found</h3>
          <p className="text-gray-600">
            {searchTerm ? 'Try adjusting your search terms' : 'No gate in operations recorded yet'}
          </p>
        </div>
      )}
    </div>
  );

  const PendingOperationsView = () => (
    <div className="space-y-4">
      {filteredPendingOperations.map((operation) => (
        <div key={operation.id} className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center space-x-3">
              {getStatusIcon(operation.status)}
              <div>
                <h3 className="font-semibold text-gray-900">{operation.containerNumber}</h3>
                <p className="text-sm text-gray-600">{operation.containerType}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(operation.status)}`}>
                {operation.status.charAt(0).toUpperCase() + operation.status.slice(1).replace('-', ' ')}
              </span>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(operation.priority)}`}>
                {operation.priority.charAt(0).toUpperCase() + operation.priority.slice(1)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{operation.driverName}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Truck className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{operation.truckNumber}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Package className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">{operation.client}</span>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">ETA: {new Date(operation.expectedTime).toLocaleString()}</span>
            </div>
          </div>

          {operation.assignedTo && (
            <div className="flex items-center space-x-2 mb-2">
              <User className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Assigned to: {operation.assignedTo}</span>
            </div>
          )}

          {operation.notes && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">{operation.notes}</p>
            </div>
          )}

          <div className="mt-4 flex justify-end space-x-2">
            <button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
              <CheckCircle className="w-4 h-4" />
              <span>Process</span>
            </button>
            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
              <Eye className="w-4 h-4" />
              <span>Details</span>
            </button>
          </div>
        </div>
      ))}

      {filteredPendingOperations.length === 0 && (
        <div className="text-center py-12">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No pending operations</h3>
          <p className="text-gray-600">
            {searchTerm ? 'Try adjusting your search terms' : 'All operations are up to date'}
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gate In Operations</h1>
          <p className="text-gray-600">Monitor and manage incoming container operations</p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveView('operations')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-all ${
              activeView === 'operations'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Operations</span>
            <span className="bg-blue-100 text-blue-600 text-xs px-2 py-1 rounded-full">
              {filteredOperations.length}
            </span>
          </button>
          <button
            onClick={() => setActiveView('pending')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-all ${
              activeView === 'pending'
                ? 'bg-white text-orange-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Pending</span>
            <span className="bg-orange-100 text-orange-600 text-xs px-2 py-1 rounded-full">
              {filteredPendingOperations.length}
            </span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder={
              activeView === 'operations'
                ? "Search containers, drivers, clients, or truck numbers..."
                : "Search containers, drivers, clients, or truck numbers..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchTerm && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="flex items-center space-x-2">
          {searchTerm && (
            <span className="text-sm text-gray-600 bg-blue-50 px-3 py-2 rounded-lg">
              {activeView === 'operations' ? filteredOperations.length : filteredPendingOperations.length} results
            </span>
          )}
          <button className="flex items-center space-x-2 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Content */}
      {activeView === 'operations' ? <OperationsView /> : <PendingOperationsView />}
    </div>
  );
};

export default GateIn;