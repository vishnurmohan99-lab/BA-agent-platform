// ─────────────────────────────────────────────
//  BA AGENT — Story generation + review + regenerate
// ─────────────────────────────────────────────

const BAAgent = {
  BASE_PROMPT: `You are a Senior Business Analyst specialising in writing clear, complete, testable user stories.

Your output MUST be valid JSON only. No preamble, no explanation, no markdown fences.

For each story, use this exact structure:
{
  "stories": [
    {
      "story_id": "PREFIX-XXX-001",
      "title": "Short feature title",
      "story_text": "As a [role], I want [goal] so that [benefit].",
      "acceptance_criteria": [
        "Given [context], When [action], Then [outcome]."
      ],
      "edge_cases": ["Edge case description"],
      "business_rules_referenced": ["BR-ID-001"],
      "priority": "high|medium|low"
    }
  ]
}

Rules:
- Never contradict existing business rules in the knowledge base
- Always reference relevant business rule IDs
- Every acceptance criterion must be testable by a QA engineer
- Write exactly the number of stories requested
- Use simple, plain English — no jargon
- Include at least one edge case per story`,

  REVIEWER_PROMPT: `You are a Quality Reviewer for user stories.

Review the provided user stories and return ONLY valid JSON:
{
  "overall": "pass|warn|fail",
  "checks": [
    {
      "story_id": "PREFIX-XXX-001",
      "completeness": { "status": "pass|warn|fail", "note": "" },
      "duplicates":   { "status": "pass|warn|fail", "note": "" },
      "business_rules": { "status": "pass|warn|fail", "note": "" },
      "edge_cases":   { "status": "pass|warn|fail", "note": "" },
      "ambiguity":    { "status": "pass|warn|fail", "note": "" }
    }
  ],
  "summary": "One sentence summary of the review"
}

Be specific in notes. If something passes cleanly, say so. Do not rewrite stories.`,

  async generate(featureDescription, storyCount, projectConfig, knowledgeDocs) {
    const systemPrompt = AI.buildSystemPrompt(this.BASE_PROMPT, projectConfig, knowledgeDocs);
    const userMessage = `Generate exactly ${storyCount} user stories for this feature:\n\n${featureDescription}\n\nUse story ID prefix: ${projectConfig?.story_prefix || 'STORY'}`;

    const raw = await AI.call(systemPrompt, userMessage);
    const parsed = AI.parseJSON(raw);
    if (!parsed?.stories) throw new Error('AI returned invalid story format. Please try again.');
    return parsed.stories;
  },

  async review(stories, projectConfig, knowledgeDocs) {
    const systemPrompt = AI.buildSystemPrompt(this.REVIEWER_PROMPT, projectConfig, knowledgeDocs);
    const userMessage = `Review these user stories:\n\n${JSON.stringify(stories, null, 2)}`;

    const raw = await AI.call(systemPrompt, userMessage);
    const parsed = AI.parseJSON(raw);
    if (!parsed?.checks) return { overall: 'warn', checks: [], summary: 'Review could not be parsed.' };
    return parsed;
  },

  async regenerate(stories, feedback, projectConfig, knowledgeDocs) {
    const systemPrompt = AI.buildSystemPrompt(this.BASE_PROMPT, projectConfig, knowledgeDocs);
    const userMessage = `Improve these user stories based on this feedback:\n\nFEEDBACK: ${feedback}\n\nORIGINAL STORIES:\n${JSON.stringify(stories, null, 2)}\n\nReturn improved stories in the same JSON format.`;

    const raw = await AI.call(systemPrompt, userMessage);
    const parsed = AI.parseJSON(raw);
    if (!parsed?.stories) throw new Error('AI could not regenerate stories. Please try again.');
    return parsed.stories;
  },
};
