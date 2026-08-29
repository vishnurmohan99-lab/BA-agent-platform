# AgentPlatform

AI-assisted BA/PM platform: user stories, test cases, risks, releases, sprints, knowledge base.

- **Live:** https://ba-agent-platform.vercel.app (`main` auto-deploys via Vercel)
- **Stack:** pure static HTML/CSS/JS — no framework, no bundler, no build step. Supabase (auth + Postgres + RLS), Vercel serverless functions (`/api/*.js`, CommonJS), OpenRouter LLMs.

## Commands

```bash
vercel dev        # local dev on http://localhost:3000 — reads .env.local
```

Deploy = `git push origin main`. **Ask before pushing or opening a PR.**

## Layout

| File | Purpose |
|---|---|
| `config.js` | Public `CONFIG` — Supabase URL/anonKey, AI model, feature flags. Tracked in git. |
| `supabase.js` | Global `DB` — all Supabase calls, namespaced (`DB.auth`, `DB.projects`, `DB.stories`, `DB.tests`, `DB.uat`, `DB.risks`, `DB.defects`, `DB.releases`, `DB.knowledge`, `DB.agentConfig`, `DB.members`, `DB.sprints`, `DB.activity`). Also `DB.requireAuth()`. |
| `agent.js` | Global `AI` — `AI.call()` → `/api/ai` (3 retries on 429/provider errors), `AI.buildSystemPrompt()`, `AI.parseJSON()`. |
| `nav.js` | Global `Nav` — injects sidebar (220px). Collapses to hamburger + overlay at ≤1024px. `Nav.init()` guards auth. |
| `animations.css` | Shared keyframes (fadeUp, fadeIn, slideInLeft, scaleIn, pulse). |
| `api/ai.js` | OpenRouter proxy. Reads `OPENROUTER_API_KEY`; tries requested model then `FALLBACK_MODELS`. |
| `agents/ba-agent.js`, `agents/qa-agent.js` | Prompt/persona logic for story and test generation. |

Pages: `index` (dashboard), `stories`, `risks`, `tests`, `releases`, `sprints`, `knowledge`, `activity`, `settings`, `login`.

## Script order (every protected page)

```html
<link rel="stylesheet" href="animations.css">
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.39.7/dist/umd/supabase.js"></script>
<script src="config.js"></script>
<script src="supabase.js"></script>
<!-- nav.js, agent.js, page script after -->
```

Then `await Nav.init()` on load — it calls `DB.requireAuth()`, hides body and redirects to `login.html` if there's no session.

## Tables

`users`, `projects`, `project_members` (roles: admin/approver/editor/viewer), `user_stories`, `story_versions`, `story_comments`, `test_cases`, `uat_sessions`, `uat_results`, `defects`, `risks`, `phases`, `releases`, `story_release_map`, `sprints`, `sprint_stories`, `knowledge_docs`, `project_agent_config`, `activity_log`.

## RLS rules (learned the hard way)

- `.insert().select().single()` applies the SELECT policy *before* the membership row exists. Fix already in place: `projects.created_by uuid DEFAULT auth.uid()`.
  - SELECT: `created_by = auth.uid() OR id IN (SELECT project_id FROM project_members WHERE user_id = auth.uid())`
  - INSERT: `WITH CHECK (created_by = auth.uid())`
- `project_members` policies must use `user_id = auth.uid()` directly — **never** self-reference the table (infinite recursion).
- Always `DROP POLICY IF EXISTS "name" ON table;` before `CREATE POLICY`.

## Security (non-negotiable)

1. `OPENROUTER_API_KEY` lives **only** in Vercel env vars + `.env.local`. Never in `config.js`, any client JS, or git. Browser talks to `/api/ai` only.
2. `config.js` **stays tracked** — the Supabase anon key is public by design, scoped by RLS. Do not gitignore it.
3. `.env*` and `.vercel` are gitignored. Never commit them.

## Working style

- Terse replies, no trailing summaries.
- Runtime bugs get verified in the browser via `vercel dev` — not by code reading alone.
- Deferred, do not start unasked: Word `.docx` story export, Google Sheets API test-case export, n8n webhooks.
