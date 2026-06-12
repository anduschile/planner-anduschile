import { getSupabaseClient } from "./supabase";
import type {
  DailyLog,
  NewProjectInput,
  Project,
  ProjectDependencyCounts,
  Task,
  TaskStatus,
} from "../types";

type ProjectRow = {
  id: string;
  created_at: string;
  user_id: string;
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
  user_id: string;
  project_id: string | null;
  title: string;
  task_date: string;
  is_key: boolean;
  status: TaskStatus;
};

type DailyLogRow = {
  id: string;
  created_at: string;
  user_id: string;
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
  "id, created_at, user_id, name, area, objective, impact, urgency, effort, status";
const taskSelect =
  "id, created_at, user_id, project_id, title, task_date, is_key, status";
const dailyLogSelect =
  "id, created_at, user_id, project_id, log_date, summary_today, next_session, later_pending, decisions, ai_prompt";

function mapProject(row: ProjectRow): Project {
  return {
    id: row.id,
    userId: row.user_id,
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
    userId: row.user_id,
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
    userId: row.user_id,
    projectId: row.project_id,
    date: row.log_date,
    summaryToday: row.summary_today,
    nextSession: row.next_session,
    laterPending: row.later_pending,
    decisions: row.decisions,
    aiPrompt: row.ai_prompt ?? "",
  };
}

export async function fetchPanelData(userId: string): Promise<PanelData> {
  const supabase = getSupabaseClient();

  const [{ data: projectRows, error: projectsError }, { data: taskRows, error: tasksError }, { data: dailyLogRows, error: dailyLogsError }] =
    await Promise.all([
      supabase.from("binn_projects").select(projectSelect).eq("user_id", userId).order("created_at", { ascending: true }),
      supabase.from("binn_tasks").select(taskSelect).eq("user_id", userId).order("task_date", { ascending: true }).order("created_at", { ascending: true }),
      supabase.from("binn_daily_logs").select(dailyLogSelect).eq("user_id", userId).order("log_date", { ascending: false }).order("created_at", { ascending: false }),
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

export async function createProject(input: NewProjectInput, userId: string): Promise<Project> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("binn_projects")
    .insert({
      user_id: userId,
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

export async function updateProject(
  projectId: string,
  input: NewProjectInput,
  userId: string
): Promise<Project> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("binn_projects")
    .update({
      name: input.name,
      area: input.area,
      objective: input.objective,
      impact: input.impact,
      urgency: input.urgency,
      effort: input.effort,
      status: input.status,
    })
    .eq("id", projectId)
    .eq("user_id", userId)
    .select(projectSelect)
    .single();

  if (error) throw error;

  return mapProject(data as ProjectRow);
}

export async function getProjectDependencyCounts(
  projectId: string,
  userId: string
): Promise<ProjectDependencyCounts> {
  const supabase = getSupabaseClient();

  const [{ count: tasksCount, error: tasksError }, { count: dailyLogsCount, error: dailyLogsError }] =
    await Promise.all([
      supabase
        .from("binn_tasks")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("user_id", userId),
      supabase
        .from("binn_daily_logs")
        .select("*", { count: "exact", head: true })
        .eq("project_id", projectId)
        .eq("user_id", userId),
    ]);

  if (tasksError) throw tasksError;
  if (dailyLogsError) throw dailyLogsError;

  return {
    tasks: tasksCount ?? 0,
    dailyLogs: dailyLogsCount ?? 0,
  };
}

export async function deleteProject(projectId: string, userId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("binn_projects")
    .delete()
    .eq("id", projectId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function createTask(input: NewTaskInput, userId: string): Promise<Task> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("binn_tasks")
    .insert({
      user_id: userId,
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

export async function updateTaskStatus(taskId: string, status: TaskStatus, userId: string): Promise<Task> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("binn_tasks")
    .update({ status })
    .eq("id", taskId)
    .eq("user_id", userId)
    .select(taskSelect)
    .single();

  if (error) throw error;

  return mapTask(data as TaskRow);
}

export async function saveDailyLog(input: SaveDailyLogInput, userId: string): Promise<DailyLog> {
  const supabase = getSupabaseClient();

  const payload = {
    id: input.id || undefined,
    user_id: userId,
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
    .upsert(payload, { onConflict: "user_id,project_id,log_date" })
    .select(dailyLogSelect)
    .single();

  if (error) throw error;

  return mapDailyLog(data as DailyLogRow);
}
