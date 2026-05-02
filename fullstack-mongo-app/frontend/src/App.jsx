import { useEffect, useMemo, useState } from "react";
import { api, getToken } from "./api";
import AuthForm from "./components/AuthForm";
import TodoList from "./components/TodoList";

export default function App() {
  const [mode, setMode] = useState("login");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [user, setUser] = useState(null);
  const [todos, setTodos] = useState([]);

  const isAuthed = useMemo(() => Boolean(user), [user]);

  const bootstrap = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const me = await api.me();
      setUser(me.user);
      const todoData = await api.listTodos();
      setTodos(todoData.items || []);
    } catch {
      localStorage.removeItem("token");
      setUser(null);
    }
  };

  useEffect(() => {
    bootstrap();
  }, []);

  const handleAuth = async (payload) => {
    setLoading(true);
    setError("");

    try {
      const data = mode === "register"
        ? await api.register(payload)
        : await api.login(payload);

      localStorage.setItem("token", data.token);
      setUser(data.user);

      const todoData = await api.listTodos();
      setTodos(todoData.items || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const createTodo = async (title) => {
    setLoading(true);
    setError("");

    try {
      const data = await api.createTodo(title);
      setTodos((prev) => [data.item, ...prev]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleTodo = async (todo) => {
    setLoading(true);
    setError("");

    try {
      const data = await api.updateTodo(todo._id, { completed: !todo.completed });
      setTodos((prev) => prev.map((item) => (item._id === todo._id ? data.item : item)));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteTodo = async (id) => {
    setLoading(true);
    setError("");

    try {
      await api.deleteTodo(id);
      setTodos((prev) => prev.filter((item) => item._id !== id));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setTodos([]);
  };

  return (
    <div className="app">
      <header className="topbar">
        <h1>Full-Stack Mongo App</h1>
        {isAuthed && (
          <div className="row">
            <span>{user.name}</span>
            <button onClick={logout}>Logout</button>
          </div>
        )}
      </header>

      {error && <p className="error">{error}</p>}

      {!isAuthed ? (
        <>
          <AuthForm mode={mode} onSubmit={handleAuth} loading={loading} />
          <p className="switch-mode">
            {mode === "login" ? "No account yet?" : "Already have an account?"}
            <button onClick={() => setMode(mode === "login" ? "register" : "login")}>
              {mode === "login" ? "Register" : "Login"}
            </button>
          </p>
        </>
      ) : (
        <TodoList
          items={todos}
          onCreate={createTodo}
          onToggle={toggleTodo}
          onDelete={deleteTodo}
          loading={loading}
        />
      )}
    </div>
  );
}
