const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function askQuestion(question: string) {
  const response = await fetch(`${API_BASE_URL}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  })
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || 'API request failed');
  }
  return response.json();
}

export async function fetchTranscriptInfo() {
  const response = await fetch(`${API_BASE_URL}/transcript-info`);
  if (!response.ok) throw new Error('Failed to fetch transcript info');
  return response.json();
}

export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) return false;
    const data = await response.json();
    return data.status === 'ok';
  } catch (e) {
    return false;
  }
}
