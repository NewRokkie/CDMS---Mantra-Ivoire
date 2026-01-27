import React from 'react';
import clsx from 'clsx';

interface Props {
  id: string;
  label: string;
  active: boolean;
  onClick: () => void;
}

export const TabButton: React.FC<Props> = ({ id, label, active, onClick }) => (
  <button
    data-tab-id={id}
    onClick={onClick}
    className={clsx(
      'outline-none px-3 py-4 text-sm font-medium capitalize transition',
      active ? 'text-gray-800' : 'text-gray-500 hover:text-gray-700'
    )}
  >
    {label}
  </button>
);
