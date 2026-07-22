// Thin API client for the Starman backend. Token persisted in localStorage;
// all CRM DATA lives server-side in Postgres (no data in localStorage).
const TOKEN_KEY = "starman_token";

export const auth = {
  get token() { return localStorage.getItem(TOKEN_KEY); },
  set token(v) { v ? localStorage.setItem(TOKEN_KEY, v) : localStorage.removeItem(TOKEN_KEY); },
  clear() { localStorage.removeItem(TOKEN_KEY); },
};

async function req(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  if (auth.token) headers.Authorization = `Bearer ${auth.token}`;
  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* no body */ }
  if (res.status === 401) { auth.clear(); }
  if (!res.ok) {
    const msg = json?.error || `Request failed (${res.status})`;
    const err = new Error(msg);
    err.status = res.status; err.issues = json?.issues;
    throw err;
  }
  return json;
}

export const api = {
  // auth
  register: (d) => req("POST", "/auth/register", d),
  login: (email, password) => req("POST", "/auth/login", { email, password }),
  me: () => req("GET", "/auth/me"),
  // leads
  listLeads: (params = "") => req("GET", `/leads${params}`),
  createLead: (d) => req("POST", "/leads", d),
  updateLead: (id, d) => req("PATCH", `/leads/${id}`, d),
  deleteLead: (id) => req("DELETE", `/leads/${id}`),
  // intakes
  listIntakes: (params = "") => req("GET", `/intakes${params}`),
  createIntake: (d) => req("POST", "/intakes", d),
  updateIntake: (id, d) => req("PATCH", `/intakes/${id}`, d),
  convertIntake: (id) => req("POST", `/intakes/${id}/convert`),
  // notifications
  listNotifications: () => req("GET", "/notifications"),
  readNotification: (id) => req("POST", `/notifications/${id}/read`),
  readAllNotifications: () => req("POST", "/notifications/read-all"),
  // connectors
  listConnectors: () => req("GET", "/connectors"),
  saveConnector: (provider, d) => req("PATCH", `/connectors/${provider}`, d),
  testConnector: (provider) => req("POST", `/connectors/${provider}/test`),
  syncConnector: (provider) => req("POST", `/connectors/${provider}/sync`),
  // api keys
  listApiKeys: () => req("GET", "/apikeys"),
  createApiKey: (d) => req("POST", "/apikeys", d),
  revokeApiKey: (id) => req("POST", `/apikeys/${id}/revoke`),
  // AI Support (grounded on CRM data + knowledge docs)
  aiInfo: () => req("GET", "/ai/info"),
  aiChat: (message, history) => req("POST", "/ai/chat", { message, history }),
  aiListDocs: () => req("GET", "/ai/docs"),
  aiAddDoc: (d) => req("POST", "/ai/docs", d),
  aiDeleteDoc: (id) => req("DELETE", `/ai/docs/${id}`),
  // dashboard
  getDashboard: () => req("GET", "/dashboard"),
  // clients
  listClients: (params = "") => req("GET", `/clients${params}`),
  getClient: (id) => req("GET", `/clients/${id}`),
  createClient: (d) => req("POST", "/clients", d),
  updateClient: (id, d) => req("PATCH", `/clients/${id}`, d),
  deleteClient: (id) => req("DELETE", `/clients/${id}`),
  addAccount: (clientId, d) => req("POST", `/clients/${clientId}/accounts`, d),
  addNote: (clientId, d) => req("POST", `/clients/${clientId}/notes`, d),
  addKyc: (clientId, d) => req("POST", `/clients/${clientId}/kyc`, d),
  // households
  listHouseholds: () => req("GET", "/households"),
  createHousehold: (d) => req("POST", "/households", d),
  attachHouseholdClient: (id, clientId) => req("POST", `/households/${id}/clients/${clientId}`),
  detachHouseholdClient: (id, clientId) => req("DELETE", `/households/${id}/clients/${clientId}`),
  // tasks
  listTasks: (params = "") => req("GET", `/tasks${params}`),
  createTask: (d) => req("POST", "/tasks", d),
  updateTask: (id, d) => req("PATCH", `/tasks/${id}`, d),
  deleteTask: (id) => req("DELETE", `/tasks/${id}`),
  // documents
  listDocuments: (params = "") => req("GET", `/documents${params}`),
  createDocument: (d) => req("POST", "/documents", d),
  updateDocument: (id, d) => req("PATCH", `/documents/${id}`, d),
  // insurance
  listInsurance: (params = "") => req("GET", `/insurance${params}`),
  createInsurance: (d) => req("POST", "/insurance", d),
  updateInsurance: (id, d) => req("PATCH", `/insurance/${id}`, d),
  deleteInsurance: (id) => req("DELETE", `/insurance/${id}`),
};
