import { getSupabaseClient } from "./supabase";
import type {
  DailyLog,
  Idea,
  NewProjectInput,
  Project,
  ProjectDependencyCounts,
  Review,
  ReviewType,
  Task,
  TaskStatus,
  TaskTemplate,
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

type TaskTemplateRow = {
  id: string;
  created_at: string;
  user_id: string;
  title: string;
  area: string | null;
};

type IdeaRow = {
  id: string;
  created_at: string;
  user_id: string;
  title: string;
  description: string;
  impact: number;
  effort: number;
  linked_project_id: string | null;
  state: Idea["state"];
};

type ReviewRow = {
  id: string;
  created_at: string;
  user_id: string;
  review_date: string;
  review_type: ReviewType;
  notes: string;
};

type NewTaskInput = {
  title: string;
  date: string;
  projectId?: string;
  isKey: boolean;
};

type SaveDailyLogInput = Omit<DailyLog, "id"> & { id?: string };

type NewIdeaInput = {
  title: string;
  description: string;
  impact: number;
  effort: number;
  linkedProjectId?: string;
  state: Idea["state"];
};

type NewReviewInput = {
  date: string;
  type: ReviewType;
  notes: string;
};

type PanelData = {
  projects: Project[];
  tasks: Task[];
  dailyLogs: DailyLog[];
  ideas: Idea[];
  reviews: Review[];
};

const projectSelect =
  "id, created_at, user_id, name, area, objective, impact, urgency, effort, status";
const taskSelect =
  "id, created_at, user_id, project_id, title, task_date, is_key, status";
const dailyLogSelect =
  "id, created_at, user_id, project_id, log_date, summary_today, next_session, later_pending, decisions, ai_prompt";
const ideaSelect =
  "id, created_at, user_id, title, description, impact, effort, linked_project_id, state";
const reviewSelect =
  "id, created_at, user_id, review_date, review_type, notes";

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

function mapTaskTemplate(row: TaskTemplateRow): TaskTemplate {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    area: row.area ?? undefined,
    createdAt: row.created_at,
  };
}

function mapIdea(row: IdeaRow): Idea {
  return {
    id: row.id,
    userId: row.user_id,
    title: row.title,
    description: row.description,
    impact: row.impact,
    effort: row.effort,
    linkedProjectId: row.linked_project_id ?? undefined,
    state: row.state,
    createdAt: row.created_at,
  };
}

function mapReview(row: ReviewRow): Review {
  return {
    id: row.id,
    userId: row.user_id,
    date: row.review_date,
    type: row.review_type,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

export async function fetchPanelData(userId: string): Promise<PanelData> {
  const supabase = getSupabaseClient();

  const [{ data: projectRows, error: projectsError }, { data: taskRows, error: tasksError }, { data: dailyLogRows, error: dailyLogsError }, { data: ideaRows, error: ideasError }, { data: reviewRows, error: reviewsError }] =
    await Promise.all([
      supabase.from("binn_projects").select(projectSelect).eq("user_id", userId).order("created_at", { ascending: true }),
      supabase.from("binn_tasks").select(taskSelect).eq("user_id", userId).order("task_date", { ascending: true }).order("created_at", { ascending: true }),
      supabase.from("binn_daily_logs").select(dailyLogSelect).eq("user_id", userId).order("log_date", { ascending: false }).order("created_at", { ascending: false }),
      supabase.from("binn_ideas").select(ideaSelect).eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("binn_reviews").select(reviewSelect).eq("user_id", userId).order("review_date", { ascending: false }),
    ]);

  if (projectsError) throw projectsError;
  if (tasksError) throw tasksError;
  if (dailyLogsError) throw dailyLogsError;
  if (ideasError) throw ideasError;
  if (reviewsError) throw reviewsError;

  return {
    projects: (projectRows ?? []).map(mapProject),
    tasks: (taskRows ?? []).map(mapTask),
    dailyLogs: (dailyLogRows ?? []).map(mapDailyLog),
    ideas: (ideaRows ?? []).map(mapIdea),
    reviews: (reviewRows ?? []).map(mapReview),
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

export async function updateTask(taskId: string, input: NewTaskInput, userId: string): Promise<Task> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("binn_tasks")
    .update({
      title: input.title,
      task_date: input.date,
      project_id: input.projectId ?? null,
      is_key: input.isKey,
    })
    .eq("id", taskId)
    .eq("user_id", userId)
    .select(taskSelect)
    .single();

  if (error) throw error;

  return mapTask(data as TaskRow);
}

export async function deleteTask(taskId: string, userId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("binn_tasks")
    .delete()
    .eq("id", taskId)
    .eq("user_id", userId);

  if (error) throw error;
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

export async function fetchTaskTemplates(userId: string): Promise<TaskTemplate[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("binn_task_templates")
    .select("id, created_at, user_id, title, area")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data ?? []).map(mapTaskTemplate);
}

export async function createTaskTemplate(title: string, area: string | undefined, userId: string): Promise<TaskTemplate> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("binn_task_templates")
    .insert({
      user_id: userId,
      title,
      area: area ?? null,
    })
    .select("id, created_at, user_id, title, area")
    .single();

  if (error) throw error;

  return mapTaskTemplate(data as TaskTemplateRow);
}

export async function deleteTaskTemplate(templateId: string, userId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("binn_task_templates")
    .delete()
    .eq("id", templateId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function createIdea(input: NewIdeaInput, userId: string): Promise<Idea> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("binn_ideas")
    .insert({
      user_id: userId,
      title: input.title,
      description: input.description,
      impact: input.impact,
      effort: input.effort,
      linked_project_id: input.linkedProjectId ?? null,
      state: input.state,
    })
    .select(ideaSelect)
    .single();

  if (error) throw error;

  return mapIdea(data as IdeaRow);
}

export async function updateIdea(ideaId: string, input: NewIdeaInput, userId: string): Promise<Idea> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("binn_ideas")
    .update({
      title: input.title,
      description: input.description,
      impact: input.impact,
      effort: input.effort,
      linked_project_id: input.linkedProjectId ?? null,
      state: input.state,
    })
    .eq("id", ideaId)
    .eq("user_id", userId)
    .select(ideaSelect)
    .single();

  if (error) throw error;

  return mapIdea(data as IdeaRow);
}

export async function deleteIdea(ideaId: string, userId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("binn_ideas")
    .delete()
    .eq("id", ideaId)
    .eq("user_id", userId);

  if (error) throw error;
}

export async function createReview(input: NewReviewInput, userId: string): Promise<Review> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("binn_reviews")
    .insert({
      user_id: userId,
      review_date: input.date,
      review_type: input.type,
      notes: input.notes,
    })
    .select(reviewSelect)
    .single();

  if (error) throw error;

  return mapReview(data as ReviewRow);
}

export async function updateReview(reviewId: string, input: NewReviewInput, userId: string): Promise<Review> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from("binn_reviews")
    .update({
      review_date: input.date,
      review_type: input.type,
      notes: input.notes,
    })
    .eq("id", reviewId)
    .eq("user_id", userId)
    .select(reviewSelect)
    .single();

  if (error) throw error;

  return mapReview(data as ReviewRow);
}

export async function deleteReview(reviewId: string, userId: string): Promise<void> {
  const supabase = getSupabaseClient();

  const { error } = await supabase
    .from("binn_reviews")
    .delete()
    .eq("id", reviewId)
    .eq("user_id", userId);

  if (error) throw error;
}
