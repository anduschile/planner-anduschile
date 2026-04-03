PROJECT MASTER CONTEXT
1. Identidad del proyecto

Nombre del proyecto:
Binnacle – Panel de Dirección Personal

Propósito del sistema:
Crear un sistema digital personal que permita organizar proyectos, tareas, decisiones y continuidad de trabajo, actuando como un “cerebro externo” que reduzca la carga mental y mejore la ejecución.

Problema que busca resolver:

Pérdida de foco entre múltiples proyectos
Falta de continuidad entre sesiones de trabajo
Dependencia de memoria para retomar tareas
Dificultad para priorizar correctamente
Sensación de desorden operativo constante

Tipo de usuario objetivo:

Emprendedor multi-proyecto
Usuario individual con alta carga de iniciativas
Perfil orientado a ejecución más que a planificación teórica
2. Objetivo del sistema

El sistema busca convertirse en una herramienta central de dirección personal que:

Permita definir y priorizar proyectos estratégicos
Facilite la planificación diaria con foco real
Registre el avance de cada proyecto
Mantenga continuidad entre sesiones de trabajo
Permita tomar decisiones informadas sobre en qué trabajar

Problemas operativos que resuelve:

Qué hacer hoy
En qué proyecto enfocarse
Qué se hizo en sesiones anteriores
Qué sigue después

Decisiones que soporta:

Priorización de proyectos
Selección de tareas clave
Continuidad operativa
Asignación de tiempo

Resultados que entrega:

Claridad diaria
Continuidad mental
Reducción de fricción al retomar trabajo
Mejora en ejecución
3. Estado actual del proyecto

Etapa:
MVP funcional en desarrollo activo con transición a persistencia real

Componentes actuales:

UI funcional (React + Vite)
Gestión de proyectos
Gestión de tareas diarias
Bitácora por proyecto
Persistencia inicial en localStorage
Migración en curso a Supabase

Estado funcional:

Frontend completamente operativo
Lógica de negocio base implementada
Persistencia local funcionando
Migración a base de datos en progreso

Partes en desarrollo:

Persistencia en Supabase
Migración automática desde localStorage
Validación de consistencia de datos entre entornos
4. Arquitectura del sistema

Stack tecnológico:

Frontend: React + Vite + TypeScript
Estilos: TailwindCSS
Backend: Supabase (PostgreSQL + API)
Hosting: Web (subdominio propio)
Persistencia inicial: localStorage

Estructura actual:

App.tsx → lógica principal
panelData.ts → acceso a datos
supabase.ts → cliente Supabase
migration.ts → migración localStorage → Supabase

Decisión arquitectónica clave:

Migrar desde localStorage a Supabase para persistencia real multi-dispositivo
5. Modelo de datos y estructura lógica

Entidades principales:

binn_projects
id
name
area
objective
impact
urgency
effort
status
created_at
binn_tasks
id
project_id
title
task_date
is_key
status
created_at
binn_daily_logs
id
project_id
log_date
summary_today
next_session
later_pending
decisions
ai_prompt
created_at

Relaciones:

tasks → project_id → projects
daily_logs → project_id → projects

Reglas clave:

Un log por proyecto por día (unique project_id + log_date)
6. Lógica de negocio del sistema

Reglas principales:

Máximo 3 tareas clave por día
Score de proyecto = impacto * 2 + urgencia - esfuerzo
Bitácora obligatoria para continuidad
No trabajar fuera del sistema

Restricciones:

Tareas deben tener fecha
Logs son únicos por día/proyecto
Proyectos deben tener métricas (impacto, urgencia, esfuerzo)
7. Flujo operativo del sistema
Usuario crea proyectos
Define tareas diarias
Ejecuta trabajo
Registra bitácora
Retoma desde bitácora
Sistema mantiene continuidad

Origen de datos:

Usuario

Procesamiento:

Priorización
Registro
Organización

Output:

Lista de proyectos priorizados
Tareas del día
Bitácoras
8. Módulos del sistema
Proyectos
Propósito: gestión estratégica
Estado: activo
Hoy (tareas)
Propósito: ejecución diaria
Estado: activo
Bitácora
Propósito: continuidad
Estado: activo
Ideas
Propósito: backlog creativo
Estado: no implementado
Revisión
Propósito: análisis semanal/mensual
Estado: no implementado
9. Decisiones importantes ya tomadas
Uso de prefijo binn_ en base de datos
Migración a Supabase (decisión crítica)
Mantener UI simple (no sobreingeniería)
Bitácora como núcleo del sistema
Máximo 3 tareas clave por día
Sistema como “cerebro externo”
10. Problemas conocidos y riesgos
Dependencia previa de localStorage
Posible pérdida de datos en migración
Inconsistencias entre navegadores
Esquemas anteriores incompatibles
Riesgo de duplicación de datos en migración
11. Backlog del proyecto
Migración completa a Supabase
Importación de datos antiguos
Módulo Ideas
Módulo Revisión semanal
Métricas de productividad
Integración con IA
Exportación de datos
12. Supuestos del proyecto
Usuario usará sistema diariamente
Bitácora será mantenida
Máximo 3 tareas es suficiente
Usuario prioriza ejecución sobre planificación
13. Restricciones del proyecto
Supabase compartido con otros sistemas
Hardware limitado (16GB RAM)
Desarrollo individual
Sin backend custom (solo Supabase)
14. Principios de diseño del proyecto
Simplicidad > complejidad
Ejecución > planificación
Continuidad > memoria
Foco > multitarea
Datos > intuición
15. Historial resumido del desarrollo
Problema: desorden mental y falta de foco
Solución inicial: app con localStorage
Implementación UI completa
Problema detectado: datos no persistentes entre navegadores
Decisión: migración a Supabase
Implementación de migración automática
Ajuste de schema con prefijos
Validación en curso
16. Reglas para futuros chats
Usar este documento como base
No rediseñar arquitectura sin instrucción
Documentar cada cambio
Mantener continuidad
Priorizar ejecución
No sobreingeniería
Información que aún falta documentar
Flujo exacto de migración validado en producción
Manejo de errores en migración
Estrategia de deduplicación avanzada
Diseño final de módulo Ideas
Diseño de revisión semanal
Estrategia de autenticación futura
Seguridad (RLS real)
Métricas de uso del sistema
Diagnóstico final (importante)

Este documento ya deja claro algo clave:

👉 El proyecto pasó de ser un experimento local a un sistema serio.
👉 El siguiente punto crítico es cerrar la migración correctamente.

Si eso falla, todo lo demás pierde sentido.