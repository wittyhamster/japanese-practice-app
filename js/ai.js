// Talks to the Anthropic API directly from the browser using a key the
// learner supplies themselves ("bring your own key"). The key lives only in
// this browser's localStorage — it is never committed to the repo and is
// sent nowhere except straight to api.anthropic.com.
//
// Direct browser calls require the `anthropic-dangerous-direct-browser-access`
// header. Anthropic calls it "dangerous" because embedding a key in client
// code is unsafe for a multi-user product (anyone could read it out of the
// page and spend your quota). For a personal tool where you paste in your
// own key, that risk doesn't apply the same way — just don't publish your
// key anywhere, and treat it like a password.

const API_KEY_STORAGE = 'sensei-v1-api-key';
const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-5';

export function getApiKey() {
  try { return localStorage.getItem(API_KEY_STORAGE) || ''; } catch { return ''; }
}

export function setApiKey(key) {
  try {
    if (key) localStorage.setItem(API_KEY_STORAGE, key);
    else localStorage.removeItem(API_KEY_STORAGE);
    return true;
  } catch {
    return false;
  }
}

export async function requestAIReview(prompt, apiKey) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!response.ok) {
    let detail = '';
    try { detail = (await response.json())?.error?.message || ''; } catch { /* Body was not JSON. */ }
    const error = new Error(detail || `AI review request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }

  const data = await response.json();
  const text = (data.content || []).filter(block => block.type === 'text').map(block => block.text).join('\n').trim();
  if (!text) throw new Error('The AI response came back empty. Please try again.');
  return text;
}
