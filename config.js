// ─────────────────────────────────────────────
//  AGENT PLATFORM — CONFIG
//  Edit this file only. Nothing else needs changing.
// ─────────────────────────────────────────────

const CONFIG = {
  app: {
    name: 'Agent Platform',
    version: '1.0.0',
  },

  // ── AI Provider (OpenRouter) ──────────────────
  // The API key is NOT here — it lives server-side as the
  // OPENROUTER_API_KEY env var and is used by /api/ai.js.
  ai: {
    // FREE phase — Llama 3.3 70B (no cost, no card)
    model: 'meta-llama/llama-3.3-70b-instruct:free',

    // PAID phase — uncomment one line below, comment the free line above
    // model: 'openai/gpt-4o-mini',
    // model: 'openai/gpt-4o',

    maxTokens: 4000,
    temperature: 0.3,
  },

  // ── Supabase ──────────────────────────────────
  supabase: {
    url: 'https://jwawqbbhnatvjengfnpy.supabase.co',               // Settings → API → Project URL
    anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3YXdxYmJobmF0dmplbmdmbnB5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MTcwMDIsImV4cCI6MjA5NzA5MzAwMn0.ggtHSGjgrQSBu9CgD9VoA1-tFMM8v7xPSibmcW52GBs',      // Settings → API → anon public
  },

  // ── Feature flags ─────────────────────────────
  features: {
    riskAnalysis: true,
    brdGeneration: true,
    versionHistory: true,
    exportPDF: true,
    exportCSV: true,
    activityLog: true,
    bulkActions: true,
  },
};

// Do not edit below this line
if (typeof module !== 'undefined') module.exports = CONFIG;
