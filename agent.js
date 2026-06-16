// ─────────────────────────────────────────────
//  AGENT PLATFORM — AI CALLER
//  Single function used by all pages and agents.
// ─────────────────────────────────────────────

const AI = {
  // Core call — used by all agents.
  // Routes through the /api/ai serverless proxy so the API key
  // stays server-side (Vercel env var) and never reaches the browser.
  async call(systemPrompt, userMessage, options = {}) {
    const body = JSON.stringify({
      model: options.model || CONFIG.ai.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: options.temperature || CONFIG.ai.temperature,
      max_tokens: options.maxTokens || CONFIG.ai.maxTokens,
    });

    let lastErr;
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt > 0) await new Promise(r => setTimeout(r, 2000 * attempt));
      const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return data.choices?.[0]?.message?.content || '';
      const msg = data.error?.message || `AI call failed: ${res.status}`;
      if (res.status !== 429 && !msg.includes('provider')) throw new Error(msg);
      lastErr = new Error(msg);
    }
    throw lastErr;
  },

  // Build system prompt injecting project context
  buildSystemPrompt(basePrompt, projectConfig, knowledgeDocs = []) {
    let prompt = basePrompt;

    if (projectConfig) {
      prompt += `\n\n--- PROJECT CONTEXT ---`;
      prompt += `\nProject: ${projectConfig.project_name || 'Unknown'}`;
      prompt += `\nIndustry: ${projectConfig.industry || 'Not specified'}`;
      prompt += `\nUser types: ${projectConfig.user_types || 'Not specified'}`;
      prompt += `\nStory ID prefix: ${projectConfig.story_prefix || 'STORY'}`;
      prompt += `\nAcceptance criteria format: ${projectConfig.ac_format || 'Given/When/Then'}`;
      if (projectConfig.custom_rules) prompt += `\nCustom rules: ${projectConfig.custom_rules}`;
    }

    if (knowledgeDocs.length > 0) {
      prompt += `\n\n--- KNOWLEDGE BASE (existing rules and decisions) ---`;
      knowledgeDocs.slice(0, 5).forEach(doc => {
        prompt += `\n\n[${doc.doc_type?.toUpperCase() || 'DOC'}] ${doc.title}:\n${doc.content?.slice(0, 800)}`;
      });
    }

    return prompt;
  },

  // Parse JSON safely from AI response
  parseJSON(text) {
    try {
      const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      return JSON.parse(clean);
    } catch {
      return null;
    }
  },
};
