import type { AssistantTool } from '../assistantTypes';

export function createDebugTools(
  getOnlineStatus: () => boolean,
  getCurrentTab: () => string
): AssistantTool[] {
  const runHealthCheckTool: AssistantTool = {
    name: 'run_health_check',
    description: 'Run a safe application health check. Checks online status, page state, and basic connectivity.',
    permission: 'read',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async () => {
      const online = getOnlineStatus();
      const tab = getCurrentTab();

      const checks: { name: string; status: 'ok' | 'warn' | 'error'; detail: string }[] = [];

      checks.push({
        name: 'Internet Connectivity',
        status: online ? 'ok' : 'error',
        detail: online ? 'Online' : 'Offline — some features may not work'
      });

      checks.push({
        name: 'Current Page',
        status: 'ok',
        detail: `Viewing "${tab}"`
      });

      checks.push({
        name: 'Local Storage',
        status: typeof localStorage !== 'undefined' ? 'ok' : 'error',
        detail: typeof localStorage !== 'undefined' ? 'Available' : 'Not available'
      });

      try {
        const response = await fetch('/api/health', { method: 'HEAD', signal: AbortSignal.timeout(5000) });
        checks.push({
          name: 'Server Reachability',
          status: response.ok ? 'ok' : 'warn',
          detail: response.ok ? 'Server responded' : `Server returned ${response.status}`
        });
      } catch {
        checks.push({
          name: 'Server Reachability',
          status: 'warn',
          detail: 'Could not reach server — may be starting up'
        });
      }

      const allOk = checks.every(c => c.status === 'ok');
      const lines = [
        allOk ? 'All systems operational.' : 'Some systems need attention.',
        '',
        'Health Check Results:'
      ];
      checks.forEach(c => {
        const icon = c.status === 'ok' ? 'OK' : c.status === 'warn' ? '~' : '!!';
        lines.push(`  ${icon} ${c.name}: ${c.detail}`);
      });
      lines.push('', 'This is a basic connectivity check. No private data is transmitted.');

      return {
        success: true,
        output: lines.join('\n')
      };
    }
  };

  return [runHealthCheckTool];
}
