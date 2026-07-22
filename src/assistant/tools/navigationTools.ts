import type { AssistantTool } from '../assistantTypes';

const VALID_TABS = ['dashboard', 'jobs', 'battery', 'tracker', 'habits', 'settings'];

export function createNavigationTools(onNavigate: (tab: string) => void): AssistantTool[] {
  const navigateTool: AssistantTool = {
    name: 'navigate',
    description: "Navigate to a specific app page. Valid pages: dashboard, jobs, battery, tracker, habits, settings. Route requests open Dashboard and focus Today's Route when possible.",
    permission: 'navigate',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        page: { type: 'string', description: 'The page/tab to navigate to' }
      },
      required: ['page']
    },
    execute: async (input: Record<string, unknown>) => {
      const page = String(input.page || '').toLowerCase();
      if (page === 'route' || page === 'routes') {
        onNavigate('dashboard');
        window.setTimeout(() => {
          document.getElementById('bento-tile-todays-route')?.scrollIntoView({
            behavior: 'smooth',
            block: 'start'
          });
        }, 0);
        return {
          success: true,
          output: 'Opened Dashboard and focused Today\'s Route.'
        };
      }
      if (!VALID_TABS.includes(page)) {
        return {
          success: false,
          output: `"${page}" is not a valid page. Try: ${VALID_TABS.join(', ')}.`
        };
      }
      onNavigate(page);
      return {
        success: true,
        output: `Navigated to ${page}.`
      };
    }
  };

  const getCurrentPageTool: AssistantTool = {
    name: 'get_current_page',
    description: 'Get the current page the user is viewing.',
    permission: 'read',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async () => {
      return {
        success: true,
        output: ''  // Context provides the current page
      };
    }
  };

  return [navigateTool, getCurrentPageTool];
}
