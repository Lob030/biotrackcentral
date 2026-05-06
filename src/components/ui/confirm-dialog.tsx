import { createContext, useCallback, useContext, useRef, useState, ReactNode } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

type ConfirmOptions = {
  title?: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "destructive" applies the destructive button style. */
  tone?: "default" | "destructive";
};

type ConfirmFn = (opts?: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/**
 * Provider for an app-wide promise-based confirm dialog.
 *
 *   const confirm = useConfirm();
 *   if (await confirm({ title: "Eliminar caja?", tone: "destructive" })) ...
 *
 * Replaces native window.confirm() with an accessible, themed dialog.
 */
export function ConfirmDialogProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [opts, setOpts] = useState<ConfirmOptions>({});
  const resolverRef = useRef<((v: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((options) => {
    setOpts(options ?? {});
    setOpen(true);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  const handleResolve = (value: boolean) => {
    setOpen(false);
    resolverRef.current?.(value);
    resolverRef.current = null;
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog
        open={open}
        onOpenChange={(o) => {
          if (!o) handleResolve(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="display-font">
              {opts.title ?? "¿Confirmar acción?"}
            </AlertDialogTitle>
            {opts.description && (
              <AlertDialogDescription>{opts.description}</AlertDialogDescription>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => handleResolve(false)}>
              {opts.cancelLabel ?? "Cancelar"}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleResolve(true)}
              className={cn(
                opts.tone === "destructive" &&
                  "bg-destructive text-destructive-foreground hover:bg-destructive/90",
              )}
            >
              {opts.confirmLabel ?? "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within <ConfirmDialogProvider>");
  }
  return ctx;
}
