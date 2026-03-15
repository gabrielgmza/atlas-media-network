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

export const presidentMemory = [
  {
    id: "mem-001",
    type: "decision",
    title: "Invisible holding model confirmed",
    detail:
      "Atlas Media Network operates as an invisible holding while publications appear independent to the public.",
    priority: "high"
  },
  {
    id: "mem-002",
    type: "decision",
    title: "Pilot geography confirmed",
    detail:
      "The initial pilot is Argentina, starting with the national publication and the Mendoza provincial edition.",
    priority: "high"
  },
  {
    id: "mem-003",
    type: "infrastructure",
    title: "Vercel and Google Cloud SQL operational",
    detail:
      "The public platform runs on Vercel and article persistence is connected to Google Cloud SQL.",
    priority: "high"
  },
  {
    id: "mem-004",
    type: "governance",
    title: "Founder final authority",
    detail:
      "The AI President does not override the founder. It supports, analyzes, and executes under founder direction.",
    priority: "critical"
  }
];

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
