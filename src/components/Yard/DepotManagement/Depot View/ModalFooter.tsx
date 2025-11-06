import React from 'react';

interface Props {
  onClose: () => void;
}

export const ModalFooter: React.FC<Props> = ({ onClose }) => (
  <footer className="px-8 py-4 border-t border-gray-200 flex justify-end">
    <button
      onClick={onClose}
      className="px-5 py-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm transition"
    >
      Close
    </button>
  </footer>
);
