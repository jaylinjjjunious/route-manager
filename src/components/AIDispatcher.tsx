/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowRightLeft,
  Battery,
  CheckCircle2,
  CheckSquare,
  ListChecks,
  Navigation,
  RotateCcw,
  Send,
  Sparkles,
  Undo2
} from 'lucide-react';
import { Job, RouteMetrics, EbikeConfig, DispatcherAction, ChatMessage } from '../types';
import { BAKERSFIELD_COORDINATES, getDistanceInMiles } from '../utils/routeUtils';

interface AIDispatcherProps {
  jobs: Job[];
  routeAJobs: Job[];
  routeBJobs: Job[];
  activeMetrics: RouteMetrics;
  ebikeConfig: EbikeConfig;
  outlierIds: string[];
  onOptimizeRoute: () => void;
  onMoveJobRoute: (jobId: string, routeId: 'A' | 'B') => void;
  onAddJobClick: () => void;
  onResetSeeds: () => void;
  lastOptimizationLog?: {
    why: string;
    minutesSaved: number;
    batteryDifference: number;
    earningsDifference: number;
    timestamp: string;
  } | null;
  isOptimizing?: boolean;
  onExecuteAction?: (action: DispatcherAction) => string | null;
  onUndoAction?: () => boolean;
  canUndo?: boolean;
  currentBattery?: number;
}

type DispatcherResult = {
  response: string;
  action?: DispatcherAction;
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export default function AIDispatcher({
  jobs,
  routeAJobs,
  activeMetrics,
  ebikeConfig,
  onOptimizeRoute,
  onResetSeeds,
  isOptimizing = false,
  onExecuteAction,
  onUndoAction,
  canUndo = false,
  currentBattery = 100
}: AIDispatcherProps) {
  const [command, setCommand] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem('dispatcher_chat_messages');
      if (saved) return JSON.parse(saved);
    } catch {}

    return [
      {
        id: 'dispatcher-v1-initial',
        sender: 'assistant',
        text: 'Operations ready. Ask what is next, complete a job, move a job, count jobs left, or re-optimize.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ];
  });

  const isJobDone = (job: Job) => job.status === 'completed' || job.isCompleted;
  const remainingJobs = useMemo(() => routeAJobs.filter(job => !isJobDone(job)), [routeAJobs]);
  const currentStop = remainingJobs[0] || null;
  const projectedBatteryAfterRoute = Math.max(0, Math.round(currentBattery - activeMetrics.estimatedBatteryUsage));
  const batteryEstimate =
    projectedBatteryAfterRoute >= 25 ? 'Good' : projectedBatteryAfterRoute >= 15 ? 'Watch' : 'Charge before finishing';

  useEffect(() => {
    localStorage.setItem('dispatcher_chat_messages', JSON.stringify(messages));
  }, [messages]);

  const findJob = (target: string) => {
    const cleaned = normalize(target);
    if (!cleaned || cleaned === 'this' || cleaned === 'this job' || cleaned === 'current' || cleaned === 'current stop') {
      return currentStop;
    }

    return jobs.find(job => {
      const haystack = normalize(`${job.storeName} ${job.address}`);
      return haystack.includes(cleaned) || cleaned.includes(normalize(job.storeName));
    }) || null;
  };

  const getNextLeg = (pendingOverride = remainingJobs) => {
    const nextStop = pendingOverride[0] || null;
    if (!nextStop) {
      return { nextStop: null, minutesAway: 0 };
    }

    const routeIndex = routeAJobs.findIndex(job => job.id === nextStop.id);
    const origin = routeIndex <= 0
      ? BAKERSFIELD_COORDINATES['1951 Golden State Ave']
      : routeAJobs[routeIndex - 1].coordinates;
    const distance = getDistanceInMiles(origin, nextStop.coordinates);
    const minutesAway = Math.max(1, Math.round((distance / ebikeConfig.avgSpeedMph) * 60));

    return { nextStop, minutesAway };
  };

  const statusReadback = (pendingOverride = remainingJobs) => {
    const { nextStop, minutesAway } = getNextLeg(pendingOverride);

    if (!nextStop) {
      return [
        'Next stop:',
        'Route clear.',
        '',
        'Jobs remaining: 0',
        `Battery estimate: ${batteryEstimate}`
      ].join('\n');
    }

    return [
      'Next stop:',
      nextStop.storeName,
      `${minutesAway} minutes away.`,
      '',
      `Jobs remaining: ${pendingOverride.length}`,
      `Battery estimate: ${batteryEstimate}`
    ].join('\n');
  };

  const cleanTarget = (input: string, verbs: string[]) => {
    let target = normalize(input);
    verbs.forEach(verb => {
      target = target.replace(new RegExp(`\\b${verb}\\b`, 'g'), ' ');
    });
    return target
      .replace(/\b(i|have|has|the|job|stop|at|to|route|b|standby|please|just|now|this)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const buildCanFinishResponse = () => {
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(20, 0, 0, 0);
    const minutesLeft = Math.max(0, Math.round((endOfDay.getTime() - now.getTime()) / 60000));
    const buffer = minutesLeft - activeMetrics.totalTime;
    const canFinish = buffer >= 20 && projectedBatteryAfterRoute >= 15;

    return [
      canFinish ? 'Yes. You can finish today.' : 'Risk check: today is tight.',
      '',
      `Route time remaining: ${Math.round(activeMetrics.totalTime)} minutes`,
      `Daylight/work window left: ${minutesLeft} minutes`,
      `Battery estimate: ${batteryEstimate}`,
      '',
      statusReadback()
    ].join('\n');
  };

  const interpretCommand = (rawInput: string): DispatcherResult => {
    const input = normalize(rawInput);

    if (!input) {
      return { response: statusReadback() };
    }

    if (input.includes('how many') || input.includes('jobs left') || input.includes('remaining')) {
      return {
        response: [
          `Jobs remaining: ${remainingJobs.length}`,
          '',
          statusReadback()
        ].join('\n')
      };
    }

    if (input.includes('can i finish') || input.includes('finish today') || input.includes('done today')) {
      return { response: buildCanFinishResponse() };
    }

    if (input.includes('what next') || input.includes('what s next') || input.includes('next stop') || input === 'next') {
      return { response: statusReadback() };
    }

    if (input.includes('re optimize') || input.includes('reoptimize') || input.includes('optimize')) {
      return {
        action: { type: 'REOPTIMIZE_ROUTE' },
        response: [
          'Route re-optimized.',
          '',
          statusReadback()
        ].join('\n')
      };
    }

    if (input.includes('complete') || input.includes('completed') || input.includes('done') || input.includes('finished')) {
      const target = cleanTarget(rawInput, ['complete', 'completed', 'done', 'finished']);
      const job = findJob(target);

      if (!job) {
        return {
          response: [
            'I could not find that job.',
            'Say: "Complete Family Dollar" or "Complete this job."',
            '',
            statusReadback()
          ].join('\n')
        };
      }

      const pendingAfter = remainingJobs.filter(item => item.id !== job.id);
      return {
        action: { type: 'COMPLETE_JOB', jobTarget: job.id },
        response: [
          `${job.storeName} completed.`,
          '',
          statusReadback(pendingAfter)
        ].join('\n')
      };
    }

    if (input.includes('move')) {
      const target = cleanTarget(rawInput, ['move', 'push', 'send', 'shelve']);
      const job = findJob(target);

      if (!job) {
        return {
          response: [
            'I could not find that job to move.',
            'Say: "Move Family Dollar" or "Move this job."',
            '',
            statusReadback()
          ].join('\n')
        };
      }

      const pendingAfter = remainingJobs.filter(item => item.id !== job.id);
      return {
        action: { type: 'MOVE_TO_ROUTE_B', jobTarget: job.id },
        response: [
          `${job.storeName} moved to standby.`,
          '',
          statusReadback(pendingAfter)
        ].join('\n')
      };
    }

    return {
      response: [
        'Operations command not recognized.',
        'Try: "What is next?", "Can I finish today?", "Complete Albertsons", "Move this job", "How many jobs left?", or "Re-optimize."',
        '',
        statusReadback()
      ].join('\n')
    };
  };

  const runCommand = (input: string) => {
    const result = interpretCommand(input);
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMessage: ChatMessage = {
      id: `dispatcher-user-${Date.now()}`,
      sender: 'user',
      text: input,
      timestamp
    };

    if (result.action && onExecuteAction) {
      onExecuteAction(result.action);
    }

    const assistantMessage: ChatMessage = {
      id: `dispatcher-ai-${Date.now()}`,
      sender: 'assistant',
      text: result.response,
      timestamp,
      action: result.action
    };

    setMessages(prev => [...prev, userMessage, assistantMessage]);
    setCommand('');
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!command.trim()) return;
    runCommand(command);
  };

  const handleUndo = () => {
    if (!onUndoAction?.()) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setMessages(prev => [
      ...prev,
      {
        id: `dispatcher-undo-${Date.now()}`,
        sender: 'assistant',
        text: ['Last operation undone.', '', statusReadback()].join('\n'),
        timestamp
      }
    ]);
  };

  const quickCommands = [
    { label: "What's next?", value: "What's next?" },
    { label: 'Can I finish today?', value: 'Can I finish today?' },
    { label: 'Complete this job', value: 'Complete this job' },
    { label: 'Move this job', value: 'Move this job' },
    { label: 'Jobs left', value: 'How many jobs left?' },
    { label: 'Re-optimize', value: 'Re-optimize' }
  ];

  return (
    <div id="ai-dispatcher-panel" className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-blue-700 text-white">
            <Sparkles size={24} />
          </div>
          <div>
            <h3 className="text-2xl font-black uppercase text-slate-950 dark:text-white">AI Dispatcher V1</h3>
            <p className="text-sm font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">
              Operations manager, not chatbot
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`rounded-[8px] px-3 py-2 text-sm font-black uppercase ${
            projectedBatteryAfterRoute >= 25
              ? 'bg-emerald-600 text-white'
              : projectedBatteryAfterRoute >= 15
                ? 'bg-amber-400 text-slate-950'
                : 'bg-rose-600 text-white'
          }`}>
            {batteryEstimate}
          </span>
          <button
            type="button"
            onClick={handleUndo}
            disabled={!canUndo}
            className="flex min-h-10 items-center justify-center gap-2 rounded-[8px] border border-slate-300 px-3 text-sm font-black uppercase text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:text-slate-200 dark:hover:bg-white/10"
          >
            <Undo2 size={16} />
            <span>Undo</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
        <div className="rounded-[8px] bg-slate-950 p-4 text-white">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black uppercase">Current Stop</p>
            <Navigation size={20} />
          </div>
          <p className="mt-3 truncate text-3xl font-black">{currentStop?.storeName || 'Route Clear'}</p>
          <p className="mt-1 truncate text-base font-black text-slate-300">{currentStop?.address || 'No active stop'}</p>
        </div>

        <div className="rounded-[8px] bg-blue-50 p-4 text-blue-950 dark:bg-blue-500/10 dark:text-blue-100">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black uppercase">Jobs Left</p>
            <ListChecks size={20} />
          </div>
          <p className="mt-3 text-5xl font-black leading-none">{remainingJobs.length}</p>
        </div>

        <div className="rounded-[8px] bg-emerald-50 p-4 text-emerald-950 dark:bg-emerald-500/10 dark:text-emerald-100">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black uppercase">Can Finish</p>
            <CheckCircle2 size={20} />
          </div>
          <p className="mt-3 text-3xl font-black">{projectedBatteryAfterRoute >= 15 ? 'Likely' : 'Risk'}</p>
          <p className="mt-1 text-base font-black">{Math.round(activeMetrics.totalTime)} min route</p>
        </div>

        <div className="rounded-[8px] bg-amber-50 p-4 text-amber-950 dark:bg-amber-500/10 dark:text-amber-100">
          <div className="flex items-center justify-between">
            <p className="text-sm font-black uppercase">Battery</p>
            <Battery size={20} />
          </div>
          <p className="mt-3 text-5xl font-black leading-none">{projectedBatteryAfterRoute}%</p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="rounded-[8px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-black/20">
          <div className="mb-3 flex items-center gap-2">
            <CheckSquare size={20} className="text-blue-700 dark:text-blue-300" />
            <h4 className="text-lg font-black uppercase text-slate-950 dark:text-white">Operations Log</h4>
          </div>

          <div className="max-h-[380px] space-y-3 overflow-y-auto pr-1">
            {messages.slice(-8).map(message => (
              <div
                key={message.id}
                className={`rounded-[8px] border-2 p-3 ${
                  message.sender === 'user'
                    ? 'ml-auto max-w-[85%] border-blue-700 bg-blue-700 text-white'
                    : 'mr-auto max-w-[92%] border-slate-200 bg-slate-50 text-slate-950 dark:border-white/10 dark:bg-white/[0.04] dark:text-white'
                }`}
              >
                <p className="whitespace-pre-line text-base font-black leading-snug">{message.text}</p>
                <p className="mt-2 text-xs font-black uppercase opacity-70">{message.timestamp}</p>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-4 flex gap-2 border-t border-slate-200 pt-4 dark:border-white/10">
            <input
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder='Try "I completed Albertsons"'
              className="min-h-14 flex-1 rounded-[8px] border-2 border-slate-300 bg-white px-4 text-lg font-black text-slate-950 outline-none transition focus:border-blue-700 dark:border-white/10 dark:bg-black/30 dark:text-white"
            />
            <button
              type="submit"
              className="flex min-h-14 items-center justify-center gap-2 rounded-[8px] bg-blue-700 px-5 text-base font-black uppercase text-white transition hover:bg-blue-600"
            >
              <Send size={20} />
              <span>Run</span>
            </button>
          </form>
        </div>

        <div className="space-y-3">
          <div className="rounded-[8px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-black/20">
            <h4 className="text-lg font-black uppercase text-slate-950 dark:text-white">Command Buttons</h4>
            <div className="mt-3 grid grid-cols-1 gap-2">
              {quickCommands.map(item => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => runCommand(item.value)}
                  className="min-h-12 rounded-[8px] bg-slate-100 px-3 text-left text-base font-black text-slate-900 transition hover:bg-slate-200 dark:bg-white/10 dark:text-white dark:hover:bg-white/15"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[8px] border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-black/20">
            <div className="flex items-center gap-2">
              <AlertTriangle size={20} className={remainingJobs.length > 0 ? 'text-amber-500' : 'text-emerald-500'} />
              <h4 className="text-lg font-black uppercase text-slate-950 dark:text-white">Dispatcher State</h4>
            </div>
            <p className="mt-3 whitespace-pre-line text-base font-black leading-snug text-slate-700 dark:text-slate-200">
              {statusReadback()}
            </p>
            <button
              type="button"
              onClick={() => {
                onExecuteAction?.({ type: 'REOPTIMIZE_ROUTE' }) || onOptimizeRoute();
              }}
              disabled={isOptimizing}
              className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-slate-950 px-3 text-base font-black uppercase text-white transition hover:bg-slate-800 disabled:opacity-60 dark:bg-white dark:text-slate-950"
            >
              <RotateCcw size={18} />
              <span>{isOptimizing ? 'Optimizing' : 'Re-optimize Now'}</span>
            </button>
            {jobs.length === 0 && (
              <button
                type="button"
                onClick={onResetSeeds}
                className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-[8px] bg-blue-700 px-3 text-base font-black uppercase text-white transition hover:bg-blue-600"
              >
                Load Seed Jobs
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
