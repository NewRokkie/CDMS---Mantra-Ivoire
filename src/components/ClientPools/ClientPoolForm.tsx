import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Save, Loader, Building, Package, Calendar, Search, Check, ChevronDown, Grid3X3 } from 'lucide-react';
import { DatePicker } from '../Common/DatePicker';
import { ClientPool } from '../../types/clientPool';
import { Yard, YardStack } from '../../types';
import { clientPoolService, clientService } from '../../services/api';
import { useYard } from '../../hooks/useYard';

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


export const ClientPoolForm: React.FC<ClientPoolFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  selectedPool,
  yard,
  isLoading = false
}) => {
  const { currentYard } = useYard();

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

  const [clients, setClients] = useState<Client[]>([]);
  const [isClientDropdownOpen, setIsClientDropdownOpen] = useState(false);
  const [clientSearchTerm, setClientSearchTerm] = useState('');
  const [selectedStacks, setSelectedStacks] = useState<Set<string>>(new Set());
  const [availableStacks, setAvailableStacks] = useState<YardStack[]>([]);
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
        contractStartDate: new Date(selectedPool.contractStartDate).toISOString().split('T')[0],
        contractEndDate: selectedPool.contractEndDate ? new Date(selectedPool.contractEndDate).toISOString().split('T')[0] : '',
        notes: selectedPool.notes || ''
      });
      setSelectedStacks(new Set(selectedPool.assignedStacks));
    }
  }, [selectedPool]);

  // Load clients from API
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const fetchedClients = await clientService.getAll();
        setClients(fetchedClients);
      } catch (error) {
        console.error("Error fetching clients:", error);
      }
    };
    fetchClients();
  }, []);

  // Calculate capacity based on selected stacks
  useEffect(() => {
    const totalCapacity = calculateTotalCapacity(Array.from(selectedStacks));
    setFormData(prev => ({ ...prev, maxCapacity: totalCapacity, assignedStacks: Array.from(selectedStacks) }));
  }, [selectedStacks]);

  useEffect(() => {
    const fetchAvailableStacks = async () => {
      const allStacks = yard.sections.flatMap(section => section.stacks);
      try {
        const allPools = await clientPoolService.getAll(yard.id);
        const assignedStackIds = new Set(
          allPools
            .filter(pool => pool.id !== selectedPool?.id)
            .flatMap(pool => pool.assignedStacks)
        );
        setAvailableStacks(allStacks.filter(stack => !assignedStackIds.has(stack.id)));
      } catch (error) {
        console.error("Failed to get available stacks:", error);
        setAvailableStacks(allStacks); // Fallback to all stacks on error
      }
    };

    if (isOpen) {
      fetchAvailableStacks();
    }
  }, [isOpen, yard, selectedPool]);

  const calculateTotalCapacity = (stackIds: string[]): number => {
    let totalCapacity = 0;
    const allStacks = yard.sections.flatMap(section => section.stacks);
    stackIds.forEach(stackId => {
      const stack = allStacks.find(s => s.id === stackId);
      if (stack) {
        totalCapacity += stack.rows * stack.maxTiers;
      }
    });
    return totalCapacity;
  };

  const getAllStacks = (): YardStack[] => {
    return yard.sections.flatMap(section => section.stacks);
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(clientSearchTerm.toLowerCase()) ||
    client.code.toLowerCase().includes(clientSearchTerm.toLowerCase())
  );

  const selectedClient = clients.find(client => client.id === formData.clientId);

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

  const filteredStacks = availableStacks.filter(stack =>
    stackSearchTerm === '' ||
    stack.stackNumber.toString().includes(stackSearchTerm) ||
    `s${stack.stackNumber}`.toLowerCase().includes(stackSearchTerm.toLowerCase()) ||
    `stack ${stack.stackNumber}`.toLowerCase().includes(stackSearchTerm.toLowerCase()) ||
    yard.sections.find(s => s.id === stack.sectionId)?.name.toLowerCase().includes(stackSearchTerm.toLowerCase())
  );

  // Group stacks by section for better organization
  const targetYard = currentYard;
  const stacksBySection = (currentYard?.sections || []).map(section => ({
    section,
    stacks: filteredStacks.filter(stack => stack.sectionId === section.id)
  })).filter(group => group.stacks.length > 0);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl shadow-lg max-h-[90vh] overflow-hidden flex flex-col">

        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[#A0C800] text-white rounded-lg">
                <Building className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {selectedPool ? 'Edit Client Pool' : 'Create Client Pool'}
                </h3>
                <p className="text-sm text-gray-600">
                  {selectedPool ? 'Update client pool configuration' : 'Assign dedicated stacks to a client'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {autoSaving && (
                <div className="flex items-center space-x-2 text-[#A0C800]">
                  <Loader className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Auto-saving...</span>
                </div>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Client Selection */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-[#A0C800] text-white rounded-lg">
                  <Building className="h-5 w-5" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Client Information</h4>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Client *
                  </label>

                  {/* Streamlined Client Dropdown */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsClientDropdownOpen(!isClientDropdownOpen)}
                      className={`w-full flex items-center justify-between p-4 bg-white border rounded-lg transition-all ${
                        isClientDropdownOpen
                          ? 'border-[#A0C800] shadow-md ring-2 ring-[#A0C800]/20'
                          : selectedClient
                          ? 'border-green-400 shadow-sm'
                          : 'border-gray-300 hover:border-gray-400 shadow-sm hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Building className={`h-5 w-5 ${selectedClient ? 'text-[#A0C800]' : 'text-gray-400'}`} />
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
                      <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform ${
                        isClientDropdownOpen ? 'rotate-180' : ''
                      }`} />
                    </button>

                    {/* Dropdown Menu */}
                    {isClientDropdownOpen && (
                      <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
                        {/* Search */}
                        <div className="p-3 border-b border-gray-100">
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                            <input
                              type="text"
                              placeholder="Search clients..."
                              value={clientSearchTerm}
                              onChange={(e) => setClientSearchTerm(e.target.value)}
                              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded focus:ring-2 focus:ring-[#A0C800] focus:border-[#A0C800]"
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
                              className={`w-full text-left p-3 transition-colors group ${
                                formData.clientId === client.id
                                  ? 'bg-[#A0C800]/10 border-l-4 border-[#A0C800]'
                                  : 'hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded transition-colors ${
                                  formData.clientId === client.id
                                    ? 'bg-[#A0C800]/20 text-[#A0C800]'
                                    : 'bg-gray-100 text-gray-500 group-hover:bg-[#A0C800]/10 group-hover:text-[#A0C800]'
                                }`}>
                                  <Building className="h-4 w-4" />
                                </div>
                                <div className="flex-1">
                                  <div className="font-medium text-gray-900">{client.code}</div>
                                  <div className="text-sm text-gray-600">{client.name}</div>
                                </div>
                                {formData.clientId === client.id && (
                                  <Check className="h-4 w-4 text-[#A0C800]" />
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contract Start Date *
                    </label>
                    <DatePicker
                      value={formData.contractStartDate}
                      onChange={(date) => {
                        setFormData(prev => ({ ...prev, contractStartDate: date }));
                        triggerAutoSave();
                      }}
                      required
                      placeholder="Select contract start date"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Contract End Date
                    </label>
                    <DatePicker
                      value={formData.contractEndDate}
                      onChange={(date) => {
                        setFormData(prev => ({ ...prev, contractEndDate: date }));
                        triggerAutoSave();
                      }}
                      placeholder="Select contract end date"
                      minDate={formData.contractStartDate}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Stack Assignment */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-[#A0C800] text-white rounded-lg">
                    <Package className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">Stack Assignment</h4>
                    <p className="text-sm text-gray-600">
                      Selected: {selectedStacks.size} stacks • Capacity: {formData.maxCapacity} containers
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleSelectAllStacks}
                  className="text-sm font-medium text-[#A0C800] hover:text-[#8bb400] px-3 py-1 hover:bg-[#A0C800]/10 rounded-md transition-colors"
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
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#A0C800] focus:border-[#A0C800]"
                  />
                </div>
              </div>

              {/* Modern Stack Selection Grid */}
              <div className="space-y-6">
                {stacksBySection.map(({ section, stacks }) => (
                  <div key={section.id} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                          <Grid3X3 className="h-4 w-4 text-[#A0C800]" />
                          <h5 className="font-medium text-gray-800">{section.name}</h5>
                          <span className="text-xs text-[#A0C800] bg-[#A0C800]/10 px-2 py-1 rounded-full">
                            {stacks.filter(s => selectedStacks.has(s.id)).length}/{stacks.length} selected
                          </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const sectionStackIds = stacks.map(s => s.id);
                          const allSelected = sectionStackIds.every(id => selectedStacks.has(id));
                          setSelectedStacks(prev => {
                            const newSet = new Set(prev);
                            if (allSelected) {
                              sectionStackIds.forEach(id => newSet.delete(id));
                            } else {
                              sectionStackIds.forEach(id => newSet.add(id));
                            }
                            return newSet;
                          });
                          triggerAutoSave();
                        }}
                        className="text-xs font-medium text-[#A0C800] hover:text-[#8bb400] px-2 py-1 hover:bg-[#A0C800]/10 rounded-md transition-colors"
                      >
                        {stacks.every(s => selectedStacks.has(s.id)) ? 'Deselect Section' : 'Select Section'}
                      </button>
                    </div>

                    {/* Responsive Grid with Optimal Spacing */}
                    <div className="grid grid-cols-6 sm:grid-cols-8 md:grid-cols-9 lg:grid-cols-12 gap-4">
                      {stacks.map((stack) => {
                        const isSelected = selectedStacks.has(stack.id);
                        const capacity = stack.rows * stack.maxTiers;

                        return (
                          <button
                            key={stack.id}
                            type="button"
                            onClick={() => handleStackToggle(stack.id)}
                            className={`relative group w-full aspect-square rounded-lg border-2 transition-all transform hover:scale-105 hover:shadow-lg ${
                              isSelected
                                ? 'border-[#A0C800] bg-[#A0C800]/10 shadow-lg shadow-[#A0C800]/20'
                                : 'border-gray-200 bg-white hover:border-[#A0C800] hover:bg-[#A0C800]/5 shadow-sm hover:shadow-md'
                            }`}
                            title={`Stack ${stack.stackNumber} - ${stack.rows} Rows × ${stack.maxTiers} Tiers (${capacity} containers)`}
                          >
                            {/* Simplified Content - Only Stack Number */}
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className={`font-bold text-lg ${
                                isSelected ? 'text-[#A0C800]' : 'text-gray-700 group-hover:text-[#A0C800]'
                              }`}>
                                {stack.stackNumber.toString().padStart(2, '0')}
                              </div>
                            </div>

                            {/* Selection Indicator */}
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 bg-[#A0C800] text-white rounded-full p-1 shadow-md">
                                <Check className="h-3 w-3" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* Selection Summary */}
              {selectedStacks.size > 0 && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className="text-sm font-medium text-gray-800">Selected Stacks Summary</div>
                      <span className="text-xs text-[#A0C800] bg-[#A0C800]/10 px-2 py-1 rounded-full">
                        {selectedStacks.size} stacks
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    {Array.from(selectedStacks).slice(0, 5).map(stackId => {
                      const stack = getAllStacks().find(s => s.id === stackId);
                      return stack ? `S${stack.stackNumber.toString().padStart(2, '0')} ` : '';
                    }).join('• ')}
                    {selectedStacks.size > 5 && ` • +${selectedStacks.size - 5} more`}
                  </div>
                </div>
              )}

            </div>

            {/* Empty State */}
            {availableStacks.length === 0 && (
              <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                <div className="p-4 bg-white rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center shadow-sm">
                  <Package className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Available Stacks</h3>
                <p className="text-gray-600 mb-4">All stacks are currently assigned to other clients</p>
                <div className="text-sm text-gray-600 bg-white px-4 py-2 rounded-lg inline-block border border-gray-200">
                  Contact administrator to reassign stacks or create new yard sections
                </div>
              </div>
            )}

            {/* Additional Information Section */}
            <div className="bg-white rounded-lg p-6 border border-gray-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-[#A0C800] text-white rounded-lg">
                  <Calendar className="h-5 w-5" />
                </div>
                <h4 className="text-lg font-semibold text-gray-900">Additional Information</h4>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes & Special Instructions
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, notes: e.target.value }));
                    triggerAutoSave();
                  }}
                  rows={3}
                  className="form-input w-full resize-none"
                  placeholder="Enter any special instructions, handling requirements, or notes about this client pool..."
                />
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-8 py-6 border-t border-gray-200 bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Form Progress Indicator */}
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className={`w-2 h-2 rounded-full ${selectedClient ? 'bg-[#A0C800]' : 'bg-gray-300'}`}></div>
                <span>Client Selected</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className={`w-2 h-2 rounded-full ${selectedStacks.size > 0 ? 'bg-[#A0C800]' : 'bg-gray-300'}`}></div>
                <span>Stacks Assigned</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <div className={`w-2 h-2 rounded-full ${formData.contractStartDate ? 'bg-[#A0C800]' : 'bg-gray-300'}`}></div>
                <span>Contract Date Set</span>
              </div>
            </div>

            <div className="flex items-center space-x-3">
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
    </div>
  );
};
