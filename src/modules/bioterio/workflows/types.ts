/**
 * Workflow Action Types
 *
 * All workflow inputs reference species via `speciesProfileId` exclusively.
 */

import type { SpeciesProfileId } from "../lots/runtime/types";
import type { CageStatus, CageType } from "../cages/runtime/types";

export interface WorkflowContext {
  workspaceId: string;
  instanceId: string;
  userId: string;
  timestamp: Date;
}

export interface WorkflowResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  eventId?: string;
  requiresProjectionRebuild?: boolean;
}

export interface ValidationError {
  field: string;
  message: string;
  severity: "warning" | "error";
}

// ============================================================================
// CREATE LOT
// ============================================================================

export interface CreateLotWorkflowInput {
  speciesProfileId: SpeciesProfileId;
  strain?: string;
  sex: "mixed" | "male" | "female";
  quantity: number;
  sourceType: "internal_birth" | "external_purchase" | "transfer";
  birthDate?: Date;
  acquisitionDate?: Date;
  cageId?: string;
  notes?: string;
  tags?: string[];
}

export interface CreateLotWorkflowResult {
  lotId: string;
  lotCode: string;
  eventId: string;
}

// ============================================================================
// SUBDIVIDE LOT
// ============================================================================

export interface SubdivideLotSubdivision {
  sex: "mixed" | "male" | "female";
  quantity: number;
  codeSuffix?: string;
  notes?: string;
}

export interface SubdivideLotWorkflowInput {
  lotId: string;
  subdivisions: SubdivideLotSubdivision[];
  notes?: string;
}

export interface SubdivideLotWorkflowResult {
  originalLotId: string;
  childLotIds: string[];
  eventIds: string[];
}

// ============================================================================
// MOVE LOT
// ============================================================================

export interface MoveLotWorkflowInput {
  lotId: string;
  fromCageId: string;
  toCageId: string;
  quantity?: number;
  notes?: string;
}

export interface MoveLotWorkflowResult {
  lotId: string;
  movementEventId: string;
  assignmentEventId: string;
}

// ============================================================================
// ASSIGN LOT TO CAGE
// ============================================================================

export interface AssignLotToCageWorkflowInput {
  lotId: string;
  cageId: string;
  notes?: string;
}

export interface AssignLotToCageWorkflowResult {
  lotId: string;
  cageId: string;
  assignmentEventId: string;
}

// ============================================================================
// MORTALITY
// ============================================================================

export interface RegisterMortalityWorkflowInput {
  lotId: string;
  quantity: number;
  reason?: string;
  notes?: string;
}

export interface RegisterMortalityWorkflowResult {
  lotId: string;
  eventId: string;
  remainingQuantity: number;
}

// ============================================================================
// BREEDING GROUP
// ============================================================================

export interface BreedingGroupMember {
  lotId: string;
  role: "male" | "female";
  quantity: number;
}

export interface CreateBreedingGroupWorkflowInput {
  members: BreedingGroupMember[];
  cageId: string;
  breedingStrategy?: string;
  notes?: string;
}

export interface CreateBreedingGroupWorkflowResult {
  breedingGroupId: string;
  eventId: string;
}

// ============================================================================
// LITTER
// ============================================================================

export interface RegisterLitterWorkflowInput {
  breedingGroupId: string;
  /** Required so the new lot inherits the workspace's species profile. */
  speciesProfileId: SpeciesProfileId;
  litterSize: number;
  liveBirths: number;
  stillbirths?: number;
  birthDate?: Date;
  notes?: string;
}

export interface RegisterLitterWorkflowResult {
  litterId: string;
  lotId: string;
  eventId: string;
}

// ============================================================================
// WEANING
// ============================================================================

export interface WeaningSubdivision {
  sex: "mixed" | "male" | "female";
  quantity: number;
  notes?: string;
}

export interface RegisterWeaningWorkflowInput {
  litterLotId: string;
  weaningDate: Date;
  subdivisions: WeaningSubdivision[];
  notes?: string;
}

export interface RegisterWeaningWorkflowResult {
  originalLotId: string;
  weanedLotIds: string[];
  eventIds: string[];
}

// ============================================================================
// CAGE & SUMMARY TYPES
// ============================================================================

export interface CageSummary {
  id: string;
  code: string;
  status: CageStatus;
  type: CageType;
  capacity: number;
  currentOccupancy: number;
  availableSpace: number;
  location?: string;
}

export interface LotSummary {
  id: string;
  code: string;
  speciesProfileId: SpeciesProfileId;
  strain?: string;
  sex: "mixed" | "male" | "female";
  currentQuantity: number;
  status: string;
  location?: string;
  cageId?: string;
}

export interface OperationalActivity {
  id: string;
  type: string;
  description: string;
  timestamp: Date;
  userId: string;
  metadata?: Record<string, unknown>;
}

export interface OperationalAlert {
  id: string;
  type: "warning" | "error" | "info";
  title: string;
  message: string;
  relatedEntityId?: string;
  relatedEntityType?: "lot" | "cage" | "breeding_group" | "litter";
  timestamp: Date;
  acknowledged?: boolean;
}
