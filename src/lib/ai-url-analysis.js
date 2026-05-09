export async function fetchAiUrlAnalysis(url) {
  const response = await fetch("/api/ai-url-analysis", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const error = new Error(data?.error || "AI analysis failed");
    error.status = response.status;
    error.configured = data?.configured;
    error.code = data?.code;
    error.provider = data?.provider;
    error.model = data?.model;
    error.rawOutput = data?.rawOutput;
    throw error;
  }

  return data;
}
