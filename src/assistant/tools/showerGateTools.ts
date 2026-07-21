import type { AssistantTool } from '../assistantTypes';

export function createShowerGateTools(
  getIsUnlocked: () => boolean,
  onNavigate: (tab: string) => void
): AssistantTool[] {
  const getShowerStatusTool: AssistantTool = {
    name: 'get_shower_gate_status',
    description: 'Get the current Shower Gate verification status. Tells you if the user has verified today.',
    permission: 'read',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async () => {
      const unlocked = getIsUnlocked();
      return {
        success: true,
        output: unlocked
          ? 'Shower Gate is verified for today. All pages are accessible.'
          : 'Shower Gate is not yet verified today. Some pages are locked.'
      };
    }
  };

  const navigateShowerGateTool: AssistantTool = {
    name: 'open_shower_gate',
    description: 'Navigate the user to the Shower Gate verification panel on the dashboard.',
    permission: 'navigate',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async () => {
      onNavigate('dashboard');
      return {
        success: true,
        output: 'Opened the dashboard where Shower Gate verification is available.'
      };
    }
  };

  return [getShowerStatusTool, navigateShowerGateTool];
}
