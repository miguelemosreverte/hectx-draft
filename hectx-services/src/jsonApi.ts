export type JsonApiConfig = {
  baseUrl: string;
  token?: string;
};

export const getConfig = (): JsonApiConfig => {
  const baseUrl = process.env.JSON_API_URL;
  if (!baseUrl) {
    throw new Error("JSON_API_URL is required");
  }
  return { baseUrl, token: process.env.JSON_API_TOKEN };
};

const headers = (token?: string) => {
  const h: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
};

export const create = async (config: JsonApiConfig, templateId: string, payload: unknown) => {
  const res = await fetch(`${config.baseUrl}/v1/create`, {
    method: "POST",
    headers: headers(config.token),
    body: JSON.stringify({ templateId, payload }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`create failed ${res.status}: ${text}`);
  }
  return res.json();
};

export const exercise = async (
  config: JsonApiConfig,
  templateId: string,
  contractId: string,
  choice: string,
  argument: unknown
) => {
  const res = await fetch(`${config.baseUrl}/v1/exercise`, {
    method: "POST",
    headers: headers(config.token),
    body: JSON.stringify({ templateId, contractId, choice, argument }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`exercise failed ${res.status}: ${text}`);
  }
  return res.json();
};

export const query = async (config: JsonApiConfig, templateId: string, query: unknown = {}) => {
  const res = await fetch(`${config.baseUrl}/v1/query`, {
    method: "POST",
    headers: headers(config.token),
    body: JSON.stringify({ templateId, query }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`query failed ${res.status}: ${text}`);
  }
  return res.json();
};
