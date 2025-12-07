export type Area = "Negocio" | "Personal" | "Salud" | "Familia" | "Otro";

export type ProjectStatus = "Idea" | "En marcha" | "Pausado" | "Cerrado";

export type TaskStatus = "Pendiente" | "En curso" | "Hecha";

export type ReviewType = "semanal" | "mensual";

export interface Project {
  id: string;
  name: string;
  area: Area;
  objective: string;
  impact: number;   // 1-5
  urgency: number;  // 1-5
  effort: number;   // 1-5
  status: ProjectStatus;
  createdAt: string; // ISO
}

export interface Task {
  id: string;
  projectId?: string;
  title: string;
  date: string;       // "2025-12-05"
  isKey: boolean;     // Tarea clave del día
  status: TaskStatus;
}

export interface Idea {
  id: string;
  title: string;
  description: string;
  impact: number;
  effort: number;
  linkedProjectId?: string;
  state: "Idea" | "A evaluar" | "Aprobada" | "Descartada";
  createdAt: string;
}

export interface DailyLog {
  id: string;
  projectId: string;
  date: string;       // "YYYY-MM-DD"
  summaryToday: string;   // En qué quedé hoy
  nextSession: string;    // Qué debería hacer la próxima vez
  laterPending: string;   // Pendientes más adelante
  decisions: string;      // Notas / decisiones
  aiPrompt?: string;      // Texto listo para IA
}

export interface Review {
  id: string;
  date: string;
  type: ReviewType;
  notes: string;
}

export interface AppState {
  projects: Project[];
  tasks: Task[];
  ideas: Idea[];
  dailyLogs: DailyLog[];
  reviews: Review[];
}

export interface NewProjectInput {
  name: string;
  area: Area;
  objective: string;
  impact: number;
  urgency: number;
  effort: number;
  status: ProjectStatus;
}
