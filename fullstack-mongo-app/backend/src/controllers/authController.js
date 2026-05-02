import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";

const buildToken = (userId) => {
  return jwt.sign({ sub: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

export const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "name, email, and password are required" });
  }

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) {
    return res.status(409).json({ message: "Email already in use" });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash });
  const token = buildToken(user._id.toString());

  return res.status(201).json({
    token,
    user: { id: user._id, name: user.name, email: user.email },
  });
};

export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "email and password are required" });
  }

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const token = buildToken(user._id.toString());

  return res.json({
    token,
    user: { id: user._id, name: user.name, email: user.email },
  });
};

export const me = async (req, res) => {
  const user = await User.findById(req.user.id).select("_id name email");
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({ user: { id: user._id, name: user.name, email: user.email } });
};
