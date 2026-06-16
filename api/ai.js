// ─────────────────────────────────────────────
//  AGENT PLATFORM — AI PROXY (Vercel serverless)
//  Keeps the OpenRouter key server-side. The browser
//  calls /api/ai; the key lives in Vercel env vars only.
// ─────────────────────────────────────────────

const FALLBACK_MODELS = [
  'openrouter/owl-alpha',
  'openai/gpt-oss-120b:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
  'google/gemma-4-31b-it:free',
  'moonshotai/kimi-k2.6:free',
];

async function callOpenRouter(apiKey, body, model, origin) {
  const payload = { ...body, model };
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'HTTP-Referer': origin || '',
      'X-Title': 'Agent Platform',
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).json({ error: { message: 'Method not allowed' } });
    return;
  }

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: { message: 'OPENROUTER_API_KEY is not configured on the server' } });
    return;
  }

  try {
    const requestedModel = req.body?.model;
    // Build fallback list: requested model first, then defaults (deduped)
    const candidates = [requestedModel, ...FALLBACK_MODELS].filter((m, i, a) => m && a.indexOf(m) === i);

    let lastStatus = 500;
    let lastData = {};

    for (const model of candidates) {
      const { status, data } = await callOpenRouter(apiKey, req.body, model, req.headers.origin);
      if (status === 200) {
        res.status(200).json(data);
        return;
      }
      lastStatus = status;
      lastData = data;
      const msg = (data?.error?.message || '').toLowerCase();
      // Fall through to next model on availability/rate-limit errors
      const shouldFallback = status === 429 || msg.includes('provider') || msg.includes('unavailable') || msg.includes('no endpoints') || msg.includes('overloaded');
      if (!shouldFallback) break;
    }

    res.status(lastStatus).json(lastData);
  } catch (err) {
    res.status(500).json({ error: { message: err.message || 'AI proxy request failed' } });
  }
};
