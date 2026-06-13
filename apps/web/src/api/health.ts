import axios from "axios";

export async function checkHealth(serverUrl: string, apiKey: string): Promise<void> {
  const base = serverUrl.replace(/\/$/, "");
  await axios.get(`${base}/api/health`, {
    headers: { "X-Api-Key": apiKey },
    timeout: 8000,
  });
}
