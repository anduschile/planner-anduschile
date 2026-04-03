import { getSupabaseClient } from "./supabase";
import type { DailyLog, NewProjectInput, Project, Task, TaskStatus } from "../types";

type ProjectRow = {
  id: string;
  created_at: string;
  name: string;
  area: Project["area"];
  objective: string;
  impact: number;
  urgency: number;
  effort: number;
  status: Project["status"];
};

type TaskRow = {
  id: string;
  created_at: string;
  project_id: string | null;
  title: string;
  task_date: string;
  is_key: boolean;
  status: TaskStatus;
};

type DailyLogRow = {
  id: string;
  created_at: string;
  project_id: string;
  log_date: string;
  summary_today: string;
  next_session: string;
  later_pending: string;
  decisions: string;
  ai_prompt: string | null;
};

type NewTaskInput = {
  title: string;
  date: string;
  projectId?: string;
  isKey: boolean;
};

type SaveDailyLogInput = Omit<DailyLog, "id"> & { id?: string };

type PanelData = {
  projects: Project[];
  tasks: Task[];
  dailyLogs: DailyLog[];
};

const projectSelect =
  "id, created_at, name, area, objective, impact, urgency, effort, status";
const taskSelect =
  "id, created_at, project_id, title, task_date, is_key, status";
const dailyLogSelect =
  "id, created_at, project_id, log_date, summary_today, next_session, later_pending, decisions, ai_prompt";

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    createdAt: row.created_at,
    name: row.name,
    area: row.area,
    objective: row.objective,
    impact: row.impact,
    urgency: row.urgency,
    effort: row.effort,
    status: row.status,
  };
}

function mapTask(row: TaskRow): Task {
  return {
    id: row.id,
    projectId: row.project_id ?? undefined,
    title: row.title,
    date: row.task_date,
    isKey: row.is_key,
    status: row.status,
  };
}

function mapDailyLog(row: DailyLogRow): DailyLog {
  return {
    id: row.id,
    projectId: row.project_id,
    date: row.log_date,
    summaryToday: row.summary_today,
    nextSession: row.next_session,
    laterPending: row.later_pending,
    decisions: row.decisions,
    aiPrompt: row.ai_prompt ?? "",
  };
}

export async function fetchPanelData(): Promise<PanelData> {
  const supabase = getSupabaseClient();

  const [{ data: projectRows, error: projectsError }, { data: taskRows, error: tasksError }, { data: dailyLogRows, error: dailyLogsError }] =
    await Promise.all([
      supabase.from("binn_projects").select(projectSelect).order("created_at", { ascending: true }),
      supabase.from("binn_tasks").select(taskSelect).order("task_date", { ascending: true }).order("created_at", { ascending: true }),
      supabase.from("binn_daily_logs").select(dailyLogSelect).order("log_date", { ascending: false }).order("created_at", { ascending: false }),
    ]);

  if (projectsError) throw projectsError;
  if (tasksError) throw tasksError;
  if (dailyLogsError) throw dailyLogsError;

  return {
    projects: (projectRows ?? []).map(mapProject),
    tasks: (taskRows ?? []).map(mapTask),
    dailyLogs: (dailyLogRows ?? []).map(mapDailyLog),
  };
}

export async function createProject(input: NewProjectInput): Promise<Project> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("binn_projects")
    .insert({
      name: input.name,
      area: input.area,
      objective: input.objective,
      impact: input.impact,
      urgency: input.urgency,
      effort: input.effort,
      status: input.status,
    })
    .select(projectSelect)
    .single();

  if (error) throw error;

  return mapProject(data as ProjectRow);
}

export async function createTask(input: NewTaskInput): Promise<Task> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("binn_tasks")
    .insert({
      title: input.title,
      task_date: input.date,
      project_id: input.projectId ?? null,
      is_key: input.isKey,
      status: "Pendiente",
    })
    .select(taskSelect)
    .single();

  if (error) throw error;

  return mapTask(data as TaskRow);
}

export async function updateTaskStatus(taskId: string, status: TaskStatus): Promise<Task> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("binn_tasks")
    .update({ status })
    .eq("id", taskId)
    .select(taskSelect)
    .single();

  if (error) throw error;

  return mapTask(data as TaskRow);
}

export async function saveDailyLog(input: SaveDailyLogInput): Promise<DailyLog> {
  const supabase = getSupabaseClient();

  const payload = {
    id: input.id || undefined,
    project_id: input.projectId,
    log_date: input.date,
    summary_today: input.summaryToday,
    next_session: input.nextSession,
    later_pending: input.laterPending,
    decisions: input.decisions,
    ai_prompt: input.aiPrompt ?? "",
  };

  const { data, error } = await supabase
    .from("binn_daily_logs")
    .upsert(payload, { onConflict: "project_id,log_date" })
    .select(dailyLogSelect)
    .single();

  if (error) throw error;

  return mapDailyLog(data as DailyLogRow);
}
