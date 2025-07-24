import React, { useState, useEffect } from 'react';
import { X, Save, Loader, Building, Package, Calendar, Search, Check, ChevronDown, Grid3X3 } from 'lucide-react';
import { ClientPool } from '../../types/clientPool';
import { Yard, YardStack } from '../../types';
import { clientPoolService } from '../../services/clientPoolService';

interface ClientPoolFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ClientPoolFormData) => void;
  selectedPool?: ClientPool | null;
  yard: Yard;
  isLoading?: boolean;
}

interface ClientPoolFormData {
  clientId: string;
  clientCode: string;
  clientName: string;
  assignedStacks: string[];
  maxCapacity: number;
  contractStartDate: string;
  contractEndDate: string;
  notes: string;
}

interface Client {
  id: string;
  code: string;
  name: string;
}

// Mock clients data
const mockClients: Client[] = [
  { id: '1', code: 'MAEU', name: 'Maersk Line' },
  { id: '2', code: 'MSCU', name: 'MSC Mediterranean Shipping' },
  { id: '3', code: 'CMDU', name: 'CMA CGM' },
  { id: '4', code: 'SHIP001', name: 'Shipping Solutions Inc' },
  { id: '5', code: 'HLCU', name: 'Hapag-Lloyd' },
  { id: '6', code: 'ONEY', name: 'Ocean Network Express' },
  { id: '7', code: 'EGLV', name: 'Evergreen Marine' },
  { id: '8', code: 'YMLU', name: 'Yang Ming Marine' }
];

export const ClientPoolForm: React.FC<ClientPoolFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  selectedPool,
  yard,
  isLoading = false
}) => {
  const [formData, setFormData] = useState<ClientPoolFormData>({
    clientId: '',
    clientCode: '',
    clientName: '',
    assignedStacks: [],
    maxCapacity: 0,
    contractStartDate: new Date().toISOString().split('T')[0],
    contractEndDate: '',
    notes: ''
  });

  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedStacks, setSelectedStacks] = useState<Set<string>>(new Set());
  const [stackSearchTerm, setStackSearchTerm] = useState('');
  const [autoSaving, setAutoSaving] = useState(false);

  // Initialize form data when editing
  useEffect(() => {
    if (selectedPool) {
      setFormData({
        clientId: selectedPool.clientId,
        clientCode: selectedPool.clientCode,
        clientName: selectedPool.clientName,
        assignedStacks: selectedPool.assignedStacks,
        maxCapacity: selectedPool.maxCapacity,
        contractStartDate: selectedPool.contractStartDate.toISOString().split('T')[0],
        contractEndDate: selectedPool.contractEndDate?.toISOString().split('T')[0] || '',
        notes: selectedPool.notes || ''
      });
      setSelectedStacks(new Set(selectedPool.assignedStacks));
    }
  }, [selectedPool]);

  // Calculate capacity based on selected stacks
  useEffect(() => {
    const totalCapacity = calculateTotalCapacity(Array.from(selectedStacks));
    setFormData(prev => ({ ...prev, maxCapacity: totalCapacity, assignedStacks: Array.from(selectedStacks) }));
  }, [selectedStacks]);

  const calculateTotalCapacity = (stackIds: string[]): number => {
    let totalCapacity = 0;
    
    stackIds.forEach(stackId => {
      const stack = getAllStacks().find(s => s.id === stackId);
      if (stack) {
        // Each stack position can hold one 20ft container (capacity = 1)
        // For 40ft containers, they take 2 positions, so effective capacity is halved
        const baseCapacity = stack.rows * stack.maxTiers;
        
        // Check if this stack is configured for 40ft containers
        // For now, assume all stacks can handle 20ft (capacity = baseCapacity)
        // In a real implementation, you'd check the stack configuration
        totalCapacity += baseCapacity;
      }
    });
    
    return totalCapacity;
  };

  const getAllStacks = (): YardStack[] => {
    return yard.sections.flatMap(section => section.stacks);
  };

  const getAvailableStacks = (): YardStack[] => {
    const allStacks = getAllStacks();
    const assignedStacks = clientPoolService.getClientPools()
      .filter(pool => pool.id !== selectedPool?.id) // Exclude current pool when editing
      .flatMap(pool => pool.assignedStacks);
    
    return allStacks.filter(stack => !assignedStacks.includes(stack.id));
  };

  const filteredClients = mockClients.filter(client =>
    client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    client.code.toLowerCase().includes(clientSearchTerm.toLowerCase())
  );

  const selectedClient = mockClients.find(client => client.id === formData.clientId);

  const handleClientSelect = (client: Client) => {
    setFormData(prev => ({
      ...prev,
      clientId: client.id,
      clientCode: client.code,
      clientName: client.name
    }));
    setIsClientDropdownOpen(false);
    setClientSearchTerm('');
    triggerAutoSave();
  };

  const handleStackToggle = (stackId: string) => {
    setSelectedStacks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stackId)) {
        newSet.delete(stackId);
      } else {
        newSet.add(stackId);
      }
      return newSet;
    });
    triggerAutoSave();
  };

  const handleSelectAllStacks = () => {
    const availableStacks = getAvailableStacks();
    if (selectedStacks.size === availableStacks.length) {
      setSelectedStacks(new Set());
    } else {
      setSelectedStacks(new Set(availableStacks.map(s => s.id)));
    }
    triggerAutoSave();
  };

  const triggerAutoSave = () => {
    setAutoSaving(true);
    setTimeout(() => setAutoSaving(false), 1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.clientId || selectedStacks.size === 0) {
      alert('Please select a client and at least one stack.');
      return;
    }

    onSubmit({
      ...formData,
      assignedStacks: Array.from(selectedStacks),
      maxCapacity: calculateTotalCapacity(Array.from(selectedStacks))
    });
  };

  const isFormValid = formData.clientId && 
                     formData.clientCode && 
                     formData.clientName && 
                     selectedStacks.size > 0 && 
                     formData.contractStartDate;

  const availableStacks = getAvailableStacks();
  const filteredStacks = availableStacks.filter(stack =>
    stack.stackNumber.toString().includes(stackSearchTerm) ||
    yard.sections.find(s => s.id === stack.sectionId)?.name.toLowerCase().includes(stackSearchTerm.toLowerCase())
  );

  // Group stacks by section for better organization
  const stacksBySection = yard.sections.map(section => ({
    section,
    stacks: filteredStacks.filter(stack => stack.sectionId === section.id)
  })).filter(group => group.stacks.length > 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-4xl shadow-strong max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Modal Header */}
        <div className="px-8 py-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-2xl flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-900">
                {selectedPool ? 'Edit Client Pool' : 'Create Client Pool'}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {selectedPool ? 'Update client pool configuration' : 'Assign dedicated stacks to a client'}
              </p>
            </div>
            <div className="flex items-center space-x-3">
              {autoSaving && (
                <div className="flex items-center space-x-2 text-green-600">
                  <Loader className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Auto-saving...</span>
                </div>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-white/50 transition-colors"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Client Selection */}
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-600 text-white rounded-lg">
                  <Building className="h-5 w-5" />
                </div>
                <h4 className="text-lg font-semibold text-blue-900">Client Information</h4>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-blue-800 mb-2">
                    Select Client *
                  </label>
                  
                  {/* Streamlined Client Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                      className={`w-full flex items-center justify-between p-4 bg-white border-2 rounded-xl transition-all duration-300 ${
                        isClientDropdownOpen 
                          ? 'border-blue-500 shadow-lg shadow-blue-500/20 ring-4 ring-blue-500/10' 
                          : selectedClient 
                          ? 'border-green-400 shadow-md shadow-green-400/10' 
                          : 'border-gray-200 hover:border-gray-300 shadow-sm hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Building className={`h-5 w-5 ${selectedClient ? 'text-green-600' : 'text-gray-400'}`} />
                        <div className="text-left">
                          {selectedClient ? (
                            <>
                              <div className="font-medium text-gray-900">{selectedClient.code}</div>
                              <div className="text-sm text-gray-600">{selectedClient.name}</div>
                            </>
                          ) : (
                            <div className="text-gray-500">Select a client...</div>
                          )}
                        </div>
                      </div>
                      <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-300 ${
                        isClientDropdownOpen ? 'rotate-180' : ''
                      }`} />
                    </button>

                    {/* Dropdown Menu */}
                    {isClientDropdownOpen && (
                      <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-xl shadow-2xl max-h-64 overflow-hidden animate-slide-in-up">
                        {/* Search */}
                        <div className="p-3 border-b border-gray-100">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <input
                              type="text"
                              placeholder="Search clients..."
                              value={clientSearchTerm}
                              onChange={(e) => setClientSearchTerm(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                        </div>

                        {/* Client List */}
                        <div className="max-h-48 overflow-y-auto">
                          {filteredClients.map((client) => (
                            <button
                              key={client.id}
                              type="button"
                              onClick={() => handleClientSelect(client)}
                              className={`w-full text-left p-4 transition-all duration-200 group ${
                                formData.clientId === client.id
                                  ? 'bg-green-50 border-l-4 border-green-500'
                                  : 'hover:bg-gray-50 border-l-4 border-transparent'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-lg transition-all duration-200 ${
                                  formData.clientId === client.id
                                    ? 'bg-green-100 text-green-600'
                                    : 'bg-gray-100 text-gray-500 group-hover:bg-blue-100 group-hover:text-blue-600'
                                }`}>
                                  <Building className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">{client.code}</div>
                                  <div className="text-sm text-gray-600">{client.name}</div>
                                </div>
                                {formData.clientId === client.id && (
                                  <Check className="h-4 w-4 text-green-600" />
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contract Dates */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">
                      Contract Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.contractStartDate}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, contractStartDate: e.target.value }));
                        triggerAutoSave();
                      }}
                      className="form-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-blue-800 mb-2">
                      Contract End Date
                    </label>
                    <input
                      type="date"
                      value={formData.contractEndDate}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, contractEndDate: e.target.value }));
                        triggerAutoSave();
                      }}
                      className="form-input w-full"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Stack Assignment */}
            <div className="bg-purple-50 rounded-xl p-6 border border-purple-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-purple-600 text-white rounded-lg">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-purple-900">Stack Assignment</h4>
                    <p className="text-sm text-purple-700">
                      Selected: {selectedStacks.size} stacks • Capacity: {formData.maxCapacity} containers
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSelectAllStacks}
                  className="text-sm font-medium text-purple-600 hover:text-purple-800 px-3 py-1 hover:bg-purple-100 rounded-md transition-colors"
                >
                  {selectedStacks.size === availableStacks.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              {/* Stack Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Search stacks by number or section..."
                    value={stackSearchTerm}
                    onChange={(e) => setStackSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Modern Stack Selection Grid */}
              <div className="space-y-6 max-h-80 overflow-y-auto scrollbar-thin">
                {stacksBySection.map(({ section, stacks }) => (
                  <div key={section.id} className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Grid3X3 className="h-4 w-4 text-purple-600" />
                      <h5 className="font-medium text-purple-800">{section.name}</h5>
                      <span className="text-xs text-purple-600 bg-purple-100 px-2 py-1 rounded-full">
                        {stacks.filter(s => selectedStacks.has(s.id)).length}/{stacks.length} selected
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12 gap-2">
                      {stacks.map((stack) => {
                        const isSelected = selectedStacks.has(stack.id);
                        const capacity = stack.rows * stack.maxTiers;
                        
                        return (
                          <button
                            key={stack.id}
                            type="button"
                            onClick={() => handleStackToggle(stack.id)}
                            className={`relative group p-3 rounded-xl border-2 transition-all duration-300 transform hover:scale-105 ${
                              isSelected
                                ? 'border-purple-500 bg-purple-100 shadow-lg shadow-purple-500/20'
                                : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50 shadow-sm hover:shadow-md'
                            }`}
                          >
                            <div className="text-center">
                              <div className={`font-bold text-sm ${
                                isSelected ? 'text-purple-900' : 'text-gray-700 group-hover:text-purple-700'
                              }`}>
                                S{stack.stackNumber.toString().padStart(2, '0')}
                              </div>
                              <div className={`text-xs mt-1 ${
                                isSelected ? 'text-purple-700' : 'text-gray-500 group-hover:text-purple-600'
                              }`}>
                                {capacity}
                              </div>
                            </div>
                            
                            {/* Selection Indicator */}
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 bg-purple-500 text-white rounded-full p-1 shadow-lg animate-bounce-in">
                                <Check className="h-3 w-3" />
                              </div>
                            )}
                            
                            {/* Hover Tooltip */}
                            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                              Stack {stack.stackNumber} • {stack.rows}R×{stack.maxTiers}T • Cap: {capacity}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Selection Summary */}
              {selectedStacks.size > 0 && (
                <div className="mt-4 p-4 bg-white rounded-lg border border-purple-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-purple-800">
                        {selectedStacks.size} stacks selected
                      </span>
                      <span className="text-sm text-purple-600 ml-2">
                        • Total capacity: {formData.maxCapacity} containers
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedStacks(new Set())}
                      className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                    >
                      Clear All
                    </button>
                  </div>
                </div>
              )}

              {availableStacks.length === 0 && (
                <div className="text-center py-8 text-purple-600 bg-purple-100 rounded-lg">
                  <Package className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-medium">No available stacks</p>
                  <p className="text-sm">All stacks are already assigned to other clients</p>
                </div>
              )}
            </div>

            {/* Additional Information */}
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-gray-600 text-white rounded-lg">
                  <Calendar className="h-5 w-5" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Additional Information</h4>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, notes: e.target.value }));
                    triggerAutoSave();
                  }}
                  rows={3}
                  className="form-input w-full"
                  placeholder="Additional notes about this client pool..."
                />
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer - Fixed */}
        <div className="px-8 py-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl flex-shrink-0">
          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              disabled={isLoading || !isFormValid}
              className="btn-success disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  <span>{selectedPool ? 'Updating...' : 'Creating...'}</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>{selectedPool ? 'Update Pool' : 'Create Pool'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};