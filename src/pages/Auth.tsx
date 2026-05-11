import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FlaskConical } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const GoogleIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09Z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.93l3.66-2.84Z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.83C6.71 7.31 9.14 5.38 12 5.38Z"/></svg>
);

export default function Auth() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);

  // sign in
  const [siEmail, setSiEmail] = useState("");
  const [siPwd, setSiPwd] = useState("");

  // sign up
  const [suNombre, setSuNombre] = useState("");
  const [suOrg, setSuOrg] = useState("");
  const [suEmail, setSuEmail] = useState("");
  const [suPwd, setSuPwd] = useState("");

  useEffect(() => {
    if (!loading && user) {
      // No redirigimos directamente a /dashboard aquí porque el guard de workspace
      // se encargará de redirigir a /onboarding si el usuario no tiene workspaces
      navigate("/dashboard", { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: siEmail, password: siPwd });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Bienvenido");
    // No redirigimos aquí: el useEffect de arriba + workspace guard se encargan
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: suEmail,
      password: suPwd,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { nombre: suNombre, organizacion: suOrg || `Bioterio de ${suNombre}` },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Cuenta creada");
    // No redirigimos aquí: el useEffect de arriba + workspace guard se encargan
  };

  const handleGoogle = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/` });
    setBusy(false);
    if ("error" in result && result.error) toast.error("Error con Google");
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-glow pointer-events-none" />
      <div className="w-full max-w-md relative">
        <div className="flex flex-col items-center gap-4 mb-8">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow">
            <FlaskConical className="h-7 w-7 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <h1 className="display-font text-3xl font-bold">Bioterio</h1>
            <p className="text-sm text-muted-foreground mt-1">Sistema de Gestión</p>
          </div>
        </div>

        <div className="glass-card-elevated p-6">
          <Tabs defaultValue="signin">
            <TabsList className="grid grid-cols-2 mb-6 w-full">
              <TabsTrigger value="signin">Iniciar sesión</TabsTrigger>
              <TabsTrigger value="signup">Crear cuenta</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="si-email">Email</Label>
                  <Input id="si-email" type="email" required value={siEmail} onChange={(e) => setSiEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="si-pwd">Contraseña</Label>
                  <Input id="si-pwd" type="password" required value={siPwd} onChange={(e) => setSiPwd(e.target.value)} />
                </div>
                <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow" disabled={busy}>
                  {busy ? "Entrando…" : "Entrar"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="su-nombre">Nombre</Label>
                    <Input id="su-nombre" required value={suNombre} onChange={(e) => setSuNombre(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="su-org">Bioterio</Label>
                    <Input id="su-org" placeholder="Opcional" value={suOrg} onChange={(e) => setSuOrg(e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-email">Email</Label>
                  <Input id="su-email" type="email" required value={suEmail} onChange={(e) => setSuEmail(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="su-pwd">Contraseña</Label>
                  <Input id="su-pwd" type="password" required minLength={6} value={suPwd} onChange={(e) => setSuPwd(e.target.value)} />
                </div>
                <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow" disabled={busy}>
                  {busy ? "Creando…" : "Crear cuenta"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
            <div className="relative flex justify-center text-xs"><span className="bg-card px-2 text-muted-foreground">o continúa con</span></div>
          </div>

          <Button type="button" variant="outline" className="w-full gap-2" onClick={handleGoogle} disabled={busy}>
            <GoogleIcon /> Google
          </Button>
        </div>
      </div>
    </div>
  );
}
