import type { AssistantTool } from '../assistantTypes';
import type { EbikeConfig } from '../../types';

export function createBatteryTools(
  getCurrentBattery: () => number,
  getEbikeConfig: () => EbikeConfig,
  getEstimatedRange: () => number
): AssistantTool[] {
  const getBatteryStatusTool: AssistantTool = {
    name: 'get_battery_status',
    description: 'Get current battery level and estimated range.',
    permission: 'read',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async () => {
      const battery = getCurrentBattery();
      const range = getEstimatedRange();
      const warning = battery <= 15
        ? 'WARNING: Battery critically low. Charge before continuing.'
        : battery <= 25
          ? 'CAUTION: Battery is low. Consider charging soon.'
          : 'Battery level is adequate.';

      return {
        success: true,
        output: [
          `Current battery: ${battery}%`,
          `Estimated range: ${range} miles`,
          warning
        ].join('\n')
      };
    }
  };

  return [getBatteryStatusTool];
}
