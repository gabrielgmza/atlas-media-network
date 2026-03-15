import { getDb } from "./db";

export const atlasPresidentState = {
  system: {
    name: "AI President OS",
    version: "v1",
    mode: "Founder-led execution",
    status: "Active"
  },
  founderRule:
    "The founder has final authority. AI President can analyze, suggest, optimize, and warn, but execution follows the founder's decision.",
  priorities: [
    "Stabilize the editorial pilot",
    "Operate Argentina Post and Argentina Post Mendoza",
    "Build structured newsroom operations",
    "Prepare monetization and expansion systems"
  ],
  boardStatus: {
    executiveBoard: "Configured",
    newsroom: "Configured",
    editorialInfrastructure: "Active",
    publicWeb: "Active",
    cloudDatabase: "Connected"
  }
};

export const presidentDepartments = [
  {
    id: "pres-news",
    name: "Atlas News",
    status: "active",
    focus: "Editorial operations, newsroom structure, publication quality"
  },
  {
    id: "pres-advertising",
    name: "Atlas Advertising",
    status: "planned",
    focus: "Revenue systems, advertiser discovery, monetization structure"
  },
  {
    id: "pres-infrastructure",
    name: "Atlas Digital Infrastructure",
    status: "active",
    focus: "Vercel deployment, APIs, database, platform reliability"
  }
];

export const presidentTasks = [
  {
    id: "task-001",
    title: "Operate structured editorial model",
    owner: "AI Editorial Director",
    status: "in-progress"
  },
  {
    id: "task-002",
    title: "Expand internal editorial workflows",
    owner: "AI Technology Director",
    status: "queued"
  },
  {
    id: "task-003",
    title: "Prepare monetization layer",
    owner: "AI Revenue Director",
    status: "queued"
  }
];

export async function getPresidentMemory() {
  try {
    const db = getDb();
    const result = await db.query(`
      select id, type, title, detail, priority, created_at
      from public.president_memory
      order by created_at desc
    `);
    return result.rows;
  } catch (error) {
    console.error("PRESIDENT_MEMORY_READ_ERROR", error.message);
    return [];
  }
}

export async function getPresidentDecisions() {
  try {
    const db = getDb();
    const result = await db.query(`
      select id, title, decision, rationale, status, created_at
      from public.president_decisions
      order by created_at desc
    `);
    return result.rows;
  } catch (error) {
    console.error("PRESIDENT_DECISIONS_READ_ERROR", error.message);
    return [];
  }
}

export async function createPresidentMemory(input) {
  const db = getDb();
  const result = await db.query(
    `
      insert into public.president_memory (
        id, type, title, detail, priority, created_at
      )
      values ($1,$2,$3,$4,$5,$6)
      returning id, type, title, detail, priority, created_at
    `,
    [
      input.id,
      input.type,
      input.title,
      input.detail,
      input.priority,
      input.createdAt
    ]
  );
  return result.rows[0];
}

export async function createPresidentDecision(input) {
  const db = getDb();
  const result = await db.query(
    `
      insert into public.president_decisions (
        id, title, decision, rationale, status, created_at
      )
      values ($1,$2,$3,$4,$5,$6)
      returning id, title, decision, rationale, status, created_at
    `,
    [
      input.id,
      input.title,
      input.decision,
      input.rationale,
      input.status,
      input.createdAt
    ]
  );
  return result.rows[0];
}
