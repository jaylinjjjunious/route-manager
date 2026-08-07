export interface HabitTask {
  id: string;
  name: string;
  targetMinutes: number;
  lastMinutes: number;
  createdAt: string;
}

export interface HabitLog {
  id: string;
  taskId?: string;
  taskName: string;
  minutes: number;
  date: string;
  note: string;
  createdAt: string;
}
