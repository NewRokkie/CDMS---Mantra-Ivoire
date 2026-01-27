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
  damaged: number; // Add damaged containers count
  byType: Record<string, number>;
  bySize: Record<string, number>;
  byClient: Array<{ clientCode: string; clientName: string; count: number }>;
  byDamageAssessmentStage: Record<string, number>; // Track damage assessments by stage
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
  async getContainerStats(
    yardId?: string, 
    dateRange?: DateRange,
    filters?: {
      containerSizes?: string[];
      containerStatuses?: string[];
      clientCodes?: string[];
    }
  ): Promise<ContainerStats> {
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

    // Apply additional filters
    if (filters?.containerSizes && filters.containerSizes.length > 0) {
      query = query.in('size', filters.containerSizes);
    }

    if (filters?.containerStatuses && filters.containerStatuses.length > 0) {
      query = query.in('status', filters.containerStatuses);
    }

    if (filters?.clientCodes && filters.clientCodes.length > 0) {
      query = query.in('client_code', filters.clientCodes);
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
      damaged: containers.filter(c => c.damage && Array.isArray(c.damage) && c.damage.length > 0).length,
      byType: {},
      bySize: {},
      byClient: [],
      byDamageAssessmentStage: {}
    };

    // Group by type, size, and damage assessment stage
    containers.forEach(c => {
      stats.byType[c.type] = (stats.byType[c.type] || 0) + 1;
      stats.bySize[c.size] = (stats.bySize[c.size] || 0) + 1;
      
      // Track damage assessment stage if available
      if (c.damage_assessment_stage) {
        stats.byDamageAssessmentStage[c.damage_assessment_stage] = 
          (stats.byDamageAssessmentStage[c.damage_assessment_stage] || 0) + 1;
      }
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
  async getRevenueReport(
    period: 'week' | 'month' | 'quarter' | 'year' | DateRange,
    filters?: {
      containerSizes?: string[];
      containerStatuses?: string[];
      clientCodes?: string[];
    }
  ): Promise<RevenueReport> {
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
    let query = supabase
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

    // Apply additional filters
    if (filters?.containerSizes && filters.containerSizes.length > 0) {
      query = query.in('size', filters.containerSizes);
    }

    if (filters?.containerStatuses && filters.containerStatuses.length > 0) {
      query = query.in('status', filters.containerStatuses);
    }

    if (filters?.clientCodes && filters.clientCodes.length > 0) {
      query = query.in('client_code', filters.clientCodes);
    }

    const { data: containers, error } = await query;

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
  async exportToJSON(data: any[], _options?: ExportOptions): Promise<string> {
    return JSON.stringify(data, null, 2);
  }

  /**
   * Export data to HTML format with modern design, charts and comprehensive analytics
   */
  async exportToHTML(data: any[], title?: string): Promise<string> {
    if (data.length === 0) return '<p>No data available for export</p>';

    // Detect if this is analytics data (has containerStats, revenueReport, etc.)
    const isAnalyticsReport = data.length > 0 && data[0].containerStats && data[0].revenueReport;
    
    if (isAnalyticsReport) {
      return this.generateAnalyticsHTML(data[0], title);
    } else {
      return this.generateTableHTML(data, title);
    }
  }

  /**
   * Generate comprehensive analytics HTML report with charts and KPIs
   */
  private generateAnalyticsHTML(reportData: any, title?: string): string {
    const { containerStats, revenueReport, yardUtilization, exportedAt, yardInfo } = reportData;
    
    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Rapport d\'Analyse Avancé'}</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
      color: white;
      padding: 40px;
      text-align: center;
      position: relative;
      overflow: hidden;
    }
    
    .header::before {
      content: '';
      position: absolute;
      top: -50%;
      left: -50%;
      width: 200%;
      height: 200%;
      background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><pattern id="grain" width="100" height="100" patternUnits="userSpaceOnUse"><circle cx="25" cy="25" r="1" fill="white" opacity="0.1"/><circle cx="75" cy="75" r="1" fill="white" opacity="0.1"/><circle cx="50" cy="10" r="0.5" fill="white" opacity="0.1"/></pattern></defs><rect width="100" height="100" fill="url(%23grain)"/></svg>');
      animation: float 20s ease-in-out infinite;
    }
    
    @keyframes float {
      0%, 100% { transform: translateY(0px) rotate(0deg); }
      50% { transform: translateY(-20px) rotate(180deg); }
    }
    
    .header h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 10px;
      position: relative;
      z-index: 1;
    }
    
    .header .subtitle {
      font-size: 1.1rem;
      opacity: 0.9;
      position: relative;
      z-index: 1;
    }
    
    .report-info {
      background: #f8fafc;
      padding: 20px;
      border-left: 4px solid #2563eb;
      margin: 20px;
      border-radius: 8px;
    }
    
    .kpi-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      padding: 30px;
      background: #f8fafc;
    }
    
    .kpi-card {
      background: white;
      padding: 25px;
      border-radius: 15px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      border-left: 5px solid;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      position: relative;
      overflow: hidden;
    }
    
    .kpi-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
    }
    
    .kpi-card::before {
      content: '';
      position: absolute;
      top: 0;
      right: 0;
      width: 60px;
      height: 60px;
      background: linear-gradient(45deg, transparent 30%, rgba(255,255,255,0.1) 50%, transparent 70%);
      border-radius: 50%;
    }
    
    .kpi-revenue { border-left-color: #10b981; }
    .kpi-containers { border-left-color: #3b82f6; }
    .kpi-utilization { border-left-color: #f59e0b; }
    .kpi-damaged { border-left-color: #ef4444; }
    
    .kpi-title {
      font-size: 0.9rem;
      color: #6b7280;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 8px;
    }
    
    .kpi-value {
      font-size: 2.2rem;
      font-weight: 700;
      color: #1f2937;
      margin-bottom: 5px;
    }
    
    .kpi-subtitle {
      font-size: 0.85rem;
      color: #6b7280;
    }
    
    .charts-section {
      padding: 30px;
    }
    
    .chart-container {
      background: white;
      border-radius: 15px;
      padding: 25px;
      margin-bottom: 30px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    }
    
    .chart-title {
      font-size: 1.3rem;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 20px;
      text-align: center;
    }
    
    .chart-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 30px;
    }
    
    .table-container {
      background: white;
      border-radius: 15px;
      padding: 25px;
      margin: 30px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      overflow-x: auto;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    
    .data-table th {
      background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
      color: white;
      padding: 15px 12px;
      text-align: left;
      font-weight: 600;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .data-table th:first-child {
      border-radius: 8px 0 0 0;
    }
    
    .data-table th:last-child {
      border-radius: 0 8px 0 0;
    }
    
    .data-table td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 0.9rem;
    }
    
    .data-table tr:nth-child(even) {
      background-color: #f9fafb;
    }
    
    .data-table tr:hover {
      background-color: #f3f4f6;
    }
    
    .footer {
      background: #1f2937;
      color: white;
      padding: 20px;
      text-align: center;
      font-size: 0.9rem;
    }
    
    .progress-bar {
      width: 100%;
      height: 8px;
      background: #e5e7eb;
      border-radius: 4px;
      overflow: hidden;
      margin-top: 10px;
    }
    
    .progress-fill {
      height: 100%;
      background: linear-gradient(90deg, #10b981 0%, #059669 100%);
      border-radius: 4px;
      transition: width 0.3s ease;
    }
    
    .metric-icon {
      width: 24px;
      height: 24px;
      display: inline-block;
      margin-right: 8px;
      vertical-align: middle;
    }
    
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; }
      .kpi-card:hover { transform: none; }
    }
    
    @media (max-width: 768px) {
      .kpi-grid { grid-template-columns: 1fr; padding: 20px; }
      .chart-grid { grid-template-columns: 1fr; }
      .header h1 { font-size: 2rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>📊 ${title || 'Rapport d\'Analyse Avancé'}</h1>
      <p class="subtitle">Analyse complète des performances et métriques opérationnelles</p>
    </div>
    
    <!-- Report Info -->
    <div class="report-info">
      <h3>📋 Informations du Rapport</h3>
      <p><strong>Dépôt:</strong> ${yardInfo?.name || 'Tous les dépôts'} (${yardInfo?.code || 'ALL'})</p>
      <p><strong>Mode d'affichage:</strong> ${yardInfo?.viewMode === 'global' ? 'Vue globale' : 'Vue actuelle'}</p>
      <p><strong>Généré le:</strong> ${format(new Date(exportedAt || new Date()), 'dd/MM/yyyy à HH:mm:ss')}</p>
    </div>
    
    <!-- KPI Cards -->
    <div class="kpi-grid">
      <div class="kpi-card kpi-revenue">
        <div class="kpi-title">💰 Revenus Totaux</div>
        <div class="kpi-value">$${(revenueReport?.totalRevenue || 0).toLocaleString()}</div>
        <div class="kpi-subtitle">Stockage: $${(revenueReport?.storageFees || 0).toLocaleString()}</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: 85%"></div>
        </div>
      </div>
      
      <div class="kpi-card kpi-containers">
        <div class="kpi-title">📦 Conteneurs Totaux</div>
        <div class="kpi-value">${(containerStats?.total || 0).toLocaleString()}</div>
        <div class="kpi-subtitle">En dépôt: ${containerStats?.inDepot || 0}</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${containerStats?.total ? (containerStats.inDepot / containerStats.total * 100) : 0}%"></div>
        </div>
      </div>
      
      <div class="kpi-card kpi-utilization">
        <div class="kpi-title">📊 Utilisation Cour</div>
        <div class="kpi-value">${(yardUtilization?.utilizationRate || 0).toFixed(1)}%</div>
        <div class="kpi-subtitle">${yardUtilization?.occupiedPositions || 0}/${yardUtilization?.totalCapacity || 0} positions</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${yardUtilization?.utilizationRate || 0}%"></div>
        </div>
      </div>
      
      <div class="kpi-card kpi-damaged">
        <div class="kpi-title">⚠️ Conteneurs Endommagés</div>
        <div class="kpi-value">${containerStats?.damaged || 0}</div>
        <div class="kpi-subtitle">${containerStats?.total ? ((containerStats.damaged / containerStats.total) * 100).toFixed(1) : 0}% du total</div>
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${containerStats?.total ? (containerStats.damaged / containerStats.total * 100) : 0}%; background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);"></div>
        </div>
      </div>
    </div>
    
    <!-- Charts Section -->
    <div class="charts-section">
      <div class="chart-grid">
        <!-- Container by Type Chart -->
        ${containerStats?.byType && Object.keys(containerStats.byType).length > 0 ? `
        <div class="chart-container">
          <h3 class="chart-title">📦 Répartition par Type de Conteneur</h3>
          <canvas id="containerTypeChart" width="400" height="300"></canvas>
        </div>
        ` : ''}
        
        <!-- Container by Size Chart -->
        ${containerStats?.bySize && Object.keys(containerStats.bySize).length > 0 ? `
        <div class="chart-container">
          <h3 class="chart-title">📏 Répartition par Taille</h3>
          <canvas id="containerSizeChart" width="400" height="300"></canvas>
        </div>
        ` : ''}
      </div>
      
      <!-- Revenue Trend Chart -->
      ${revenueReport?.byMonth && revenueReport.byMonth.length > 0 ? `
      <div class="chart-container">
        <h3 class="chart-title">💹 Évolution des Revenus Mensuels</h3>
        <canvas id="revenueTrendChart" width="800" height="400"></canvas>
      </div>
      ` : ''}
    </div>
    
    <!-- Client Revenue Table -->
    ${revenueReport?.byClient && revenueReport.byClient.length > 0 ? `
    <div class="table-container">
      <h3 class="chart-title">🏢 Top Clients par Revenus</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>Client</th>
            <th>Code Client</th>
            <th>Revenus</th>
            <th>Jours Conteneur</th>
            <th>Taux Moyen</th>
          </tr>
        </thead>
        <tbody>
          ${revenueReport.byClient.slice(0, 10).map((client: any) => `
            <tr>
              <td><strong>${client.clientName}</strong></td>
              <td>${client.clientCode}</td>
              <td><strong>$${client.revenue.toLocaleString()}</strong></td>
              <td>${client.containerDays.toLocaleString()}</td>
              <td>$${client.avgRate.toFixed(2)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}
    
    <!-- Yard Utilization by Zone -->
    ${yardUtilization?.byZone && yardUtilization.byZone.length > 0 ? `
    <div class="table-container">
      <h3 class="chart-title">🏗️ Utilisation par Zone</h3>
      <table class="data-table">
        <thead>
          <tr>
            <th>Zone</th>
            <th>Capacité</th>
            <th>Occupé</th>
            <th>Disponible</th>
            <th>Taux d'Utilisation</th>
          </tr>
        </thead>
        <tbody>
          ${yardUtilization.byZone.map((zone: any) => `
            <tr>
              <td><strong>${zone.zone}</strong></td>
              <td>${zone.capacity}</td>
              <td>${zone.occupied}</td>
              <td>${zone.available}</td>
              <td>
                <strong>${zone.utilizationRate.toFixed(1)}%</strong>
                <div class="progress-bar">
                  <div class="progress-fill" style="width: ${zone.utilizationRate}%"></div>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    ` : ''}
    
    <!-- Footer -->
    <div class="footer">
      <p>📄 Rapport généré automatiquement par le système CDMS • ${format(new Date(), 'dd/MM/yyyy à HH:mm:ss')}</p>
      <p>🔒 Document confidentiel - Usage interne uniquement</p>
    </div>
  </div>
  
  <script>
    // Chart.js configurations and data rendering
    document.addEventListener('DOMContentLoaded', function() {
      // Container Type Pie Chart
      ${containerStats?.byType && Object.keys(containerStats.byType).length > 0 ? `
      const typeCtx = document.getElementById('containerTypeChart');
      if (typeCtx) {
        new Chart(typeCtx, {
          type: 'doughnut',
          data: {
            labels: ${JSON.stringify(Object.keys(containerStats.byType))},
            datasets: [{
              data: ${JSON.stringify(Object.values(containerStats.byType))},
              backgroundColor: [
                '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'
              ],
              borderWidth: 3,
              borderColor: '#ffffff'
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: { position: 'bottom', labels: { padding: 20, font: { size: 12 } } },
              tooltip: {
                callbacks: {
                  label: function(context) {
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                    return context.label + ': ' + context.parsed + ' (' + percentage + '%)';
                  }
                }
              }
            }
          }
        });
      }
      ` : ''}
      
      // Container Size Bar Chart
      ${containerStats?.bySize && Object.keys(containerStats.bySize).length > 0 ? `
      const sizeCtx = document.getElementById('containerSizeChart');
      if (sizeCtx) {
        new Chart(sizeCtx, {
          type: 'bar',
          data: {
            labels: ${JSON.stringify(Object.keys(containerStats.bySize))},
            datasets: [{
              label: 'Nombre de Conteneurs',
              data: ${JSON.stringify(Object.values(containerStats.bySize))},
              backgroundColor: 'rgba(59, 130, 246, 0.8)',
              borderColor: 'rgba(59, 130, 246, 1)',
              borderWidth: 2,
              borderRadius: 8
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: false }
            },
            scales: {
              y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.1)' } },
              x: { grid: { display: false } }
            }
          }
        });
      }
      ` : ''}
      
      // Revenue Trend Line Chart
      ${revenueReport?.byMonth && revenueReport.byMonth.length > 0 ? `
      const revenueCtx = document.getElementById('revenueTrendChart');
      if (revenueCtx) {
        new Chart(revenueCtx, {
          type: 'line',
          data: {
            labels: ${JSON.stringify(revenueReport.byMonth.map((m: any) => new Date(m.month + '-01').toLocaleDateString('fr', { month: 'short', year: 'numeric' })))},
            datasets: [{
              label: 'Revenus ($)',
              data: ${JSON.stringify(revenueReport.byMonth.map((m: any) => m.revenue))},
              borderColor: 'rgba(16, 185, 129, 1)',
              backgroundColor: 'rgba(16, 185, 129, 0.1)',
              borderWidth: 3,
              fill: true,
              tension: 0.4,
              pointBackgroundColor: 'rgba(16, 185, 129, 1)',
              pointBorderColor: '#ffffff',
              pointBorderWidth: 2,
              pointRadius: 6
            }]
          },
          options: {
            responsive: true,
            plugins: {
              legend: { display: false }
            },
            scales: {
              y: { 
                beginAtZero: true,
                grid: { color: 'rgba(0,0,0,0.1)' },
                ticks: {
                  callback: function(value) {
                    return '$' + value.toLocaleString();
                  }
                }
              },
              x: { grid: { display: false } }
            },
            interaction: {
              intersect: false,
              mode: 'index'
            }
          }
        });
      }
      ` : ''}
    });
  </script>
</body>
</html>`;

    return html;
  }

  /**
   * Generate simple table HTML for non-analytics data
   */
  private generateTableHTML(data: any[], title?: string): string {
    const headers = Object.keys(data[0]);

    const html = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title || 'Export de Données'}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      line-height: 1.6;
      color: #333;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 10px;
    }
    
    .table-container {
      padding: 30px;
      overflow-x: auto;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.1);
      border-radius: 10px;
      overflow: hidden;
    }
    
    .data-table th {
      background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
      color: white;
      padding: 15px 12px;
      text-align: left;
      font-weight: 600;
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .data-table td {
      padding: 12px;
      border-bottom: 1px solid #e5e7eb;
      font-size: 0.9rem;
    }
    
    .data-table tr:nth-child(even) {
      background-color: #f9fafb;
    }
    
    .data-table tr:hover {
      background-color: #f3f4f6;
    }
    
    .footer {
      background: #1f2937;
      color: white;
      padding: 20px;
      text-align: center;
      font-size: 0.9rem;
    }
    
    .summary {
      background: #f8fafc;
      padding: 20px;
      margin: 20px;
      border-radius: 10px;
      border-left: 4px solid #2563eb;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 ${title || 'Export de Données'}</h1>
      <p>Rapport généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm:ss')}</p>
    </div>
    
    <div class="summary">
      <h3>📋 Résumé</h3>
      <p><strong>Nombre total d'enregistrements:</strong> ${data.length.toLocaleString()}</p>
      <p><strong>Colonnes:</strong> ${headers.length}</p>
    </div>
    
    <div class="table-container">
      <table class="data-table">
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
                  return `<td>${format(value, 'dd/MM/yyyy HH:mm:ss')}</td>`;
                }
                if (typeof value === 'object' && value !== null) {
                  return `<td><pre>${JSON.stringify(value, null, 2)}</pre></td>`;
                }
                if (typeof value === 'number' && value > 1000) {
                  return `<td><strong>${value.toLocaleString()}</strong></td>`;
                }
                return `<td>${value || '-'}</td>`;
              }).join('')}
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
    
    <div class="footer">
      <p>📄 Rapport généré automatiquement par le système CDMS • ${format(new Date(), 'dd/MM/yyyy à HH:mm:ss')}</p>
    </div>
  </div>
</body>
</html>`;

    return html;
  }

  /**
   * Export data to Excel format (XLSX)
   */
  async exportToExcel(data: any[], _title?: string, _options?: ExportOptions): Promise<Blob> {
    if (data.length === 0) {
      throw new Error('No data to export');
    }

    // Create workbook structure
    const headers = Object.keys(data[0]);
    const worksheetData = [
      headers, // Header row
      ...data.map(item => 
        headers.map(header => {
          const value = item[header];
          if (value instanceof Date) {
            return format(value, 'yyyy-MM-dd HH:mm:ss');
          }
          if (typeof value === 'object' && value !== null) {
            return JSON.stringify(value);
          }
          return value || '';
        })
      )
    ];

    // Create CSV content (Excel can read CSV)
    const csvContent = worksheetData.map(row => 
      row.map(cell => {
        const strValue = String(cell);
        if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
          return `"${strValue.replace(/"/g, '""')}"`;
        }
        return strValue;
      }).join(',')
    ).join('\n');

    // Add BOM for proper Excel UTF-8 handling
    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { 
      type: 'application/vnd.ms-excel;charset=utf-8' 
    });

    return blob;
  }

  /**
   * Export data to PDF format with professional design and charts
   */
  async exportToPDF(data: any[], title?: string): Promise<Blob> {
    if (data.length === 0) {
      throw new Error('No data to export');
    }

    // Dynamic import to avoid bundling issues
    const jsPDF = (await import('jspdf')).default;
    await import('jspdf-autotable');

    // Detect if this is analytics data
    const isAnalyticsReport = data.length > 0 && data[0].containerStats && data[0].revenueReport;
    
    if (isAnalyticsReport) {
      return this.generateAnalyticsPDF(data[0], title || 'Rapport d\'Analyse Avancé');
    } else {
      return this.generateTablePDF(data, title || 'Export de Données');
    }
  }

  /**
   * Generate comprehensive analytics PDF report with charts and KPIs
   */
  private async generateAnalyticsPDF(reportData: any, title: string): Promise<Blob> {
    const jsPDF = (await import('jspdf')).default;
    await import('jspdf-autotable');
    
    const { containerStats, revenueReport, yardUtilization, exportedAt, yardInfo } = reportData;
    
    // Create PDF document in A4 format
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let currentY = 20;

    // Colors
    const primaryColor: [number, number, number] = [37, 99, 235]; // Blue
    const secondaryColor: [number, number, number] = [124, 58, 237]; // Purple
    const successColor: [number, number, number] = [16, 185, 129]; // Green
    const warningColor: [number, number, number] = [245, 158, 11]; // Orange
    const dangerColor: [number, number, number] = [239, 68, 68]; // Red

    // Helper function to add gradient background (simulated with rectangles)
    const addGradientHeader = (y: number, height: number) => {
      for (let i = 0; i < height; i++) {
        const alpha = 1 - (i / height) * 0.3;
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.setGState({ opacity: alpha } as any);
        doc.rect(0, y + i, pageWidth, 1, 'F');
      }
      doc.setGState({ opacity: 1 } as any);
    };

    // Header with gradient background
    addGradientHeader(0, 40);
    
    // Company logo area (placeholder)
    doc.setFillColor(255, 255, 255);
    doc.setGState({ opacity: 0.9 } as any);
    doc.circle(25, 20, 8, 'F');
    doc.setGState({ opacity: 1 } as any);
    
    // Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth / 2, 25, { align: 'center' });
    
    // Subtitle
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Analyse complète des performances et métriques opérationnelles', pageWidth / 2, 32, { align: 'center' });
    
    currentY = 50;

    // Report Information Box
    doc.setFillColor(248, 250, 252);
    doc.rect(15, currentY, pageWidth - 30, 25, 'F');
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(0.5);
    doc.rect(15, currentY, pageWidth - 30, 25, 'S');
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('📋 Informations du Rapport', 20, currentY + 8);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Dépôt: ${yardInfo?.name || 'Tous les dépôts'} (${yardInfo?.code || 'ALL'})`, 20, currentY + 15);
    doc.text(`Mode: ${yardInfo?.viewMode === 'global' ? 'Vue globale' : 'Vue actuelle'}`, 20, currentY + 20);
    doc.text(`Généré le: ${format(new Date(exportedAt || new Date()), 'dd/MM/yyyy à HH:mm:ss')}`, 120, currentY + 15);
    
    currentY += 35;

    // KPI Cards Section
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.text('📊 Indicateurs Clés de Performance', 20, currentY);
    currentY += 10;

    // KPI Cards in 2x2 grid
    const cardWidth = (pageWidth - 50) / 2;
    const cardHeight = 25;
    const cardSpacing = 10;

    // Revenue Card
    doc.setFillColor(successColor[0], successColor[1], successColor[2]);
    doc.setGState({ opacity: 0.1 } as any);
    doc.rect(20, currentY, cardWidth, cardHeight, 'F');
    doc.setGState({ opacity: 1 } as any);
    doc.setDrawColor(successColor[0], successColor[1], successColor[2]);
    doc.setLineWidth(2);
    doc.line(20, currentY, 20, currentY + cardHeight);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('💰 REVENUS TOTAUX', 25, currentY + 6);
    doc.setFontSize(16);
    doc.text(`$${(revenueReport?.totalRevenue || 0).toLocaleString()}`, 25, currentY + 14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Stockage: $${(revenueReport?.storageFees || 0).toLocaleString()}`, 25, currentY + 20);

    // Containers Card
    const containerCardX = 20 + cardWidth + cardSpacing;
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setGState({ opacity: 0.1 } as any);
    doc.rect(containerCardX, currentY, cardWidth, cardHeight, 'F');
    doc.setGState({ opacity: 1 } as any);
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.setLineWidth(2);
    doc.line(containerCardX, currentY, containerCardX, currentY + cardHeight);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('📦 CONTENEURS TOTAUX', containerCardX + 5, currentY + 6);
    doc.setFontSize(16);
    doc.text(`${(containerStats?.total || 0).toLocaleString()}`, containerCardX + 5, currentY + 14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`En dépôt: ${containerStats?.inDepot || 0}`, containerCardX + 5, currentY + 20);

    currentY += cardHeight + cardSpacing;

    // Utilization Card
    doc.setFillColor(warningColor[0], warningColor[1], warningColor[2]);
    doc.setGState({ opacity: 0.1 } as any);
    doc.rect(20, currentY, cardWidth, cardHeight, 'F');
    doc.setGState({ opacity: 1 } as any);
    doc.setDrawColor(warningColor[0], warningColor[1], warningColor[2]);
    doc.setLineWidth(2);
    doc.line(20, currentY, 20, currentY + cardHeight);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('📊 UTILISATION COUR', 25, currentY + 6);
    doc.setFontSize(16);
    doc.text(`${(yardUtilization?.utilizationRate || 0).toFixed(1)}%`, 25, currentY + 14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`${yardUtilization?.occupiedPositions || 0}/${yardUtilization?.totalCapacity || 0} positions`, 25, currentY + 20);

    // Damaged Card
    doc.setFillColor(dangerColor[0], dangerColor[1], dangerColor[2]);
    doc.setGState({ opacity: 0.1 } as any);
    doc.rect(containerCardX, currentY, cardWidth, cardHeight, 'F');
    doc.setGState({ opacity: 1 } as any);
    doc.setDrawColor(dangerColor[0], dangerColor[1], dangerColor[2]);
    doc.setLineWidth(2);
    doc.line(containerCardX, currentY, containerCardX, currentY + cardHeight);
    
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.text('⚠️ CONTENEURS ENDOMMAGÉS', containerCardX + 5, currentY + 6);
    doc.setFontSize(16);
    doc.text(`${containerStats?.damaged || 0}`, containerCardX + 5, currentY + 14);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    const damageRate = containerStats?.total ? ((containerStats.damaged / containerStats.total) * 100).toFixed(1) : 0;
    doc.text(`${damageRate}% du total`, containerCardX + 5, currentY + 20);

    currentY += cardHeight + 15;

    // Container Distribution Charts (Text-based)
    if (containerStats?.byType && Object.keys(containerStats.byType).length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('📦 Répartition des Conteneurs par Type', 20, currentY);
      currentY += 8;

      const typeEntries = Object.entries(containerStats.byType);
      const total = typeEntries.reduce((sum, [, count]) => sum + (count as number), 0);
      
      typeEntries.forEach(([type, count], index) => {
        const percentage = ((count as number / total) * 100).toFixed(1);
        const barWidth = (count as number / total) * 120;
        
        // Progress bar background
        doc.setFillColor(230, 230, 230);
        doc.rect(20, currentY, 120, 4, 'F');
        
        // Progress bar fill
        const colors: [number, number, number][] = [primaryColor, successColor, warningColor, dangerColor, secondaryColor];
        const color = colors[index % colors.length];
        doc.setFillColor(color[0], color[1], color[2]);
        doc.rect(20, currentY, barWidth, 4, 'F');
        
        // Label
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`${type}: ${count} (${percentage}%)`, 145, currentY + 3);
        
        currentY += 8;
      });
      
      currentY += 5;
    }

    // Check if we need a new page
    if (currentY > pageHeight - 60) {
      doc.addPage();
      currentY = 20;
    }

    // Client Revenue Table
    if (revenueReport?.byClient && revenueReport.byClient.length > 0) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('🏢 Top Clients par Revenus', 20, currentY);
      currentY += 10;

      const tableData = revenueReport.byClient.slice(0, 10).map((client: any) => [
        client.clientName,
        client.clientCode,
        `$${client.revenue.toLocaleString()}`,
        client.containerDays.toLocaleString(),
        `$${client.avgRate.toFixed(2)}`
      ]);

      (doc as any).autoTable({
        head: [['Client', 'Code', 'Revenus', 'Jours Conteneur', 'Taux Moyen']],
        body: tableData,
        startY: currentY,
        theme: 'grid',
        headStyles: {
          fillColor: primaryColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 3
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          2: { halign: 'right', fontStyle: 'bold' }, // Revenue column
          3: { halign: 'right' }, // Container days
          4: { halign: 'right' } // Average rate
        },
        margin: { left: 20, right: 20 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Yard Utilization by Zone
    if (yardUtilization?.byZone && yardUtilization.byZone.length > 0) {
      // Check if we need a new page
      if (currentY > pageHeight - 80) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.text('🏗️ Utilisation par Zone', 20, currentY);
      currentY += 10;

      const zoneTableData = yardUtilization.byZone.map((zone: any) => [
        zone.zone,
        zone.capacity.toString(),
        zone.occupied.toString(),
        zone.available.toString(),
        `${zone.utilizationRate.toFixed(1)}%`
      ]);

      (doc as any).autoTable({
        head: [['Zone', 'Capacité', 'Occupé', 'Disponible', 'Utilisation']],
        body: zoneTableData,
        startY: currentY,
        theme: 'grid',
        headStyles: {
          fillColor: warningColor,
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9
        },
        bodyStyles: {
          fontSize: 8,
          cellPadding: 3
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        columnStyles: {
          1: { halign: 'center' },
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'center', fontStyle: 'bold' }
        },
        margin: { left: 20, right: 20 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 15;
    }

    // Footer
    const addFooter = () => {
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        
        // Footer background
        doc.setFillColor(31, 41, 55);
        doc.rect(0, pageHeight - 20, pageWidth, 20, 'F');
        
        // Footer text
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('📄 Rapport généré automatiquement par le système CDMS', 20, pageHeight - 12);
        doc.text('🔒 Document confidentiel - Usage interne uniquement', 20, pageHeight - 6);
        
        // Page number
        doc.text(`Page ${i} sur ${pageCount}`, pageWidth - 30, pageHeight - 9);
        
        // Generation date
        doc.text(format(new Date(), 'dd/MM/yyyy HH:mm'), pageWidth - 50, pageHeight - 15);
      }
    };

    addFooter();

    // Convert to blob
    const pdfBlob = doc.output('blob');
    return pdfBlob;
  }

  /**
   * Generate simple table PDF for non-analytics data
   */
  private async generateTablePDF(data: any[], title: string): Promise<Blob> {
    const jsPDF = (await import('jspdf')).default;
    await import('jspdf-autotable');
    
    const doc = new jsPDF('landscape', 'mm', 'a4'); // Landscape for better table display
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    const primaryColor: [number, number, number] = [37, 99, 235];
    
    // Header
    doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(0, 0, pageWidth, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(title, pageWidth / 2, 20, { align: 'center' });
    
    // Summary box
    doc.setFillColor(248, 250, 252);
    doc.rect(15, 40, pageWidth - 30, 15, 'F');
    doc.setDrawColor(primaryColor[0], primaryColor[1], primaryColor[2]);
    doc.rect(15, 40, pageWidth - 30, 15, 'S');
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`📋 Résumé: ${data.length.toLocaleString()} enregistrements • Généré le ${format(new Date(), 'dd/MM/yyyy à HH:mm:ss')}`, 20, 50);
    
    // Prepare table data
    const headers = Object.keys(data[0]);
    const tableData = data.map(item => 
      headers.map(header => {
        const value = item[header];
        if (value instanceof Date) {
          return format(value, 'dd/MM/yyyy HH:mm');
        }
        if (typeof value === 'object' && value !== null) {
          return JSON.stringify(value).substring(0, 30) + '...';
        }
        if (typeof value === 'number' && value > 1000) {
          return value.toLocaleString();
        }
        return String(value || '-');
      })
    );

    // Generate table
    (doc as any).autoTable({
      head: [headers],
      body: tableData,
      startY: 65,
      theme: 'grid',
      headStyles: {
        fillColor: primaryColor,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 2
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252]
      },
      margin: { left: 15, right: 15 },
      tableWidth: 'auto',
      columnStyles: headers.reduce((styles, _header, index) => {
        // Auto-adjust column widths
        styles[index] = { cellWidth: 'auto' };
        return styles;
      }, {} as any)
    });

    // Footer
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      
      doc.setFillColor(31, 41, 55);
      doc.rect(0, pageHeight - 15, pageWidth, 15, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(8);
      doc.text('📄 Rapport généré par le système CDMS', 15, pageHeight - 8);
      doc.text(`Page ${i}/${pageCount}`, pageWidth - 30, pageHeight - 8);
    }

    return doc.output('blob');
  }

  /**
   * Get damage assessment report
   */
  async getDamageAssessmentReport(yardId?: string, dateRange?: DateRange) {
    let query = supabase
      .from('gate_in_operations')
      .select(`
        id,
        container_number,
        client_code,
        client_name,
        damage_reported,
        damage_description,
        damage_type,
        damage_assessment_stage,
        damage_assessed_by,
        damage_assessed_at,
        created_at
      `)
      .eq('damage_reported', true);

    if (yardId) {
      query = query.eq('yard_id', yardId);
    }

    if (dateRange) {
      query = query
        .gte('created_at', dateRange.startDate.toISOString())
        .lte('created_at', dateRange.endDate.toISOString());
    }

    const { data, error } = await query.order('damage_assessed_at', { ascending: false });
    if (error) throw error;

    const summary = {
      totalDamaged: data?.length || 0,
      byStage: {
        assignment: 0,
        inspection: 0
      },
      byType: {} as Record<string, number>,
      avgAssessmentTime: 0
    };

    let totalAssessmentTime = 0;
    let assessmentTimeCount = 0;

    data?.forEach(record => {
      // Count by stage
      if (record.damage_assessment_stage === 'assignment') {
        summary.byStage.assignment++;
      } else if (record.damage_assessment_stage === 'inspection') {
        summary.byStage.inspection++;
      }

      // Count by damage type
      if (record.damage_type) {
        summary.byType[record.damage_type] = (summary.byType[record.damage_type] || 0) + 1;
      }

      // Calculate assessment time if both dates are available
      if (record.damage_assessed_at && record.created_at) {
        const assessmentTime = new Date(record.damage_assessed_at).getTime() - new Date(record.created_at).getTime();
        totalAssessmentTime += assessmentTime;
        assessmentTimeCount++;
      }
    });

    // Calculate average assessment time in hours
    if (assessmentTimeCount > 0) {
      summary.avgAssessmentTime = Math.round((totalAssessmentTime / assessmentTimeCount) / (1000 * 60 * 60) * 10) / 10;
    }

    return {
      summary,
      details: data || []
    };
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
