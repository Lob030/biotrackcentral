/**
 * Species Profiles Page
 * 
 * Main operational configuration interface for workspace species management.
 * Route: /bioterio/species
 */

import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  Search,
  Plus,
  RefreshCw,
  LayoutGrid,
  List,
  ArrowLeft,
  ArrowRight,
  Settings, 
  Package, 
  Egg, 
  TrendingUp, 
  AlertTriangle,
  DollarSign 
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState } from "@/components/ui/error-state";
import { StatGridSkeleton } from "@/components/ui/list-skeleton";
import { cn } from "@/lib/utils";

import { SpeciesProfileCard } from "../species/components/SpeciesProfileCard";
import { SizeClassEditor } from "../species/components/SizeClassEditor";
import { ClassificationFlow, InventoryClassificationSummary } from "../species/components/ClassificationFlow";
import { MigrationAssistant } from "../species/components/MigrationAssistant";
import { useLotesList } from "../data/lotes";

import {
  useSpeciesProfiles,
  useSpeciesProfile,
  useSizeClasses,
  useOperationalSettings,
  useUpsertSpeciesProfile,
  useDeleteSpeciesProfile,
  useAddSizeClass,
  useUpdateSizeClass,
  useDeleteSizeClass,
  useReorderSizeClasses,
  useSpeciesInventoryCounts,
} from "../species/data/index";

import { validateSpeciesConfiguration } from "../species/runtime/operations";
import type { SpeciesSizeClass } from "../species/runtime/types";

// Starter blueprint options
const STARTER_BLUEPRINTS = [
  {
    id: "starter_asf",
    name: "ASF (Rata Africana)",
    scientificName: "Mastomys natalensis",
    description: "Rata africana de pelaje suave - ciclo reproductivo rápido",
    defaultSizeClasses: 4,
  },
  {
    id: "starter_rat",
    name: "Rata de Laboratorio",
    scientificName: "Rattus norvegicus",
    description: "Rata Wistar/Sprague-Dawley estándar",
    defaultSizeClasses: 5,
  },
  {
    id: "starter_mouse",
    name: "Ratón de Laboratorio",
    scientificName: "Mus musculus",
    description: "Ratón BALB/c o C57BL/6 estándar",
    defaultSizeClasses: 5,
  },
];

export default function SpeciesProfilesPage() {
  const { profile: authProfile } = useAuth();
  const navigate = useNavigate();
  const { speciesId } = useParams<{ speciesId: string }>();

  const workspaceId = authProfile?.workspace_id || "";

  // Data fetching
  const profilesQuery = useSpeciesProfiles(workspaceId);
  const selectedProfileQuery = useSpeciesProfile(speciesId || null);
  const sizeClassesQuery = useSizeClasses(speciesId || null);
  const settingsQuery = useOperationalSettings(speciesId || null);
  const inventoryCountsQuery = useSpeciesInventoryCounts(speciesId || null);

  const profiles = profilesQuery.data ?? [];
  const selectedProfile = selectedProfileQuery.data;
  const sizeClasses = sizeClassesQuery.data ?? [];
  const settings = settingsQuery.data;
  const lotCounts = inventoryCountsQuery.data ?? {};

  // Fetch all lots for overview stats
  const { data: allLots = [] } = useLotsList({ estado: "activo" });
  
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [showBlueprintModal, setShowBlueprintModal] = useState(false);
  const [showCustomSpeciesForm, setShowCustomSpeciesForm] = useState(false);
  const [customSpeciesData, setCustomSpeciesData] = useState({
    speciesName: "",
    operationalName: "",
    scientificName: "",
    description: "",
  });

  const overviewStats = useMemo(() => {
    const totalLots = allLots.length;
    const activeSpecies = profiles.filter(p => p.isActive).length;
    const totalValue = allLots.reduce((sum, lot) => {
      return sum + (lot.species_size_classes?.sale_price || 0);
    }, 0);

    return { totalLots, activeSpecies, totalValue };
  }, [allLots, profiles]);

  const isLoading = profilesQuery.isLoading;
  const error = profilesQuery.error;

  // Mutations
  const upsertProfileMutation = useUpsertSpeciesProfile();
  const deleteProfileMutation = useDeleteSpeciesProfile();
  const addSizeClassMutation = useAddSizeClass();
  const updateSizeClassMutation = useUpdateSizeClass();
  const deleteSizeClassMutation = useDeleteSizeClass();
  const reorderSizeClassesMutation = useReorderSizeClasses();

  // Validation
  const validation = useMemo(() => {
    if (!speciesId || !workspaceId) return null;
    return validateSpeciesConfiguration({
      workspaceId,
      speciesProfileId: speciesId,
    });
  }, [speciesId, workspaceId, sizeClasses]);

  // Handlers
  const handleCreateFromBlueprint = (blueprintId: string) => {
    if (!workspaceId) return;

    upsertProfileMutation.mutate(
      {
        payload: {
          workspaceId,
          speciesId: blueprintId.replace("starter_", ""),
          speciesName: STARTER_BLUEPRINTS.find((b) => b.id === blueprintId)?.name || "",
          operationalName: STARTER_BLUEPRINTS.find((b) => b.id === blueprintId)?.name || "",
          scientificName: STARTER_BLUEPRINTS.find((b) => b.id === blueprintId)?.scientificName,
          isStarterBlueprint: true,
        },
      },
      {
        onSuccess: () => {
          setShowBlueprintModal(false);
        },
      }
    );
  };

  const handleCreateCustomSpecies = () => {
    if (!workspaceId) return;

    upsertProfileMutation.mutate(
      {
        payload: {
          workspaceId,
          speciesId: customSpeciesData.speciesName.toLowerCase().replace(/\s+/g, "_"),
          speciesName: customSpeciesData.speciesName,
          operationalName: customSpeciesData.operationalName || customSpeciesData.speciesName,
          scientificName: customSpeciesData.scientificName || undefined,
          description: customSpeciesData.description || undefined,
          isStarterBlueprint: false,
        },
      },
      {
        onSuccess: () => {
          setShowCustomSpeciesForm(false);
          setCustomSpeciesData({
            speciesName: "",
            operationalName: "",
            scientificName: "",
            description: "",
          });
        },
      }
    );
  };

  const handleDeleteProfile = (profileId: string) => {
    if (confirm("¿Estás seguro de eliminar este perfil de especie? Esta acción no se puede deshacer.")) {
      deleteProfileMutation.mutate(profileId, {
        onSuccess: () => {
          if (speciesId === profileId) {
            navigate("/bioterio/species");
          }
        },
      });
    }
  };

  const handleAddSizeClass = (data: Partial<SpeciesSizeClass>) => {
    if (!workspaceId || !speciesId) return;
    addSizeClassMutation.mutate({
      workspaceId,
      speciesProfileId: speciesId,
      name: data.name || "",
      code: data.code,
      minWeightGrams: data.minWeightGrams,
      maxWeightGrams: data.maxWeightGrams,
      minAgeDays: data.minAgeDays,
      maxAgeDays: data.maxAgeDays,
      salePrice: data.salePrice,
      costPrice: data.costPrice,
      description: data.description,
    });
  };

  const handleUpdateSizeClass = (id: string, data: Partial<SpeciesSizeClass>) => {
    updateSizeClassMutation.mutate({ id, payload: data });
  };

  const handleDeleteSizeClass = (id: string) => {
    if (confirm("¿Eliminar esta clasificación?")) {
      deleteSizeClassMutation.mutate(id);
    }
  };

  const handleReorderSizeClasses = (orderedIds: string[]) => {
    if (!speciesId) return;
    reorderSizeClassesMutation.mutate({ speciesProfileId: speciesId, orderedIds });
  };

  // List View
  if (!speciesId) {
    return (
      <div className="p-6 md:p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Perfiles de Especies
            </h1>
            <p className="text-muted-foreground mt-1">
              Configuración operacional y runtime de clasificaciones por bioterio.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => profilesQuery.refetch()}
              disabled={profilesQuery.isFetching}
              className="h-10"
            >
              <RefreshCw className={cn("h-4 w-4 mr-2", profilesQuery.isFetching && "animate-spin")} />
              Sincronizar
            </Button>
            <Button onClick={() => setShowCustomSpeciesForm(true)} className="h-10">
              <Plus className="h-4 w-4 mr-2" /> Nuevo Perfil
            </Button>
          </div>
        </div>

        {/* Operational Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider">
                    Especies Activas
                  </p>
                  <h3 className="text-3xl font-bold text-foreground mt-1">
                    {overviewStats.activeSpecies}
                  </h3>
                </div>
                <div className="bg-primary/10 p-3 rounded-xl">
                  <Package className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-emerald-500/5 border-emerald-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    Inventario Total
                  </p>
                  <h3 className="text-3xl font-bold text-foreground mt-1">
                    {overviewStats.totalLots.toLocaleString()}
                  </h3>
                </div>
                <div className="bg-emerald-500/10 p-3 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-emerald-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    Valor Operativo Est.
                  </p>
                  <h3 className="text-3xl font-bold text-foreground mt-1">
                    ${overviewStats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h3>
                </div>
                <div className="bg-amber-500/10 p-3 rounded-xl">
                  <DollarSign className="h-6 w-6 text-amber-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content */}
        {isLoading ? (
          <StatGridSkeleton count={3} />
        ) : error ? (
          <ErrorState
            title="Error al cargar perfiles"
            message={error instanceof Error ? error.message : "Error desconocido"}
            retry={() => profilesQuery.refetch()}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {profiles.map((profile) => (
              <SpeciesProfileCard
                key={profile.id}
                profile={profile}
                sizeClasses={sizeClasses.filter((sc) => sc.speciesProfileId === profile.id)}
                settings={settings}
              />
            ))}
          </div>
        )}

        {/* Blueprint Selection Modal */}
        <Dialog open={showBlueprintModal} onOpenChange={setShowBlueprintModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="display-font text-xl">Seleccionar Plantilla de Especie</DialogTitle>
              <DialogDescription>
                Elige una plantilla optimizada para comenzar. Todas las plantillas son completamente editables para ajustarse a tu operación.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 sm:grid-cols-2">
              {STARTER_BLUEPRINTS.map((blueprint) => (
                <Card
                  key={blueprint.id}
                  className="cursor-pointer group hover:border-primary transition-all hover:shadow-md bg-card/50"
                  onClick={() => handleCreateFromBlueprint(blueprint.id)}
                >
                  <CardContent className="p-5">
                    <div className="flex flex-col h-full">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">
                          {blueprint.name}
                        </h4>
                        <Badge variant="secondary" className="text-[10px]">Blueprint</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground italic mb-3">
                        {blueprint.scientificName}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2 flex-1">
                        {blueprint.description}
                      </p>
                      <div className="mt-4 pt-4 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        <span>{blueprint.defaultSizeClasses} Etapas</span>
                        <div className="flex items-center gap-1 text-primary">
                          Elegir <ArrowRight className="h-3 w-3" />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              
              {/* Custom option card inside the grid */}
              <Card
                className="cursor-pointer group border-dashed hover:border-primary/50 hover:bg-primary/5 transition-all"
                onClick={() => {
                  setShowBlueprintModal(false);
                  setShowCustomSpeciesForm(true);
                }}
              >
                <CardContent className="p-5 flex flex-col items-center justify-center h-full text-center space-y-3">
                  <div className="bg-muted p-3 rounded-full group-hover:bg-primary/10 transition-colors">
                    <Plus className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">
                      Especie Personalizada
                    </h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Crea una configuración desde cero
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>

        {/* Custom Species Form Modal */}
        <Dialog open={showCustomSpeciesForm} onOpenChange={setShowCustomSpeciesForm}>
          <DialogContent className="sm:max-w-[480px]">
            <DialogHeader>
              <DialogTitle className="display-font text-xl">Nueva Especie Personalizada</DialogTitle>
              <DialogDescription>
                Define los detalles básicos para tu nueva configuración de especie.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-5 py-4">
              <div className="grid gap-2">
                <Label htmlFor="speciesName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Nombre de la Especie *
                </Label>
                <Input
                  id="speciesName"
                  value={customSpeciesData.speciesName}
                  onChange={(e) => setCustomSpeciesData({ ...customSpeciesData, speciesName: e.target.value })}
                  placeholder="Ej: Hámster Sirio"
                  className="h-10 focus:ring-primary"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="scientificName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Nombre Científico (opcional)
                </Label>
                <Input
                  id="scientificName"
                  value={customSpeciesData.scientificName}
                  onChange={(e) => setCustomSpeciesData({ ...customSpeciesData, scientificName: e.target.value })}
                  placeholder="Ej: Mesocricetus auratus"
                  className="h-10 focus:ring-primary"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Descripción Operacional
                </Label>
                <Input
                  id="description"
                  value={customSpeciesData.description}
                  onChange={(e) => setCustomSpeciesData({ ...customSpeciesData, description: e.target.value })}
                  placeholder="Uso, propósito o notas rápidas..."
                  className="h-10 focus:ring-primary"
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="ghost" onClick={() => setShowCustomSpeciesForm(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleCreateCustomSpecies}
                disabled={!customSpeciesData.speciesName || upsertProfileMutation.isPending}
                className="bg-gradient-primary text-white"
              >
                {upsertProfileMutation.isPending && <RefreshCw className="h-4 w-4 mr-2 animate-spin" />}
                Crear Especie
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Detail View
  if (!selectedProfile) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate("/bioterio/species")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Cargando...</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/bioterio/species")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{selectedProfile.speciesName}</h1>
            {selectedProfile.isStarterBlueprint && (
              <Badge variant="secondary" className="text-xs">Plantilla</Badge>
            )}
            {selectedProfile.isCustom && (
              <Badge variant="outline" className="text-xs">Personalizada</Badge>
            )}
            {selectedProfile.scientificName && (
              <p className="text-sm text-muted-foreground italic">
                {selectedProfile.scientificName}
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-1">
              {selectedProfile.operationalName}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="destructive"
            size="sm"
            onClick={() => handleDeleteProfile(selectedProfile.id)}
            disabled={deleteProfileMutation.isPending}
            className="text-xs"
          >
            Eliminar
          </Button>
          <Button variant="outline" size="sm" className="text-xs">
            <Settings className="h-3.5 w-3.5 mr-1.5" />
            Configuración
          </Button>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Size Class Editor */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Clasificaciones por Tamaño
              </CardTitle>
              <CardDescription>
                Define las clasificaciones operacionales para esta especie
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SizeClassEditor
                sizeClasses={sizeClasses}
                validation={validation || undefined}
                onAdd={handleAddSizeClass}
                onUpdate={handleUpdateSizeClass}
                onDelete={handleDeleteSizeClass}
                onReorder={handleReorderSizeClasses}
                workspaceId={workspaceId}
                speciesProfileId={selectedProfile.id}
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Visualization & Settings */}
        <div className="space-y-6">
          {/* Migration Assistant */}
          <MigrationAssistant 
            speciesName={selectedProfile.speciesName} 
            sizeClasses={sizeClasses} 
          />

          {/* Classification Flow */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Flujo de Clasificación
              </CardTitle>
              <CardDescription>
                Progresión operacional de clasificaciones
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <ClassificationFlow sizeClasses={sizeClasses} />
              <div className="pt-6 border-t border-border">
                <InventoryClassificationSummary 
                  sizeClasses={sizeClasses} 
                  lotCounts={lotCounts}
                />
              </div>
            </CardContent>
          </Card>

          {/* Operational Settings */}
          {settings && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Egg className="h-5 w-5" />
                  Parámetros Operacionales
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Ciclo de Cría</span>
                  <span className="font-semibold">{settings.breedingCycleDays} días</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Gestación</span>
                  <span className="font-semibold">{settings.expectedGestationDays} días</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Destete</span>
                  <span className="font-semibold">{settings.expectedWeaningAgeDays} días</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Madurez Sexual</span>
                  <span className="font-semibold">{settings.maturityAgeDays} días</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Peso Nacimiento</span>
                  <span className="font-semibold">{settings.expectedBirthWeightGrams}g</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Peso Adulto</span>
                  <span className="font-semibold">{settings.expectedAdultWeightGrams}g</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Mortalidad Esperada</span>
                  <span className="font-semibold">{(settings.expectedMortalityRate * 100).toFixed(1)}%</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Validation Status */}
          {validation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {validation.isValid ? (
                    <span className="text-green-600">✓</span>
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  )}
                  Estado de Validación
                </CardTitle>
              </CardHeader>
              <CardContent>
                {validation.isValid ? (
                  <p className="text-sm text-green-600">
                    Configuración válida - sin errores detectados
                  </p>
                ) : (
                  <div className="space-y-2">
                    {validation.errors.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-destructive mb-1">
                          {validation.errors.length} error(s)
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {validation.errors.slice(0, 3).map((err, idx) => (
                            <li key={idx}>• {err.message}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {validation.warnings.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-amber-600 mb-1">
                          {validation.warnings.length} advertencia(s)
                        </p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                          {validation.warnings.slice(0, 3).map((err, idx) => (
                            <li key={idx}>• {err.message}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
