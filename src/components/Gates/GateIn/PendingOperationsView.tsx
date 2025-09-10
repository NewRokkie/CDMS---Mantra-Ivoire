@@ .. @@
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Date
                 </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Container
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                 <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                   Truck
                 </th>
@@ .. @@
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                     {operation.date?.toLocaleDateString() || '-'}
                   </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{operation.containerNumber}</div>
                    {operation.secondContainerNumber && (
                      <div className="text-sm font-medium text-gray-900">{operation.secondContainerNumber}</div>
                    )}
                    <div className="text-sm text-gray-500">
                      {operation.containerSize}
                    </div>
                    <div className="text-xs text-gray-500">
                      {operation.containerType?.charAt(0).toUpperCase() + operation.containerType?.slice(1).replace('_', ' ')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {operation.clientName || 'Unknown Client'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {operation.clientCode || '-'}
                    </div>
                  </td>
                   <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                     {operation.vehicleNumber || '-'}
                   </td>
@@ .. @@
          <div className="flex items-center space-x-3">
            <div className="flex bg-gray-100 rounded-lg p-1">
              {['all', 'pending', 'completed'].map(status => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setTypeFilter(status as any)}
                  className={`px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                    typeFilter === status
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {status === 'all' ? 'All Status' : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}
            </div>
@@ .. @@
  const filteredOperations = operations.filter(operation => {
    const matchesSearch = operation.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         operation.driverName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         operation.truckNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         operation.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = typeFilter === 'all' || operation.operationStatus === typeFilter;
    return matchesSearch && matchesStatus;
  });