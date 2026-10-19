import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, ChevronDown, ChevronRight, ClipboardList, FileCheck2, PackageCheck, ShieldAlert } from 'lucide-react';
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
  initialTargetStepId?: string;
  onTargetStepReached?: () => void;
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

function stepStatusLabel(item: ReturnType<typeof deriveProcedureWorkspaceModel>['steps'][number]): string {
  if (item.satisfied) return 'Complete';
  if (item.missingBlockingRequirements.length > 0) return 'Missing';
  if (item.step.classification === 'conditional' && item.unresolvedCondition) return 'Optional';
  return 'Current';
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
  initialTargetStepId,
  onTargetStepReached,
}: ProcedureWorkspaceProps) {
  const [mode, setMode] = useState<ProcedureWorkspaceMode>(() => readMode());
  const [selectedProcedureKey, setSelectedProcedureKey] = useState('');
  const [assignmentMessage, setAssignmentMessage] = useState<string | null>(null);
  const [pendingAssignment, setPendingAssignment] = useState<{ input: ProcedureAssignmentInput; procedure: ProcedureDefinition } | null>(null);
  const [acknowledgedIds, setAcknowledgedIds] = useState<string[]>(() => getProcedureAcknowledgementIds(job.id));
  const [inventoryForms, setInventoryForms] = useState<Record<string, InventoryFormState>>({});
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set());
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [forceShowFullInstructions, setForceShowFullInstructions] = useState<Set<string>>(new Set());

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

  const phases = useMemo(() => {
    const map = new Map<string, typeof model.steps>();
    model.steps.forEach(step => {
      const key = step.phaseLabel;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(step);
    });
    return Array.from(map.entries()).map(([label, steps]) => ({
      label,
      steps,
      completedCount: steps.filter(s => s.satisfied).length,
      totalCount: steps.filter(s => s.applicable && s.step.classification !== 'reference').length,
      missingCount: steps.filter(s => s.missingBlockingRequirements.length > 0).length,
      hasCurrentStep: steps.some(s => model.summary.nextStep?.step.id === s.step.id),
    }));
  }, [model.steps, model.summary.nextStep]);

  // Default expansion based on current step and state
  useEffect(() => {
    const next = new Set<string>();
    const nextSteps = new Set<string>();
    phases.forEach(phase => {
      const hasCurrent = phase.hasCurrentStep;
      const hasBlocking = phase.missingCount > 0;
      const isCompleted = phase.completedCount === phase.totalCount && phase.totalCount > 0;
      if (hasCurrent || hasBlocking) {
        next.add(phase.label);
      }
      phase.steps.forEach(step => {
        const isCurrent = model.summary.nextStep?.step.id === step.step.id;
        const hasBlockers = step.missingBlockingRequirements.length > 0;
        if (isCurrent || hasBlockers) {
          nextSteps.add(step.step.id);
        }
      });
    });
    setExpandedPhases(next);
    setExpandedSteps(nextSteps);
  }, [phases, model.summary.nextStep]);

  // Scroll to target step when provided
  useEffect(() => {
    if (!initialTargetStepId) return;
    const el = document.getElementById(`step-${initialTargetStepId}`);
    if (!el) return;

    // Expand the target step and its phase
    const targetStep = model.steps.find(s => s.step.id === initialTargetStepId);
    if (targetStep) {
      setExpandedPhases(prev => new Set(prev).add(targetStep.phaseLabel));
      setExpandedSteps(prev => new Set(prev).add(initialTargetStepId));
    }

    requestAnimationFrame(() => {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      onTargetStepReached?.();
    });
  }, [initialTargetStepId, model.steps, onTargetStepReached]);

  const setWorkspaceMode = (nextMode: ProcedureWorkspaceMode) => {
    setMode(nextMode);
    safeStorage.setItem(MODE_KEY, nextMode);
  };

  const togglePhase = (label: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const toggleStep = (stepId: string) => {
    setExpandedSteps(prev => {
      const next = new Set(prev);
      if (next.has(stepId)) next.delete(stepId);
      else next.add(stepId);
      return next;
    });
  };

  const showFullInstructions = (stepId: string) => {
    setForceShowFullInstructions(prev => {
      const next = new Set(prev);
      next.add(stepId);
      return next;
    });
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
    <span className={`rounded-full border px-1.5 py-0.5 text-xs font-black uppercase ${classificationStyle(requirement.kind, requirement.blocking)}`}>
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
            <p className="text-sm font-black">{proofRequirement.label}</p>
            <p className="mt-0.5 text-xs font-semibold opacity-80">{proofRequirement.instructions}</p>
            <p className="mt-1 text-xs font-black uppercase opacity-60">
              {proofRequirement.proofType} {proofRequirement.visitScope ? ` / ${proofRequirement.visitScope}` : ''}
            </p>
          </div>
          {renderRequirementStatus(requirement)}
        </div>
        <label
          htmlFor={inputId}
          className={`mt-2 inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-black text-white transition ${
            requirement.blocking
              ? 'w-full border-amber-500/30 bg-amber-500/15 hover:bg-amber-500/20'
              : 'border-white/15 bg-white/10 hover:bg-white/15'
          }`}
        >
          <FileCheck2 size={14} />
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
            <p className="text-sm font-black">{equipmentRequirement.label}</p>
            <p className="mt-0.5 text-xs font-semibold opacity-80">
              {equipmentRequirement.deviceModel || 'Equipment'} / serial: {equipmentRequirement.serialRequirement}
            </p>
            <p className="mt-1 text-xs font-black uppercase opacity-60">
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
            className="min-h-10 rounded-lg border border-white/10 bg-black/20 px-2 text-xs font-bold text-white outline-none focus:border-cyan-400"
          />
          <input
            aria-label={`${equipmentRequirement.label} serial number`}
            value={form.serialNumber}
            onChange={event => updateInventoryForm(requirement.id, { serialNumber: event.target.value })}
            placeholder="Serial"
            className="min-h-10 rounded-lg border border-white/10 bg-black/20 px-2 text-xs font-bold text-white outline-none focus:border-cyan-400"
          />
          {equipmentRequirement.returnRequired && (
            <>
              <input
                aria-label={`${equipmentRequirement.label} receipt number`}
                value={form.receiptNumber}
                onChange={event => updateInventoryForm(requirement.id, { receiptNumber: event.target.value })}
                placeholder="Receipt"
                className="min-h-10 rounded-lg border border-white/10 bg-black/20 px-2 text-xs font-bold text-white outline-none focus:border-cyan-400"
              />
              <input
                aria-label={`${equipmentRequirement.label} tracking number`}
                value={form.trackingNumber}
                onChange={event => updateInventoryForm(requirement.id, { trackingNumber: event.target.value })}
                placeholder="Tracking"
                className="min-h-10 rounded-lg border border-white/10 bg-black/20 px-2 text-xs font-bold text-white outline-none focus:border-cyan-400"
              />
            </>
          )}
        </div>
        <button
          type="button"
          onClick={() => void recordInventory(requirement, equipmentRequirement)}
          className={`mt-2 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-black text-white transition ${
            requirement.blocking
              ? 'w-full border-amber-500/30 bg-amber-500/15 hover:bg-amber-500/20'
              : 'border-white/15 bg-white/10 hover:bg-white/15'
          }`}
        >
          <PackageCheck size={14} />
          Record Inventory
        </button>
      </div>
    );
  };

  const renderStepCard = (item: typeof model.steps[number], index: number) => {
    const isCurrentStep = model.summary.nextStep?.step.id === item.step.id;
    const hasBlocking = item.missingBlockingRequirements.length > 0;
    const isExpanded = expandedSteps.has(item.step.id) || forceShowFullInstructions.has(item.step.id);
    const showExpanded = isExpanded || (mode === 'guided' && hasBlocking) || (mode === 'guided' && isCurrentStep);

    const containerClass = isCurrentStep
      ? 'border-blue-500/30 bg-blue-500/5'
      : hasBlocking
        ? 'border-rose-500/25 bg-rose-500/5'
        : item.satisfied
          ? 'border-white/5 bg-black/5'
          : 'border-white/10 bg-black/10';

    const stepNumber = index + 1;

    return (
      <div
        key={item.step.id}
        id={`step-${item.step.id}`}
        className={`rounded-xl border px-2.5 py-2 ${containerClass}`}
      >
        {/* Collapsed header — always visible */}
        <button
          type="button"
          onClick={() => toggleStep(item.step.id)}
          className="flex w-full cursor-pointer items-start justify-between gap-2 text-left"
        >
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-xs font-black text-slate-300">
                {item.satisfied ? <CheckCircle2 size={12} className="text-emerald-400" /> : stepNumber}
              </span>
              {isCurrentStep && (
                <span className="rounded-full border border-blue-500/30 bg-blue-500/15 px-1.5 py-0.5 text-xs font-black uppercase text-blue-300">
                  Current
                </span>
              )}
              <span className={`rounded-full border px-1.5 py-0.5 text-xs font-black uppercase ${
                item.satisfied
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
                  : hasBlocking
                    ? 'border-rose-500/25 bg-rose-500/10 text-rose-300'
                    : 'border-white/10 bg-white/[0.04] text-slate-400'
              }`}>
                {stepStatusLabel(item)}
              </span>
              {item.step.warningText && (
                <ShieldAlert size={13} className="shrink-0 text-amber-400" />
              )}
            </div>
            <p className={`mt-1 text-base font-black leading-snug ${item.satisfied ? 'text-slate-400' : 'text-white'}`}>
              {item.step.title}
            </p>
          </div>
          <div className="shrink-0 pt-0.5">
            {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
          </div>
        </button>

        {/* Quick checkpoint — always visible in quick, or when collapsed */}
        {!showExpanded && (
          <p className="mt-1 text-sm font-bold text-slate-400">
            {item.step.quickCheckpoint ?? item.step.guidedInstructions}
          </p>
        )}

        {/* Expanded content */}
        {showExpanded && (
          <div className="mt-2 space-y-2">
            {/* Classification chips */}
            <div className="flex flex-wrap gap-1.5">
              <span className={`rounded-full border px-1.5 py-0.5 text-xs font-black uppercase ${classificationStyle(item.step.classification, item.missingBlockingRequirements.length > 0)}`}>
                {item.step.classification}
              </span>
              {item.step.condition && (
                <span className={`rounded-full border px-1.5 py-0.5 text-xs font-black uppercase ${item.unresolvedCondition ? 'border-amber-500/25 text-amber-200' : item.condition.active ? 'border-emerald-500/20 text-emerald-200' : 'border-white/10 text-slate-500'}`}>
                  {item.condition.status === 'active' ? 'Applies' : item.condition.status === 'inactive' ? 'Does not apply' : 'Cannot determine'}
                </span>
              )}
            </div>

            {/* Instructions — Quick mode: short; Guided mode: full with chunks */}
            {mode === 'quick' && item.step.quickCheckpoint && (
              <p className="text-sm font-bold text-slate-300">{item.step.quickCheckpoint}</p>
            )}
            {mode === 'quick' && item.step.guidedInstructions && (
              <button
                type="button"
                onClick={() => showFullInstructions(item.step.id)}
                className="text-xs font-bold text-cyan-300 hover:text-cyan-200"
              >
                Show full instructions
              </button>
            )}
            {mode === 'guided' && item.step.guidedInstructions && (
              <div className="space-y-1.5">
                {item.step.guidedInstructions.split(/\n+/).map((paragraph, i) => (
                  <p key={i} className="text-sm font-semibold leading-relaxed text-slate-300">
                    {paragraph}
                  </p>
                ))}
              </div>
            )}

            {/* Warning */}
            {item.step.warningText && (
              <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2 py-1.5 text-xs font-bold text-amber-200">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{item.step.warningText}</span>
              </div>
            )}

            {/* Requirements — progressive disclosure */}
            {item.requirements.map(requirement => {
              // Quick mode: hide satisfied requirements, show only blocking or unsatisfied
              if (mode === 'quick' && requirement.satisfied && !requirement.blocking) return null;

              if (requirement.proofRequirement) return renderProofPrompt(requirement, requirement.proofRequirement);
              if (requirement.equipmentRequirement) return renderInventoryPrompt(requirement, requirement.equipmentRequirement);
              if (requirement.testingRequirement) {
                return (
                  <div key={requirement.id} className={`rounded-lg border px-2.5 py-2 ${classificationStyle(requirement.kind, requirement.blocking)}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-black">{requirement.testingRequirement.label}</p>
                        <p className="mt-0.5 text-xs font-semibold opacity-80">{requirement.testingRequirement.instructions}</p>
                        <p className="mt-1 text-xs font-black uppercase opacity-60">{requirement.testingRequirement.validationType}</p>
                      </div>
                      {renderRequirementStatus(requirement)}
                    </div>
                    {!requirement.satisfied && requirement.source === 'testing' && (
                      <button
                        type="button"
                        onClick={() => acknowledgeRequirement(scopedProcedureRequirementId(procedure!, 'testing', requirement.testingRequirement!.id))}
                        className="mt-2 min-h-10 w-full rounded-lg border border-amber-500/30 bg-amber-500/15 px-3 py-2 text-sm font-black text-white transition hover:bg-amber-500/20"
                      >
                        <CheckCircle2 size={14} className="inline align-text-bottom mr-1" />
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
                        <p className="text-sm font-black">{requirement.supportEscalation.escalationLabel}</p>
                        <p className="mt-0.5 text-xs font-semibold opacity-80">{requirement.supportEscalation.instructions}</p>
                        <p className="mt-1 text-xs font-black uppercase opacity-60">{requirement.supportEscalation.contactRoleType}</p>
                      </div>
                      {renderRequirementStatus(requirement)}
                    </div>
                  </div>
                );
              }
              return null;
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <section aria-labelledby="procedure-workspace-title" className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h5 id="procedure-workspace-title" className="text-sm font-black uppercase tracking-wider text-slate-500">
            Procedure
          </h5>
          <p className="mt-0.5 text-base font-black text-white">
            {procedure ? `${procedure.name} v${procedure.version}` : model.resolution.status === 'unassigned' ? 'No procedure assigned' : 'Assigned procedure unresolved'}
          </p>
          <p className="mt-0.5 text-xs font-bold uppercase text-slate-500">
            {procedure ? `${procedure.status} / ${procedure.category}` : model.resolution.reason}
          </p>
        </div>
        {procedure && (
          <span className={`shrink-0 rounded-full border px-2 py-1 text-xs font-black uppercase ${model.summary.missingRequiredItems > 0 ? 'border-rose-500/25 bg-rose-500/10 text-rose-200' : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-200'}`}>
            {model.summary.percentComplete}%
          </span>
        )}
      </div>

      {model.resolution.status === 'not_found' || model.resolution.status === 'invalid_assignment' ? (
        <div className="flex items-start gap-2 rounded-lg border border-rose-500/25 bg-rose-500/10 px-2.5 py-2 text-sm font-bold text-rose-200">
          <ShieldAlert size={14} className="mt-0.5 shrink-0" />
          <span>{model.resolution.reason}</span>
        </div>
      ) : null}

      {/* Assignment panel */}
      <div className="rounded-lg border border-white/10 bg-black/10 px-2.5 py-2">
        <p className="text-xs font-black uppercase tracking-wider text-slate-500">
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
              className={`min-h-10 rounded-lg border px-2.5 py-2 text-left text-sm font-bold ${
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
            className="min-h-10 rounded-lg bg-white/15 px-3 py-2 text-sm font-black text-white hover:bg-white/20 disabled:cursor-not-allowed disabled:opacity-45"
          >
            Confirm
          </button>
        </div>
        {assignmentMessage && (
          <p className="mt-2 text-xs font-bold text-amber-100" role="status">{assignmentMessage}</p>
        )}
        {pendingAssignment && (
          <button
            type="button"
            onClick={confirmPendingAssignment}
            className="mt-2 min-h-10 w-full rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-sm font-black text-amber-100"
          >
            Confirm Procedure Change After Work Started
          </button>
        )}
      </div>

      {procedure && (
        <>
          {/* Progress tiles */}
          <div className="grid grid-cols-3 gap-1.5">
            <div className="rounded-lg border border-white/10 bg-black/10 px-2 py-2 text-center">
              <p className="text-xs font-black uppercase text-slate-500">Progress</p>
              <p className="mt-0.5 text-sm font-black text-slate-200">{model.summary.completedSteps}/{model.summary.applicableSteps}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/10 px-2 py-2 text-center">
              <p className="text-xs font-black uppercase text-slate-500">Missing</p>
              <p className="mt-0.5 text-sm font-black text-slate-200">{model.summary.missingRequiredItems}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-black/10 px-2 py-2 text-center">
              <p className="text-xs font-black uppercase text-slate-500">Next</p>
              <p
                className="mt-0.5 truncate text-sm font-black text-slate-200"
                title={model.summary.nextStep?.step.title ?? 'Review'}
              >
                {model.summary.nextStep?.step.title ?? 'Review'}
              </p>
            </div>
          </div>

          {/* Mode toggle */}
          <div className="grid grid-cols-2 gap-1.5 rounded-lg border border-white/10 bg-black/10 p-1">
            <button
              type="button"
              onClick={() => setWorkspaceMode('guided')}
              className={`min-h-10 rounded-md text-sm font-black ${mode === 'guided' ? 'bg-white/20 text-white' : 'text-slate-400 hover:bg-white/10'}`}
            >
              Guided
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceMode('quick')}
              className={`min-h-10 rounded-md text-sm font-black ${mode === 'quick' ? 'bg-white/20 text-white' : 'text-slate-400 hover:bg-white/10'}`}
            >
              Quick
            </button>
          </div>

          {model.summary.unresolvedConditionalItems > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/25 bg-amber-500/10 px-2.5 py-2 text-xs font-bold text-amber-200">
              <AlertCircle size={14} className="mt-0.5 shrink-0" />
              <span>{model.summary.unresolvedConditionalItems} conditional step needs more context before it can be treated as complete.</span>
            </div>
          )}

          {/* Phase accordion */}
          <div className="space-y-2">
            {phases.map((phase, phaseIndex) => {
              const isExpanded = expandedPhases.has(phase.label);
              return (
                <div key={phase.label} className="rounded-xl border border-white/10 bg-black/10">
                  {/* Phase header */}
                  <button
                    type="button"
                    onClick={() => togglePhase(phase.label)}
                    className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <p className="text-sm font-black text-slate-200">{phase.label}</p>
                        {phase.hasCurrentStep && (
                          <span className="rounded-full border border-blue-500/30 bg-blue-500/15 px-1.5 py-0.5 text-xs font-black uppercase text-blue-300">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs font-bold text-slate-500">
                        {phase.completedCount} / {phase.totalCount} complete
                        {phase.missingCount > 0 ? ` · ${phase.missingCount} required item${phase.missingCount === 1 ? '' : 's'} missing` : ''}
                      </p>
                    </div>
                    <div className="shrink-0">
                      {isExpanded ? <ChevronDown size={16} className="text-slate-400" /> : <ChevronRight size={16} className="text-slate-400" />}
                    </div>
                  </button>

                  {/* Phase steps */}
                  {isExpanded && (
                    <div className="px-2 pb-2 space-y-2">
                      {phase.steps
                        .filter(step => mode === 'guided' || step.applicable || step.missingBlockingRequirements.length > 0)
                        .map((step, stepIdx) => renderStepCard(step, phaseIndex * 100 + stepIdx))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
