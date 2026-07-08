'use client';

import { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
    () => (
      <Dialog open={isOpen} onOpenChange={(open) => !open && handleCancel()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{options.title}</DialogTitle>
            {options.description && (
              <DialogDescription>{options.description}</DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleCancel}>
              {options.cancelText}
            </Button>
            <Button
              variant={options.variant === 'destructive' ? 'destructive' : 'default'}
              onClick={handleConfirm}
              className={
                options.variant !== 'destructive'
                  ? 'bg-[#1B2A6B] hover:bg-[#141f4d] text-white'
                  : undefined
              }
            >
              {options.confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    ),
    [isOpen, options, handleCancel, handleConfirm]
  );

  return { confirm, DialogComponent };
}
