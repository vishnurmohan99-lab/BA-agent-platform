// ─────────────────────────────────────────────
//  AGENT PLATFORM — AI PROXY (Vercel serverless)
//  Keeps the OpenRouter key server-side. The browser
//  calls /api/ai; the key lives in Vercel env vars only.
// ─────────────────────────────────────────────

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
    const upstream = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': req.headers.origin || '',
        'X-Title': 'Agent Platform',
      },
      // Vercel parses JSON bodies into req.body; forward as-is.
      body: JSON.stringify(req.body),
    });

    const data = await upstream.json().catch(() => ({}));
    res.status(upstream.status).json(data);
  } catch (err) {
    res.status(500).json({ error: { message: err.message || 'AI proxy request failed' } });
  }
};
