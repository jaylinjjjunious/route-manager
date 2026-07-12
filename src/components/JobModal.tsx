/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Job, JobType, Coordinates, JobStatus } from '../types';
import { resolveCoordinates, BAKERSFIELD_COORDINATES } from '../utils/routeUtils';
import { X, Sparkles, MapPin, DollarSign, Clock, HelpCircle } from 'lucide-react';

interface JobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (jobData: Omit<Job, 'id'> & { id?: string }) => void;
  editingJob?: Job | null;
  defaultRouteId: 'A' | 'B';
  defaultJobType?: JobType;
}

const PRESET_LOCATIONS = Object.keys(BAKERSFIELD_COORDINATES);

export default function JobModal({
  isOpen,
  onClose,
  onSave,
  editingJob,
  defaultRouteId,
  defaultJobType = 'retail_audit'
}: JobModalProps) {
  const [storeName, setStoreName] = useState('');
  const [address, setAddress] = useState('');
  const [pay, setPay] = useState<number>(15);
  const [estimatedMinutes, setEstimatedMinutes] = useState<number>(20);
  const [jobType, setJobType] = useState<JobType>('retail_audit');
  const [dueTime, setDueTime] = useState('17:00');
  const [notes, setNotes] = useState('');
  const [routeId, setRouteId] = useState<'A' | 'B'>('A');
  const [status, setStatus] = useState<JobStatus>('ready');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [isCompleted, setIsCompleted] = useState(false);
  const [isRevisionRequired, setIsRevisionRequired] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Sync state with editing job
  useEffect(() => {
    if (editingJob) {
      setStoreName(editingJob.storeName);
      setAddress(editingJob.address);
      setPay(editingJob.pay);
      setEstimatedMinutes(editingJob.estimatedMinutes);
      setJobType(editingJob.jobType);
      setDueTime(editingJob.dueTime);
      setNotes(editingJob.notes);
      setRouteId(editingJob.routeId);
      setStatus(editingJob.status === 'pending' ? 'ready' : (editingJob.status || 'ready'));
      setPriority(editingJob.priority || 'medium');
      setIsCompleted(editingJob.isCompleted || editingJob.status === 'completed');
      setIsRevisionRequired(editingJob.isRevisionRequired || editingJob.status === 'revisit');
    } else {
      setStoreName('');
      setAddress('');
      const isProcessServeDefault = defaultJobType === 'process_serve';
      setPay(isProcessServeDefault ? 35 : 15);
      setEstimatedMinutes(isProcessServeDefault ? 10 : 20);
      setJobType(defaultJobType);
      setDueTime(isProcessServeDefault ? 'ASAP' : '17:00');
      setNotes(isProcessServeDefault ? 'Process server assignment. Add case number, party name, attempt window, and proof notes.' : '');
      setRouteId(defaultRouteId);
      setStatus('ready');
      setPriority(isProcessServeDefault ? 'high' : 'medium');
      setIsCompleted(false);
      setIsRevisionRequired(false);
    }
    setErrors({});
  }, [editingJob, isOpen, defaultRouteId, defaultJobType]);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: string) => {
    setAddress(preset);
    // Extract a nice store name from preset (e.g. "Family Dollar 2151 S Chester Ave" -> "Family Dollar")
    const match = preset.match(/^([A-Za-z0-9!\s]+)\s\d/);
    if (match && match[1]) {
      setStoreName(match[1].trim());
    } else {
      setStoreName(preset);
    }
  };

  const handleJobTypeChange = (nextType: JobType) => {
    setJobType(nextType);

    if (nextType === 'process_serve' && !editingJob) {
      setStoreName(current => current || 'Process Serve');
      setEstimatedMinutes(current => current === 20 ? 10 : current);
      setDueTime(current => current === '17:00' ? 'ASAP' : current);
      setPriority('high');
      setNotes(current => current || 'Process server assignment. Add case number, party name, attempt window, and proof notes.');
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!storeName.trim()) newErrors.storeName = 'Store/Job name is required';
    if (!address.trim()) newErrors.address = 'Address is required';
    if (pay <= 0) newErrors.pay = 'Pay must be greater than 0';
    if (estimatedMinutes <= 0) newErrors.estimatedMinutes = 'Duration must be positive';

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Resolve geographic lat/lng
    const coordinates = resolveCoordinates(address);

    onSave({
      id: editingJob?.id,
      storeName: storeName.trim(),
      address: address.trim(),
      pay: Number(pay),
      estimatedMinutes: Number(estimatedMinutes),
      jobType,
      dueTime,
      notes: notes.trim(),
      status,
      routeId,
      coordinates,
      priority,
      isCompleted,
      isRevisionRequired
    });

    onClose();
  };

  return (
    <div id="job-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div
        id="job-modal-content"
        className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-white/5 dark:bg-[#0A0A0A] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 dark:border-white/5">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              <Sparkles size={16} className="text-blue-500" />
              <span>{editingJob ? 'Edit Gig Job' : 'Add New Gig Job'}</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">Retail, gig, and process-server stops all go into the same route.</p>
          </div>
          <button
            id="close-modal-btn"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleFormSubmit} className="max-h-[80vh] overflow-y-auto p-5 space-y-4">
          
          {/* Preset Helper */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-white/2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 block mb-2">
              Bakersfield Preset Addresses
            </span>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_LOCATIONS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-700 hover:border-slate-400 hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:border-white/25"
                >
                  {preset.split(' ')[0]} {preset.split(' ').slice(1, 3).join(' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Store Name & Type */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="store-name-input" className="block text-xs font-bold text-slate-600 uppercase tracking-wide dark:text-slate-400 mb-1">
                Store / Job Name
              </label>
              <input
                id="store-name-input"
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="e.g. Family Dollar or Process Serve"
                className={`w-full rounded-xl border px-3.5 py-2 text-sm bg-white dark:bg-[#050505] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                  errors.storeName ? 'border-rose-500' : 'border-slate-200 dark:border-white/10'
                }`}
              />
              {errors.storeName && (
                <p className="mt-1 text-xs text-rose-500">{errors.storeName}</p>
              )}
            </div>

            <div>
              <label htmlFor="job-type-select" className="block text-xs font-bold text-slate-600 uppercase tracking-wide dark:text-slate-400 mb-1">
                Job Type
              </label>
              <select
                id="job-type-select"
                value={jobType}
                onChange={(e) => handleJobTypeChange(e.target.value as JobType)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm dark:border-white/10 dark:bg-[#050505] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              >
                <option value="retail_audit">Retail Audit</option>
                <option value="merchandising">Merchandising</option>
                <option value="mystery_shop">Mystery Shop</option>
                <option value="field_task">Field Task</option>
                <option value="process_serve">Process Serve</option>
              </select>
            </div>
          </div>

          {/* Address */}
          <div>
            <label htmlFor="address-input" className="block text-xs font-bold text-slate-600 uppercase tracking-wide dark:text-slate-400 mb-1">
              Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <MapPin size={14} />
              </span>
              <input
                id="address-input"
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. 2151 S Chester Ave, Bakersfield, CA"
                className={`w-full rounded-xl border pl-9 pr-3.5 py-2 text-sm bg-white dark:bg-[#050505] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                  errors.address ? 'border-rose-500' : 'border-slate-200 dark:border-white/10'
                }`}
              />
            </div>
            {errors.address && (
              <p className="mt-1 text-xs text-rose-500">{errors.address}</p>
            )}
          </div>

          {/* Pay & Inside Store Minutes */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="pay-input" className="block text-xs font-bold text-slate-600 uppercase tracking-wide dark:text-slate-400 mb-1">
                Job Pay ($)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <DollarSign size={14} />
                </span>
                <input
                  id="pay-input"
                  type="number"
                  step="0.01"
                  min="1"
                  value={pay || ''}
                  onChange={(e) => setPay(parseFloat(e.target.value))}
                  placeholder="25.00"
                  className={`w-full rounded-xl border pl-8 pr-3.5 py-2 text-sm bg-white dark:bg-[#050505] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                    errors.pay ? 'border-rose-500' : 'border-slate-200 dark:border-white/10'
                  }`}
                />
              </div>
              {errors.pay && (
                <p className="mt-1 text-xs text-rose-500">{errors.pay}</p>
              )}
            </div>

            <div>
              <label htmlFor="duration-input" className="block text-xs font-bold text-slate-600 uppercase tracking-wide dark:text-slate-400 mb-1">
                Inside Store (Minutes)
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Clock size={14} />
                </span>
                <input
                  id="duration-input"
                  type="number"
                  min="1"
                  value={estimatedMinutes || ''}
                  onChange={(e) => setEstimatedMinutes(parseInt(e.target.value))}
                  placeholder="25"
                  className={`w-full rounded-xl border pl-8 pr-3.5 py-2 text-sm bg-white dark:bg-[#050505] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${
                    errors.estimatedMinutes ? 'border-rose-500' : 'border-slate-200 dark:border-white/10'
                  }`}
                />
              </div>
              {errors.estimatedMinutes && (
                <p className="mt-1 text-xs text-rose-500">{errors.estimatedMinutes}</p>
              )}
            </div>
          </div>

          {/* Due Time & Route Assignment */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="due-time-input" className="block text-xs font-bold text-slate-600 uppercase tracking-wide dark:text-slate-400 mb-1">
                Due Time / Window
              </label>
              <input
                id="due-time-input"
                type="text"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                placeholder="e.g. 17:00 or 5 PM"
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm dark:border-white/10 dark:bg-[#050505] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide dark:text-slate-400 mb-1">
                Route Designation
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="assign-route-a-btn"
                  type="button"
                  onClick={() => setRouteId('A')}
                  className={`rounded-xl py-2 text-xs font-bold border transition-all ${
                    routeId === 'A'
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-white/5 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10'
                  }`}
                >
                  Route A (Active)
                </button>
                <button
                  id="assign-route-b-btn"
                  type="button"
                  onClick={() => setRouteId('B')}
                  className={`rounded-xl py-2 text-xs font-bold border transition-all ${
                    routeId === 'B'
                      ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-white/5 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10'
                  }`}
                >
                  Route B (Standby)
                </button>
              </div>
            </div>
          </div>

          {/* Field Status Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide dark:text-slate-400 mb-1.5">
              Field-Worker Status Code
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setStatus('ready');
                  setIsCompleted(false);
                  setIsRevisionRequired(false);
                }}
                className={`rounded-xl py-2 px-2 text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
                  status === 'ready' || status === 'pending'
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-white/5 dark:border-white/10 dark:text-slate-300'
                }`}
              >
                <span className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  <span>Active / Ready</span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatus('completed');
                  setIsCompleted(true);
                  setIsRevisionRequired(false);
                }}
                className={`rounded-xl py-2 px-2 text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
                  status === 'completed'
                    ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-white/5 dark:border-white/10 dark:text-slate-300'
                }`}
              >
                <span>✓ Completed</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatus('revisit');
                  setIsCompleted(false);
                  setIsRevisionRequired(true);
                }}
                className={`rounded-xl py-2 px-2 text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
                  status === 'revisit'
                    ? 'bg-rose-600 border-rose-600 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-white/5 dark:border-white/10 dark:text-slate-300'
                }`}
              >
                <span>⚠️ Revision Required</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatus('postponed');
                  setIsCompleted(false);
                  setIsRevisionRequired(false);
                }}
                className={`rounded-xl py-2 px-2 text-xs font-bold border transition-all flex flex-col items-center justify-center gap-1 ${
                  status === 'postponed'
                    ? 'bg-slate-700 border-slate-700 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-white/5 dark:border-white/10 dark:text-slate-300'
                }`}
              >
                <span>⏰ Moved to Tomorrow</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setStatus('outlier');
                }}
                className={`rounded-xl py-2 px-2 text-xs font-bold border col-span-2 transition-all flex flex-col items-center justify-center gap-1 ${
                  status === 'outlier'
                    ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-white/5 dark:border-white/10 dark:text-slate-300'
                }`}
              >
                <span>⚠️ Outlier (Warning Status)</span>
              </button>
            </div>
          </div>

          {/* Priority Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide dark:text-slate-400 mb-1.5">
              Priority Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPriority('high')}
                className={`rounded-xl py-2 text-xs font-bold border transition-all ${
                  priority === 'high'
                    ? 'bg-red-600 border-red-600 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-white/5 dark:border-white/10 dark:text-slate-300'
                }`}
              >
                🔴 High
              </button>
              <button
                type="button"
                onClick={() => setPriority('medium')}
                className={`rounded-xl py-2 text-xs font-bold border transition-all ${
                  priority === 'medium'
                    ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-white/5 dark:border-white/10 dark:text-slate-300'
                }`}
              >
                🟡 Medium
              </button>
              <button
                type="button"
                onClick={() => setPriority('low')}
                className={`rounded-xl py-2 text-xs font-bold border transition-all ${
                  priority === 'low'
                    ? 'bg-slate-600 border-slate-600 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 dark:bg-white/5 dark:border-white/10 dark:text-slate-300'
                }`}
              >
                🔵 Low
              </button>
            </div>
          </div>

          {/* Explicit Flag Switches */}
          <div className="grid grid-cols-2 gap-4 rounded-xl border border-slate-100 bg-slate-50/50 p-3 dark:border-white/5 dark:bg-white/2">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isCompleted}
                onChange={(e) => {
                  setIsCompleted(e.target.checked);
                  if (e.target.checked) {
                    setIsRevisionRequired(false);
                    setStatus('completed');
                  } else if (status === 'completed') {
                    setStatus('ready');
                  }
                }}
                className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Is Completed</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isRevisionRequired}
                onChange={(e) => {
                  setIsRevisionRequired(e.target.checked);
                  if (e.target.checked) {
                    setIsCompleted(false);
                    setStatus('revisit');
                  } else if (status === 'revisit') {
                    setStatus('ready');
                  }
                }}
                className="h-4 w-4 rounded border-slate-300 text-rose-600 focus:ring-rose-500"
              />
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Revision Required</span>
            </label>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes-textarea" className="block text-xs font-bold text-slate-600 uppercase tracking-wide dark:text-slate-400 mb-1">
              Job Notes / Proof Details
            </label>
            <textarea
              id="notes-textarea"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Store codes, case number, party name, attempt window, gate codes, or proof instructions..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm dark:border-white/10 dark:bg-[#050505] dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-white/5">
            <button
              id="cancel-modal-btn"
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              id="submit-modal-btn"
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-2 text-sm font-bold text-white shadow-md hover:bg-blue-500 hover:shadow-lg transition-all"
            >
              Save Job
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

