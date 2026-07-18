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

interface SafetyNewsJob {
  storeName?: string;
  address?: string;
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
      active_task_id TEXT,
      tasks_json TEXT,
      logs_json TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )`),
  ]);

  await db.prepare("ALTER TABLE habit_state ADD COLUMN active_task_id TEXT").run().catch(() => undefined);
  await db.prepare("ALTER TABLE habit_state ADD COLUMN tasks_json TEXT").run().catch(() => undefined);
};

const stripXml = (value: string) =>
  value
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

const getXmlTag = (item: string, tag: string) => {
  const match = item.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return match ? stripXml(match[1]) : "";
};

const extractNewsUrl = (link: string) => {
  try {
    const url = new URL(link);
    return url.searchParams.get("url") || link;
  } catch {
    return link;
  }
};

const getAreaParts = (job: SafetyNewsJob) => {
  const address = (job.address || "").replace(/\s+/g, " ").trim();
  const store = (job.storeName || "").replace(/\s+/g, " ").trim();
  const streetMatch = address.match(/\b([A-Za-z][A-Za-z\s]+(?:Rd|Road|Ave|Avenue|Blvd|Boulevard|Ln|Lane|Hwy|Highway|Dr|Drive|St|Street|Way|Ct|Court))\b/i);
  const street = streetMatch?.[1]?.replace(/\s+/g, " ").trim();
  return {
    label: [store, street || address].filter(Boolean).join(" near ").slice(0, 120) || "Bakersfield route area",
    street: street || address || store,
    store,
  };
};

const classifySafetyLevel = (text: string) => {
  const lowered = text.toLowerCase();
  if (/\b(shooting|homicide|murder|stabbing|armed|gunfire|fatal|kidnapping|assault)\b/.test(lowered)) return "high";
  if (/\b(robbery|burglary|theft|arrest|wanted|police|crash|pursuit|fire)\b/.test(lowered)) return "watch";
  return "info";
};

const handleSafetyNewsApi = async (request: Request): Promise<Response> => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, { status: 405 });
  }

  const payload = await request.json().catch(() => null) as null | { jobs?: SafetyNewsJob[] };
  const jobs = Array.isArray(payload?.jobs) ? payload.jobs.slice(0, 8) : [];
  const areaParts = jobs.map(getAreaParts);
  const areaLabels = Array.from(new Set(areaParts.map(area => area.label))).slice(0, 6);
  const queries = (areaParts.length > 0 ? areaParts : [{ label: "Bakersfield route area", street: "Bakersfield", store: "" }])
    .slice(0, 6)
    .map((area) => ({
      area: area.label,
      query: area.street && area.street !== area.store
        ? `Bakersfield ${area.street} crime police safety`
        : `Bakersfield ${area.store || "crime"} police safety`,
    }));
  queries.push({
    area: "Bakersfield citywide",
    query: "Bakersfield crime police safety today",
  });

  const seen = new Set<string>();
  const items: Array<{
    title: string;
    source: string;
    url: string;
    publishedAt: string;
    matchedArea: string;
    safetyLevel: "high" | "watch" | "info";
  }> = [];
  const localTerms = Array.from(new Set([
    "bakersfield",
    "kern",
    "bpd",
    "kbak",
    "23abc",
    "kget",
    ...areaLabels
      .flatMap((area) => area.toLowerCase().split(/[^a-z0-9]+/))
      .filter((term) => term.length > 3 && !["near", "family", "dollar", "general", "revisit", "target"].includes(term)),
  ]));

  await Promise.all(queries.map(async ({ area, query }) => {
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
    try {
      const response = await fetch(rssUrl, {
        headers: {
          "User-Agent": "RouteManagerSafetyBrief/1.0",
          "Accept": "application/rss+xml,text/xml;q=0.9,*/*;q=0.8",
        },
      });
      if (!response.ok) return;
      const xml = await response.text();
      const rssItems = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)].slice(0, 4);
      rssItems.forEach((match) => {
        const raw = match[1];
        const title = getXmlTag(raw, "title");
        const link = extractNewsUrl(getXmlTag(raw, "link"));
        if (!title || !link || seen.has(link)) return;
        seen.add(link);
        items.push({
          title,
          source: getXmlTag(raw, "source") || "News",
          url: link,
          publishedAt: getXmlTag(raw, "pubDate"),
          matchedArea: area,
          safetyLevel: classifySafetyLevel(title),
        });
      });
    } catch {
      // Keep a useful fallback below instead of failing the whole brief.
    }
  }));

  const recencyCutoff = Date.now() - 1000 * 60 * 60 * 24 * 120;
  const sortedItems = items
    .filter((item) => {
      const published = new Date(item.publishedAt || 0).getTime();
      const searchable = `${item.title} ${item.source}`.toLowerCase();
      return Number.isFinite(published) && published >= recencyCutoff && localTerms.some((term) => searchable.includes(term));
    })
    .sort((a, b) => new Date(b.publishedAt || 0).getTime() - new Date(a.publishedAt || 0).getTime())
    .slice(0, 12);

  return jsonResponse({
    updatedAt: new Date().toISOString(),
    areas: areaLabels,
    items: sortedItems,
    sourceSearches: queries.map(({ area, query }) => ({
      area,
      url: `https://news.google.com/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`,
    })),
    summary: sortedItems.length > 0
      ? `Checked ${queries.length} Bakersfield route area${queries.length === 1 ? "" : "s"} for recent crime and safety news.`
      : "No recent matching news came back from the safety news search. Check official police and local news links before heading out.",
  });
};

const handleHabitsApi = async (request: Request, env: Env): Promise<Response> => {
  if (!env.DB) {
    return jsonResponse({ error: "Backend storage is not configured." }, { status: 503 });
  }

  await ensureHabitSchema(env.DB);

  if (request.method === "GET") {
    const row = await env.DB
      .prepare("SELECT task_name, target_minutes, last_minutes, active_task_id, tasks_json, logs_json, updated_at FROM habit_state WHERE id = ?")
      .bind("default")
      .first<{
        task_name: string;
        target_minutes: number;
        last_minutes: number;
        active_task_id: string | null;
        tasks_json: string | null;
        logs_json: string;
        updated_at: string;
      }>();

    if (!row) {
      return jsonResponse({
        taskName: "Daily Focus Task",
        targetMinutes: 30,
        lastMinutes: 30,
        activeTaskId: "habit-task-default",
        tasks: [{
          id: "habit-task-default",
          name: "Daily Focus Task",
          targetMinutes: 30,
          lastMinutes: 30,
          createdAt: new Date().toISOString(),
        }],
        logs: [],
        updatedAt: null,
      });
    }

    return jsonResponse({
      taskName: row.task_name,
      targetMinutes: row.target_minutes,
      lastMinutes: row.last_minutes,
      activeTaskId: row.active_task_id || "habit-task-default",
      tasks: JSON.parse(row.tasks_json || "[]"),
      logs: JSON.parse(row.logs_json || "[]"),
      updatedAt: row.updated_at,
    });
  }

  if (request.method === "PUT") {
    const payload = await request.json().catch(() => null) as null | {
      taskName?: string;
      targetMinutes?: number;
      lastMinutes?: number;
      activeTaskId?: string;
      tasks?: unknown[];
      logs?: unknown[];
    };

    if (!payload) {
      return jsonResponse({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const taskName = (payload.taskName || "Daily Focus Task").toString().trim().slice(0, 120) || "Daily Focus Task";
    const targetMinutes = Math.max(1, Math.min(1440, Math.round(Number(payload.targetMinutes) || 30)));
    const lastMinutes = Math.max(1, Math.min(1440, Math.round(Number(payload.lastMinutes) || targetMinutes)));
    const activeTaskId = (payload.activeTaskId || "habit-task-default").toString().trim().slice(0, 80) || "habit-task-default";
    const updatedAt = new Date().toISOString();
    const tasks = Array.isArray(payload.tasks)
      ? payload.tasks.slice(0, 100).map((task) => {
        const record = task && typeof task === "object" ? task as Record<string, unknown> : {};
        const id = (record.id || `habit-task-${Date.now()}`).toString().trim().slice(0, 80);
        const name = (record.name || taskName).toString().trim().slice(0, 120) || taskName;
        const taskTargetMinutes = Math.max(1, Math.min(1440, Math.round(Number(record.targetMinutes) || targetMinutes)));
        return {
          id,
          name,
          targetMinutes: taskTargetMinutes,
          lastMinutes: Math.max(1, Math.min(1440, Math.round(Number(record.lastMinutes) || taskTargetMinutes))),
          createdAt: (record.createdAt || updatedAt).toString(),
        };
      })
      : [{
        id: activeTaskId,
        name: taskName,
        targetMinutes,
        lastMinutes,
        createdAt: updatedAt,
      }];
    const logs = Array.isArray(payload.logs) ? payload.logs.slice(0, 1000) : [];

    await env.DB
      .prepare(`INSERT INTO habit_state (id, task_name, target_minutes, last_minutes, active_task_id, tasks_json, logs_json, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          task_name = excluded.task_name,
          target_minutes = excluded.target_minutes,
          last_minutes = excluded.last_minutes,
          active_task_id = excluded.active_task_id,
          tasks_json = excluded.tasks_json,
          logs_json = excluded.logs_json,
          updated_at = excluded.updated_at`)
      .bind("default", taskName, targetMinutes, lastMinutes, activeTaskId, JSON.stringify(tasks), JSON.stringify(logs), updatedAt)
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

    if (url.pathname === "/api/safety-news") {
      return handleSafetyNewsApi(request);
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
