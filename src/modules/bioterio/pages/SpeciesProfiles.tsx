/**
 * Species Profiles Page
 * 
 * Main operational configuration interface for workspace species management.
 * Route: /bioterio/species
 */

import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, ArrowLeft, Settings, Package, Egg, TrendingUp, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ErrorState } from "@/components/ui/error-state";
import { StatGridSkeleton } from "@/components/ui/list-skeleton";

import { SpeciesProfileCard } from "../components/SpeciesProfileCard";
import { SizeClassEditor } from "../components/SizeClassEditor";
import { ClassificationFlow, InventoryClassificationSummary } from "../components/ClassificationFlow";

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
} from "../../data/index";

import { validateSpeciesConfiguration } from "../runtime/operations";
import type { WorkspaceSpeciesProfile, SpeciesSizeClass, SpeciesOperationalSettings } from "../runtime/types";

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

  const profiles = profilesQuery.data ?? [];
  const selectedProfile = selectedProfileQuery.data;
  const sizeClasses = sizeClassesQuery.data ?? [];
  const settings = settingsQuery.data;

  const isLoading = profilesQuery.isLoading;
  const error = profilesQuery.error;

  // Mutations
  const upsertProfileMutation = useUpsertSpeciesProfile();
  const deleteProfileMutation = useDeleteSpeciesProfile();
  const addSizeClassMutation = useAddSizeClass();
  const updateSizeClassMutation = useUpdateSizeClass();
  const deleteSizeClassMutation = useDeleteSizeClass();
  const reorderSizeClassesMutation = useReorderSizeClasses();

  // UI State
  const [showBlueprintModal, setShowBlueprintModal] = useState(false);
  const [showCustomSpeciesForm, setShowCustomSpeciesForm] = useState(false);
  const [customSpeciesData, setCustomSpeciesData] = useState({
    speciesName: "",
    operationalName: "",
    scientificName: "",
    description: "",
  });

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Perfiles de Especies</h1>
            <p className="text-sm text-muted-foreground">
              Configura las clasificaciones operacionales para cada especie
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCustomSpeciesForm(true)}
              className="h-9 text-sm"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Especie Personalizada
            </Button>
            <Button
              onClick={() => setShowBlueprintModal(true)}
              className="h-9 text-sm"
            >
              <Package className="h-4 w-4 mr-1.5" />
              Desde Plantilla
            </Button>
          </div>
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
        ) : profiles.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-semibold mb-2">Sin especies configuradas</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-md mx-auto">
                Comienza configurando una especie desde una plantilla o crea una especie personalizada
              </p>
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowCustomSpeciesForm(true)}
                  className="text-sm"
                >
                  <Plus className="h-4 w-4 mr-1.5" />
                  Personalizada
                </Button>
                <Button onClick={() => setShowBlueprintModal(true)} className="text-sm">
                  <Package className="h-4 w-4 mr-1.5" />
                  Desde Plantilla
                </Button>
              </div>
            </CardContent>
          </Card>
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
              <DialogTitle>Seleccionar Plantilla de Especie</DialogTitle>
              <DialogDescription>
                Elige una plantilla para comenzar. Todas las plantillas son completamente editables.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {STARTER_BLUEPRINTS.map((blueprint) => (
                <Card
                  key={blueprint.id}
                  className="cursor-pointer transition-all hover:border-primary/50 hover:shadow-md"
                  onClick={() => handleCreateFromBlueprint(blueprint.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{blueprint.name}</h4>
                        <p className="text-xs text-muted-foreground italic mb-2">
                          {blueprint.scientificName}
                        </p>
                        <p className="text-sm text-muted-foreground">{blueprint.description}</p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Package className="h-3.5 w-3.5" />
                            {blueprint.defaultSizeClasses} clasificaciones predeterminadas
                          </span>
                          <span className="flex items-center gap-1">
                            <Egg className="h-3.5 w-3.5" />
                            Parámetros reproductivos incluidos
                          </span>
                        </div>
                      </div>
                      <Badge variant="secondary">Editable</Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowBlueprintModal(false)}>
                Cancelar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Custom Species Form Modal */}
        <Dialog open={showCustomSpeciesForm} onOpenChange={setShowCustomSpeciesForm}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva Especie Personalizada</DialogTitle>
              <DialogDescription>
                Crea una especie completamente personalizada con tus propias clasificaciones.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="speciesName">Nombre de la Especie *</Label>
                <Input
                  id="speciesName"
                  value={customSpeciesData.speciesName}
                  onChange={(e) =>
                    setCustomSpeciesData({ ...customSpeciesData, speciesName: e.target.value })
                  }
                  placeholder="Ej: Hámster Sirio"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="operationalName">Nombre Operacional</Label>
                <Input
                  id="operationalName"
                  value={customSpeciesData.operationalName}
                  onChange={(e) =>
                    setCustomSpeciesData({ ...customSpeciesData, operationalName: e.target.value })
                  }
                  placeholder="Déjalo vacío para usar el mismo nombre"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="scientificName">Nombre Científico</Label>
                <Input
                  id="scientificName"
                  value={customSpeciesData.scientificName}
                  onChange={(e) =>
                    setCustomSpeciesData({ ...customSpeciesData, scientificName: e.target.value })
                  }
                  placeholder="Ej: Mesocricetus auratus"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  value={customSpeciesData.description}
                  onChange={(e) =>
                    setCustomSpeciesData({ ...customSpeciesData, description: e.target.value })
                  }
                  placeholder="Descripción opcional"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCustomSpeciesForm(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleCreateCustomSpecies}
                disabled={!customSpeciesData.speciesName || upsertProfileMutation.isPending}
              >
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
          <div>
            <h1 className="text-2xl font-bold text-foreground">Cargando...</h1>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/bioterio/species")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-2xl font-bold text-foreground">{selectedProfile.speciesName}</h1>
              {selectedProfile.isStarterBlueprint && (
                <Badge variant="secondary" className="text-xs">Plantilla</Badge>
              )}
              {selectedProfile.isCustom && (
                <Badge variant="outline" className="text-xs">Personalizada</Badge>
              )}
            </div>
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
            <CardContent>
              <ClassificationFlow sizeClasses={sizeClasses} />
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
