'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

type ConfirmResolver = (value: boolean) => void;

export function useConfirmDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions>({
    title: '',
    confirmText: 'Confirmar',
    cancelText: 'Cancelar',
    variant: 'default',
  });
  const [resolver, setResolver] = useState<ConfirmResolver | null>(null);

  const confirm = useCallback(
    (opts: ConfirmOptions): Promise<boolean> => {
      return new Promise((resolve) => {
        setOptions({
          confirmText: 'Confirmar',
          cancelText: 'Cancelar',
          variant: 'default',
          ...opts,
        });
        setResolver(() => resolve);
        setIsOpen(true);
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    resolver?.(true);
    setResolver(null);
  }, [resolver]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    resolver?.(false);
    setResolver(null);
  }, [resolver]);

  const DialogComponent = useCallback(
    () => {
      if (!isOpen) return null;
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50" onClick={handleCancel} />
          <div className="relative z-10 w-[420px] rounded-sm bg-white shadow-xl border p-4">
            <div className="text-sm font-semibold text-gray-900">{options.title}</div>
            {options.description && (
              <div className="text-xs text-gray-500 mt-1">{options.description}</div>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" onClick={handleCancel}>
                {options.cancelText}
              </Button>
              <Button
                size="sm"
                className={`${
                  options.variant === 'destructive'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : 'bg-[#1B2A6B] hover:bg-[#141f4d] text-white'
                }`}
                onClick={handleConfirm}
              >
                {options.confirmText}
              </Button>
            </div>
          </div>
        </div>
      );
    },
    [isOpen, options, handleCancel, handleConfirm]
  );

  return { confirm, DialogComponent };
}
