import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run(): Promise<unknown>;
}

interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<T[]>;
}

interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  DB?: D1Database;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });

const ensureHabitSchema = async (db: D1Database) => {
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS habit_state (
      id TEXT PRIMARY KEY,
      task_name TEXT NOT NULL,
      target_minutes INTEGER NOT NULL,
      last_minutes INTEGER NOT NULL,
      logs_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
  ]);
};

const handleHabitsApi = async (request: Request, env: Env): Promise<Response> => {
  if (!env.DB) {
    return jsonResponse({ error: "Backend storage is not configured." }, { status: 503 });
  }

  await ensureHabitSchema(env.DB);

  if (request.method === "GET") {
    const row = await env.DB
      .prepare("SELECT task_name, target_minutes, last_minutes, logs_json, updated_at FROM habit_state WHERE id = ?")
      .bind("default")
      .first<{
        task_name: string;
        target_minutes: number;
        last_minutes: number;
        logs_json: string;
        updated_at: string;
      }>();

    if (!row) {
      return jsonResponse({
        taskName: "Daily Focus Task",
        targetMinutes: 30,
        lastMinutes: 30,
        logs: [],
        updatedAt: null,
      });
    }

    return jsonResponse({
      taskName: row.task_name,
      targetMinutes: row.target_minutes,
      lastMinutes: row.last_minutes,
      logs: JSON.parse(row.logs_json || "[]"),
      updatedAt: row.updated_at,
    });
  }

  if (request.method === "PUT") {
    const payload = await request.json().catch(() => null) as null | {
      taskName?: string;
      targetMinutes?: number;
      lastMinutes?: number;
      logs?: unknown[];
    };

    if (!payload) {
      return jsonResponse({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const taskName = (payload.taskName || "Daily Focus Task").toString().trim().slice(0, 120) || "Daily Focus Task";
    const targetMinutes = Math.max(1, Math.min(1440, Math.round(Number(payload.targetMinutes) || 30)));
    const lastMinutes = Math.max(1, Math.min(1440, Math.round(Number(payload.lastMinutes) || targetMinutes)));
    const logs = Array.isArray(payload.logs) ? payload.logs.slice(0, 1000) : [];
    const updatedAt = new Date().toISOString();

    await env.DB
      .prepare(`INSERT INTO habit_state (id, task_name, target_minutes, last_minutes, logs_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          task_name = excluded.task_name,
          target_minutes = excluded.target_minutes,
          last_minutes = excluded.last_minutes,
          logs_json = excluded.logs_json,
          updated_at = excluded.updated_at`)
      .bind("default", taskName, targetMinutes, lastMinutes, JSON.stringify(logs), updatedAt)
      .run();

    return jsonResponse({ ok: true, updatedAt });
  }

  return jsonResponse({ error: "Method not allowed." }, { status: 405 });
};

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/habits") {
      return handleHabitsApi(request, env);
    }

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(request, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, request.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(request, env, ctx);
  },
};

export default worker;
