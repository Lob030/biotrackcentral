import { FlaskConical } from "lucide-react";

export default function PageLoader() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow animate-pulse-glow">
          <FlaskConical className="h-7 w-7 text-primary-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Cargando…</p>
      </div>
    </div>
  );
}
