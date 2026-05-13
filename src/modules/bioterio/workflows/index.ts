/**
 * Bioterio Quick Operational Workflows
 * 
 * Fast, operationally-optimized workflows for daily bioterio operations.
 * 
 * DESIGN PRINCIPLES:
 * 1. Minimal clicks - Most actions in 1-3 interactions
 * 2. Minimal typing - Smart defaults, pickers, and quick inputs
 * 3. Mobile-first - Large touch targets, simple layouts
 * 4. Event-driven - All operations emit operational events
 * 5. Validation built-in - Safeguards without friction
 * 
 * WORKFLOWS PROVIDED:
 * - createLot: Quick lot creation with smart defaults
 * - subdivideLot: Fast subdivision with quantity allocation
 * - moveLot: Cage-to-cage lot movement
 * - assignLotToCage: Initial cage assignment
 * - registerMortality: Quick mortality logging
 * - createBreedingGroup: Breeding pair/group setup
 * - registerLitter: New litter recording
 * - registerWeaning: Weaning event processing
 */

export { createLotWorkflow } from './actions/createLotWorkflow';
export { subdivideLotWorkflow } from './actions/subdivideLotWorkflow';
export { moveLotWorkflow } from './actions/moveLotWorkflow';
export { assignLotToCageWorkflow } from './actions/assignLotToCageWorkflow';
export { registerMortalityWorkflow } from './actions/registerMortalityWorkflow';
export { createBreedingGroupWorkflow } from './actions/createBreedingGroupWorkflow';
export { registerLitterWorkflow } from './actions/registerLitterWorkflow';
export { registerWeaningWorkflow } from './actions/registerWeaningWorkflow';

// Primitives
export { LotPicker, QuickLotPicker } from './primitives/LotPicker';
export { CagePicker, AvailableCagePicker } from './primitives/CagePicker';
export { QuantityInput } from './primitives/QuantityInput';
export { QuickSelector, SexSelector, SourceTypeSelector } from './primitives/QuickSelector';
export { OperationalConfirmDialog, DestructiveConfirmDialog, WarningConfirmDialog } from './primitives/OperationalConfirmDialog';
export { CommandPalette, useBioterioCommands } from './primitives/CommandPalette';

// Activity & Feedback
export { RecentActivityPanel } from './components/RecentActivityPanel';
export { OperationSuccessToast } from './components/OperationSuccessToast';
export { OperationalAlerts } from './components/OperationalAlerts';

// Hooks
export { useWorkflowActions } from './hooks/useWorkflowActions';
export { useRecentActivity } from './hooks/useRecentActivity';
export { useOperationalValidation } from './hooks/useOperationalValidation';
