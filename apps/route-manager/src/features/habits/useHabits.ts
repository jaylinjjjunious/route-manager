import { useState, useEffect, useRef } from 'react';
import { authFetch } from '../../services/apiClient';
import { getLocalDateKey } from '../../utils/showerCycle';
import safeStorage from '../../utils/safeStorage';
import type { HabitTask, HabitLog } from './types';

const createDefaultHabitTask = (): HabitTask => ({
  id: 'habit-task-default',
  name: 'Daily Focus Task',
  targetMinutes: 30,
  lastMinutes: 30,
  createdAt: new Date().toISOString()
});

export interface UseHabitsReturn {
  /* ── State ── */
  habitTasks: HabitTask[];
  habitLogs: HabitLog[];
  activeHabitTask: HabitTask;
  habitTaskName: string;
  habitTargetMinutes: number;
  habitLogMinutes: number;
  habitLogNote: string;
  todayHabitTaskName: string;
  todayHabitTaskMinutes: number;
  todayHabitTaskNote: string;
  habitSyncStatus: 'loading' | 'synced' | 'offline' | 'saving';
  todayKey: string;

  /* ── Setters ── */
  setHabitLogNote: (note: string) => void;
  setTodayHabitTaskName: (name: string) => void;
  setTodayHabitTaskMinutes: (minutes: number) => void;
  setTodayHabitTaskNote: (note: string) => void;
  setActiveHabitTaskId: (id: string) => void;

  /* ── Handlers ── */
  updateActiveHabitTask: (updates: Partial<Pick<HabitTask, 'name' | 'targetMinutes' | 'lastMinutes'>>) => void;
  handleAddHabitTask: () => void;
  handleAddTodayHabitTask: () => void;
  handleLogHabitSession: () => void;
  handleDeleteHabitLog: (id: string) => void;

  /* ── Derived stats ── */
  todayHabitMinutes: number;
  habitGoalComplete: boolean;
  habitTotalMinutes: number;
  habitTotalSessions: number;
  habitLast7Days: { key: string; label: string; minutes: number; complete: boolean }[];
  habitDaysComplete: number;
  habitConsistencyPct: number;
  habitStreakDays: number;
  habitRecentLogs: HabitLog[];
  allHabitMinutesToday: number;
  habitTasksHitToday: number;

  /* ── Shower-gate integration methods ── */
  addHabitTask: (task: HabitTask) => void;
  addHabitLog: (log: HabitLog) => void;
  ensureHabitTask: (task: HabitTask) => boolean;
}

export function useHabits(todayKey: string): UseHabitsReturn {
  /* ── State ── */
  const [habitTasks, setHabitTasks] = useState<HabitTask[]>(() => {
    try {
      const savedTasks = safeStorage.getItem('habit_tracker_tasks');
      if (savedTasks) {
        const parsedTasks = JSON.parse(savedTasks);
        if (Array.isArray(parsedTasks) && parsedTasks.length > 0) {
          return parsedTasks;
        }
      }
    } catch {
      // Fall through to legacy single-task migration.
    }

    return [{
      id: 'habit-task-default',
      name: safeStorage.getItem('habit_tracker_task_name') || 'Daily Focus Task',
      targetMinutes: Number(safeStorage.getItem('habit_tracker_target_minutes') || '30'),
      lastMinutes: Number(safeStorage.getItem('habit_tracker_last_minutes') || '30'),
      createdAt: new Date().toISOString()
    }];
  });

  const [activeHabitTaskId, setActiveHabitTaskId] = useState<string>(() => safeStorage.getItem('habit_tracker_active_task_id') || 'habit-task-default');
  const [habitLogNote, setHabitLogNote] = useState('');
  const [todayHabitTaskName, setTodayHabitTaskName] = useState('');
  const [todayHabitTaskMinutes, setTodayHabitTaskMinutes] = useState(20);
  const [todayHabitTaskNote, setTodayHabitTaskNote] = useState('');

  const [habitLogs, setHabitLogs] = useState<HabitLog[]>(() => {
    try {
      const saved = safeStorage.getItem('habit_tracker_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [habitSyncStatus, setHabitSyncStatus] = useState<'loading' | 'synced' | 'offline' | 'saving'>('loading');
  const habitBackendLoadedRef = useRef(false);

  /* ── Derived values ── */
  const activeHabitTask = habitTasks.find(task => task.id === activeHabitTaskId) || habitTasks[0] || createDefaultHabitTask();
  const habitTaskName = activeHabitTask.name;
  const habitTargetMinutes = Math.max(1, Number(activeHabitTask.targetMinutes) || 30);
  const habitLogMinutes = Math.max(1, Number(activeHabitTask.lastMinutes) || habitTargetMinutes);

  const currentHabitLogs = habitLogs.filter(log => log.taskId === activeHabitTask.id || (!log.taskId && log.taskName === habitTaskName));
  const todayHabitMinutes = currentHabitLogs
    .filter(log => log.date === todayKey)
    .reduce((sum, log) => sum + log.minutes, 0);
  const habitGoalComplete = todayHabitMinutes >= habitTargetMinutes;
  const habitTotalMinutes = currentHabitLogs.reduce((sum, log) => sum + log.minutes, 0);
  const habitTotalSessions = currentHabitLogs.length;

  const habitLast7Days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = getLocalDateKey(date);
    const minutes = currentHabitLogs
      .filter(log => log.date === key)
      .reduce((sum, log) => sum + log.minutes, 0);
    return {
      key,
      label: date.toLocaleDateString([], { weekday: 'short' }),
      minutes,
      complete: minutes > 0
    };
  });

  const habitDaysComplete = habitLast7Days.filter(day => day.complete).length;
  const habitConsistencyPct = Math.round((habitDaysComplete / habitLast7Days.length) * 100);

  const habitStreakDays = (() => {
    let streak = 0;
    for (let offset = 0; offset < 365; offset++) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      const key = getLocalDateKey(date);
      const minutes = currentHabitLogs
        .filter(log => log.date === key)
        .reduce((sum, log) => sum + log.minutes, 0);
      if (minutes > 0) {
        streak += 1;
      } else {
        break;
      }
    }
    return streak;
  })();

  const habitRecentLogs = [...habitLogs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const allHabitMinutesToday = habitLogs
    .filter(log => log.date === todayKey)
    .reduce((sum, log) => sum + log.minutes, 0);

  const habitTasksHitToday = habitTasks.filter(task => {
    const minutes = habitLogs
      .filter(log => log.date === todayKey && (log.taskId === task.id || (!log.taskId && log.taskName === task.name)))
      .reduce((sum, log) => sum + log.minutes, 0);
    return minutes >= task.targetMinutes;
  }).length;

  /* ── Effects ── */

  // Persist habit state to localStorage
  useEffect(() => {
    safeStorage.setItem('habit_tracker_tasks', JSON.stringify(habitTasks));
    safeStorage.setItem('habit_tracker_active_task_id', activeHabitTask.id);
    safeStorage.setItem('habit_tracker_task_name', habitTaskName);
    safeStorage.setItem('habit_tracker_target_minutes', habitTargetMinutes.toString());
    safeStorage.setItem('habit_tracker_last_minutes', habitLogMinutes.toString());
    safeStorage.setItem('habit_tracker_logs', JSON.stringify(habitLogs));
  }, [habitTasks, activeHabitTask.id, habitTaskName, habitTargetMinutes, habitLogMinutes, habitLogs]);

  // Load habits from backend on mount
  useEffect(() => {
    let isMounted = true;

    const loadBackendHabits = async () => {
      try {
        const response = await authFetch('/api/habits');
        if (!response.ok) throw new Error('Habit backend unavailable');
        const backend = await response.json();
        if (!isMounted) return;

        const legacyBackendTask: HabitTask = {
          id: 'habit-task-default',
          name: backend.taskName || 'Daily Focus Task',
          targetMinutes: Number(backend.targetMinutes || 30),
          lastMinutes: Number(backend.lastMinutes || backend.targetMinutes || 30),
          createdAt: backend.updatedAt || new Date().toISOString()
        };
        const backendTasks = Array.isArray(backend.tasks) && backend.tasks.length > 0
          ? backend.tasks as HabitTask[]
          : [legacyBackendTask];
        const normalizedBackendTasks = backendTasks.reduce<HabitTask[]>((acc, task) => {
          if (!task?.id || acc.some(item => item.id === task.id)) return acc;
          acc.push({
            id: task.id,
            name: (task.name || 'Daily Focus Task').toString().trim().slice(0, 120) || 'Daily Focus Task',
            targetMinutes: Math.max(1, Math.round(Number(task.targetMinutes) || 30)),
            lastMinutes: Math.max(1, Math.round(Number(task.lastMinutes) || Number(task.targetMinutes) || 30)),
            createdAt: task.createdAt || new Date().toISOString()
          });
          return acc;
        }, []);
        const activeId = backend.activeTaskId || normalizedBackendTasks[0]?.id || 'habit-task-default';
        const backendLogs = Array.isArray(backend.logs) ? backend.logs as HabitLog[] : [];
        const normalizedBackendLogs = backendLogs.reduce<HabitLog[]>((acc, log) => {
          if (!log?.id || acc.some(item => item.id === log.id)) return acc;
          const matchingTask = normalizedBackendTasks.find(task => task.id === log.taskId) || normalizedBackendTasks.find(task => task.name === log.taskName);
          acc.push({
            ...log,
            taskId: log.taskId || matchingTask?.id || activeId,
            taskName: log.taskName || matchingTask?.name || 'Daily Focus Task'
          });
          return acc;
        }, []);
        const nextTasks = normalizedBackendTasks.length > 0 ? normalizedBackendTasks : [legacyBackendTask];

        setHabitTasks(nextTasks);
        setActiveHabitTaskId(nextTasks.some(task => task.id === activeId) ? activeId : nextTasks[0]?.id || 'habit-task-default');
        setHabitLogs(normalizedBackendLogs);
        habitBackendLoadedRef.current = true;
        setHabitSyncStatus('synced');
      } catch (error) {
        console.warn('Habit backend sync unavailable. Using local fallback.', error);
        if (!isMounted) return;
        habitBackendLoadedRef.current = true;
        setHabitSyncStatus('offline');
      }
    };

    loadBackendHabits();

    return () => {
      isMounted = false;
    };
  }, []);

  // Debounced save to backend
  useEffect(() => {
    if (!habitBackendLoadedRef.current) return;

    const saveTimer = window.setTimeout(async () => {
      try {
        setHabitSyncStatus('saving');
        const response = await authFetch('/api/habits', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskName: habitTaskName,
            targetMinutes: habitTargetMinutes,
            lastMinutes: habitLogMinutes,
            activeTaskId: activeHabitTask.id,
            tasks: habitTasks,
            logs: habitLogs
          })
        });
        if (!response.ok) throw new Error('Habit backend save failed');
        setHabitSyncStatus('synced');
      } catch (error) {
        console.warn('Habit backend save failed. Local copy is still saved.', error);
        setHabitSyncStatus('offline');
      }
    }, 450);

    return () => window.clearTimeout(saveTimer);
  }, [habitTaskName, habitTargetMinutes, habitLogMinutes, activeHabitTask.id, habitTasks, habitLogs]);

  /* ── Handlers ── */

  const updateActiveHabitTask = (updates: Partial<Pick<HabitTask, 'name' | 'targetMinutes' | 'lastMinutes'>>) => {
    setHabitTasks(prev => prev.map(task => task.id === activeHabitTask.id ? {
      ...task,
      ...updates,
      name: updates.name !== undefined ? updates.name : task.name,
      targetMinutes: updates.targetMinutes !== undefined ? Math.max(1, updates.targetMinutes) : task.targetMinutes,
      lastMinutes: updates.lastMinutes !== undefined ? Math.max(1, updates.lastMinutes) : task.lastMinutes
    } : task));
  };

  const handleAddHabitTask = () => {
    const newTask: HabitTask = {
      id: `habit-task-${Date.now()}`,
      name: `Task ${habitTasks.length + 1}`,
      targetMinutes: 30,
      lastMinutes: 30,
      createdAt: new Date().toISOString()
    };
    setHabitTasks(prev => [...prev, newTask]);
    setActiveHabitTaskId(newTask.id);
  };

  const handleAddTodayHabitTask = () => {
    const minutes = Math.max(1, Math.round(Number(todayHabitTaskMinutes) || 20));
    const taskName = todayHabitTaskName.trim() || `Task ${habitTasks.length + 1}`;
    const createdAt = new Date().toISOString();
    const idBase = Date.now();
    const newTask: HabitTask = {
      id: `habit-task-${idBase}`,
      name: taskName,
      targetMinutes: minutes,
      lastMinutes: minutes,
      createdAt
    };

    setHabitTasks(prev => [...prev, newTask]);
    setActiveHabitTaskId(newTask.id);
    setHabitLogs(prev => [
      {
        id: `habit-${idBase}`,
        taskId: newTask.id,
        taskName,
        minutes,
        date: todayKey,
        note: todayHabitTaskNote.trim(),
        createdAt
      },
      ...prev
    ]);
    setTodayHabitTaskName('');
    setTodayHabitTaskNote('');
    setTodayHabitTaskMinutes(minutes);
  };

  const handleLogHabitSession = () => {
    const minutes = Math.max(1, Math.round(habitLogMinutes || habitTargetMinutes || 30));
    const taskName = habitTaskName.trim() || 'Daily Focus Task';
    updateActiveHabitTask({ name: taskName, lastMinutes: minutes });
    setHabitLogs(prev => [
      {
        id: `habit-${Date.now()}`,
        taskId: activeHabitTask.id,
        taskName,
        minutes,
        date: todayKey,
        note: habitLogNote.trim(),
        createdAt: new Date().toISOString()
      },
      ...prev
    ]);
    setHabitLogNote('');
  };

  const handleDeleteHabitLog = (id: string) => {
    setHabitLogs(prev => prev.filter(log => log.id !== id));
  };

  /* ── Shower-gate integration methods ── */

  const addHabitTask = (task: HabitTask) => {
    setHabitTasks(prev => {
      if (prev.some(t => t.id === task.id)) return prev;
      return [...prev, task];
    });
  };

  const addHabitLog = (log: HabitLog) => {
    setHabitLogs(prev => {
      if (prev.some(l => l.id === log.id)) return prev;
      return [log, ...prev];
    });
  };

  const ensureHabitTask = (task: HabitTask): boolean => {
    let changed = false;
    setHabitTasks(prev => {
      const indexById = prev.findIndex(t => t.id === task.id);
      const indexByName = prev.findIndex(t => t.name.toLowerCase() === task.name.toLowerCase());
      const index = indexById >= 0 ? indexById : indexByName;
      if (index >= 0) {
        const existing = prev[index];
        if (
          existing.name === task.name &&
          existing.targetMinutes === task.targetMinutes &&
          existing.lastMinutes === task.lastMinutes &&
          (indexById >= 0 || existing.id === task.id)
        ) {
          return prev;
        }
        changed = true;
        return prev.map((t, i) => i === index ? { ...task, createdAt: existing.createdAt } : t);
      }
      changed = true;
      return [...prev, task];
    });
    return changed;
  };

  return {
    habitTasks,
    habitLogs,
    activeHabitTask,
    habitTaskName,
    habitTargetMinutes,
    habitLogMinutes,
    habitLogNote,
    todayHabitTaskName,
    todayHabitTaskMinutes,
    todayHabitTaskNote,
    habitSyncStatus,
    todayKey,
    setHabitLogNote,
    setTodayHabitTaskName,
    setTodayHabitTaskMinutes,
    setTodayHabitTaskNote,
    setActiveHabitTaskId,
    updateActiveHabitTask,
    handleAddHabitTask,
    handleAddTodayHabitTask,
    handleLogHabitSession,
    handleDeleteHabitLog,
    todayHabitMinutes,
    habitGoalComplete,
    habitTotalMinutes,
    habitTotalSessions,
    habitLast7Days,
    habitDaysComplete,
    habitConsistencyPct,
    habitStreakDays,
    habitRecentLogs,
    allHabitMinutesToday,
    habitTasksHitToday,
    addHabitTask,
    addHabitLog,
    ensureHabitTask,
  };
}
