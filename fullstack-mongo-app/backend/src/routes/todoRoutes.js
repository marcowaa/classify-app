import { Router } from "express";
import { createTodo, deleteTodo, listTodos, updateTodo } from "../controllers/todoController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);
router.get("/", listTodos);
router.post("/", createTodo);
router.patch("/:id", updateTodo);
router.delete("/:id", deleteTodo);

export default router;
