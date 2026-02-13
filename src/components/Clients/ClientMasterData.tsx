import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter, CreditCard as Edit, Eye, Trash2, Building, Mail, Phone, MapPin } from 'lucide-react';
import { Client } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../hooks/useLanguage';
import { clientService } from '../../services/api';
import { ClientSearchField } from '../Common/ClientSearchField';
import { ClientFormModal } from './ClientFormModal';
import { ClientViewModal } from './ClientViewModal';
import { ContactDisplay } from '../Common/ContactDisplay';
import { DesktopOnlyMessage } from '../Common/DesktopOnlyMessage';
import { handleError } from '../../services/errorHandling';
import { useToast } from '../../hooks/useToast';
import { useConfirm } from '../../hooks/useConfirm';

export const ClientMasterData: React.FC = () => {
  const { t } = useLanguage();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const toast = useToast();
  const { confirm } = useConfirm();

  useEffect(() => {
    async function loadClients() {
      try {
        setLoading(true);
        const data = await clientService.getAll().catch(err => { 
          handleError(err, 'ClientMasterData.loadClients');
          return []; 
        });
        setClients(data || []);
      } catch (error) {
        handleError(error, 'ClientMasterData.loadClients');
        setClients([]);
      } finally {
        setLoading(false);
      }
    }
    loadClients();
  }, []);

  const addClient = async (client: any) => {
    const newClient = await clientService.create(client);
    setClients(prev => [...prev, newClient]);
  };

  const updateClient = async (id: string, updates: any) => {
    try {
      const updatedClient = await clientService.update(id, updates);
      setClients(prev => prev.map(c => c.id === id ? updatedClient : c));
      return updatedClient;
    } catch (error) {
      throw error;
    }
  };

  const deleteClient = async (id: string) => {
    await clientService.delete(id);
    setClients(prev => prev.filter(c => c.id !== id));
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const { user } = useAuth();

  const canManageClients = user?.role === 'admin' || user?.role === 'supervisor';

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         client.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' ||
                         (statusFilter === 'active' && client.isActive) ||
                         (statusFilter === 'inactive' && !client.isActive);
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (client: Client) => {
    setSelectedClient(client);
    setShowForm(true);
  };

  const handleView = (client: Client) => {
    setSelectedClient(client);
    setShowViewModal(true);
  };

  const handleDelete = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    confirm({
      title: t('clients.delete.title'),
      message: t('clients.delete.confirm').replace('{client}', client?.name || ''),
      confirmText: t('clients.delete.title'),
      cancelText: t('common.cancel'),
      variant: 'danger',
      onConfirm: async () => {
        await deleteClient(clientId);
        toast.success(t('clients.success.delete'));
      }
    });
  };



  const DesktopContent = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">{t('clients.title')}</h2>
        <div className="flex items-center space-x-2">         
          {canManageClients && (
            <button
              onClick={() => {
                setSelectedClient(null);
                setShowForm(true);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>{t('clients.create')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Building className="h-5 w-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">{t('clients.stats.total')}</p>
              <p className="text-lg font-semibold text-gray-900">{clients.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Building className="h-5 w-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">{t('clients.stats.active')}</p>
              <p className="text-lg font-semibold text-gray-900">
                {clients.filter(c => c.isActive).length}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder={t('clients.search')}
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
              <option value="all">{t('common.all')}</option>
              <option value="active">{t('common.status.active')}</option>
              <option value="inactive">{t('common.status.inactive')}</option>
            </select>
          </div>

          <button className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="h-4 w-4" />
            <span>{t('common.filter')}</span>
          </button>
        </div>
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.client')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('clients.table.contact')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.location')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.status')}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-2 text-gray-500">{t('common.loading')}</span>
                    </div>
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="text-gray-500">
                      <Building className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-lg font-medium">{t('clients.noClients')}</p>
                      <p className="text-sm">
                        {searchTerm || statusFilter !== 'all' 
                          ? t('common.tryAdjusting')
                          : t('clients.noClientsEmpty')
                        }
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="hover:bg-gray-50 transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                          <Building className="h-5 w-5 text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{client.name}</div>
                          <div className="text-sm text-gray-500">{client.code}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <ContactDisplay
                        contactPerson={client.contactPerson}
                        fallbackEmail={client.email}
                        fallbackPhone={client.phone}
                        compact={true}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center text-sm text-gray-900">
                          <MapPin className="h-3 w-3 text-gray-400 mr-2 flex-shrink-0" />
                          <span className="truncate">
                            {client.address ? `${client.address.city}, ${client.address.state}` : '-'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-500 ml-5">
                          {client.address?.country || '-'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        client.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {client.isActive ? t('common.status.active') : t('common.status.inactive')}
                      </span>
                      {client.autoEDI && (
                        <span className="ml-2 inline-flex px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                          EDI
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleView(client)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50 transition-colors"
                          title={t('common.viewDetails')}
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        {canManageClients && (
                          <>
                            <button
                              onClick={() => handleEdit(client)}
                              className="text-gray-600 hover:text-gray-900 p-1 rounded hover:bg-gray-50 transition-colors"
                              title={t('clients.edit')}
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(client.id)}
                              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 transition-colors"
                              title={t('clients.delete.title')}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Client Form Modal */}
      {showForm && (
        <ClientFormModal
          isOpen={showForm}
          onClose={() => {
            setShowForm(false);
            setSelectedClient(null);
          }}
          selectedClient={selectedClient}
          onSubmit={async (clientData) => {
            try {
              if (selectedClient) {
                await updateClient(selectedClient.id, clientData);
                toast.success(t('clients.success.update'));
              } else {
                await addClient(clientData);
                toast.success(t('clients.success.create'));
              }
              setShowForm(false);
              setSelectedClient(null);
            } catch (error) {
              toast.error(t('clients.error.save') + ' ' + (error as Error).message);
            }
          }}
        />
      )}

      {/* Client View Modal */}
      {showViewModal && selectedClient && (
        <ClientViewModal
          isOpen={showViewModal}
          onClose={() => {
            setShowViewModal(false);
            setSelectedClient(null);
          }}
          client={selectedClient}
        />
      )}
    </div>
  );

  return (
    <>
      {/* Desktop Only Message for Mobile */}
      <div className="lg:hidden">
        <DesktopOnlyMessage
          moduleName="Client Master Data"
          reason="Managing detailed client information, contact persons, billing details, and comprehensive client profiles requires extensive forms optimized for desktop."
        />
      </div>

      {/* Desktop View */}
      <div className="hidden lg:block">
        <DesktopContent />
      </div>
    </>
  );
};
