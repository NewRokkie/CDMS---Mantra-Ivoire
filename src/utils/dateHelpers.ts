export const toDate = (date: Date | string | undefined | null): Date | null => {
  if (!date) return null;
  if (date instanceof Date) return date;
  try {
    return new Date(date);
  } catch {
    return null;
  }
};

export const safeToLocaleDateString = (date: Date | string | undefined | null): string => {
  const d = toDate(date);
  return d ? d.toLocaleDateString() : 'N/A';
};

export const safeToDateString = (date: Date | string | undefined | null): string => {
  const d = toDate(date);
  return d ? d.toDateString() : 'N/A';
};

export const safeGetTime = (date: Date | string | undefined | null): number => {
  const d = toDate(date);
  return d ? d.getTime() : 0;
};

export const formatDate = (date: Date | string | undefined | null, format: 'short' | 'long' = 'short'): string => {
  const d = toDate(date);
  if (!d) return 'N/A';

  if (format === 'long') {
    return d.toLocaleString();
  }
  return d.toLocaleDateString();
};

export const getDaysBetween = (date1: Date | string | undefined | null, date2: Date | string | undefined | null = new Date()): number => {
  const d1 = toDate(date1);
  const d2 = toDate(date2);
  if (!d1 || !d2) return 0;

  const diffTime = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};
