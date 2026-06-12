import { getSupabaseClient } from "./supabase";
import type { AppState, DailyLog, Project, Task } from "../types";

const STORAGE_KEY = "panel-direccion-personal";
const MIGRATION_KEY = "panel-direccion-personal:migrated-to-supabase";

type MigrationResult = {
  attempted: boolean;
  skippedReason?: string;
  projectsFound: number;
  tasksFound: number;
  dailyLogsFound: number;
  projectsMigrated: number;
  tasksMigrated: number;
  dailyLogsMigrated: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isProject(value: unknown): value is Project {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.area === "string" &&
    typeof value.objective === "string" &&
    typeof value.impact === "number" &&
    typeof value.urgency === "number" &&
    typeof value.effort === "number" &&
    typeof value.status === "string"
  );
}

function isTask(value: unknown): value is Task {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.date === "string" &&
    typeof value.isKey === "boolean" &&
    typeof value.status === "string" &&
    (typeof value.projectId === "string" || typeof value.projectId === "undefined")
  );
}

function isDailyLog(value: unknown): value is DailyLog {
  if (!isRecord(value)) return false;

  return (
    typeof value.id === "string" &&
    typeof value.projectId === "string" &&
    typeof value.date === "string" &&
    typeof value.summaryToday === "string" &&
    typeof value.nextSession === "string" &&
    typeof value.laterPending === "string" &&
    typeof value.decisions === "string" &&
    (typeof value.aiPrompt === "string" || typeof value.aiPrompt === "undefined")
  );
}

function parseLocalState(raw: string | null): AppState | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isRecord(parsed)) return null;

    const projects = Array.isArray(parsed.projects)
      ? parsed.projects.filter(isProject)
      : [];
    const tasks = Array.isArray(parsed.tasks) ? parsed.tasks.filter(isTask) : [];
    const dailyLogs = Array.isArray(parsed.dailyLogs)
      ? parsed.dailyLogs.filter(isDailyLog)
      : [];

    return {
      projects,
      tasks,
      dailyLogs,
      ideas: [],
      reviews: [],
      taskTemplates: [],
    };
  } catch (error) {
    console.error("[migration] error parsing localStorage payload:", error);
    return null;
  }
}

function dedupeById<T extends { id: string }>(items: T[]): T[] {
  return Array.from(new Map(items.map((item) => [item.id, item])).values());
}

function dedupeDailyLogs(items: DailyLog[]): DailyLog[] {
  return Array.from(
    new Map(items.map((item) => [`${item.projectId}::${item.date}`, item])).values()
  );
}

async function migrateProjects(projects: Project[], userId: string): Promise<number> {
  if (projects.length === 0) return 0;

  const supabase = getSupabaseClient();
  const payload = projects.map((project) => ({
    id: project.id,
    created_at: project.createdAt,
    user_id: userId,
    name: project.name,
    area: project.area,
    objective: project.objective,
    impact: project.impact,
    urgency: project.urgency,
    effort: project.effort,
    status: project.status,
  }));

  const { error } = await supabase
    .from("binn_projects")
    .upsert(payload, { onConflict: "id" });

  if (error) throw error;

  return payload.length;
}

async function migrateTasks(tasks: Task[], userId: string): Promise<number> {
  if (tasks.length === 0) return 0;

  const supabase = getSupabaseClient();
  const payload = tasks.map((task) => ({
    id: task.id,
    user_id: userId,
    title: task.title,
    task_date: task.date,
    project_id: task.projectId ?? null,
    is_key: task.isKey,
    status: task.status,
  }));

  const { error } = await supabase
    .from("binn_tasks")
    .upsert(payload, { onConflict: "id" });

  if (error) throw error;

  return payload.length;
}

async function migrateDailyLogs(dailyLogs: DailyLog[], userId: string): Promise<number> {
  if (dailyLogs.length === 0) return 0;

  const supabase = getSupabaseClient();
  const { data: existingRows, error: existingError } = await supabase
    .from("binn_daily_logs")
    .select("id, user_id, project_id, log_date");

  if (existingError) throw existingError;

  const existingByComposite = new Map(
    (existingRows ?? []).map((row) => [`${row.user_id}::${row.project_id}::${row.log_date}`, row.id])
  );

  const payload = dailyLogs.map((log) => {
    const existingId = existingByComposite.get(`${userId}::${log.projectId}::${log.date}`);

    return {
      id: existingId ?? log.id,
      user_id: userId,
      project_id: log.projectId,
      log_date: log.date,
      summary_today: log.summaryToday,
      next_session: log.nextSession,
      later_pending: log.laterPending,
      decisions: log.decisions,
      ai_prompt: log.aiPrompt ?? "",
    };
  });

  const { error } = await supabase
    .from("binn_daily_logs")
    .upsert(payload, { onConflict: "user_id,project_id,log_date" });

  if (error) throw error;

  return payload.length;
}

export function hasCompletedSupabaseMigration(): boolean {
  if (typeof window === "undefined") return false;

  return window.localStorage.getItem(MIGRATION_KEY) === "true";
}

export async function migrateLocalStorageToSupabase(userId: string): Promise<MigrationResult> {
  if (typeof window === "undefined") {
    return {
      attempted: false,
      skippedReason: "window-unavailable",
      projectsFound: 0,
      tasksFound: 0,
      dailyLogsFound: 0,
      projectsMigrated: 0,
      tasksMigrated: 0,
      dailyLogsMigrated: 0,
    };
  }

  const userMigrationKey = `${MIGRATION_KEY}:${userId}`;

  if (window.localStorage.getItem(userMigrationKey) === "true") {
    return {
      attempted: false,
      skippedReason: "already-migrated",
      projectsFound: 0,
      tasksFound: 0,
      dailyLogsFound: 0,
      projectsMigrated: 0,
      tasksMigrated: 0,
      dailyLogsMigrated: 0,
    };
  }

  console.log("[migration] starting localStorage -> Supabase migration for user:", userId);

  const localState = parseLocalState(window.localStorage.getItem(STORAGE_KEY));
  if (!localState) {
    console.log("[migration] no valid localStorage payload found");
    return {
      attempted: false,
      skippedReason: "no-valid-local-data",
      projectsFound: 0,
      tasksFound: 0,
      dailyLogsFound: 0,
      projectsMigrated: 0,
      tasksMigrated: 0,
      dailyLogsMigrated: 0,
    };
  }

  const projects = dedupeById(localState.projects);
  const tasks = dedupeById(localState.tasks);
  const dailyLogs = dedupeDailyLogs(localState.dailyLogs);

  console.log("[migration] local data found:", {
    projects: projects.length,
    tasks: tasks.length,
    dailyLogs: dailyLogs.length,
  });

  const result: MigrationResult = {
    attempted: true,
    projectsFound: projects.length,
    tasksFound: tasks.length,
    dailyLogsFound: dailyLogs.length,
    projectsMigrated: 0,
    tasksMigrated: 0,
    dailyLogsMigrated: 0,
  };

  try {
    result.projectsMigrated = await migrateProjects(projects, userId);
    console.log("[migration] projects migrated:", result.projectsMigrated);
  } catch (error) {
    console.error("[migration] projects migration failed:", error);
  }

  try {
    result.tasksMigrated = await migrateTasks(tasks, userId);
    console.log("[migration] tasks migrated:", result.tasksMigrated);
  } catch (error) {
    console.error("[migration] tasks migration failed:", error);
  }

  try {
    result.dailyLogsMigrated = await migrateDailyLogs(dailyLogs, userId);
    console.log("[migration] daily logs migrated:", result.dailyLogsMigrated);
  } catch (error) {
    console.error("[migration] daily logs migration failed:", error);
  }

  if (
    result.projectsMigrated === result.projectsFound &&
    result.tasksMigrated === result.tasksFound &&
    result.dailyLogsMigrated === result.dailyLogsFound
  ) {
    window.localStorage.setItem(userMigrationKey, "true");
    console.log("[migration] migration completed successfully for user:", userId);
  } else {
    console.warn("[migration] migration completed with pending items", result);
  }

  return result;
}
