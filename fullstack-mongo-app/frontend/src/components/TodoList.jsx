import { useState } from "react";

export default function TodoList({ items, onCreate, onToggle, onDelete, loading }) {
  const [title, setTitle] = useState("");

  const submit = (event) => {
    event.preventDefault();
    if (!title.trim()) return;
    onCreate(title.trim());
    setTitle("");
  };

  return (
    <div className="card">
      <h2>Your Todos</h2>

      <form onSubmit={submit} className="row">
        <input
          placeholder="New todo title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button disabled={loading}>Add</button>
      </form>

      <ul className="todo-list">
        {items.map((todo) => (
          <li key={todo._id} className="todo-item">
            <label>
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => onToggle(todo)}
              />
              <span className={todo.completed ? "done" : ""}>{todo.title}</span>
            </label>
            <button className="danger" onClick={() => onDelete(todo._id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}
