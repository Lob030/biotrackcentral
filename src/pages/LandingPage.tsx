import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dna,
  Package,
  ShoppingCart,
  Users,
  BarChart3,
  Bell,
  Rocket,
  Play,
  Check,
  X,
  Sparkles,
  FlaskConical,
} from "lucide-react";

function Feature({ icon: Icon, title, desc }: any) {
  return (
    <div className="glass-card p-6 transition-all hover:border-primary/40 hover:-translate-y-0.5">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
        <Icon className="h-7 w-7" strokeWidth={2} />
      </div>
      <h3 className="display-font text-xl font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
    </div>
  );
}

function EspecieCard({ emoji, nombre, sub, etapas, rango, precios }: any) {
  return (
    <div className="glass-card p-6 transition-all hover:border-primary/40">
      <div className="text-4xl mb-3">{emoji}</div>
      <h3 className="display-font text-2xl font-bold">{nombre}</h3>
      <p className="text-sm text-muted-foreground italic mb-4">{sub}</p>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between border-b border-border/40 pb-2">
          <span className="text-muted-foreground">Etapas</span>
          <span className="font-semibold">{etapas}</span>
        </div>
        <div className="flex justify-between border-b border-border/40 pb-2">
          <span className="text-muted-foreground">Rango</span>
          <span className="font-semibold">{rango}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Precios</span>
          <span className="font-semibold text-primary">{precios}</span>
        </div>
      </div>
    </div>
  );
}

function PlanCard({ icon, nombre, precio, sub, features, cta, recommended, onClick }: any) {
  return (
    <div
      className={`glass-card p-6 flex flex-col relative ${
        recommended ? "border-primary/60 shadow-glow" : ""
      }`}
    >
      {recommended && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-primary text-primary-foreground text-xs font-semibold">
          Recomendado
        </div>
      )}
      <div className="text-3xl mb-2">{icon}</div>
      <h3 className="display-font text-xl font-bold">{nombre}</h3>
      <p className="display-font text-3xl font-bold mt-2 mb-1">{precio}</p>
      <p className="text-xs text-muted-foreground mb-4">{sub}</p>
      <ul className="space-y-2 text-sm flex-1 mb-6">
        {features.map((f: any, i: number) => (
          <li key={i} className="flex items-start gap-2">
            {f.ok ? (
              <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
            ) : (
              <X className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            )}
            <span className={f.ok ? "" : "text-muted-foreground"}>{f.label}</span>
          </li>
        ))}
      </ul>
      <Button
        onClick={onClick}
        variant={recommended ? "default" : "outline"}
        className={recommended ? "bg-gradient-primary text-primary-foreground" : ""}
      >
        {cta}
      </Button>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const goRegister = () => navigate("/auth?tab=register");
  const goLogin = () => navigate("/auth");

  return (
    <div className="min-h-screen bg-background">
      {/* NAVBAR */}
      <nav className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-glow">
              <FlaskConical className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="display-font font-bold text-lg">BioTrack Central</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goLogin}>
              Iniciar sesión
            </Button>
            <Button
              size="sm"
              onClick={goRegister}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90"
            >
              Registrarse
            </Button>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative py-24 md:py-32 px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none" style={{ background: "var(--gradient-glow)" }} />
        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/5 text-primary text-xs font-medium mb-6">
            <Sparkles className="h-3.5 w-3.5" />
            Sistema de gestión para bioterios profesionales
          </div>
          <h1 className="display-font text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight">
            Administra tu bioterio
            <br />
            <span className="text-gradient">con precisión total</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mt-6 max-w-2xl mx-auto leading-relaxed">
            Control completo de lotes, reproductores, ventas y clientes. Desde el nacimiento hasta la entrega,
            todo en una sola plataforma.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 mt-10">
            <Button
              size="lg"
              onClick={goRegister}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
            >
              <Rocket className="h-4 w-4" />
              Comenzar gratis
            </Button>
            <Button size="lg" variant="outline" onClick={goRegister}>
              <Play className="h-4 w-4" />
              Ver demo
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-4 md:gap-8 mt-16 max-w-2xl mx-auto">
            {[
              { n: "3", l: "Especies soportadas" },
              { n: "27+", l: "Variables monitoreadas" },
              { n: "100%", l: "En la nube · Seguro" },
            ].map((s) => (
              <div key={s.l} className="glass-card p-5">
                <p className="display-font text-3xl md:text-4xl font-bold text-gradient">{s.n}</p>
                <p className="text-xs text-muted-foreground mt-1">{s.l}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* FEATURES */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="display-font text-4xl md:text-5xl font-bold">Todo lo que necesita tu bioterio</h2>
            <p className="text-muted-foreground mt-3 text-lg">
              Una plataforma completa, diseñada para el día a día del laboratorio.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <Feature
              icon={Dna}
              title="Control Genético"
              desc="Registra líneas genéticas, seguimiento del coeficiente de consanguinidad y alertas de renovación automáticas."
            />
            <Feature
              icon={Package}
              title="Gestión de Lotes"
              desc="Monitorea cada lote desde el nacimiento. Etapas de crecimiento calculadas automáticamente por edad, con timeline de eventos."
            />
            <Feature
              icon={ShoppingCart}
              title="Ventas Inteligentes"
              desc="Precios automáticos por etapa y especie. Descuentos por volumen y acuerdos especiales por cliente."
            />
            <Feature
              icon={Users}
              title="Trazabilidad de Clientes"
              desc="Historial completo de compras, ranking de mejores clientes y análisis de productos más demandados."
            />
            <Feature
              icon={BarChart3}
              title="Analytics en Tiempo Real"
              desc="Gráficos de ingresos, gastos y ganancia neta. Proyección de stock y alertas de desabasto por tamaño."
            />
            <Feature
              icon={Bell}
              title="Alertas Automáticas"
              desc="Cambio de reproductores, renovación genética, stock bajo y pedidos pendientes. Nunca más te olvides de nada."
            />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* ESPECIES */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="display-font text-4xl md:text-5xl font-bold">
              Especializado en roedores de bioterio
            </h2>
            <p className="text-muted-foreground mt-3 text-lg">
              Tablas de etapas, pesos y precios calibradas para cada especie.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <EspecieCard
              emoji="🐀"
              nombre="ASF"
              sub="Mastomys coucha"
              etapas="7"
              rango="Pinky → Grande"
              precios="$15 – $42"
            />
            <EspecieCard
              emoji="🐭"
              nombre="Ratón"
              sub="Mus musculus"
              etapas="7"
              rango="Pinky → Grande"
              precios="$16 – $43"
            />
            <EspecieCard
              emoji="🐀"
              nombre="Rata"
              sub="Long Evans"
              etapas="13"
              rango="Pinky → Ratota"
              precios="$16 – $80"
            />
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6">
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      </div>

      {/* PLANES */}
      <section className="py-20 md:py-28 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="display-font text-4xl md:text-5xl font-bold">
              Planes para cada etapa de tu negocio
            </h2>
            <p className="text-muted-foreground mt-3 text-lg">
              Comienza gratis, escala cuando lo necesites.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <PlanCard
              icon="🆓"
              nombre="FREE"
              precio="$0"
              sub="Para empezar"
              features={[
                { ok: true, label: "3 lotes" },
                { ok: true, label: "5 clientes" },
                { ok: true, label: "10 pedidos/mes" },
                { ok: false, label: "Analytics" },
                { ok: false, label: "IA Asistente" },
              ]}
              cta="Comenzar gratis"
              onClick={goRegister}
            />
            <PlanCard
              icon="⭐"
              nombre="BÁSICO"
              precio="Próximamente"
              sub="Para crecer"
              features={[
                { ok: true, label: "15 lotes" },
                { ok: true, label: "25 clientes" },
                { ok: true, label: "50 pedidos/mes" },
                { ok: false, label: "Analytics" },
                { ok: false, label: "IA Asistente" },
              ]}
              cta="Próximamente"
              onClick={goRegister}
            />
            <PlanCard
              recommended
              icon="🚀"
              nombre="PROFESIONAL"
              precio="Próximamente"
              sub="Para escalar"
              features={[
                { ok: true, label: "50 lotes" },
                { ok: true, label: "Clientes ilimitados" },
                { ok: true, label: "Pedidos ilimitados" },
                { ok: true, label: "Analytics" },
                { ok: false, label: "IA Asistente" },
              ]}
              cta="Próximamente"
              onClick={goRegister}
            />
            <PlanCard
              icon="💎"
              nombre="ENTERPRISE"
              precio="Próximamente"
              sub="Sin límites"
              features={[
                { ok: true, label: "Sin límites" },
                { ok: true, label: "Todo incluido" },
                { ok: true, label: "IA Asistente" },
                { ok: true, label: "Soporte VIP" },
              ]}
              cta="Contactar"
              onClick={goRegister}
            />
          </div>
        </div>
      </section>

      {/* BETA */}
      <section className="py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div
            className="relative rounded-3xl p-10 md:p-14 text-center overflow-hidden border border-primary/40"
            style={{ background: "var(--gradient-card)" }}
          >
            <div className="absolute inset-0 pointer-events-none" style={{ background: "var(--gradient-glow)" }} />
            <div className="relative">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-semibold mb-4">
                🧪 Estamos en Beta — Únete gratis
              </div>
              <h2 className="display-font text-3xl md:text-4xl font-bold mb-4">
                Sé parte del lanzamiento
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto mb-8 leading-relaxed">
                BioTrack Central está en fase de pruebas con bioterios reales. Regístrate ahora, úsalo gratis durante
                el beta y danos tu feedback. Los primeros usuarios tendrán beneficios especiales al lanzamiento.
              </p>
              <Button
                size="lg"
                onClick={goRegister}
                className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow"
              >
                <Rocket className="h-4 w-4" />
                Unirme al beta — Es gratis
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/60 py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
                <FlaskConical className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="display-font font-bold">BioTrack Central</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-md">
              Sistema integral de gestión para bioterios de roedores.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goLogin}>
              Iniciar sesión
            </Button>
            <Button
              size="sm"
              onClick={goRegister}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90"
            >
              Registrarse
            </Button>
          </div>
        </div>
        <div className="max-w-7xl mx-auto mt-8 pt-6 border-t border-border/40">
          <p className="text-xs text-muted-foreground text-center">
            © 2026 BioTrack Central. Todos los derechos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
