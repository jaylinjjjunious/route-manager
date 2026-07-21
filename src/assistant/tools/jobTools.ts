import type { AssistantTool } from '../assistantTypes';
import type { Job } from '../../types';
import { isJobCompleted } from '../../utils/jobState';

export function createJobTools(
  getJobs: () => Job[],
  getRouteAJobs: () => Job[],
  getCurrentStopName: () => string | null,
  onNavigate: (tab: string) => void
): AssistantTool[] {
  const getJobListTool: AssistantTool = {
    name: 'get_job_list',
    description: 'Get the list of all jobs and their statuses.',
    permission: 'read',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async () => {
      const jobs = getJobs();
      const completed = jobs.filter(j => isJobCompleted(j));
      const pending = jobs.filter(j => !isJobCompleted(j));
      const lines = [
        `Total jobs: ${jobs.length}`,
        `Completed: ${completed.length}`,
        `Pending: ${pending.length}`,
        '',
        'Pending jobs:'
      ];
      pending.forEach((job, i) => {
        const routeLabel = job.routeId === 'A' ? 'Active' : 'Standby';
        lines.push(`${i + 1}. ${job.storeName} — ${job.address} (${job.jobType}, $${job.pay}, ${routeLabel})`);
      });
      return {
        success: true,
        output: lines.join('\n')
      };
    }
  };

  const getNextJobTool: AssistantTool = {
    name: 'get_next_job',
    description: 'Get the next job/stop the user should visit.',
    permission: 'read',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async () => {
      const routeA = getRouteAJobs();
      const next = routeA.find(j => !isJobCompleted(j));
      if (!next) {
        return {
          success: true,
          output: 'No pending jobs on the active route.'
        };
      }
      return {
        success: true,
        output: `Next stop: ${next.storeName} at ${next.address}. Pay: $${next.pay}. Estimated time: ${next.estimatedMinutes} minutes.`
      };
    }
  };

  const getJobDetailTool: AssistantTool = {
    name: 'get_job_detail',
    description: 'Get detailed information about a specific job by store name or address.',
    permission: 'read',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Store name or address to search for' }
      },
      required: ['query']
    },
    execute: async (input: Record<string, unknown>) => {
      const query = String(input.query || '').toLowerCase();
      const jobs = getJobs();
      const match = jobs.find(j =>
        j.storeName.toLowerCase().includes(query) ||
        j.address.toLowerCase().includes(query)
      );
      if (!match) {
        return {
          success: false,
          output: `No job found matching "${input.query}".`
        };
      }
      const status = isJobCompleted(match) ? 'Completed' : match.status;
      return {
        success: true,
        output: [
          `Store: ${match.storeName}`,
          `Address: ${match.address}`,
          `Status: ${status}`,
          `Pay: $${match.pay}`,
          `Type: ${match.jobType}`,
          `Est. time: ${match.estimatedMinutes} min`,
          `Due: ${match.dueTime}`,
          `Route: ${match.routeId === 'A' ? 'Active' : 'Standby'}`,
          match.notes ? `Notes: ${match.notes}` : ''
        ].filter(Boolean).join('\n')
      };
    }
  };

  const openJobsPageTool: AssistantTool = {
    name: 'open_jobs_page',
    description: 'Navigate to the Jobs management page.',
    permission: 'navigate',
    requiresConfirmation: false,
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    },
    execute: async () => {
      onNavigate('jobs');
      return {
        success: true,
        output: 'Opened the Jobs page.'
      };
    }
  };

  return [getJobListTool, getNextJobTool, getJobDetailTool, openJobsPageTool];
}
