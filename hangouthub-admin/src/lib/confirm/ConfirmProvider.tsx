import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

import { Button } from '@/components/ui';
import { ConfirmContext, type ConfirmOptions } from './context';

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const close = useCallback((result: boolean) => {
    resolverRef.current?.(result);
    resolverRef.current = null;
    setOptions(null);
  }, []);

  // Échap pour annuler.
  useEffect(() => {
    if (!options) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [options, close]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}

      {options && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => close(false)}
            aria-hidden
          />
          <div
            role="alertdialog"
            aria-modal="true"
            className="relative z-10 w-full max-w-md animate-fade-in rounded-lg border border-border bg-card p-6 shadow-xl"
          >
            <h2 className="text-lg font-semibold">{options.title}</h2>
            {options.description && (
              <p className="mt-2 text-sm text-muted-foreground">{options.description}</p>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <Button variant="outline" onClick={() => close(false)}>
                {options.cancelLabel ?? 'Annuler'}
              </Button>
              <Button
                variant={options.variant === 'destructive' ? 'destructive' : 'primary'}
                onClick={() => close(true)}
                autoFocus
              >
                {options.confirmLabel ?? 'Confirmer'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
