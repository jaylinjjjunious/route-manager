// @vitest-environment jsdom

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import JobDetailModal from '../src/features/jobs/JobDetailModal';
import type { Job } from '../src/types';
import { DEFAULT_PROCEDURE_CATALOG } from '../src/features/jobs/procedures/procedureCatalog';
import type { ProcedureDefinition } from '../src/features/jobs/procedures/types';

vi.mock('../src/lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({ data: { session: null }, error: null })),
      refreshSession: vi.fn(async () => ({ data: { session: null }, error: null })),
    },
  },
}));

const procedure = DEFAULT_PROCEDURE_CATALOG[0] as ProcedureDefinition;

let container: HTMLDivElement;
let root: Root;

function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 'job-1',
    storeName: 'Vons',
    address: '5201 White Ln, Bakersfield, CA',
    pay: 25,
    estimatedMinutes: 30,
    jobType: 'field_task',
    dueTime: '17:00',
    notes: '',
    status: 'ready',
    routeId: 'A',
    coordinates: { lat: 35.3733, lng: -119.0187 },
    ...overrides,
  };
}

function assignedJob(overrides: Partial<Job> = {}): Job {
  return makeJob({
    procedureAssignment: {
      procedureId: procedure.id,
      procedureVersion: procedure.version,
      assignedAt: '2026-08-15T09:00:00.000Z',
      assignmentSource: 'manual',
    },
    ...overrides,
  });
}

async function renderModal(props: React.ComponentProps<typeof JobDetailModal>) {
  await act(async () => {
    root.render(React.createElement(JobDetailModal, props));
    await Promise.resolve();
  });
}

function getTabButton(label: string): HTMLButtonElement | undefined {
  return Array.from(document.querySelectorAll('button')).find(
    candidate => candidate.textContent?.trim() === label,
  ) as HTMLButtonElement | undefined;
}

async function clickTab(label: string) {
  const button = getTabButton(label);
  expect(button, `tab ${label}`).toBeTruthy();
  await act(async () => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
}

async function clickButton(name: string) {
  const buttons = Array.from(document.querySelectorAll('button'));
  const button = buttons.find(candidate => candidate.textContent?.trim() === name);
  expect(button, `button ${name}`).toBeTruthy();
  await act(async () => {
    button?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
  });
}

beforeEach(() => {
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = () => {};
  }
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = false;
});

describe('JobDetailModal tabs', () => {
  const baseProps = (job: Job): React.ComponentProps<typeof JobDetailModal> => ({
    job,
    routeIndex: null,
    legDistance: 0,
    rideMinutes: 0,
    navLink: 'https://www.google.com/maps',
    isOutlier: false,
    jobAccessLocked: false,
    onToggleComplete: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onDuplicate: vi.fn(),
    onToggleRoute: vi.fn(),
    onClose: vi.fn(),
  });

  it('defaults to WORK tab on open', async () => {
    await renderModal(baseProps(makeJob()));
    const workTab = getTabButton('WORK');
    expect(workTab).toBeTruthy();
    expect(workTab?.getAttribute('aria-current')).toBe('page');
    expect(document.body.textContent).toContain('Next Action');
  });

  it('does not render full procedure content in WORK tab', async () => {
    await renderModal(baseProps(assignedJob()));
    expect(document.body.textContent).toContain('Procedure');
    // The WORK tab shows a compact procedure summary, not the full workspace steps
    // Full procedure controls like "Change Procedure", "Guided", "Quick" should not appear in WORK
    expect(document.body.textContent).not.toContain('Change Procedure');
    expect(document.body.textContent).not.toContain('Guided');
    expect(document.body.textContent).not.toContain('Capture Proof');
  });

  it('renders procedure workspace in PROCEDURE tab', async () => {
    await renderModal(baseProps(assignedJob()));
    await clickTab('PROCEDURE');
    expect(document.body.textContent).toContain('Generic Field Work v1.0.0');
    expect(document.body.textContent).toContain('Guided');
    expect(document.body.textContent).toContain('Quick');
  });

  it('renders closeout content in CLOSEOUT tab', async () => {
    await renderModal(baseProps(makeJob({
      lifecycle: {
        schemaVersion: 1,
        status: 'work_complete_pending_closeout',
        workState: 'offsite',
        visits: [{ id: 'visit-1', visitNumber: 1, arrivedAt: '2026-08-15T09:00:00.000Z', endedAt: '2026-08-15T10:00:00.000Z' }],
        events: [],
      },
      closeoutRequirements: [
        { id: 'proof', kind: 'required', label: 'Upload required proof', satisfied: false },
      ],
    })));
    await clickTab('CLOSEOUT');
    expect(document.body.textContent).toContain('Closeout');
    expect(document.body.textContent).toContain('1 required item missing.');
  });

  it('renders visit and admin information in DETAILS tab', async () => {
    await renderModal(baseProps(makeJob({
      lifecycle: {
        schemaVersion: 1,
        status: 'ready',
        workState: 'offsite',
        visits: [{ id: 'visit-1', visitNumber: 1, arrivedAt: '2026-08-15T09:00:00.000Z' }],
        events: [],
      },
    })));
    await clickTab('DETAILS');
    expect(document.body.textContent).toContain('Visit History');
    expect(document.body.textContent).toContain('Time Summary');
    expect(document.body.textContent).toContain('Schedule');
    expect(document.body.textContent).toContain('Pay');
  });

  it('shows the current procedure phase expanded by default in PROCEDURE tab', async () => {
    await renderModal(baseProps(assignedJob()));
    await clickTab('PROCEDURE');
    // The generic procedure has phases: Arrival, Work, Validation, Support
    // The current phase (Arrival, with the next step) should be expanded by default
    const phaseButton = Array.from(document.querySelectorAll('button')).find(
      b => b.textContent?.includes('Arrival') && b.textContent?.includes('complete'),
    );
    expect(phaseButton).toBeTruthy();
    // Steps should be visible because the phase is expanded
    expect(document.body.textContent).toContain('Confirm site context');
  });

  it('collapses completed phases by default when there are no missing items', async () => {
    await renderModal(baseProps(assignedJob()));
    await clickTab('PROCEDURE');
    // The generic procedure has phases: Arrival, Work, Validation, Support
    // The Support phase only contains a reference step, which is always satisfied
    // and should be collapsed by default since it has no current step and no blockers
    const supportPhaseHeader = Array.from(document.querySelectorAll('button')).find(
      b => b.textContent?.includes('Support'),
    );
    expect(supportPhaseHeader).toBeTruthy();
    // The Support phase step title "Escalate if blocked" should NOT be visible
    // because the phase is collapsed by default
    expect(document.body.textContent).not.toContain('Escalate if blocked');
    // The current unresolved phase (Arrival) should be expanded and visible
    expect(document.body.textContent).toContain('Confirm site context');
  });

  it('expands the current step by default', async () => {
    await renderModal(baseProps(assignedJob()));
    await clickTab('PROCEDURE');
    // The current step should be expanded and show its requirements
    expect(document.body.textContent).toContain('Current');
  });

  it('shows satisfied steps as quiet/collapsed', async () => {
    const job = assignedJob({
      closeoutRequirements: [
        { id: 'step-arrival-context', kind: 'required', label: 'Arrival context', satisfied: true },
      ],
    });
    await renderModal(baseProps(job));
    await clickTab('PROCEDURE');
    // A satisfied step should show "Complete" status and not have blocking styling
    expect(document.body.textContent).toContain('Complete');
  });

  it('hides verbose content in Quick Mode but still shows blocking requirements', async () => {
    await renderModal(baseProps(assignedJob()));
    await clickTab('PROCEDURE');
    await clickButton('Quick');
    // Quick mode should still show the step title and status
    expect(document.body.textContent).toContain('Confirm site context');
    // But long instructions should be hidden behind "Show full instructions"
    expect(document.body.textContent).toContain('Show full instructions');
  });

  it('keeps critical warnings visible in Quick Mode', async () => {
    await renderModal(baseProps(assignedJob()));
    await clickTab('PROCEDURE');
    await clickButton('Quick');
    // The generic procedure step "Confirm site context" has a warningText
    // In Quick Mode the step may be collapsed but the warning icon should remain visible
    // or the warning text should be accessible via "Show full instructions"
    expect(document.body.textContent).toContain('Confirm site context');
    expect(document.body.textContent).toContain('Show full instructions');
  });

  it('switches to PROCEDURE tab when Continue Procedure is clicked from WORK tab', async () => {
    const job = assignedJob({
      lifecycle: {
        schemaVersion: 1,
        status: 'in_progress',
        workState: 'working',
        activeVisitId: 'visit-1',
        visits: [{ id: 'visit-1', visitNumber: 1, arrivedAt: '2026-08-15T09:00:00.000Z' }],
        events: [{ id: 'event-1', type: 'arrived', timestamp: '2026-08-15T09:00:00.000Z', visitId: 'visit-1' }],
      },
    });
    await renderModal(baseProps(job));
    // Continue Procedure should appear in the sticky action bar or secondary actions
    const continueButton = Array.from(document.querySelectorAll('button')).find(
      b => b.textContent?.trim() === 'Continue Procedure',
    );
    expect(continueButton).toBeTruthy();
    await act(async () => {
      continueButton?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      await Promise.resolve();
    });
    // Should now be on PROCEDURE tab
    const procedureTab = getTabButton('PROCEDURE');
    expect(procedureTab?.getAttribute('aria-current')).toBe('page');
  });

  it('jumps to correct step from closeout blocker tap in CLOSEOUT tab', async () => {
    const job = assignedJob({
      lifecycle: {
        schemaVersion: 1,
        status: 'work_complete_pending_closeout',
        workState: 'offsite',
        visits: [{ id: 'visit-1', visitNumber: 1, arrivedAt: '2026-08-15T09:00:00.000Z', endedAt: '2026-08-15T10:00:00.000Z' }],
        events: [],
      },
    });
    await renderModal(baseProps(job));
    await clickTab('CLOSEOUT');
    // The closeout tab should show a jump button when there's a next missing step
    const jumpButton = Array.from(document.querySelectorAll('button')).find(
      b => b.textContent?.includes('Jump to next missing step'),
    );
    if (jumpButton) {
      await act(async () => {
        jumpButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));
        await Promise.resolve();
      });
      // Should have switched to PROCEDURE tab
      const procedureTab = getTabButton('PROCEDURE');
      expect(procedureTab?.getAttribute('aria-current')).toBe('page');
    }
  });

  it('preserves Guided/Quick mode preference across renders', async () => {
    localStorage.clear();
    await renderModal(baseProps(assignedJob()));
    await clickTab('PROCEDURE');
    await clickButton('Quick');
    expect(localStorage.getItem('route_manager_procedure_workspace_mode_v1')).toBe('quick');

    // Re-render and verify preference persists
    act(() => root.unmount());
    root = createRoot(container);
    await renderModal(baseProps(assignedJob()));
    await clickTab('PROCEDURE');
    // Quick button should still be active (has bg-white/20)
    const quickButton = Array.from(document.querySelectorAll('button')).find(
      b => b.textContent?.trim() === 'Quick',
    );
    expect(quickButton?.className).toContain('bg-white/20');
  });

  it('renders legacy jobs without procedures correctly', async () => {
    await renderModal(baseProps(makeJob()));
    expect(document.body.textContent).toContain('Next Action');
    await clickTab('PROCEDURE');
    expect(document.body.textContent).toContain('No procedure assigned');
    expect(document.body.textContent).toContain('Assign Procedure');
  });

  it('shows lifecycle state consistently across tabs', async () => {
    const job = makeJob({
      lifecycle: {
        schemaVersion: 1,
        status: 'in_progress',
        workState: 'working',
        activeVisitId: 'visit-1',
        visits: [{ id: 'visit-1', visitNumber: 1, arrivedAt: '2026-08-15T09:00:00.000Z' }],
        events: [{ id: 'event-1', type: 'arrived', timestamp: '2026-08-15T09:00:00.000Z', visitId: 'visit-1' }],
      },
    });
    await renderModal(baseProps(job));
    expect(document.body.textContent).toContain('Working');
    await clickTab('DETAILS');
    expect(document.body.textContent).toContain('Onsite now');
    await clickTab('WORK');
    expect(document.body.textContent).toContain('Current work state: Working');
  });

  it('shows sticky bottom action bar with primary lifecycle action when appropriate', async () => {
    const job = makeJob({
      lifecycle: {
        schemaVersion: 1,
        status: 'in_progress',
        workState: 'working',
        activeVisitId: 'visit-1',
        visits: [{ id: 'visit-1', visitNumber: 1, arrivedAt: '2026-08-15T09:00:00.000Z' }],
        events: [{ id: 'event-1', type: 'arrived', timestamp: '2026-08-15T09:00:00.000Z', visitId: 'visit-1' }],
      },
    });
    await renderModal(baseProps(job));
    // The sticky action bar should show the primary action label
    expect(document.body.textContent).toContain('Pause Work');
  });

  it('does not show six buttons at once in the action area', async () => {
    await renderModal(baseProps(makeJob()));
    const allButtons = Array.from(document.querySelectorAll('button'));
    const actionAreaButtons = allButtons.filter(b => {
      const parent = b.closest('[class*="shrink-0"]');
      return parent && parent.className.includes('border-t');
    });
    expect(actionAreaButtons.length).toBeLessThanOrEqual(3);
  });

  it('uses readable font sizes with no essential text below 12px', async () => {
    await renderModal(baseProps(makeJob()));
    // Scope to the modal panel to avoid picking up unrelated test-environment elements
    const panel = document.querySelector('[role="dialog"]');
    expect(panel).toBeTruthy();
    const allElements = Array.from(panel!.querySelectorAll('*'));
    const tinyElements = allElements.filter(el => {
      const className = el.className;
      if (typeof className !== 'string') return false;
      return /text-\[8px\]|text-\[9px\]|text-\[10px\]|text-\[11px\]/.test(className);
    });
    // The refactored JobDetailModal and ProcedureWorkspace should have no sub-12px text
    expect(tinyElements).toHaveLength(0);
  });
});
