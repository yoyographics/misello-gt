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
        <DialogContent className="sm:max-w-sm p-4 gap-2">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base">{options.title}</DialogTitle>
            {options.description && (
              <DialogDescription className="text-xs">{options.description}</DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2 mt-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              {options.cancelText}
            </Button>
            <Button
              size="sm"
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
