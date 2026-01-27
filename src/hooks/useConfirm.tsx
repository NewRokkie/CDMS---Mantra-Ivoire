import { create } from 'zustand';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
}

interface ConfirmStore {
  isOpen: boolean;
  options: ConfirmOptions | null;
  confirm: (options: ConfirmOptions) => void;
  handleConfirm: () => void;
  handleCancel: () => void;
}

export const useConfirm = create<ConfirmStore>((set, get) => ({
  isOpen: false,
  options: null,
  
  confirm: (options) => {
    set({ isOpen: true, options });
  },
  
  handleConfirm: async () => {
    const { options } = get();
    if (options?.onConfirm) {
      await options.onConfirm();
    }
    set({ isOpen: false, options: null });
  },
  
  handleCancel: () => {
    const { options } = get();
    if (options?.onCancel) {
      options.onCancel();
    }
    set({ isOpen: false, options: null });
  }
}));
