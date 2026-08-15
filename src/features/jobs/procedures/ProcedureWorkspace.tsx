import React, { useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, ClipboardList, FileCheck2, PackageCheck, ShieldAlert } from 'lucide-react';
import type { Job } from '../../../types';
import type { ProofAssetKind } from '../../proofVault/types';
import type { ProcedureProofRequirementIdentity } from '../../proofVault/procedureProof';
import safeStorage from '../../../utils/safeStorage';
import type {
  CustodyEventType,
  CustodyLedger,
  CustodyRequirementRole,
  ProcedureInventoryRequirementContext,
} from '../../../services/inventory/chainOfCustody';
import {
  type ProcedureAssignmentInput,
  type ProcedureAssignmentResult,
} from './jobProcedureAssignment';
import type { ProcedureCatalog } from './procedureCatalog';
import { DEFAULT_PROCEDURE_CATALOG } from './procedureCatalog';
import {
  deriveProcedureWorkspaceModel,
  scopedProcedureRequirementId,
  type ProcedureRequirementSummary,
  type ProcedureWorkspaceMode,
} from './procedureProgress';
import type { ProcedureDefinition, ProcedureEquipmentRequirement, ProcedureProofRequirement } from './types';

const MODE_KEY = 'route_manager_procedure_workspace_mode_v1';
const ACK_KEY = 'route_manager_procedure_acknowledgements_v1';

export interface ProcedureInventoryRecordInput {
  requirementContext: ProcedureInventoryRequirementContext;
  type: CustodyEventType;
  partNumber: string;
  serialNumber: string;
  receiptNumber?: string;
  trackingNumber?: string;
  equipmentLabel?: string;
  notes?: string;
}

interface InventoryFormState {
  partNumber: string;
  serialNumber: string;
  receiptNumber: string;
  trackingNumber: string;
}

interface ProcedureWorkspaceProps {
  job: Job;
  procedureCatalog?: ProcedureCatalog;
  proofRecords?: unknown;
  inventoryLedgers?: CustodyLedger[];
  onAssignProcedure?: (
    jobId: string,
    input: ProcedureAssignmentInput,
    procedure?: ProcedureDefinition,
    confirmed?: boolean,
  ) => ProcedureAssignmentResult;
  onCaptureProcedureProof?: (
    job: Job,
    kind: ProofAssetKind,
    files: FileList | null,
    requirementContext: Omit<ProcedureProofRequirementIdentity, 'visitId'> & { visitId?: string },
  ) => void;
  onRecordInventoryForRequirement?: (job: Job, input: ProcedureInventoryRecordInput) => void | Promise<void>;
  onEvidenceChanged?: () => void;
}

function readMode(): ProcedureWorkspaceMode {
  return safeStorage.getItem(MODE_KEY) === 'quick' ? 'quick' : 'guided';
}

export function getProcedureAcknowledgementIds(jobId: string): string[] {
  try {
    const raw = safeStorage.getItem(ACK_KEY);
    const parsed = raw ? JSON.parse(raw) as Record<string, string[]> : {};
    return Array.isArray(parsed[jobId]) ? parsed[jobId] : [];
  } catch {
    return [];
  }
}

function saveAcknowledgements(jobId: string, ids: string[]): void {
  try {
    const raw = safeStorage.getItem(ACK_KEY);
    const parsed = raw ? JSON.parse(raw) as Record<string, string[]> : {};
    safeStorage.setItem(ACK_KEY, JSON.stringify({ ...parsed, [jobId]: [...new Set(ids)] }));
  } catch {
    // Preference storage is best effort.
  }
}

function proofKind(requirement: ProcedureProofRequirement): ProofAssetKind {
  if (requirement.proofType === 'screenshot') return 'screenshots';
  if (requirement.proofType === 'receipt' || requirement.proofType === 'document') return 'receipts';
  return 'photos';
}

function inventoryTypeAndRole(requirement: ProcedureEquipmentRequirement): { type: CustodyEventType; role: CustodyRequirementRole } {
  switch (requirement.serialRequirement) {
    case 'new':
      return { type: 'install', role: 'installed_item' };
    case 'old':
      return { type: 'removal', role: 'removed_item' };
    case 'none':
    case 'single':
    case 'old_and_new':
      return { type: 'receive_in', role: 'serial_capture' };
  }
}

function classificationStyle(kind: string, blocking = false): string {
  if (blocking) return 'border-rose-500/25 bg-rose-500/10 text-rose-200';
  if (kind === 'required' || kind === 'conditional') return 'border-amber-500/25 bg-amber-500/10 text-amber-200';
  if (kind === 'recommended') return 'border-cyan-500/20 bg-cyan-500/10 text-cyan-200';
  return 'border-white/10 bg-white/[0.04] text-slate-400';
}

export default function ProcedureWorkspace({
  job,
  procedureCatalog = DEFAULT_PROCEDURE_CATALOG,
  proofRecords,
  inventoryLedgers,
  onAssignProcedure,
  onCaptureProcedureProof,
  onRecordInventoryForRequirement,
  onEvidenceChanged,
}: ProcedureWorkspaceProps) {
  const [mode, setMode] = useState<ProcedureWorkspaceMode>(() => readMode());
  const [selectedProcedureKey, setSelectedProcedureKey] = useState('');
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null);
  const [pendingAssignment, setPendingAssignment] = useState<{ input: ProcedureAssignmentInput; procedure: ProcedureDefinition } | null>(null);
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>(() => getProcedureAcknowledgementIds(job.id));
  const [inventoryForms, setInventoryForms] = useState<Record<string, InventoryFormState>>({});

  const model = useMemo(() => deriveProcedureWorkspaceModel(job, {
    procedureCatalog,
    context: {
      job,
      proofRecords: proofRecords as never,
      inventoryLedgers,
      satisfiedRequirementIds: acknowledgedIds,
    },
  }), [acknowledgedIds, inventoryLedgers, job, procedureCatalog, proofRecords]);

  const matchingProcedures = procedureCatalog.filter(procedure => procedure.jobType === job.jobType);
  const selectableProcedures = matchingProcedures.length > 0 ? matchingProcedures : procedureCatalog;
  const selectedProcedure = selectableProcedures.find(procedure => `${procedure.id}@${procedure.version}` === selectedProcedureKey);
  const procedure = model.procedure;

  const setWorkspaceMode = (nextMode: ProcedureWorkspaceMode) => {
    setMode(nextMode);
    safeStorage.setItem(MODE_KEY, nextMode);
  };

  const runAssignment = (confirmed = false) => {
    if (!selectedProcedure || !onAssignProcedure) return;
    const input: ProcedureAssignmentInput = {
      procedureId: selectedProcedure.id,
      procedureVersion: selectedProcedure.version,
      assignmentSource: 'manual',
    };
    const result = onAssignProcedure(job.id, input, selectedProcedure, confirmed);
    if (result.status === 'confirmation_required') {
      setPendingAssignment({ input, procedure: selectedProcedure });
      setAssignmentMessage('Procedure changes after work starts need explicit confirmation.');
      return;
    }
    setPendingAssignment(null);
    setAssignmentMessage(result.status === 'rejected'
      ? result.errors.map(error => error.message).join(' ')
      : result.status === 'unchanged'
        ? 'This exact procedure version is already assigned.'
        : 'Procedure assignment saved.');
  };

  const confirmPendingAssignment = () => {
    if (!pendingAssignment || !onAssignProcedure) return;
    const result = onAssignProcedure(job.id, pendingAssignment.input, pendingAssignment.procedure, true);
    setAssignmentMessage(result.status === 'updated' ? 'Confirmed procedure assignment saved.' : 'Assignment was not changed.');
    setPendingAssignment(null);
  };

  const acknowledgeRequirement = (id: string) => {
    const nextIds = [...new Set([...acknowledgedIds, id])];
    setAcknowledgedIds(nextIds);
    saveAcknowledgements(job.id, nextIds);
    onEvidenceChanged?.();
  };

  const updateInventoryForm = (id: string, updates: Partial<InventoryFormState>) => {
    setInventoryForms(prev => ({
      ...prev,
      [id]: {
        partNumber: '',
        serialNumber: '',
        receiptNumber: '',
        trackingNumber: '',
        ...(prev[id] ?? {}),
        ...updates,
      },
    }));
  };

  const recordInventory = async (
    requirementSummary: ProcedureRequirementSummary,
    equipmentRequirement: ProcedureEquipmentRequirement,
  ) => {
    if (!procedure || !onRecordInventoryForRequirement) return;
    const form = inventoryForms[requirementSummary.id] ?? {
      partNumber: '',
      serialNumber: '',
      receiptNumber: '',
      trackingNumber: '',
    };
    const typeAndRole = inventoryTypeAndRole(equipmentRequirement);
    const requirementContext: ProcedureInventoryRequirementContext = {
      requirementId: equipmentRequirement.id,
      procedureId: procedure.id,
      procedureVersion: procedure.version,
      procedureStepId: requirementSummary.procedureStepId,
      visitId: job.lifecycle?.activeVisitId,
      requirementRole: typeAndRole.role,
    };
    await onRecordInventoryForRequirement(job, {
      requirementContext,
      type: typeAndRole.type,
      partNumber: form.partNumber || equipmentRequirement.deviceModel || equipmentRequirement.label,
      serialNumber: form.serialNumber,
      receiptNumber: form.receiptNumber || undefined,
      trackingNumber: form.trackingNumber || undefined,
      equipmentLabel: equipmentRequirement.label,
      notes: `Procedure requirement ${equipmentRequirement.id}`,
    });
    onEvidenceChanged?.();
  };

  const renderRequirementStatus = (requirement: ProcedureRequirementSummary) => (
    <span className={`rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase ${classificationStyle(requirement.kind, requirement.blocking)}`}>
      {requirement.satisfied ? 'Satisfied' : requirement.blocking ? 'Missing' : requirement.kind}
    </span>
  );

  const renderProofPrompt = (requirement: ProcedureRequirementSummary, proofRequirement: ProcedureProofRequirement) => {
    if (!procedure) return null;
    const inputId = `${job.id}-${requirement.id}-proof`;
    return (
      <div key={requirement.id} className={`rounded-lg border px-2.5 py-2 ${classificationStyle(requirement.kind, requirement.blocking)}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-black">{proofRequirement.label}</p>
            <p className="mt-0.5 text-[10px] font-semibold opacity-80">{proofRequirement.instructions}</p>
            <p className="mt-1 text-[9px] font-black uppercase opacity-60">
              {proofRequirement.proofType} {proofRequirement.visitScope ? ` / ${proofRequirement.visitScope}` : ''}
            </p>
          </div>
          {renderRequirementStatus(requirement)}
        </div>
        <label htmlFor={inputId} className="mt-2 inline-flex min-h-9 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] font-black text-white hover:bg-white/15">
          <FileCheck2 size={13} />
          Capture Proof
        </label>
        <input
          id={inputId}
          type="file"
          multiple
          accept="image/*,.pdf"
          className="sr-only"
          onChange={event => {
            onCaptureProcedureProof?.(job, proofKind(proofRequirement), event.currentTarget.files, {
              requirementId: proofRequirement.id,
              procedureId: procedure.id,
              procedureVersion: procedure.version,
              procedureStepId: requirement.procedureStepId,
              proofType: proofRequirement.proofType,
              visitId: job.lifecycle?.activeVisitId,
            });
            event.currentTarget.value = '';
            onEvidenceChanged?.();
          }}
        />
      </div>
    );
  };

  const renderInventoryPrompt = (requirement: ProcedureRequirementSummary, equipmentRequirement: ProcedureEquipmentRequirement) => {
    const form = inventoryForms[requirement.id] ?? { partNumber: '', serialNumber: '', receiptNumber: '', trackingNumber: '' };
    return (
      <div key={requirement.id} className={`rounded-lg border px-2.5 py-2 ${classificationStyle(requirement.kind, requirement.blocking)}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-black">{equipmentRequirement.label}</p>
            <p className="mt-0.5 text-[10px] font-semibold opacity-80">
              {equipmentRequirement.deviceModel || 'Equipment'} / serial: {equipmentRequirement.serialRequirement}
            </p>
            <p className="mt-1 text-[9px] font-black uppercase opacity-60">
              Qty {equipmentRequirement.quantity ?? 1}
              {equipmentRequirement.trackRemovedEquipment ? ' / removed tracking' : ''}
              {equipmentRequirement.returnRequired ? ' / return required' : ''}
            </p>
          </div>
          {renderRequirementStatus(requirement)}
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <input
            aria-label={`${equipmentRequirement.label} part number`}
            value={form.partNumber}
            onChange={event => updateInventoryForm(requirement.id, { partNumber: event.target.value })}
            placeholder="Part/model"
            className="min-h-9 rounded-lg border border-white/10 bg-black/20 px-2 text-[11px] font-bold text-white outline-none focus:border-cyan-400"
          />
          <input
            aria-label={`${equipmentRequirement.label} serial number`}
            value={form.serialNumber}
            onChange={event => updateInventoryForm(requirement.id, { serialNumber: event.target.value })}
            placeholder="Serial"
            className="min-h-9 rounded-lg border border-white/10 bg-black/20 px-2 text-[11px] font-bold text-white outline-none focus:border-cyan-400"
          />
          {equipmentRequirement.returnRequired && (
            <>
              <input
                aria-label={`${equipmentRequirement.label} receipt number`}
                value={form.receiptNumber}
                onChange={event => updateInventoryForm(requirement.id, { receiptNumber: event.target.value })}
                placeholder="Receipt"
                className="min-h-9 rounded-lg border border-white/10 bg-black/20 px-2 text-[11px] font-bold text-white outline-none focus:border-cyan-400"
              />
              <input
                aria-label={`${equipmentRequirement.label} tracking number`}
                value={form.trackingNumber}
                onChange={event => updateInventoryForm(requirement.id, { trackingNumber: event.target.value })}
                placeholder="Tracking"
                className="min-h-9 rounded-lg border border-white/10 bg-black/20 px-2 text-[11px] font-bold text-white outline-none focus:border-cyan-400"
              />
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => void recordInventory(requirement, equipmentRequirement)}
          className="mt-2 inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] font-black text-white hover:bg-white/15"
        >
          <PackageCheck size={13} />
          Record Inventory
        </button>
      </div>
    );
  };

  return (
    <section aria-labelledby="procedure-workspace-title" className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h5 id="procedure-workspace-title" className="text-[10px] font-black uppercase tracking-wider text-slate-500">
            Procedure
          </h5>
          <p className="mt-0.5 text-sm font-black text-white">
            {procedure ? `${procedure.name} v${procedure.version}` : model.resolution.status === 'unassigned' ? 'No procedure assigned' : 'Assigned procedure unresolved'}
          </p>
          <p className="mt-0.5 text-[10px] font-bold uppercase text-slate-500">
            {procedure ? `${procedure.status} / ${procedure.category}` : model.resolution.reason}
          </p>
        </div>
        {procedure && (
          <span className={`rounded-full border px-2 py-1 text-[9px] font-black uppercase ${model.summary.missingRequiredItems > 0 ? 'border-rose-500/25 bg-rose-500/10 text-rose-200' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'}`}>
            {model.summary.percentComplete}%
          </span>
        )}
      </div>

      {model.resolution.status === 'not_found' || model.resolution.status === 'invalid_assignment' ? (
        <div className="mt-3 flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-2.5 py-2 text-[11px] font-bold text-rose-200">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
          <span>{model.resolution.reason}</span>
        </div>
      ) : null}

      <div className="mt-3 rounded-lg border border-white/10 bg-black/10 px-2.5 py-2">
        <p className="text-[9px] font-black uppercase tracking-wider text-slate-500">
          {procedure ? 'Change Procedure' : 'Assign Procedure'}
        </p>
        <div role="listbox" aria-label="Procedure catalog" className="mt-1.5 grid gap-1.5">
            {selectableProcedures.map(item => (
            <button
              key={`${item.id}@${item.version}`}
              type="button"
              role="option"
              aria-selected={selectedProcedureKey === `${item.id}@${item.version}`}
              onClick={() => setSelectedProcedureKey(`${item.id}@${item.version}`)}
              className={`min-h-10 rounded-lg border px-2.5 py-2 text-left text-xs font-bold ${
                selectedProcedureKey === `${item.id}@${item.version}`
                  ? 'border-cyan-400/40 bg-cyan-500/15 text-cyan-100'
                  : 'border-white/10 bg-black/20 text-slate-300 hover:bg-white/[0.06]'
              }`}
            >
                {item.name} v{item.version} ({item.status})
            </button>
            ))}
        </div>
        <div className="mt-2 flex justify-end">
          <button
            type="button"
            disabled={!selectedProcedure || !onAssignProcedure}
            onClick={() => runAssignment(false)}
            className="min-h-10 rounded-lg bg-white/15 px-3 py-2 text-xs font-black text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Confirm
          </button>
        </div>
        {assignmentMessage && (
          <p className="mt-2 text-[11px] font-bold text-amber-100" role="status">{assignmentMessage}</p>
        )}
        {pendingAssignment && (
          <button
            type="button"
            onClick={confirmPendingAssignment}
            className="mt-2 min-h-10 w-full rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs font-black text-amber-100"
          >
            Confirm Procedure Change After Work Started
          </button>
        )}
      </div>

      {procedure && (
        <>
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            <div className="rounded-lg border border-white/10 bg-black/10 px-2 py-2 text-center">
              <p className="text-[8px] font-black uppercase text-slate-500">Progress</p>
              <p className="mt-0.5 text-[11px] font-black text-slate-200">{model.summary.completedSteps}/{model.summary.applicableSteps}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/10 px-2 py-2 text-center">
              <p className="text-[8px] font-black uppercase text-slate-500">Missing</p>
              <p className="mt-0.5 text-[11px] font-black text-slate-200">{model.summary.missingRequiredItems}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/10 px-2 py-2 text-center">
              <p className="text-[8px] font-black uppercase text-slate-500">Next</p>
              <p
                className="mt-0.5 truncate text-[11px] font-black text-slate-200"
                title={model.summary.nextStep?.step.title ?? 'Review'}
              >
                {model.summary.nextStep?.step.title ?? 'Review'}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-1.5 rounded-lg border border-white/10 bg-black/10 p-1">
            <button
              type="button"
              onClick={() => setWorkspaceMode('guided')}
              className={`min-h-9 rounded-md text-xs font-black ${mode === 'guided' ? 'bg-white/20 text-white' : 'text-slate-400 hover:bg-white/10'}`}
            >
              Guided
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceMode('quick')}
              className={`min-h-9 rounded-md text-xs font-black ${mode === 'quick' ? 'bg-white/20 text-white' : 'text-slate-400 hover:bg-white/10'}`}
            >
              Quick
            </button>
          </div>

          {model.summary.unresolvedConditionalItems > 0 && (
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-2 text-[11px] font-bold text-amber-200">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{model.summary.unresolvedConditionalItems} conditional step needs more context before it can be treated as complete.</span>
            </div>
          )}

          <div className="mt-3 space-y-2">
            {model.steps
              .filter(item => mode === 'guided' || item.applicable || item.missingBlockingRequirements.length > 0)
              .map(item => {
                const showExpanded = mode === 'guided' || item.missingBlockingRequirements.length > 0;
                return (
                  <details key={item.step.id} open={showExpanded} className="rounded-xl border border-white/10 bg-black/10 px-2.5 py-2">
                    <summary className="flex cursor-pointer list-none items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[9px] font-black uppercase text-slate-500">{item.phaseLabel}</p>
                        <p className="mt-0.5 text-sm font-black text-white">{item.step.title}</p>
                        <p className="mt-0.5 text-[10px] font-bold text-slate-400">
                          {mode === 'quick' ? item.step.quickCheckpoint ?? item.step.guidedInstructions : item.step.guidedInstructions ?? item.step.quickCheckpoint}
                        </p>
                      </div>
                      {item.satisfied ? (
                        <CheckCircle2 size={16} className="mt-1 shrink-0 text-emerald-300" />
                      ) : (
                        <ClipboardList size={16} className="mt-1 shrink-0 text-amber-300" />
                      )}
                    </summary>

                    <div className="mt-2 space-y-2">
                      <div className="flex flex-wrap gap-1.5">
                        <span className={`rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase ${classificationStyle(item.step.classification, item.missingBlockingRequirements.length > 0)}`}>
                          {item.step.classification}
                        </span>
                        {item.step.condition && (
                          <span className={`rounded-full border px-1.5 py-0.5 text-[8px] font-black uppercase ${item.unresolvedCondition ? 'border-amber-500/25 text-amber-200' : item.condition.active ? 'border-emerald-500/20 text-emerald-200' : 'border-white/10 text-slate-500'}`}>
                            {item.condition.status === 'active' ? 'Applies' : item.condition.status === 'inactive' ? 'Does not apply' : 'Cannot determine'}
                          </span>
                        )}
                      </div>
                      {item.step.warningText && (
                        <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1.5 text-[10px] font-bold text-amber-200">
                          <AlertCircle size={13} className="mt-0.5 shrink-0" />
                          <span>{item.step.warningText}</span>
                        </div>
                      )}
                      {item.requirements.map(requirement => {
                        if (requirement.proofRequirement) return renderProofPrompt(requirement, requirement.proofRequirement);
                        if (requirement.equipmentRequirement) return renderInventoryPrompt(requirement, requirement.equipmentRequirement);
                        if (requirement.testingRequirement) {
                          return (
                            <div key={requirement.id} className={`rounded-lg border px-2.5 py-2 ${classificationStyle(requirement.kind, requirement.blocking)}`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-black">{requirement.testingRequirement.label}</p>
                                  <p className="mt-0.5 text-[10px] font-semibold opacity-80">{requirement.testingRequirement.instructions}</p>
                                  <p className="mt-1 text-[9px] font-black uppercase opacity-60">{requirement.testingRequirement.validationType}</p>
                                </div>
                                {renderRequirementStatus(requirement)}
                              </div>
                              {!requirement.satisfied && requirement.source === 'testing' && (
                                <button
                                  type="button"
                                  onClick={() => acknowledgeRequirement(scopedProcedureRequirementId(procedure, 'testing', requirement.testingRequirement!.id))}
                                  className="mt-2 min-h-9 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-[11px] font-black text-white hover:bg-white/15"
                                >
                                  Acknowledge Test Complete
                                </button>
                              )}
                            </div>
                          );
                        }
                        if (requirement.supportEscalation) {
                          return (
                            <div key={requirement.id} className={`rounded-lg border px-2.5 py-2 ${classificationStyle(requirement.kind, requirement.blocking)}`}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="text-xs font-black">{requirement.supportEscalation.escalationLabel}</p>
                                  <p className="mt-0.5 text-[10px] font-semibold opacity-80">{requirement.supportEscalation.instructions}</p>
                                  <p className="mt-1 text-[9px] font-black uppercase opacity-60">{requirement.supportEscalation.contactRoleType}</p>
                                </div>
                                {renderRequirementStatus(requirement)}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })}
                    </div>
                  </details>
                );
              })}
          </div>
        </>
      )}
    </section>
  );
}
