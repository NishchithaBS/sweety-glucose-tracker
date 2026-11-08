import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../db.js";

const router = Router();

function createToken(user) {
  return jwt.sign(
    { name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { subject: String(user.id), expiresIn: "7d" }
  );
}

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ message: "Name, email and password are required." });
    }
    if (name.trim().length > 100) return res.status(400).json({ message: "Name must be 100 characters or fewer." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ message: "Please enter a valid email address." });
    }
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });

    const passwordHash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      "INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3) RETURNING id,name,email",
      [name.trim(), email.trim().toLowerCase(), passwordHash]
    );
    const user = result.rows[0];
    res.status(201).json({ token: createToken(user), user });
  } catch (error) {
    if (error.code === "23505") return res.status(409).json({ message: "An account with this email already exists." });
    console.error(error);
    res.status(500).json({ message: "Could not create your account." });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." });
    const result = await pool.query(
      "SELECT id,name,email,password_hash FROM users WHERE email=$1",
      [email.trim().toLowerCase()]
    );
    const user = result.rows[0];
    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
      return res.status(401).json({ message: "Incorrect email or password." });
    }
    res.json({
      token: createToken(user),
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not log in." });
  }
});

export default router;
