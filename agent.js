// ─────────────────────────────────────────────
//  AGENT PLATFORM — AI CALLER
//  Single function used by all pages and agents.
// ─────────────────────────────────────────────

const AI = {
  // Core call — used by all agents.
  // Routes through the /api/ai serverless proxy so the API key
  // stays server-side (Vercel env var) and never reaches the browser.
  async call(systemPrompt, userMessage, options = {}) {
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: options.model || CONFIG.ai.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: options.temperature || CONFIG.ai.temperature,
        max_tokens: options.maxTokens || CONFIG.ai.maxTokens,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `AI call failed: ${res.status}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content || '';
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
