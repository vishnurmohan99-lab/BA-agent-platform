// ─────────────────────────────────────────────
//  QA AGENT — Test cases, BRD, Risk, Release
// ─────────────────────────────────────────────

const QAAgent = {

  // ── Test case generation ──────────────────────
  async generateTestCases(stories, projectConfig) {
    const DEFAULT_PROMPT = `You are a QA Engineer. Generate comprehensive test cases from user stories.
Return ONLY valid JSON:
{
  "test_cases": [
    {
      "story_id": "STORY-001",
      "title": "Test case title",
      "type": "functional|edge_case|negative",
      "steps": ["Step 1", "Step 2"],
      "expected_result": "What should happen",
      "priority": "high|medium|low"
    }
  ]
}
Generate at least 2 test cases per story (1 functional, 1 edge case or negative).
Every step must be specific and actionable.`;
    const prompt = projectConfig?.qa_prompt_override || DEFAULT_PROMPT;

    const userMessage = `Generate test cases for these approved user stories:\n\n${JSON.stringify(stories, null, 2)}`;
    const raw = await AI.call(prompt, userMessage);
    const parsed = AI.parseJSON(raw);
    if (!parsed?.test_cases) throw new Error('Could not generate test cases.');
    return parsed.test_cases;
  },

  // ── BRD generation ────────────────────────────
  async generateBRD(featureDescription, stories, projectConfig, knowledgeDocs) {
    const prompt = AI.buildSystemPrompt(`You are a Business Analyst writing a formal Business Requirements Document (BRD).
Return a structured BRD in plain text (not JSON). Use these sections:
1. Executive Summary
2. Business Objectives
3. Scope
4. Stakeholders
5. Functional Requirements (derived from user stories)
6. Non-Functional Requirements
7. Assumptions & Constraints
8. Out of Scope
9. Glossary

Be specific, professional, and concise.`, projectConfig, knowledgeDocs);

    const userMessage = `Write a BRD for this feature:\n\n${featureDescription}\n\nBased on these approved user stories:\n${JSON.stringify(stories, null, 2)}`;
    return await AI.call(prompt, userMessage, { maxTokens: 3000 });
  },

  // ── Risk & gap analysis ───────────────────────
  async analyseRisk(newFeature, existingStories, knowledgeDocs, projectConfig) {
    const prompt = AI.buildSystemPrompt(`You are a Risk Analyst reviewing a new feature proposal.
Analyse for: conflicts with existing stories, missing business rules, integration risks, dependency gaps, edge cases not covered.
Return ONLY valid JSON:
{
  "risk_score": 1-10,
  "risk_level": "low|medium|high|critical",
  "summary": "One paragraph summary",
  "conflicts": [
    { "type": "story_conflict|rule_conflict|gap|dependency", "description": "", "affected_id": "", "severity": "low|medium|high" }
  ],
  "recommendations": ["Action item 1", "Action item 2"],
  "missing_requirements": ["Missing item 1"]
}`, projectConfig, knowledgeDocs);

    const userMessage = `Analyse this new feature for risks:\n\nFEATURE:\n${newFeature}\n\nEXISTING STORIES:\n${JSON.stringify(existingStories.slice(0, 10), null, 2)}`;
    const raw = await AI.call(prompt, userMessage);
    const parsed = AI.parseJSON(raw);
    if (!parsed?.risk_score) throw new Error('Could not analyse risk.');
    return parsed;
  },

  // ── Release changelog ─────────────────────────
  async generateChangelog(phase, stories, projectConfig) {
    const prompt = `You are a technical writer generating a release changelog.
Write a clear, structured changelog for the release. Use these sections:
## What's new
## Improvements
## Bug fixes (if any)
## Known limitations

Be concise. Each item is one line starting with a verb. Audience: product team and stakeholders.`;

    const userMessage = `Generate a changelog for ${phase.name}.\n\nStories in this release:\n${JSON.stringify(stories, null, 2)}`;
    return await AI.call(prompt, userMessage, { maxTokens: 1500 });
  },
};
