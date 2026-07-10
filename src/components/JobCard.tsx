/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Job, JobType, JobStatus } from '../types';
import { Clock, MapPin, CheckSquare, Square, Edit2, Trash2, Copy, ArrowRightLeft, ShieldAlert, Calendar, AlertCircle, Sparkles } from 'lucide-react';

interface JobCardProps {
  key?: string;
  job: Job;
  isOutlier: boolean;
  onToggleComplete: (id: string) => void;
  onEdit: (job: Job) => void;
  onDelete: (id: string) => void;
  onDuplicate: (job: Job) => void;
  onToggleRoute: (id: string) => void;
  onUpdateStatus?: (id: string, updates: Partial<Job>) => void;
}

export default function JobCard({
  job,
  isOutlier,
  onToggleComplete,
  onEdit,
  onDelete,
  onDuplicate,
  onToggleRoute,
  onUpdateStatus
}: JobCardProps) {
  
  const getJobTypeStyle = (type: JobType) => {
    switch (type) {
      case 'retail_audit':
        return 'bg-violet-50 text-violet-700 border-violet-100 dark:bg-violet-950/30 dark:text-violet-400 dark:border-violet-900/30';
      case 'merchandising':
        return 'bg-cyan-50 text-cyan-700 border-cyan-100 dark:bg-cyan-950/30 dark:text-cyan-400 dark:border-cyan-900/30';
      case 'mystery_shop':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/30';
      case 'field_task':
        return 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/30';
    }
  };

  const formatJobType = (type: JobType) => {
    return type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  // Determine color coding category
  let category: 'ready' | 'revisit' | 'outlier' | 'completed' | 'postponed' = 'ready';
  if (job.status === 'completed' || job.isCompleted) {
    category = 'completed';
  } else if (job.status === 'postponed') {
    category = 'postponed';
  } else if (job.routeId === 'B') {
    category = 'postponed';
  } else if (isOutlier || job.status === 'outlier') {
    category = 'outlier';
  } else if (job.status === 'revisit' || job.isRevisionRequired) {
    category = 'revisit';
  } else {
    category = 'ready';
  }

  const cardStyles = {
    ready: 'border-emerald-300/80 bg-emerald-500/[0.03] hover:bg-emerald-500/[0.06] dark:border-emerald-500/20 dark:bg-emerald-500/[0.03] hover:border-emerald-400 dark:hover:border-emerald-500/50 hover:shadow-md text-slate-900 dark:text-white',
    revisit: 'border-rose-400/80 bg-rose-500/[0.03] hover:bg-rose-500/[0.06] dark:border-rose-500/20 dark:bg-rose-500/[0.03] hover:border-rose-400 dark:hover:border-rose-500/50 hover:shadow-md text-slate-900 dark:text-white ring-1 ring-rose-100/50 dark:ring-rose-500/10',
    outlier: 'border-amber-400/80 bg-amber-500/[0.03] hover:bg-amber-500/[0.06] dark:border-amber-500/20 dark:bg-amber-500/[0.03] hover:border-amber-400 dark:hover:border-amber-500/50 hover:shadow-md text-slate-900 dark:text-white',
    completed: 'border-blue-300 bg-blue-50/5 opacity-75 hover:opacity-90 dark:border-blue-500/20 dark:bg-blue-500/[0.01] text-slate-600 dark:text-slate-400',
    postponed: 'border-slate-300 bg-slate-500/[0.02] hover:bg-slate-500/[0.05] dark:border-slate-800/40 dark:bg-slate-900/[0.02] hover:border-slate-400 dark:hover:border-slate-700 text-slate-500 dark:text-slate-400'
  };

  const badgeStyles = {
    ready: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-500/10',
    revisit: 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200/50 dark:border-rose-500/10',
    outlier: 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200/50 dark:border-amber-500/10',
    completed: 'bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-200/50 dark:border-blue-500/10',
    postponed: 'bg-slate-100 text-slate-800 dark:bg-slate-950/40 dark:text-slate-400 border border-slate-200/50 dark:border-slate-500/10'
  };

  const badgeLabels = {
    ready: 'READY',
    revisit: 'REVISION',
    outlier: 'RISK',
    completed: 'DONE',
    postponed: 'TOMORROW'
  };

  const getPriorityStyle = (p?: 'high' | 'medium' | 'low') => {
    switch (p) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-500/20';
      case 'low':
        return 'bg-slate-100 text-slate-600 dark:bg-slate-800/40 dark:text-slate-400 border-slate-200 dark:border-slate-700/20';
      case 'medium':
      default:
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/30 dark:text-amber-400 border-amber-200 dark:border-amber-500/10';
    }
  };

  const handleQuickStatusChange = (statusType: 'completed' | 'revisit' | 'postponed' | 'ready') => {
    if (onUpdateStatus) {
      switch (statusType) {
        case 'completed':
          onUpdateStatus(job.id, {
            status: 'completed',
            isCompleted: true,
            isRevisionRequired: false
          });
          break;
        case 'revisit':
          onUpdateStatus(job.id, {
            status: 'revisit',
            isCompleted: false,
            isRevisionRequired: true
          });
          break;
        case 'postponed':
          onUpdateStatus(job.id, {
            status: 'postponed',
            isCompleted: false,
            isRevisionRequired: false
          });
          break;
        case 'ready':
          onUpdateStatus(job.id, {
            status: 'ready',
            isCompleted: false,
            isRevisionRequired: false
          });
          break;
      }
    } else {
      // Fallback to legacy toggle
      if (statusType === 'completed') {
        onToggleComplete(job.id);
      }
    }
  };

  return (
    <div
      id={`job-card-${job.id}`}
      className={`group relative rounded-2xl border p-5 shadow-xs transition-all duration-300 sm:p-6 ${cardStyles[category]}`}
    >
      {/* Top Banner Status Badges */}
      <div className="absolute -top-2.5 left-4 flex flex-wrap gap-1.5 items-center">
        <span className={`road-pill min-h-8 px-3 py-1 text-[11px] shadow-xs border ${badgeStyles[category]}`}>
          {category === 'ready' && <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500 mr-1" />}
          {badgeLabels[category]}
        </span>

        {/* Priority Badge */}
        <span className={`hidden sm:inline-flex road-pill min-h-8 px-3 py-1 text-[11px] shadow-xs border uppercase ${getPriorityStyle(job.priority)}`}>
          {job.priority || 'medium'} Priority
        </span>
      </div>

      {/* Upper Section */}
      <div className="flex items-start justify-between gap-3 mt-1.5">
        <div className="flex items-start gap-3">
          {/* Complete Status Indicator Indicator */}
          <button
            id={`toggle-complete-${job.id}`}
            onClick={() => handleQuickStatusChange(job.status === 'completed' ? 'ready' : 'completed')}
            className="road-icon-button mt-0.5 border-slate-200 bg-white text-slate-400 hover:text-emerald-600 dark:border-white/10 dark:bg-white/5 dark:text-slate-500 dark:hover:text-emerald-400 focus:outline-none"
            title="Toggle completed"
          >
            {job.status === 'completed' || job.isCompleted ? (
              <CheckSquare size={24} className="text-blue-500 fill-blue-100 dark:fill-blue-950/30" />
            ) : (
              <Square size={24} />
            )}
          </button>

          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className={`font-black text-slate-900 dark:text-white transition-all text-lg sm:text-xl leading-tight ${
                job.status === 'completed' || job.isCompleted ? 'line-through text-slate-400 dark:text-slate-500' : ''
              }`}>
                {job.storeName}
              </h4>
            </div>

            <div className="flex items-center gap-1 text-sm font-bold text-slate-500 dark:text-slate-400">
              <MapPin size={13} className="flex-shrink-0" />
              <span className="truncate max-w-[180px] sm:max-w-xs">{job.address}</span>
            </div>
          </div>
        </div>

        {/* Financial Yield Badge */}
        <div className="text-right flex-shrink-0">
          <span className={`text-2xl font-black tracking-tight ${category === 'completed' ? 'text-blue-600 dark:text-blue-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            ${job.pay.toFixed(2)}
          </span>
          <p className="text-[11px] font-black text-slate-400 uppercase tracking-wide mt-0.5">
            Pay
          </p>
        </div>
      </div>

      {/* Middle info bar */}
      <div className="mt-4 grid grid-cols-2 gap-2 border-y border-slate-100/60 py-3 dark:border-slate-900 sm:flex sm:flex-wrap">
        <span className={`rounded-xl border px-3 py-2 text-xs font-black uppercase tracking-wide ${getJobTypeStyle(job.jobType)}`}>
          {formatJobType(job.jobType)}
        </span>
        <span className="flex items-center gap-1 text-xs font-black text-slate-500 dark:text-slate-400 bg-slate-50 px-3 py-2 rounded-xl border border-slate-100 dark:bg-slate-900 dark:border-slate-800">
          <Clock size={11} />
          <span>{job.estimatedMinutes} mins inside</span>
        </span>
        {job.deadline ? (
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
            Due: {job.deadline}
          </span>
        ) : job.dueTime ? (
          <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
            Due by {job.dueTime}
          </span>
        ) : null}
        
        {job.revisionStatus && job.revisionStatus !== 'None' && (
          <span className={`rounded-md border px-2 py-0.5 text-[10px] font-black uppercase tracking-wider flex items-center gap-0.5 ${
            job.revisionStatus === 'Needs Revision'
              ? 'bg-rose-100 text-rose-800 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-500/20'
              : job.revisionStatus === 'Approved'
              ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-500/20'
              : 'bg-indigo-100 text-indigo-800 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-500/20'
          }`}>
            <Sparkles size={10} />
            <span>{job.revisionStatus}</span>
          </span>
        )}
      </div>

      {/* Notes block */}
      {job.notes && (
        <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed bg-slate-50/50 dark:bg-white/2 p-3 rounded-xl border border-slate-100/50 dark:border-transparent">
          &ldquo;{job.notes}&rdquo;
        </p>
      )}

      {/* Smart Merge Insertion Explanation */}
      {job.smartMergeExplanation && (
        <div className="mt-3 rounded-xl bg-blue-500/[0.04] border border-blue-300/30 dark:border-blue-500/20 p-2.5 text-[10px] text-blue-800 dark:text-blue-400 leading-normal font-semibold flex items-start gap-1.5 shadow-3xs">
          <ShieldAlert size={12} className="flex-shrink-0 mt-0.5 text-blue-500" />
          <span>{job.smartMergeExplanation}</span>
        </div>
      )}

      {/* Quick Mobile Action Buttons */}
      <div className="mt-4 pt-3 border-t border-slate-100/60 dark:border-slate-900">
        <p className="road-label mb-2">Quick status controls</p>
        <div className="grid grid-cols-2 gap-2">
          {/* Quick Complete / Reactivate */}
          <button
            onClick={() => handleQuickStatusChange(job.status === 'completed' ? 'ready' : 'completed')}
            className={`road-action ${
              job.status === 'completed' || job.isCompleted
                ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-white/5 dark:border-white/10 dark:text-slate-300'
            }`}
          >
            <CheckSquare size={16} />
            <span>{job.status === 'completed' || job.isCompleted ? 'Done' : 'Complete'}</span>
          </button>

          {/* Quick Revision Required */}
          <button
            onClick={() => handleQuickStatusChange(job.status === 'revisit' ? 'ready' : 'revisit')}
            className={`road-action ${
              job.status === 'revisit' || job.isRevisionRequired
                ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-white/5 dark:border-white/10 dark:text-slate-300'
            }`}
          >
            <AlertCircle size={16} />
            <span>{job.status === 'revisit' || job.isRevisionRequired ? 'Needs Fix' : 'Revision'}</span>
          </button>

          {/* Quick Postpone / Moved to Tomorrow */}
          <button
            onClick={() => handleQuickStatusChange(job.status === 'postponed' ? 'ready' : 'postponed')}
            className={`road-action ${
              job.status === 'postponed'
                ? 'bg-slate-700 border-slate-700 text-white shadow-xs'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-white/5 dark:border-white/10 dark:text-slate-300'
            }`}
          >
            <Calendar size={16} />
            <span>{job.status === 'postponed' ? 'Tomorrow' : 'Tomorrow'}</span>
          </button>

          {/* Toggle between Route A and B */}
          <button
            onClick={() => onToggleRoute(job.id)}
            className={`road-action ${
              job.routeId === 'B'
                ? 'bg-amber-600 border-amber-600 text-white'
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-white/5 dark:border-white/10 dark:text-slate-300'
            }`}
          >
            <ArrowRightLeft size={16} />
            <span>{job.routeId === 'B' ? 'Route A' : 'Route B'}</span>
          </button>
        </div>
      </div>

      {/* Administrative row (Edit, Duplicate, Delete) */}
      <div className="mt-3 pt-3 border-t border-dashed border-slate-100 dark:border-slate-900 flex items-center justify-between">
        <span className="text-[10px] font-medium text-slate-400">ID: {job.id.split('-').pop()}</span>
        <div className="flex items-center gap-1.5">
          <button
            id={`edit-job-btn-${job.id}`}
            onClick={() => onEdit(job)}
            title="Edit job"
            className="road-icon-button min-h-10 min-w-10 border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <Edit2 size={12} />
            <span className="sr-only">Edit</span>
          </button>
          <button
            id={`duplicate-job-btn-${job.id}`}
            onClick={() => onDuplicate(job)}
            title="Duplicate job"
            className="road-icon-button min-h-10 min-w-10 border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <Copy size={12} />
            <span className="sr-only">Duplicate</span>
          </button>
          <button
            id={`delete-job-btn-${job.id}`}
            onClick={() => onDelete(job.id)}
            title="Delete job"
            className="road-icon-button min-h-10 min-w-10 border-transparent text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:text-slate-500 dark:hover:bg-rose-950/30 dark:hover:text-rose-400"
          >
            <Trash2 size={12} />
            <span className="sr-only">Delete</span>
          </button>
        </div>
      </div>
    </div>
  );
}


