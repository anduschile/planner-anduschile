import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..");

const STORAGE_KEY = "panel-direccion-personal";
const backupFiles = [
  "backup-localstorage-chrome-2026-04-03.json",
  "backup-localstorage-comet-2026-04-03.json",
];

function parseDotEnv(content) {
  const result = {};

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const separatorIndex = line.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim();
    let value = line.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    result[key] = value;
  }

  return result;
}

async function loadEnvFile(filename) {
  try {
    const content = await readFile(path.join(projectRoot, filename), "utf8");
    return parseDotEnv(content);
  } catch {
    return {};
  }
}

async function loadImportEnv() {
  const [envFile, envLocalFile] = await Promise.all([
    loadEnvFile(".env"),
    loadEnvFile(".env.local"),
  ]);

  const merged = {
    ...envFile,
    ...envLocalFile,
    ...process.env,
  };

  const supabaseUrl = merged.SUPABASE_URL || merged.VITE_SUPABASE_URL;
  const serviceRoleKey = merged.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Falta SUPABASE_URL o VITE_SUPABASE_URL en .env, .env.local o variables de entorno."
    );
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Falta SUPABASE_SERVICE_ROLE_KEY. Este script debe ejecutarse localmente con service role, no con anon key."
    );
  }

  return {
    supabaseUrl,
    serviceRoleKey,
  };
}

function extractBalancedJsonObject(text, startIndex) {
  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let index = startIndex; index < text.length; index += 1) {
    const char = text[index];

    if (inString) {
      if (escaping) {
        escaping = false;
        continue;
      }

      if (char === "\\") {
        escaping = true;
        continue;
      }

      if (char === '"') {
        inString = false;
      }

      continue;
    }

    if (char === '"') {
      inString = true;
      continue;
    }

    if (char === "{") {
      depth += 1;
      continue;
    }

    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(startIndex, index + 1);
      }
    }
  }

  throw new Error("No se pudo encontrar un objeto JSON balanceado en el respaldo.");
}

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
    return `{${entries
      .map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function safeIsoDate(value) {
  if (typeof value === "string" && value.trim()) {
    return value;
  }

  return new Date().toISOString();
}

function isRecord(value) {
  return typeof value === "object" && value !== null;
}

function parseBackupPayload(rawContent, sourceName) {
  const keyIndex = rawContent.indexOf(STORAGE_KEY);
  if (keyIndex === -1) {
    throw new Error(`No se encontró la clave ${STORAGE_KEY} en ${sourceName}.`);
  }

  const objectStart = rawContent.indexOf("{", keyIndex);
  if (objectStart === -1) {
    throw new Error(`No se encontró el inicio del objeto JSON en ${sourceName}.`);
  }

  const jsonObject = extractBalancedJsonObject(rawContent, objectStart);
  const parsed = JSON.parse(jsonObject);

  if (!isRecord(parsed)) {
    throw new Error(`El contenido de ${sourceName} no tiene estructura válida.`);
  }

  return {
    projects: Array.isArray(parsed.projects) ? parsed.projects : [],
    tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
    dailyLogs: Array.isArray(parsed.dailyLogs) ? parsed.dailyLogs : [],
  };
}

function mergeById(items, entityName, conflicts) {
  const byId = new Map();

  for (const item of items) {
    if (!item?.id || typeof item.id !== "string") continue;

    const existing = byId.get(item.id);
    if (!existing) {
      byId.set(item.id, item);
      continue;
    }

    if (stableStringify(existing) !== stableStringify(item)) {
      conflicts.push({
        entity: entityName,
        id: item.id,
        sources: [existing.__source, item.__source],
      });
    }

    byId.set(item.id, item);
  }

  return Array.from(byId.values());
}

function mapProject(project) {
  return {
    id: project.id,
    name: project.name,
    area: project.area,
    objective: project.objective ?? "",
    impact: Number(project.impact ?? 1),
    urgency: Number(project.urgency ?? 1),
    effort: Number(project.effort ?? 1),
    status: project.status,
    created_at: safeIsoDate(project.createdAt),
  };
}

function mapTask(task) {
  return {
    id: task.id,
    project_id: typeof task.projectId === "string" ? task.projectId : null,
    title: task.title,
    task_date: task.date,
    is_key: Boolean(task.isKey),
    status: task.status,
    created_at: safeIsoDate(task.createdAt),
  };
}

function mapDailyLog(log) {
  return {
    id: log.id,
    project_id: log.projectId,
    log_date: log.date,
    summary_today: log.summaryToday ?? "",
    next_session: log.nextSession ?? "",
    later_pending: log.laterPending ?? "",
    decisions: log.decisions ?? "",
    ai_prompt: log.aiPrompt ?? "",
    created_at: safeIsoDate(log.createdAt),
  };
}

function chunk(array, size) {
  const result = [];

  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }

  return result;
}

async function upsertInChunks(supabase, table, rows, options = {}) {
  if (rows.length === 0) return 0;

  let total = 0;
  const chunks = chunk(rows, 200);

  for (const rowsChunk of chunks) {
    const { error } = await supabase
      .from(table)
      .upsert(rowsChunk, options);

    if (error) {
      throw error;
    }

    total += rowsChunk.length;
  }

  return total;
}

function findSimilarProjectNames(importProjects, existingProjects) {
  const allProjects = [
    ...existingProjects.map((project) => ({
      id: project.id,
      name: project.name,
      source: "supabase",
      normalized: normalizeText(project.name),
    })),
    ...importProjects.map((project) => ({
      id: project.id,
      name: project.name,
      source: project.__source,
      normalized: normalizeText(project.name),
    })),
  ];

  const results = [];
  const seen = new Set();

  for (let i = 0; i < allProjects.length; i += 1) {
    for (let j = i + 1; j < allProjects.length; j += 1) {
      const left = allProjects[i];
      const right = allProjects[j];

      if (!left.normalized || !right.normalized) continue;
      if (left.id === right.id) continue;
      if (left.normalized !== right.normalized) continue;

      const key = [left.id, right.id].sort().join("::");
      if (seen.has(key)) continue;
      seen.add(key);

      results.push({
        left: { id: left.id, name: left.name, source: left.source },
        right: { id: right.id, name: right.name, source: right.source },
      });
    }
  }

  return results;
}

async function main() {
  const { supabaseUrl, serviceRoleKey } = await loadImportEnv();
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const rawBackups = await Promise.all(
    backupFiles.map(async (filename) => {
      const fullPath = path.join(projectRoot, filename);
      const rawContent = await readFile(fullPath, "utf8");
      const parsed = parseBackupPayload(rawContent, filename);

      return {
        filename,
        projects: parsed.projects.map((item) => ({ ...item, __source: filename })),
        tasks: parsed.tasks.map((item) => ({ ...item, __source: filename })),
        dailyLogs: parsed.dailyLogs.map((item) => ({ ...item, __source: filename })),
      };
    })
  );

  const conflicts = [];

  const mergedProjects = mergeById(
    rawBackups.flatMap((backup) => backup.projects),
    "projects",
    conflicts
  );
  const mergedTasks = mergeById(
    rawBackups.flatMap((backup) => backup.tasks),
    "tasks",
    conflicts
  );
  const mergedDailyLogs = mergeById(
    rawBackups.flatMap((backup) => backup.dailyLogs),
    "dailyLogs",
    conflicts
  );

  console.log("[import] respaldos leídos:", backupFiles);
  console.log("[import] registros encontrados:", {
    projects: mergedProjects.length,
    tasks: mergedTasks.length,
    dailyLogs: mergedDailyLogs.length,
  });

  const projectRows = mergedProjects.map(mapProject);
  const taskRows = mergedTasks.map(mapTask);
  const dailyLogRows = mergedDailyLogs.map(mapDailyLog);

  const [{ data: existingProjects, error: existingProjectsError }, { data: existingDailyLogs, error: existingDailyLogsError }] =
    await Promise.all([
      supabase.from("binn_projects").select("id, name"),
      supabase.from("binn_daily_logs").select("id, project_id, log_date"),
    ]);

  if (existingProjectsError) throw existingProjectsError;
  if (existingDailyLogsError) throw existingDailyLogsError;

  const similarProjects = findSimilarProjectNames(
    mergedProjects,
    existingProjects ?? []
  );

  const validProjectIds = new Set([
    ...projectRows.map((row) => row.id),
    ...(existingProjects ?? []).map((row) => row.id),
  ]);

  const orphanTasks = taskRows.filter(
    (row) => row.project_id && !validProjectIds.has(row.project_id)
  );
  const orphanDailyLogs = dailyLogRows.filter(
    (row) => row.project_id && !validProjectIds.has(row.project_id)
  );

  const filteredTaskRows = taskRows.filter(
    (row) => !row.project_id || validProjectIds.has(row.project_id)
  );
  const filteredDailyLogRows = dailyLogRows.filter((row) =>
    validProjectIds.has(row.project_id)
  );

  const dailyLogIdByComposite = new Map(
    (existingDailyLogs ?? []).map((row) => [`${row.project_id}::${row.log_date}`, row.id])
  );

  const dailyLogRowsWithResolvedIds = filteredDailyLogRows.map((row) => {
    const existingId = dailyLogIdByComposite.get(`${row.project_id}::${row.log_date}`);
    return {
      ...row,
      id: existingId ?? row.id,
    };
  });

  const importedProjects = await upsertInChunks(supabase, "binn_projects", projectRows, {
    onConflict: "id",
  });

  const importedTasks = await upsertInChunks(supabase, "binn_tasks", filteredTaskRows, {
    onConflict: "id",
  });

  const importedDailyLogs = await upsertInChunks(
    supabase,
    "binn_daily_logs",
    dailyLogRowsWithResolvedIds,
    { onConflict: "project_id,log_date" }
  );

  console.log("");
  console.log("=== IMPORT SUMMARY ===");
  console.log("Proyectos importados:", importedProjects);
  console.log("Tareas importadas:", importedTasks);
  console.log("Bitácoras importadas:", importedDailyLogs);
  console.log("Conflictos detectados:", conflicts.length);
  console.log("Tareas omitidas por project_id huérfano:", orphanTasks.length);
  console.log("Bitácoras omitidas por project_id huérfano:", orphanDailyLogs.length);

  if (conflicts.length > 0) {
    console.log("");
    console.log("Conflictos por mismo id con contenido distinto:");
    for (const conflict of conflicts) {
      console.log(
        `- ${conflict.entity} id=${conflict.id} sources=${conflict.sources.join(", ")}`
      );
    }
  }

  console.log("");
  console.log(
    "Posibles duplicados por nombre parecido pero distinto id:",
    similarProjects.length
  );

  if (similarProjects.length > 0) {
    for (const duplicate of similarProjects) {
      console.log(
        `- "${duplicate.left.name}" (${duplicate.left.id}, ${duplicate.left.source}) <-> "${duplicate.right.name}" (${duplicate.right.id}, ${duplicate.right.source})`
      );
    }
  }

  if (orphanTasks.length > 0) {
    console.log("");
    console.log("Tareas omitidas por referencia inválida:");
    for (const task of orphanTasks) {
      console.log(`- ${task.id} -> project_id=${task.project_id}`);
    }
  }

  if (orphanDailyLogs.length > 0) {
    console.log("");
    console.log("Bitácoras omitidas por referencia inválida:");
    for (const log of orphanDailyLogs) {
      console.log(`- ${log.id} -> project_id=${log.project_id} log_date=${log.log_date}`);
    }
  }
}

main().catch((error) => {
  console.error("[import] import failed:", error);
  process.exitCode = 1;
});
