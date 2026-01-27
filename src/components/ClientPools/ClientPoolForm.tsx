import React, { useState, useEffect } from 'react';
import { X, Save, Loader, Building, Package, Calendar, Search, Check, ChevronDown, Grid3X3 } from 'lucide-react';
import { DatePicker } from '../Common/DatePicker';
import { ClientPool } from '../../types/clientPool';
import { Yard, YardStack } from '../../types';
import { clientPoolService, clientService } from '../../services/api';
import { handleError } from '../../services/errorHandling';
import { StackSelectionModal } from './StackSelectionModal';
import { useToast } from '../../hooks/useToast';

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
  const toast = useToast();

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
  const [autoSaving, setAutoSaving] = useState(false);
  const [showStackSelectionModal, setShowStackSelectionModal] = useState(false);
  const [excludedStackIds, setExcludedStackIds] = useState<string[]>([]);

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
        handleError(error, 'ClientPoolForm.fetchClients');
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
        const assignedStackIds = Array.from(new Set(
          allPools
            .filter(pool => pool.id !== selectedPool?.id)
            .flatMap(pool => pool.assignedStacks)
        ));
        setExcludedStackIds(assignedStackIds);
        setAvailableStacks(allStacks.filter(stack => !assignedStackIds.includes(stack.id)));
      } catch (error) {
        handleError(error, 'ClientPoolForm.fetchAvailableStacks');
        setAvailableStacks(allStacks); // Fallback to all stacks on error
        setExcludedStackIds([]);
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

  const handleStackSelectionConfirm = (stackIds: string[]) => {
    setSelectedStacks(new Set(stackIds));
    triggerAutoSave();
  };

  const triggerAutoSave = () => {
    setAutoSaving(true);
    setTimeout(() => setAutoSaving(false), 1000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.clientId || selectedStacks.size === 0) {
      toast.warning('Please select a client and at least one stack.');
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
                  onClick={() => setShowStackSelectionModal(true)}
                  className="px-4 py-2 bg-[#A0C800] text-white rounded-lg hover:bg-[#8bb400] transition-colors font-medium flex items-center space-x-2"
                >
                  <Grid3X3 className="h-4 w-4" />
                  <span>Select Stacks</span>
                </button>
              </div>

              {/* Selection Summary */}
              {selectedStacks.size > 0 ? (
                <div className="p-6 bg-gradient-to-br from-[#A0C800]/5 to-[#A0C800]/10 rounded-lg border-2 border-[#A0C800]/20">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-[#A0C800] text-white rounded-lg">
                        <Check className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="text-lg font-semibold text-gray-900">
                          {selectedStacks.size} Stack{selectedStacks.size !== 1 ? 's' : ''} Selected
                        </div>
                        <div className="text-sm text-gray-600">
                          Total capacity: {formData.maxCapacity} containers
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowStackSelectionModal(true)}
                      className="text-sm font-medium text-[#A0C800] hover:text-[#8bb400] px-3 py-2 hover:bg-white/50 rounded-md transition-colors"
                    >
                      Modify Selection
                    </button>
                  </div>
                  
                  {/* Stack Numbers Display */}
                  <div className="flex flex-wrap gap-2">
                    {Array.from(selectedStacks).map(stackId => {
                      const stack = getAllStacks().find(s => s.id === stackId);
                      if (!stack) return null;
                      return (
                        <div
                          key={stackId}
                          className="px-3 py-1.5 bg-white border border-[#A0C800]/30 rounded-lg text-sm font-medium text-gray-700 flex items-center space-x-2"
                        >
                          <span>S{stack.stackNumber.toString().padStart(2, '0')}</span>
                          <span className="text-xs text-gray-500">({stack.rows}×{stack.maxTiers})</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 text-center">
                  <Package className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Stacks Selected</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Click the button above to select stacks for this client pool
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowStackSelectionModal(true)}
                    className="px-4 py-2 bg-[#A0C800] text-white rounded-lg hover:bg-[#8bb400] transition-colors font-medium inline-flex items-center space-x-2"
                  >
                    <Grid3X3 className="h-4 w-4" />
                    <span>Select Stacks</span>
                  </button>
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

      {/* Stack Selection Modal */}
      <StackSelectionModal
        isOpen={showStackSelectionModal}
        onClose={() => setShowStackSelectionModal(false)}
        onConfirm={handleStackSelectionConfirm}
        yardId={yard.id}
        availableStacks={availableStacks
          .filter(stack => stack.stackNumber % 2 !== 0) // Only show physical stacks (odd numbers)
          .map(stack => ({
            id: stack.id,
            stackNumber: stack.stackNumber,
            sectionId: stack.sectionId || '',
            sectionName: yard.sections.find(s => s.id === stack.sectionId)?.name || 'Unknown Section',
            rows: stack.rows || 6,
            maxTiers: stack.maxTiers || 4,
            containerSize: (stack.containerSize as '20ft' | '40ft') || '20ft',
            isSpecialStack: stack.isSpecialStack || false,
            isVirtual: false, // All shown stacks are physical
            currentOccupancy: stack.currentOccupancy || 0,
            maxCapacity: (stack.rows || 6) * (stack.maxTiers || 4)
          }))}
        initialSelectedStacks={Array.from(selectedStacks)}
        excludeStackIds={excludedStackIds}
        title="Select Stacks for Client Pool"
        subtitle={`Choose stacks to assign to ${formData.clientName || 'this client'} (Physical stacks only - virtual stacks assigned automatically)`}
      />
    </div>
  );
};
