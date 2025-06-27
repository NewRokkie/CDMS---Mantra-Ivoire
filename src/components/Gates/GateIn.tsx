import React, { useState } from 'react';
import { Plus, Search, Filter, CheckCircle, Clock, AlertCircle, Truck, Container as ContainerIcon } from 'lucide-react';
import { Container } from '../../types';
import { useLanguage } from '../../hooks/useLanguage';
import { useAuth } from '../../hooks/useAuth';

interface GateInFormData {
  containerNumber: string;
  containerType: 'dry' | 'reefer' | 'tank' | 'flat_rack' | 'open_top';
  containerSize: '20ft' | '40ft' | '45ft';
  client: string;
  transportCompany: string;
  driverName: string;
  vehicleNumber: string;
  location: string;
  sealNumbers: string[];
  damage: string[];
  notes: string;
}

// Mock data for recent gate-ins
const mockRecentGateIns = [
  {
    id: '1',
    containerNumber: 'MSKU-123456-7',
    client: 'Maersk Line',
    gateInTime: new Date('2025-01-11T14:30:00'),
    status: 'completed',
    location: 'Block A-12'
  },
  {
    id: '2',
    containerNumber: 'TCLU-987654-3',
    client: 'MSC',
    gateInTime: new Date('2025-01-11T13:15:00'),
    status: 'completed',
    location: 'Block B-05'
  }
];

export const GateIn: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [formData, setFormData] = useState<GateInFormData>({
    containerNumber: '',
    containerType: 'dry',
    containerSize: '40ft',
    client: '',
    transportCompany: '',
    driverName: '',
    vehicleNumber: '',
    location: '',
    sealNumbers: [],
    damage: [],
    notes: ''
  });

  const { t } = useLanguage();
  const { user } = useAuth();

  const canPerformGateIn = user?.role === 'admin' || user?.role === 'operator' || user?.role === 'supervisor';

  const handleInputChange = (field: keyof GateInFormData, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddSeal = () => {
    const sealNumber = prompt('Enter seal number:');
    if (sealNumber && sealNumber.trim()) {
      setFormData(prev => ({
        ...prev,
        sealNumbers: [...prev.sealNumbers, sealNumber.trim()]
      }));
    }
  };

  const handleRemoveSeal = (index: number) => {
    setFormData(prev => ({
      ...prev,
      sealNumbers: prev.sealNumbers.filter((_, i) => i !== index)
    }));
  };

  const handleAddDamage = () => {
    const damage = prompt('Describe damage:');
    if (damage && damage.trim()) {
      setFormData(prev => ({
        ...prev,
        damage: [...prev.damage, damage.trim()]
      }));
    }
  };

  const handleRemoveDamage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      damage: prev.damage.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canPerformGateIn) return;

    setIsProcessing(true);
    try {
      // Create container object
      const container: Container = {
        id: Date.now().toString(),
        number: formData.containerNumber,
        type: formData.containerType,
        size: formData.containerSize,
        status: 'in_depot',
        location: formData.location,
        gateInDate: new Date(),
        client: formData.client,
        damage: formData.damage.length > 0 ? formData.damage : undefined
      };

      alert(`Container ${formData.containerNumber} successfully gated in!`);
      
      // Reset form
      setFormData({
        containerNumber: '',
        containerType: 'dry',
        containerSize: '40ft',
        client: '',
        transportCompany: '',
        driverName: '',
        vehicleNumber: '',
        location: '',
        sealNumbers: [],
        damage: [],
        notes: ''
      });
      setShowForm(false);
    } catch (error) {
      alert(`Error processing gate in: ${error}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredGateIns = mockRecentGateIns.filter(gateIn =>
    gateIn.containerNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gateIn.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!canPerformGateIn) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Access Restricted</h3>
        <p className="text-gray-600">You don't have permission to perform gate in operations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Gate In Management</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          <span>New Gate In</span>
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Truck className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Today's Gate Ins</p>
              <p className="text-lg font-semibold text-gray-900">12</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ContainerIcon className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Containers In Depot</p>
              <p className="text-lg font-semibold text-gray-900">892</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Average Processing Time</p>
              <p className="text-lg font-semibold text-gray-900">8 min</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search recent gate ins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>
          <button className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="h-4 w-4" />
            <span>Filter</span>
          </button>
        </div>
      </div>

      {/* Recent Gate Ins */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Gate Ins</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Container Number
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Client
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gate In Time
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredGateIns.map((gateIn) => (
                <tr key={gateIn.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{gateIn.containerNumber}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {gateIn.client}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {gateIn.gateInTime.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {gateIn.location}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Completed
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Gate In Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">New Gate In</h3>
                <button
                  onClick={() => setShowForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Container Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Container Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.containerNumber}
                      onChange={(e) => handleInputChange('containerNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g., MSKU-123456-7"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Container Type *
                    </label>
                    <select
                      required
                      value={formData.containerType}
                      onChange={(e) => handleInputChange('containerType', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="dry">Dry Container</option>
                      <option value="reefer">Reefer</option>
                      <option value="tank">Tank</option>
                      <option value="flat_rack">Flat Rack</option>
                      <option value="open_top">Open Top</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Container Size *
                    </label>
                    <select
                      required
                      value={formData.containerSize}
                      onChange={(e) => handleInputChange('containerSize', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="20ft">20ft</option>
                      <option value="40ft">40ft</option>
                      <option value="45ft">45ft</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.client}
                      onChange={(e) => handleInputChange('client', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="e.g., Maersk Line"
                    />
                  </div>
                </div>

                {/* Transport Information */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Transport Company *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.transportCompany}
                      onChange={(e) => handleInputChange('transportCompany', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Transport company name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Driver Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.driverName}
                      onChange={(e) => handleInputChange('driverName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Driver full name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Vehicle Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.vehicleNumber}
                      onChange={(e) => handleInputChange('vehicleNumber', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="License plate"
                    />
                  </div>
                </div>

                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Assigned Location *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.location}
                    onChange={(e) => handleInputChange('location', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="e.g., Block A-12"
                  />
                </div>

                {/* Seal Numbers */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seal Numbers
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.sealNumbers.map((seal, index) => (
                      <span
                        key={index}
                        className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                      >
                        {seal}
                        <button
                          type="button"
                          onClick={() => handleRemoveSeal(index)}
                          className="ml-2 text-blue-600 hover:text-blue-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddSeal}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Add Seal Number
                  </button>
                </div>

                {/* Damage */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Damage Reports
                  </label>
                  <div className="space-y-2 mb-2">
                    {formData.damage.map((damage, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-2 bg-red-50 border border-red-200 rounded"
                      >
                        <span className="text-sm text-red-800">{damage}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveDamage(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={handleAddDamage}
                    className="text-sm text-red-600 hover:text-red-800"
                  >
                    + Report Damage
                  </button>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => handleInputChange('notes', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="Additional notes..."
                  />
                </div>

                {/* Form Actions */}
                <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Processing...' : 'Process Gate In'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};