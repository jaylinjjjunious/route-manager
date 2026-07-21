import type { AssistantTool } from '../assistantTypes';

export function createWeatherTools(
  getWeatherWind: () => string,
  getTerrain: () => string
): AssistantTool[] {
  const getWeatherContextTool: AssistantTool = {
    name: 'get_weather_context',
    description: 'Get current weather/wind and terrain settings that affect battery and travel.',
    permission: 'read',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async () => {
      const wind = getWeatherWind();
      const terrain = getTerrain();
      const windLabels: Record<string, string> = {
        none: 'Calm or light wind',
        tailwind: 'Tailwind (favorable)',
        headwind_light: 'Light headwind',
        headwind_strong: 'Strong headwind'
      };
      const terrainLabels: Record<string, string> = {
        flat: 'Flat terrain',
        rolling: 'Rolling hills',
        hilly: 'Steep slopes'
      };

      return {
        success: true,
        output: [
          `Wind: ${windLabels[wind] || 'Unknown'}`,
          `Terrain: ${terrainLabels[terrain] || 'Unknown'}`
        ].join('\n')
      };
    }
  };

  return [getWeatherContextTool];
}
