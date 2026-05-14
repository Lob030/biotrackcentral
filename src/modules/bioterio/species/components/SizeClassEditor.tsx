/**
 * Size Class Editor Component
 * 
 * Provides inline editing, drag-and-drop reordering, and validation for size classes.
 * Designed for fast operational workflows with minimal modal depth.
 */

import { useState, useMemo, useCallback } from "react";
import { GripVertical, Plus, Pencil, Trash2, AlertTriangle, Check, X } from "lucide-react";
import type { SpeciesSizeClass, SpeciesConfigValidationResult } from "../runtime/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface SizeClassEditorProps {
  sizeClasses: SpeciesSizeClass[];
  validation?: SpeciesConfigValidationResult | null;
  onAdd: (data: Partial<SpeciesSizeClass>) => void;
  onUpdate: (id: string, data: Partial<SpeciesSizeClass>) => void;
  onDelete: (id: string) => void;
  onReorder: (orderedIds: string[]) => void;
  workspaceId: string;
  speciesProfileId: string;
}

interface EditableSizeClassRowProps {
  sizeClass: SpeciesSizeClass;
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: (data: Partial<SpeciesSizeClass>) => void;
  onCancel: () => void;
  onDelete: () => void;
  index: number;
  validationErrors?: string[];
}

function EditableSizeClassRow({
  sizeClass,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
  onDelete,
  index,
  validationErrors = [],
}: EditableSizeClassRowProps) {
  const [editData, setEditData] = useState<Partial<SpeciesSizeClass>>({
    name: sizeClass.name,
    code: sizeClass.code,
    minWeightGrams: sizeClass.minWeightGrams,
    maxWeightGrams: sizeClass.maxWeightGrams,
    minAgeDays: sizeClass.minAgeDays,
    maxAgeDays: sizeClass.maxAgeDays,
    salePrice: sizeClass.salePrice,
    costPrice: sizeClass.costPrice,
    description: sizeClass.description,
  });

  const handleSave = () => {
    onSave(editData);
  };

  const handleCancel = () => {
    setEditData({
      name: sizeClass.name,
      code: sizeClass.code,
      minWeightGrams: sizeClass.minWeightGrams,
      maxWeightGrams: sizeClass.maxWeightGrams,
      minAgeDays: sizeClass.minAgeDays,
      maxAgeDays: sizeClass.maxAgeDays,
      salePrice: sizeClass.salePrice,
      costPrice: sizeClass.costPrice,
      description: sizeClass.description,
    });
    onCancel();
  };

  if (isEditing) {
    return (
      <div className="rounded-lg border-2 border-primary bg-card p-4 md:p-4 space-y-3">
        {/* Name & Code Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
              Nombre *
            </label>
            <Input
              value={editData.name || ""}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              className="h-11 md:h-9 text-sm"
              placeholder="Ej: Pinky, Adulto, 20g"
              autoFocus
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
              Código
            </label>
            <Input
              value={editData.code || ""}
              onChange={(e) => setEditData({ ...editData, code: e.target.value.toUpperCase() })}
              className="h-11 md:h-9 text-sm"
              placeholder="PK, AD, 20G"
              maxLength={4}
            />
          </div>
        </div>

        {/* Weight Range Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
              Peso Mín (g)
            </label>
            <Input
              type="number"
              step="0.1"
              value={editData.minWeightGrams ?? ""}
              onChange={(e) =>
                setEditData({ ...editData, minWeightGrams: parseFloat(e.target.value) || undefined })
              }
              className="h-9 text-sm"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
              Peso Máx (g)
            </label>
            <Input
              type="number"
              step="0.1"
              value={editData.maxWeightGrams ?? ""}
              onChange={(e) =>
                setEditData({ ...editData, maxWeightGrams: parseFloat(e.target.value) || undefined })
              }
              className="h-9 text-sm"
              placeholder="∞"
            />
          </div>
        </div>

        {/* Age Range Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
              Edad Mín (días)
            </label>
            <Input
              type="number"
              value={editData.minAgeDays ?? ""}
              onChange={(e) =>
                setEditData({ ...editData, minAgeDays: parseInt(e.target.value) || undefined })
              }
              className="h-9 text-sm"
              placeholder="0"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
              Edad Máx (días)
            </label>
            <Input
              type="number"
              value={editData.maxAgeDays ?? ""}
              onChange={(e) =>
                setEditData({ ...editData, maxAgeDays: parseInt(e.target.value) || undefined })
              }
              className="h-9 text-sm"
              placeholder="∞"
            />
          </div>
        </div>

        {/* Pricing Row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
              Precio Venta ($)
            </label>
            <Input
              type="number"
              step="0.01"
              value={editData.salePrice ?? ""}
              onChange={(e) =>
                setEditData({ ...editData, salePrice: parseFloat(e.target.value) || undefined })
              }
              className="h-9 text-sm"
              placeholder="0.00"
            />
          </div>
          <div>
            <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
              Costo ($)
            </label>
            <Input
              type="number"
              step="0.01"
              value={editData.costPrice ?? ""}
              onChange={(e) =>
                setEditData({ ...editData, costPrice: parseFloat(e.target.value) || undefined })
              }
              className="h-9 text-sm"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1 block">
            Descripción
          </label>
          <Input
            value={editData.description || ""}
            onChange={(e) => setEditData({ ...editData, description: e.target.value })}
            className="h-9 text-sm"
            placeholder="Descripción opcional"
          />
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="rounded-md bg-destructive/10 p-2 space-y-1">
            {validationErrors.map((error, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs text-destructive">
                <AlertTriangle className="h-3 w-3" />
                <span>{error}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCancel}
            className="h-11 md:h-8 text-sm md:text-xs px-4"
          >
            <X className="h-4 w-4 mr-1.5" />
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="h-11 md:h-8 text-sm md:text-xs px-4 bg-primary hover:bg-primary/90"
          >
            <Check className="h-4 w-4 mr-1.5" />
            Guardar
          </Button>
        </div>
      </div>
    );
  }

  // Display mode
  return (
    <div
      className={cn(
        "group rounded-lg border bg-card p-4 transition-all",
        "hover:border-primary/30 hover:shadow-sm",
        !sizeClass.isActive && "opacity-60"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Drag Handle — large touch target for mobile */}
        <div className="pt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground p-1.5 -m-1.5 rounded-md active:bg-muted/50">
          <GripVertical className="h-5 w-5 md:h-4 md:w-4" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h4 className="font-semibold text-foreground">{sizeClass.name}</h4>
            {sizeClass.code && (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-5">
                {sizeClass.code}
              </Badge>
            )}
            {sizeClass.isDefault && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 bg-primary/10 text-primary">
                Default
              </Badge>
            )}
            {!sizeClass.isActive && (
              <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">
                Inactivo
              </Badge>
            )}
          </div>

          {/* Ranges */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">Peso:</span>
              <span className="font-medium">
                {sizeClass.minWeightGrams ?? 0}g - {sizeClass.maxWeightGrams ?? "∞"}g
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground text-xs">Edad:</span>
              <span className="font-medium">
                {sizeClass.minAgeDays ?? 0}d - {sizeClass.maxAgeDays ?? "∞"}d
              </span>
            </div>
          </div>

          {/* Pricing */}
          {(sizeClass.salePrice || sizeClass.costPrice) && (
            <div className="flex items-center gap-4 mt-2 text-sm">
              {sizeClass.salePrice && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground text-xs">Venta:</span>
                  <span className="font-semibold text-primary">
                    ${sizeClass.salePrice.toFixed(2)}
                  </span>
                </div>
              )}
              {sizeClass.costPrice && (
                <div className="flex items-center gap-1.5">
                  <span className="text-muted-foreground text-xs">Costo:</span>
                  <span className="font-medium">
                    ${sizeClass.costPrice.toFixed(2)}
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {sizeClass.description && (
            <p className="text-xs text-muted-foreground mt-2">{sizeClass.description}</p>
          )}

          {/* Validation Warnings */}
          {validationErrors.length > 0 && (
            <div className="mt-2 flex items-start gap-1.5 text-xs text-amber-600">
              <AlertTriangle className="h-3 w-3 mt-0.5" />
              <span>{validationErrors[0]}</span>
              {validationErrors.length > 1 && (
                <span className="text-muted-foreground">(+{validationErrors.length - 1} más)</span>
              )}
            </div>
          )}
        </div>

        {/* Actions — always visible on mobile, hover-reveal on desktop */}
        <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            onClick={onStartEdit}
            className="h-10 w-10 md:h-8 md:w-8 hover:bg-primary/10 hover:text-primary"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            className="h-10 w-10 md:h-8 md:w-8 hover:bg-destructive/10 hover:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function SizeClassEditor({
  sizeClasses,
  validation,
  onAdd,
  onUpdate,
  onDelete,
  onReorder,
  workspaceId,
  speciesProfileId,
}: SizeClassEditorProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const sortedSizeClasses = useMemo(() => {
    return [...sizeClasses].sort((a, b) => a.displayOrder - b.displayOrder);
  }, [sizeClasses]);

  const getValidationErrorsForSizeClass = useCallback(
    (sizeClassId: string): string[] => {
      if (!validation) return [];
      const errors = [...validation.errors, ...validation.warnings];
      return errors
        .filter((e) => e.details?.sizeClassId === sizeClassId)
        .map((e) => e.message);
    },
    [validation]
  );

  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedId || draggedId === targetId) return;

    const currentOrder = sortedSizeClasses.map((sc) => sc.id);
    const draggedIndex = currentOrder.indexOf(draggedId);
    const targetIndex = currentOrder.indexOf(targetId);

    // Remove dragged item and insert at new position
    const newOrder = [...currentOrder];
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedId);

    onReorder(newOrder);
    setDraggedId(null);
  };

  const handleAdd = (data: Partial<SpeciesSizeClass>) => {
    onAdd({
      ...data,
      workspaceId,
      speciesProfileId,
      isActive: true,
      isCustom: true,
      isDefault: false,
    });
    setShowAddForm(false);
  };

  const handleUpdate = (id: string, data: Partial<SpeciesSizeClass>) => {
    onUpdate(id, data);
    setEditingId(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-foreground">Clasificaciones por Tamaño</h3>
          <p className="text-xs text-muted-foreground">
            Arrastra para reordenar • Click en editar para modificar
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAddForm(true)}
          className="h-9 text-sm"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Agregar Clasificación
        </Button>
      </div>

      {/* Global Validation Banner */}
      {validation && !validation.isValid && (
        <div
          className={cn(
            "rounded-lg p-4",
            validation.errors.length > 0
              ? "bg-destructive/10 border border-destructive/30"
              : "bg-amber-50 border border-amber-200"
          )}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle
              className={cn(
                "h-5 w-5 mt-0.5",
                validation.errors.length > 0 ? "text-destructive" : "text-amber-600"
              )}
            />
            <div className="flex-1">
              <p
                className={cn(
                  "text-sm font-medium",
                  validation.errors.length > 0 ? "text-destructive" : "text-amber-800"
                )}
              >
                {validation.errors.length > 0
                  ? `${validation.errors.length} error(s) de configuración`
                  : `${validation.warnings.length} advertencia(s)`}
              </p>
              <ul className="mt-2 space-y-1">
                {[...validation.errors, ...validation.warnings].slice(0, 3).map((err, idx) => (
                  <li key={idx} className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <span className="w-1 h-1 rounded-full bg-current" />
                    {err.message}
                  </li>
                ))}
                {[...validation.errors, ...validation.warnings].length > 3 && (
                  <li className="text-xs text-muted-foreground">
                    +{[...validation.errors, ...validation.warnings].length - 3} más
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Size Classes List */}
      <div className="space-y-3">
        {sortedSizeClasses.map((sizeClass, index) => (
          <div
            key={sizeClass.id}
            draggable={!editingId}
            onDragStart={(e) => handleDragStart(e, sizeClass.id)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, sizeClass.id)}
            className={cn(
              draggedId === sizeClass.id && "opacity-50 scale-[0.98]",
              draggedId && "transition-all"
            )}
          >
            <EditableSizeClassRow
              sizeClass={sizeClass}
              index={index}
              isEditing={editingId === sizeClass.id || (showAddForm && index === -1)}
              onStartEdit={() => {
                setEditingId(sizeClass.id);
                setShowAddForm(false);
              }}
              onSave={(data) => handleUpdate(sizeClass.id, data)}
              onCancel={() => setEditingId(null)}
              onDelete={() => onDelete(sizeClass.id)}
              validationErrors={getValidationErrorsForSizeClass(sizeClass.id)}
            />
          </div>
        ))}

        {/* Add Form Inline */}
        {showAddForm && (
          <div className="rounded-lg border-2 border-dashed border-primary/50 bg-accent/20 p-4">
            <EditableSizeClassRow
              sizeClass={{
                id: "new",
                workspaceId,
                speciesProfileId,
                name: "",
                displayOrder: sortedSizeClasses.length + 1,
                isActive: true,
                isDefault: false,
                isCustom: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              }}
              index={-1}
              isEditing={true}
              onStartEdit={() => {}}
              onSave={handleAdd}
              onCancel={() => setShowAddForm(false)}
              onDelete={() => setShowAddForm(false)}
              validationErrors={[]}
            />
          </div>
        )}

        {/* Empty State */}
        {sortedSizeClasses.length === 0 && !showAddForm && (
          <div className="rounded-lg border border-dashed bg-muted/30 p-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              No hay clasificaciones configuradas
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(true)}
              className="text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Crear Primera Clasificación
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
