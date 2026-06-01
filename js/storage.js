const STORAGE_KEY = "instaCommentDmAutomator.state.v1";

function safeParse(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeArray(value) {
  return Array.isArray(value) ? value : [];
}

export function generateId(prefix = "item") {
  const random = Math.random().toString(36).slice(2, 10);
  return `${prefix}-${Date.now().toString(36)}-${random}`;
}

export function loadState(defaultState) {
  const stored = safeParse(window.localStorage.getItem(STORAGE_KEY));
  const source = stored && typeof stored === "object" ? stored : defaultState;

  return {
    rules: normalizeArray(source.rules),
    comments: normalizeArray(source.comments),
    logs: normalizeArray(source.logs),
    settings: {
      metaAppId: "",
      accessToken: "",
      webhookUrl: "",
      webhookVerifyToken: "",
      autoSend: false,
      reduceMotion: false,
      compactTables: false,
      ...(source.settings || {}),
    },
  };
}

export function saveState(state) {
  const safeState = {
    rules: normalizeArray(state.rules),
    comments: normalizeArray(state.comments),
    logs: normalizeArray(state.logs),
    settings: state.settings || {},
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(safeState));
}

export function exportState(state) {
  return JSON.stringify({
    exportedAt: new Date().toISOString(),
    ...state,
  }, null, 2);
}

export function clearState() {
  window.localStorage.removeItem(STORAGE_KEY);
}
