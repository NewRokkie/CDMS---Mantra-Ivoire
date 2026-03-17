/**
 * EDI Export Service
 * Exports transmission logs to CSV or Excel (XLSX via SheetJS if available,
 * otherwise falls back to CSV download).
 */
import { supabase } from '../api/supabaseClient';
import { EDITransmissionLog } from './ediTransmissionService';

export interface LogFilters {
  status?: 'success' | 'failed' | 'pending' | 'retrying';
  operation?: 'GATE_IN' | 'GATE_OUT';
  clientCode?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

const COLUMNS = [
  { key: 'id',              label: 'Log ID' },
  { key: 'containerNumber', label: 'Container' },
  { key: 'operation',       label: 'Operation' },
  { key: 'status',          label: 'Status' },
  { key: 'partnerCode',     label: 'Client Code' },
  { key: 'fileName',        label: 'File Name' },
  { key: 'fileSize',        label: 'File Size (bytes)' },
  { key: 'attempts',        label: 'Attempts' },
  { key: 'uploadedToSftp',  label: 'Uploaded to SFTP' },
  { key: 'lastAttempt',     label: 'Last Attempt' },
  { key: 'createdAt',       label: 'Created At' },
  { key: 'errorMessage',    label: 'Error' },
] as const;

class EDIExportServiceImpl {
  /**
   * Fetch logs from DB applying filters.
   */
  async fetchFiltered(filters: LogFilters): Promise<EDITransmissionLog[]> {
    try {
      let query = supabase
        .from('edi_transmission_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (filters.status)    query = query.eq('status', filters.status);
      if (filters.operation) query = query.eq('operation', filters.operation);
      if (filters.clientCode) query = query.eq('partner_code', filters.clientCode);
      if (filters.dateFrom)  query = query.gte('created_at', filters.dateFrom.toISOString());
      if (filters.dateTo)    query = query.lte('created_at', filters.dateTo.toISOString());

      const { data, error } = await query;
      if (error) throw error;

      return (data || []).map(log => ({
        id: log.id,
        containerNumber: log.container_number,
        operation: log.operation,
        status: log.status,
        attempts: log.attempts || 0,
        lastAttempt: new Date(log.last_attempt),
        fileName: log.file_name,
        fileSize: log.file_size || 0,
        partnerCode: log.partner_code,
        configId: log.config_id,
        uploadedToSftp: log.uploaded_to_sftp || false,
        errorMessage: log.error_message,
        acknowledgmentReceived: log.acknowledgment_received ? new Date(log.acknowledgment_received) : undefined,
        createdAt: new Date(log.created_at),
        updatedAt: new Date(log.updated_at),
        containerId: log.container_id,
        clientId: log.client_id,
        gateInOperationId: log.gate_in_operation_id,
        gateOutOperationId: log.gate_out_operation_id,
      }));
    } catch (error) {
      console.error('EDIExportService: failed to fetch logs', error);
      return [];
    }
  }

  /**
   * Build CSV string from logs.
   */
  private buildCSV(logs: EDITransmissionLog[]): string {
    const escape = (v: unknown): string => {
      const s = v == null ? '' : String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n')
        ? `"${s.replace(/"/g, '""')}"`
        : s;
    };

    const header = COLUMNS.map(c => c.label).join(',');
    const rows = logs.map(log =>
      COLUMNS.map(({ key }) => {
        const val = (log as any)[key];
        if (val instanceof Date) return escape(val.toLocaleString());
        if (typeof val === 'boolean') return val ? 'Yes' : 'No';
        return escape(val);
      }).join(',')
    );

    return [header, ...rows].join('\r\n');
  }

  /**
   * Export logs to CSV and trigger browser download.
   */
  async exportLogsToCSV(filters: LogFilters = {}): Promise<void> {
    const logs = await this.fetchFiltered(filters);
    const csv = this.buildCSV(logs);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    this.triggerDownload(blob, `edi_logs_${this.dateTag()}.csv`);
  }

  /**
   * Export logs to Excel (.xlsx) using SheetJS if available,
   * otherwise falls back to CSV with .xlsx extension (opens in Excel).
   */
  async exportLogsToExcel(filters: LogFilters = {}): Promise<void> {
    const logs = await this.fetchFiltered(filters);

    // Try SheetJS (xlsx) if loaded
    const XLSX = (window as any).XLSX;
    if (XLSX) {
      const wsData = [
        COLUMNS.map(c => c.label),
        ...logs.map(log =>
          COLUMNS.map(({ key }) => {
            const val = (log as any)[key];
            if (val instanceof Date) return val.toLocaleString();
            if (typeof val === 'boolean') return val ? 'Yes' : 'No';
            return val ?? '';
          })
        ),
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'EDI Logs');
      XLSX.writeFile(wb, `edi_logs_${this.dateTag()}.xlsx`);
    } else {
      // Fallback: CSV with tab separator (opens cleanly in Excel)
      const csv = this.buildCSV(logs);
      const blob = new Blob([csv], { type: 'application/vnd.ms-excel;charset=utf-8;' });
      this.triggerDownload(blob, `edi_logs_${this.dateTag()}.csv`);
    }
  }

  private dateTag(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private triggerDownload(blob: Blob, filename: string): void {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

export const ediExportService = new EDIExportServiceImpl();
