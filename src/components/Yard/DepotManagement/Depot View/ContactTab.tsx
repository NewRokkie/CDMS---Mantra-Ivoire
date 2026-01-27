import React from 'react';
import { Yard } from '../../../../types';
import { GlassCard } from './GlassCard';
import { Badge } from './Badge';

const formatPhoneNumber = (phone: string) => {
  if (!phone) return phone;

  // If it already contains spaces, return as is
  if (phone.includes(' ')) {
    return phone;
  }

  // Remove all non-numeric characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');

  // If it starts with +, format the digits after +
  if (cleaned.startsWith('+')) {
    const digits = cleaned.substring(4); // Remove +225
    const formatted = digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
    return `+225 ${formatted}`;
  }

  // For Côte d'Ivoire numbers, keep the leading 0 and format
  if (cleaned.length === 0) return '';

  // Format as Côte d'Ivoire number: +225 XX XX XX XX
  // Take first 8 digits after +225
  const digits = cleaned.substring(0, 8);
  const formatted = digits.replace(/(\d{2})(?=\d)/g, '$1 ').trim();

  return `+225 ${formatted}`;
};

interface Props {
  depot: Yard;
}

export const ContactTab: React.FC<Props> = ({ depot }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
    <GlassCard>
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Contact</h3>
      <DataRow label="Manager" value={depot.contactInfo?.manager || <Badge type="error">N/A</Badge>} />
      <DataRow label="Phone" value={depot.contactInfo?.phone ? formatPhoneNumber(depot.contactInfo.phone) : <Badge type="error">N/A</Badge>} />
      <DataRow label="Email" value={depot.contactInfo?.email || <Badge type="error">N/A</Badge>} />
    </GlassCard>

    <GlassCard>
      <h3 className="text-lg font-semibold mb-4 text-gray-800">Address</h3>
      <DataRow label="Street" value={depot.address?.street || <Badge type="error">N/A</Badge>} />
      <DataRow label="City" value={depot.address?.city || <Badge type="error">N/A</Badge>} />
      <DataRow label="State" value={depot.address?.state || <Badge type="error">N/A</Badge>} />
      <DataRow label="ZIP" value={depot.address?.zipCode || <Badge type="error">N/A</Badge>} />
      <DataRow label="Country" value={depot.address?.country || <Badge type="error">N/A</Badge>} />
    </GlassCard>
  </div>
);

const DataRow: React.FC<{ label: string; value: React.ReactNode }> = ({ label, value }) => (
  <div className="flex justify-between py-2 border-b border-gray-200 last:border-0">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium text-gray-700">{value}</span>
  </div>
);
