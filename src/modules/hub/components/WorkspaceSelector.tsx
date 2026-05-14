import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ACTIVE_WORKSPACE_KEY } from '@/lib/workspace';
import { PURPOSE_AVAILABILITY } from '@/modules/hub/blueprintAvailability';
import { ContextGroup } from './ContextGroup';
import { WorkspaceCard } from './WorkspaceCard';
import { Button } from '@/components/ui/button';
import { Plus, LayoutGrid, FlaskConical, PawPrint, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';

interface WorkspaceItem {
  id: string;
  name: string;
  purpose: string;
  subtype: string;
}

export default function WorkspaceSelector() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workspaces, setWorkspaces] = useState<WorkspaceItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const activeId = localStorage.getItem(ACTIVE_WORKSPACE_KEY);

  useEffect(() => {
    async function fetchWorkspaces() {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('workspaces')
          .select('id, name, purpose, subtype')
          .eq('owner_id', user.id);

        if (error) throw error;
        
        // Handle mock fallback if DB table doesn't exist or is empty
        // In a real scenario, we'd have the table created.
        setWorkspaces(data || []);
      } catch (err) {
        console.error('Error fetching workspaces:', err);
        // Fallback to local storage mock if DB fails (development mode)
        const mockWs = localStorage.getItem('biotrack_mock_workspace_cache');
        if (mockWs) {
          setWorkspaces(JSON.parse(mockWs));
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchWorkspaces();
  }, [user]);

  const handleSelect = (id: string) => {
    localStorage.setItem(ACTIVE_WORKSPACE_KEY, id);
    // Dispatch storage event manually for same-window listeners
    window.dispatchEvent(new StorageEvent('storage', {
      key: ACTIVE_WORKSPACE_KEY,
      newValue: id
    }));
    
    toast.success('Entorno activado');
    navigate('/dashboard');
  };

  const handleAddNew = () => {
    navigate('/onboarding');
  };

  const businessWorkspaces = workspaces.filter(w => w.purpose === 'business');
  const petWorkspaces = workspaces.filter(w => w.purpose === 'pet');
  const vetWorkspaces = workspaces.filter(w => w.purpose === 'vet');

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-12 animate-in fade-in duration-500">
      <div className="max-w-6xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-primary mb-2">
              <LayoutGrid className="h-6 w-6" />
              <span className="text-xs font-bold uppercase tracking-widest">Workspace Hub</span>
            </div>
            <h1 className="text-4xl font-bold tracking-tight">Selector de Entorno</h1>
            <p className="text-muted-foreground text-lg">Gestiona y alterna entre tus centros operacionales.</p>
          </div>
          
          <Button 
            onClick={handleAddNew}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-12 px-6 rounded-xl shadow-glow-sm transition-all hover:scale-[1.02]"
          >
            <Plus className="h-5 w-5" />
            <span>Agregar nuevo entorno</span>
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {/* Context Groups */}
        {!isLoading && (
          <div className="space-y-10">
            {/* Business Group */}
            <ContextGroup 
              title="Negocio / Operación" 
              description="Bioterios, granjas y centros de producción."
              isEnabled={PURPOSE_AVAILABILITY['business'].enabled}
            >
              {businessWorkspaces.length > 0 ? (
                businessWorkspaces.map(ws => (
                  <WorkspaceCard 
                    key={ws.id}
                    id={ws.id}
                    name={ws.name}
                    type={ws.subtype}
                    isActive={ws.id === activeId}
                    onSelect={handleSelect}
                  />
                ))
              ) : (
                <div className="md:col-span-3 p-8 border-2 border-dashed border-border/40 rounded-2xl flex flex-col items-center justify-center text-center space-y-4">
                  <FlaskConical className="h-10 w-10 text-muted-foreground/40" />
                  <div className="space-y-1">
                    <p className="font-medium text-muted-foreground">No hay entornos de negocio activos</p>
                    <p className="text-xs text-muted-foreground/60">Crea tu primer Bioterio para comenzar.</p>
                  </div>
                </div>
              )}
            </ContextGroup>

            {/* Pet Group */}
            <ContextGroup 
              title="Mascota / Colección" 
              description="Gestión individual de mascotas y terrarios."
              isEnabled={PURPOSE_AVAILABILITY['pet'].enabled}
              badge={PURPOSE_AVAILABILITY['pet'].badge}
            >
              {petWorkspaces.map(ws => (
                <WorkspaceCard 
                  key={ws.id}
                  id={ws.id}
                  name={ws.name}
                  type={ws.subtype}
                  isActive={ws.id === activeId}
                  onSelect={handleSelect}
                />
              ))}
              {petWorkspaces.length === 0 && (
                <div className="p-4 border border-border/20 rounded-xl bg-muted/20 flex items-center gap-3 grayscale opacity-40">
                   <PawPrint className="h-5 w-5" />
                   <span className="text-xs font-medium">Disponible próximamente</span>
                </div>
              )}
            </ContextGroup>

            {/* Vet Group */}
            <ContextGroup 
              title="Veterinaria / Clínica" 
              description="Atención clínica y gestión de pacientes."
              isEnabled={PURPOSE_AVAILABILITY['vet'].enabled}
              badge={PURPOSE_AVAILABILITY['vet'].badge}
            >
              {vetWorkspaces.map(ws => (
                <WorkspaceCard 
                  key={ws.id}
                  id={ws.id}
                  name={ws.name}
                  type={ws.subtype}
                  isActive={ws.id === activeId}
                  onSelect={handleSelect}
                />
              ))}
              {vetWorkspaces.length === 0 && (
                <div className="p-4 border border-border/20 rounded-xl bg-muted/20 flex items-center gap-3 grayscale opacity-40">
                   <Stethoscope className="h-5 w-5" />
                   <span className="text-xs font-medium">Disponible próximamente</span>
                </div>
              )}
            </ContextGroup>
          </div>
        )}
      </div>

      {/* Decorative Glow Elements */}
      <div className="fixed top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/5 blur-[120px] rounded-full -z-10" />
      <div className="fixed bottom-[-10%] left-[-10%] w-[30%] h-[30%] bg-blue-500/5 blur-[100px] rounded-full -z-10" />
    </div>
  );
}
