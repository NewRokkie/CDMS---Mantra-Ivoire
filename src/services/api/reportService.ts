import { supabase } from './supabaseClient';
import { format, differenceInDays, startOfDay, endOfDay, subDays } from 'date-fns';

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface ContainerStats {
  total: number;
  inDepot: number;
  outDepot: number;
  maintenance: number;
  cleaning: number;
  byType: Record<string, number>;
  bySize: Record<string, number>;
  byClient: Array<{ clientCode: string; clientName: string; count: number }>;
}

export interface GateStats {
  totalGateIns: number;
  totalGateOuts: number;
  gateInsToday: number;
  gateOutsToday: number;
  avgProcessingTime: number;
  ediTransmissionRate: number;
}

export interface RevenueReport {
  totalRevenue: number;
  storageFees: number;
  handlingFees: number;
  byClient: Array<{
    clientCode: string;
    clientName: string;
    revenue: number;
    containerDays: number;
    avgRate: number;
  }>;
  byMonth: Array<{
    month: string;
    revenue: number;
    containerCount: number;
  }>;
}

export interface ClientActivity {
  clientCode: string;
  clientName: string;
  containersIn: number;
  containersOut: number;
  currentInventory: number;
  totalRevenue: number;
  avgStorageDays: number;
  recentOperations: Array<{
    date: Date;
    type: 'gate_in' | 'gate_out';
    containerNumber: string;
    bookingNumber?: string;
  }>;
}

export interface YardUtilization {
  totalCapacity: number;
  occupiedPositions: number;
  availablePositions: number;
  utilizationRate: number;
  byZone: Array<{
    zone: string;
    capacity: number;
    occupied: number;
    available: number;
    utilizationRate: number;
  }>;
  containersByStatus: Record<string, number>;
}

export interface ExportOptions {
  format: 'csv' | 'json' | 'html';
  filename?: string;
  includeHeaders?: boolean;
}

export class ReportService {
  /**
   * Get comprehensive container statistics
   */
  async getContainerStats(yardId?: string, dateRange?: DateRange): Promise<ContainerStats> {
    let query = supabase
      .from('containers')
      .select('*, clients!inner(name)');

    if (yardId) {
      query = query.eq('yard_id', yardId);
    }

    if (dateRange) {
      query = query
        .gte('gate_in_date', dateRange.startDate.toISOString())
        .lte('gate_in_date', dateRange.endDate.toISOString());
    }

    const { data: containers, error } = await query;

    if (error) throw error;

    // Calculate statistics
    const stats: ContainerStats = {
      total: containers.length,
      inDepot: containers.filter(c => c.status === 'in_depot').length,
      outDepot: containers.filter(c => c.status === 'out_depot').length,
      maintenance: containers.filter(c => c.status === 'maintenance').length,
      cleaning: containers.filter(c => c.status === 'cleaning').length,
      byType: {},
      bySize: {},
      byClient: []
    };

    // Group by type
    containers.forEach(c => {
      stats.byType[c.type] = (stats.byType[c.type] || 0) + 1;
      stats.bySize[c.size] = (stats.bySize[c.size] || 0) + 1;
    });

    // Group by client
    const clientMap = new Map<string, { name: string; count: number }>();
    containers.forEach(c => {
      if (c.client_code) {
        const existing = clientMap.get(c.client_code);
        if (existing) {
          existing.count++;
        } else {
          clientMap.set(c.client_code, {
            name: c.clients?.name || c.client_code,
            count: 1
          });
        }
      }
    });

    stats.byClient = Array.from(clientMap.entries()).map(([code, data]) => ({
      clientCode: code,
      clientName: data.name,
      count: data.count
    }));

    return stats;
  }

  /**
   * Get gate operation statistics
   */
  async getGateStats(yardId?: string, dateRange?: DateRange): Promise<GateStats> {
    const today = new Date();
    const startOfToday = startOfDay(today);
    const endOfToday = endOfDay(today);

    // Gate In stats
    let gateInQuery = supabase.from('gate_in_operations').select('*');
    if (yardId) gateInQuery = gateInQuery.eq('yard_id', yardId);
    if (dateRange) {
      gateInQuery = gateInQuery
        .gte('created_at', dateRange.startDate.toISOString())
        .lte('created_at', dateRange.endDate.toISOString());
    }

    const { data: gateIns } = await gateInQuery;

    // Gate Out stats
    let gateOutQuery = supabase.from('gate_out_operations').select('*');
    if (yardId) gateOutQuery = gateOutQuery.eq('yard_id', yardId);
    if (dateRange) {
      gateOutQuery = gateOutQuery
        .gte('created_at', dateRange.startDate.toISOString())
        .lte('created_at', dateRange.endDate.toISOString());
    }

    const { data: gateOuts } = await gateOutQuery;

    // Calculate stats
    const gateInsToday = (gateIns || []).filter(op => {
      const opDate = new Date(op.created_at);
      return opDate >= startOfToday && opDate <= endOfToday;
    }).length;

    const gateOutsToday = (gateOuts || []).filter(op => {
      const opDate = new Date(op.created_at);
      return opDate >= startOfToday && opDate <= endOfToday;
    }).length;

    // Calculate average processing time
    const completedOps = (gateIns || []).filter(op => op.completed_at);
    const avgProcessingTime = completedOps.length > 0
      ? completedOps.reduce((sum, op) => {
          const start = new Date(op.created_at);
          const end = new Date(op.completed_at);
          return sum + (end.getTime() - start.getTime()) / 1000 / 60; // minutes
        }, 0) / completedOps.length
      : 0;

    // EDI transmission rate
    const totalOps = (gateIns?.length || 0) + (gateOuts?.length || 0);
    const ediTransmitted = [
      ...(gateIns || []).filter(op => op.edi_transmitted),
      ...(gateOuts || []).filter(op => op.edi_transmitted)
    ].length;
    const ediTransmissionRate = totalOps > 0 ? (ediTransmitted / totalOps) * 100 : 0;

    return {
      totalGateIns: gateIns?.length || 0,
      totalGateOuts: gateOuts?.length || 0,
      gateInsToday,
      gateOutsToday,
      avgProcessingTime: Math.round(avgProcessingTime * 10) / 10,
      ediTransmissionRate: Math.round(ediTransmissionRate * 10) / 10
    };
  }

  /**
   * Get revenue report with billing calculations
   */
  async getRevenueReport(period: 'week' | 'month' | 'quarter' | 'year' | DateRange): Promise<RevenueReport> {
    // Determine date range
    let dateRange: DateRange;
    if (typeof period === 'object') {
      dateRange = period;
    } else {
      const now = new Date();
      switch (period) {
        case 'week':
          dateRange = { startDate: subDays(now, 7), endDate: now };
          break;
        case 'month':
          dateRange = { startDate: subDays(now, 30), endDate: now };
          break;
        case 'quarter':
          dateRange = { startDate: subDays(now, 90), endDate: now };
          break;
        case 'year':
          dateRange = { startDate: subDays(now, 365), endDate: now };
          break;
      }
    }

    // Get containers with client billing info
    const { data: containers, error } = await supabase
      .from('containers')
      .select(`
        *,
        clients!inner(
          code,
          name,
          free_days_allowed,
          daily_storage_rate,
          currency
        )
      `)
      .gte('gate_in_date', dateRange.startDate.toISOString())
      .lte('gate_in_date', dateRange.endDate.toISOString());

    if (error) throw error;

    let totalRevenue = 0;
    let storageFees = 0;
    const handlingFees = containers.length * 25; // $25 per container handling

    const clientRevenueMap = new Map<string, {
      name: string;
      revenue: number;
      containerDays: number;
      count: number;
    }>();

    const monthRevenueMap = new Map<string, {
      revenue: number;
      containerCount: number;
    }>();

    // Calculate revenue per container
    containers.forEach(c => {
      const client = c.clients;
      const gateInDate = new Date(c.gate_in_date);
      const gateOutDate = c.gate_out_date ? new Date(c.gate_out_date) : new Date();
      const daysInDepot = differenceInDays(gateOutDate, gateInDate);

      // Calculate billable days (after free days)
      const billableDays = Math.max(0, daysInDepot - client.free_days_allowed);
      const containerRevenue = billableDays * client.daily_storage_rate + 25; // + handling fee

      storageFees += billableDays * client.daily_storage_rate;
      totalRevenue += containerRevenue;

      // By client
      const existing = clientRevenueMap.get(client.code);
      if (existing) {
        existing.revenue += containerRevenue;
        existing.containerDays += daysInDepot;
        existing.count++;
      } else {
        clientRevenueMap.set(client.code, {
          name: client.name,
          revenue: containerRevenue,
          containerDays: daysInDepot,
          count: 1
        });
      }

      // By month
      const monthKey = format(gateInDate, 'yyyy-MM');
      const monthExisting = monthRevenueMap.get(monthKey);
      if (monthExisting) {
        monthExisting.revenue += containerRevenue;
        monthExisting.containerCount++;
      } else {
        monthRevenueMap.set(monthKey, {
          revenue: containerRevenue,
          containerCount: 1
        });
      }
    });

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      storageFees: Math.round(storageFees * 100) / 100,
      handlingFees: Math.round(handlingFees * 100) / 100,
      byClient: Array.from(clientRevenueMap.entries())
        .map(([code, data]) => ({
          clientCode: code,
          clientName: data.name,
          revenue: Math.round(data.revenue * 100) / 100,
          containerDays: data.containerDays,
          avgRate: Math.round((data.revenue / data.count) * 100) / 100
        }))
        .sort((a, b) => b.revenue - a.revenue),
      byMonth: Array.from(monthRevenueMap.entries())
        .map(([month, data]) => ({
          month,
          revenue: Math.round(data.revenue * 100) / 100,
          containerCount: data.containerCount
        }))
        .sort((a, b) => a.month.localeCompare(b.month))
    };
  }

  /**
   * Get detailed client activity report
   */
  async getClientActivity(clientCode: string): Promise<ClientActivity> {
    // Get client info
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('code', clientCode)
      .single();

    if (!client) throw new Error('Client not found');

    // Get current inventory
    const { data: currentContainers } = await supabase
      .from('containers')
      .select('*')
      .eq('client_code', clientCode)
      .eq('status', 'in_depot');

    // Get gate in operations
    const { data: gateIns } = await supabase
      .from('gate_in_operations')
      .select('*')
      .eq('client_code', clientCode)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get gate out operations
    const { data: gateOuts } = await supabase
      .from('gate_out_operations')
      .select('*')
      .eq('client_code', clientCode)
      .order('created_at', { ascending: false })
      .limit(10);

    // Get all containers for revenue calculation
    const { data: allContainers } = await supabase
      .from('containers')
      .select('*')
      .eq('client_code', clientCode);

    // Calculate revenue
    let totalRevenue = 0;
    let totalDays = 0;

    allContainers?.forEach(c => {
      if (c.gate_in_date) {
        const gateInDate = new Date(c.gate_in_date);
        const gateOutDate = c.gate_out_date ? new Date(c.gate_out_date) : new Date();
        const days = differenceInDays(gateOutDate, gateInDate);
        totalDays += days;

        const billableDays = Math.max(0, days - client.free_days_allowed);
        totalRevenue += billableDays * client.daily_storage_rate + 25;
      }
    });

    // Combine recent operations
    const recentOperations = [
      ...(gateIns || []).map(op => ({
        date: new Date(op.created_at),
        type: 'gate_in' as const,
        containerNumber: op.container_number,
        bookingNumber: undefined
      })),
      ...(gateOuts || []).map(op => ({
        date: new Date(op.created_at),
        type: 'gate_out' as const,
        containerNumber: '',
        bookingNumber: op.booking_number
      }))
    ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 10);

    return {
      clientCode: client.code,
      clientName: client.name,
      containersIn: gateIns?.length || 0,
      containersOut: gateOuts?.length || 0,
      currentInventory: currentContainers?.length || 0,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      avgStorageDays: allContainers?.length ? Math.round(totalDays / allContainers.length) : 0,
      recentOperations
    };
  }

  /**
   * Get yard utilization statistics
   */
  async getYardUtilization(yardId?: string): Promise<YardUtilization> {
    // Get containers
    let query = supabase.from('containers').select('*');
    if (yardId) {
      query = query.eq('yard_id', yardId);
    }

    const { data: containers } = await query;

    // Calculate utilization
    // Assuming 500 positions per yard (can be made configurable)
    const totalCapacity = 500;
    const occupiedPositions = (containers || []).filter(c => c.status === 'in_depot').length;
    const availablePositions = totalCapacity - occupiedPositions;
    const utilizationRate = (occupiedPositions / totalCapacity) * 100;

    // Group by zone (first 2 chars of location = zone)
    const zoneMap = new Map<string, { occupied: number }>();
    (containers || []).forEach(c => {
      if (c.location && c.status === 'in_depot') {
        const zone = c.location.substring(0, 3); // e.g., "S01" from "S01-R02-H03"
        const existing = zoneMap.get(zone);
        if (existing) {
          existing.occupied++;
        } else {
          zoneMap.set(zone, { occupied: 1 });
        }
      }
    });

    // Calculate by zone (assuming 20 positions per zone)
    const positionsPerZone = 20;
    const byZone = Array.from(zoneMap.entries()).map(([zone, data]) => ({
      zone,
      capacity: positionsPerZone,
      occupied: data.occupied,
      available: positionsPerZone - data.occupied,
      utilizationRate: (data.occupied / positionsPerZone) * 100
    }));

    // Containers by status
    const containersByStatus: Record<string, number> = {};
    (containers || []).forEach(c => {
      containersByStatus[c.status] = (containersByStatus[c.status] || 0) + 1;
    });

    return {
      totalCapacity,
      occupiedPositions,
      availablePositions,
      utilizationRate: Math.round(utilizationRate * 10) / 10,
      byZone,
      containersByStatus
    };
  }

  /**
   * Export data to CSV format
   */
  async exportToCSV(data: any[], options?: ExportOptions): Promise<string> {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    const rows = data.map(item =>
      headers.map(header => {
        const value = item[header];
        // Handle dates, objects, arrays
        if (value instanceof Date) {
          return format(value, 'yyyy-MM-dd HH:mm:ss');
        }
        if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value);
        }
        // Escape commas and quotes
        const strValue = String(value || '');
        if (strValue.includes(',') || strValue.includes('"')) {
          return `"${strValue.replace(/"/g, '""')}"`;
        }
        return strValue;
      }).join(',')
    );

    const csv = [
      options?.includeHeaders !== false ? headers.join(',') : null,
      ...rows
    ].filter(Boolean).join('\n');

    return csv;
  }

  /**
   * Export data to JSON format
   */
  async exportToJSON(data: any[], options?: ExportOptions): Promise<string> {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Export data to HTML table format
   */
  async exportToHTML(data: any[], title?: string): Promise<string> {
    if (data.length === 0) return '<p>No data</p>';

    const headers = Object.keys(data[0]);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title || 'Export'}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th { background-color: #2563eb; color: white; padding: 12px; text-align: left; }
    td { border: 1px solid #ddd; padding: 8px; }
    tr:nth-child(even) { background-color: #f9fafb; }
    .export-date { color: #666; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <h1>${title || 'Export'}</h1>
  <table>
    <thead>
      <tr>
        ${headers.map(h => `<th>${h}</th>`).join('')}
      </tr>
    </thead>
    <tbody>
      ${data.map(item => `
        <tr>
          ${headers.map(h => {
            const value = item[h];
            if (value instanceof Date) {
              return `<td>${format(value, 'yyyy-MM-dd HH:mm:ss')}</td>`;
            }
            if (typeof value === 'object' && value !== null) {
              return `<td>${JSON.stringify(value)}</td>`;
            }
            return `<td>${value || ''}</td>`;
          }).join('')}
        </tr>
      `).join('')}
    </tbody>
  </table>
  <p class="export-date">Generated on ${format(new Date(), 'yyyy-MM-dd HH:mm:ss')}</p>
</body>
</html>
    `.trim();

    return html;
  }

  /**
   * Download exported data as file
   */
  downloadFile(content: string, filename: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export const reportService = new ReportService();
