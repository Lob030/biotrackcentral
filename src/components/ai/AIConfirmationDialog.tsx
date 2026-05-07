import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import AIResultPreview from "./AIResultPreview";
import { DESTRUCTIVE_INTENTS, type ParsedIntent } from "@/data/aiCommand";
import { Loader2 } from "lucide-react";

interface Props {
  intent: ParsedIntent | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isExecuting: boolean;
}

export default function AIConfirmationDialog({ intent, open, onClose, onConfirm, isExecuting }: Props) {
  const isDestructive = intent ? DESTRUCTIVE_INTENTS.has(intent.intent) : false;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && !isExecuting && onClose()}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="display-font">Confirmar acción</DialogTitle>
          <DialogDescription>
            Revisa lo que el copiloto va a ejecutar. Nada se guarda hasta que confirmes.
          </DialogDescription>
        </DialogHeader>
        {intent && <AIResultPreview intent={intent} />}
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isExecuting}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isExecuting}
            className={
              isDestructive
                ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                : "bg-gradient-primary text-primary-foreground hover:opacity-90"
            }
          >
            {isExecuting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isDestructive ? "Confirmar y ejecutar" : "Ejecutar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
