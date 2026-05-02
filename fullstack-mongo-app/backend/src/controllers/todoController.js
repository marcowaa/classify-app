import { Todo } from "../models/Todo.js";

export const listTodos = async (req, res) => {
  const todos = await Todo.find({ userId: req.user.id }).sort({ createdAt: -1 });
  return res.json({ items: todos });
};

export const createTodo = async (req, res) => {
  const { title } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ message: "title is required" });
  }

  const todo = await Todo.create({
    userId: req.user.id,
    title: title.trim(),
    completed: false,
  });

  return res.status(201).json({ item: todo });
};

export const updateTodo = async (req, res) => {
  const { id } = req.params;
  const { title, completed } = req.body;

  const todo = await Todo.findOne({ _id: id, userId: req.user.id });
  if (!todo) {
    return res.status(404).json({ message: "Todo not found" });
  }

  if (typeof title === "string") {
    todo.title = title.trim() || todo.title;
  }
  if (typeof completed === "boolean") {
    todo.completed = completed;
  }

  await todo.save();
  return res.json({ item: todo });
};

export const deleteTodo = async (req, res) => {
  const { id } = req.params;
  const deleted = await Todo.findOneAndDelete({ _id: id, userId: req.user.id });

  if (!deleted) {
    return res.status(404).json({ message: "Todo not found" });
  }

  return res.status(204).send();
};
