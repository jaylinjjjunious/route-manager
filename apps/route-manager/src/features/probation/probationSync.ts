import type { ProbationCheckInRecord } from './useProbationCheckIn';
import type { ProbationCheckInRecord as ServerRecord } from '../../services/apiClient';
export function fromServer(r: ServerRecord): ProbationCheckInRecord {
  return { monthKey: r.month_key, device: r.device, startedAt: r.started_at || undefined,
    completedAt: r.completed_at || undefined, verificationLevel: r.verification_level || undefined,
    proofName: r.proof_name || undefined, proofDataUrl: r.proof_data_url || undefined,
    providerReceiptId: r.provider_receipt_id || undefined, confirmationUrl: r.confirmation_url || undefined,
    confirmationMessageId: r.confirmation_message_id || undefined, events: r.events || [],
    serverUpdatedAt: r.updated_at, serverSynced: true };
}
export function payload(r: ProbationCheckInRecord) {
  const { serverSynced, serverUpdatedAt, ...value } = r;
  // A client cannot assert independently verified provider completion.
  return { ...value, verificationLevel: r.completedAt ? (r.proofDataUrl ? 'screenshot_documented' : 'self_confirmed') : undefined };
}
export function fingerprint(r: ProbationCheckInRecord) { return JSON.stringify(payload(r)); }
export function mergeRecord(local: ProbationCheckInRecord | undefined, remote: ProbationCheckInRecord): ProbationCheckInRecord {
  if (!local || local.serverSynced) return remote;
  const events = [...new Map([...remote.events, ...local.events].map(e => [JSON.stringify(e), e])).values()].sort((a,b) => a.at.localeCompare(b.at));
  const proofAt = (r: ProbationCheckInRecord) => r.events.filter(e => e.type === 'proof_attached').at(-1)?.at || '';
  const proof = local.proofDataUrl && (!remote.proofDataUrl || proofAt(local) >= proofAt(remote)) ? local : remote;
  const completedAt = remote.completedAt || local.completedAt;
  return { ...remote, ...local, startedAt: remote.startedAt || local.startedAt, completedAt,
    proofName: proof.proofName, proofDataUrl: proof.proofDataUrl,
    verificationLevel: remote.verificationLevel === 'provider_verified' ? 'provider_verified' : completedAt ? (proof.proofDataUrl ? 'screenshot_documented' : 'self_confirmed') : undefined,
    events, serverSynced: false, serverUpdatedAt: remote.serverUpdatedAt };
}
