import type { AssistantTool } from '../assistantTypes';

export function createProofTools(
  onOpenProofHistory: () => void
): AssistantTool[] {
  const openProofHistoryTool: AssistantTool = {
    name: 'open_proof_history',
    description: 'Open the Proof History / Proof Vault to view saved proof images.',
    permission: 'navigate',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async () => {
      onOpenProofHistory();
      return {
        success: true,
        output: 'Opened Proof History.'
      };
    }
  };

  return [openProofHistoryTool];
}
