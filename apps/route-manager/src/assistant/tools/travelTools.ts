import type { AssistantTool } from '../assistantTypes';

export function createTravelTools(
  getCurrentBattery: () => number,
  getWeatherWind: () => string,
  getTerrain: () => string,
  getTotalRouteTime: () => number,
  getEstimatedRange: () => number
): AssistantTool[] {
  const getTravelRecommendationTool: AssistantTool = {
    name: 'get_travel_recommendation',
    description: 'Get a recommendation on whether to bike, take the bus, or mix travel modes based on battery, weather, terrain, and route context.',
    permission: 'read',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async () => {
      const battery = getCurrentBattery();
      const wind = getWeatherWind();
      const terrain = getTerrain();
      const routeTime = getTotalRouteTime();
      const range = getEstimatedRange();

      const hasStrongWind = wind === 'headwind_strong';
      const hasHills = terrain === 'hilly';
      const lowBattery = battery <= 30;
      const veryLowBattery = battery <= 15;
      const rangeLimited = range < routeTime / 60 * 18;

      const factors: string[] = [];
      if (hasStrongWind) factors.push('strong headwind');
      if (hasHills) factors.push('hilly terrain');
      if (lowBattery) factors.push(`low battery (${battery}%)`);
      if (rangeLimited) factors.push('range may be insufficient for the full route');

      let recommendation: string;
      if (veryLowBattery) {
        recommendation = 'Charge your battery before riding, or take the bus today.';
      } else if (hasStrongWind && lowBattery) {
        recommendation = 'Consider taking the bus or mixing travel modes. The strong headwind combined with low battery makes biking risky.';
      } else if (hasHills && lowBattery) {
        recommendation = 'Rolling hills will drain battery faster. Consider the bus or charge before heading out.';
      } else if (hasStrongWind) {
        recommendation = 'Biking is possible but the strong headwind will reduce range significantly. Use a higher PAS level or consider the bus for longer legs.';
      } else if (lowBattery) {
        recommendation = 'Battery is getting low. Stick to shorter trips and keep PAS low if biking.';
      } else {
        recommendation = 'Conditions look good for biking today.';
      }

      const lines = [
        `Battery: ${battery}% (est. range ${range} mi)`,
        `Route time remaining: ${Math.round(routeTime)} min`,
        ...(factors.length ? ['', 'Risk factors:', ...factors.map(f => `  - ${f}`)] : []),
        '',
        `Recommendation: ${recommendation}`
      ];

      return {
        success: true,
        output: lines.join('\n')
      };
    }
  };

  return [getTravelRecommendationTool];
}
