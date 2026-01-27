import * as XLSX from 'xlsx';

export interface ExportColumn {
  header: string;
  key: string;
  width?: number;
}

export interface ExportOptions {
  filename: string;
  sheetName: string;
  columns: ExportColumn[];
  data: any[];
}

/**
 * Exporte des données vers un fichier Excel (.xlsx)
 * @param options Options d'export incluant le nom du fichier, les colonnes et les données
 */
export const exportToExcel = (options: ExportOptions): void => {
  const { filename, sheetName, columns, data } = options;

  // Créer les en-têtes
  const headers = columns.map(col => col.header);

  // Créer les lignes de données
  const rows = data.map(item => 
    columns.map(col => {
      const value = item[col.key];
      
      // Formater les dates
      if (value instanceof Date) {
        return value.toLocaleString('fr-FR');
      }
      
      // Formater les valeurs null/undefined
      if (value === null || value === undefined) {
        return '';
      }
      
      return value;
    })
  );

  // Combiner en-têtes et données
  const worksheetData = [headers, ...rows];

  // Créer la feuille de calcul
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

  // Définir les largeurs de colonnes
  const columnWidths = columns.map(col => ({
    wch: col.width || 15
  }));
  worksheet['!cols'] = columnWidths;

  // Créer le classeur
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

  // Générer et télécharger le fichier
  XLSX.writeFile(workbook, filename);
};

/**
 * Formate une date pour l'export
 */
export const formatDateForExport = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '';
  
  return dateObj.toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formate une date courte pour l'export (sans heure)
 */
export const formatDateShortForExport = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '';
  
  return dateObj.toLocaleDateString('fr-FR');
};

/**
 * Formate uniquement l'heure pour l'export
 */
export const formatTimeForExport = (date: Date | string | null | undefined): string => {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return '';
  
  return dateObj.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Formate une durée en minutes pour l'export
 */
export const formatDurationForExport = (minutes: number | null | undefined): string => {
  if (!minutes || minutes <= 0) return '';
  
  if (minutes < 60) {
    return `${minutes}min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}min`;
};
