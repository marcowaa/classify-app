const API_BASE = "";

export const getToken = () => localStorage.getItem("token");

const request = async (path, options = {}) => {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 204) return null;

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "Request failed");
  }

  return data;
};

export const api = {
  register: (payload) => request("/api/auth/register", { method: "POST", body: JSON.stringify(payload) }),
  login: (payload) => request("/api/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  me: () => request("/api/auth/me"),
  listTodos: () => request("/api/todos"),
  createTodo: (title) => request("/api/todos", { method: "POST", body: JSON.stringify({ title }) }),
  updateTodo: (id, payload) => request(`/api/todos/${id}`, { method: "PATCH", body: JSON.stringify(payload) }),
  deleteTodo: (id) => request(`/api/todos/${id}`, { method: "DELETE" }),
};
