require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2");
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
app.use(express.json());
app.use(cors());

// MySQL connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "chat_bot"
});

db.connect(err => {
  if (err) console.log("DB ERROR:", err);
  else console.log("MySQL Connected sucessfully!");
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-pro" });

// Middleware to verify JWT
function auth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Unauthorized" });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = decoded;
    next();
  });
}

// REGISTER API
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);

  db.query(
    "INSERT INTO users(username, password) VALUES (?, ?)",
    [username, hashed],
    (err) => {
      if (err) return res.status(400).json({ message: "User already exists" });
      res.json({ message: "Registered successfully" });
    }
  );
});

// LOGIN API
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;

  db.query("SELECT * FROM users WHERE username = ?", [username], async (err, rows) => {
    if (err || rows.length === 0) return res.status(400).json({ message: "Invalid credentials" });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) return res.status(400).json({ message: "Invalid credentials" });

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, userId: user.id });
  });
});

// save history
app.post("/api/chat", auth, async (req, res) => {
  try {
    const userMessage = req.body.message;

    // Save user message
    db.query("INSERT INTO chat_history(user_id, role, message) VALUES (?, ?, ?)",
      [req.user.id, "user", userMessage]);

    const result = await model.generateContent(`User: ${userMessage}`);
    const reply = result?.response?.text();

    // Save AI response
    db.query("INSERT INTO chat_history(user_id, role, message) VALUES (?, ?, ?)",
      [req.user.id, "assistant", reply]);

    res.json({ reply });
  } catch (err) {
    console.log(err);
    res.status(500).json({ reply: "Error. Try later." });
  }
});

// chat history
app.get("/api/history", auth, (req, res) => {
  db.query("SELECT role, message FROM chat_history WHERE user_id = ? ORDER BY created_at ASC",
    [req.user.id],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "DB Error" });
      res.json(rows);
    });
});

app.listen(5000, () => console.log("🚀 Server running on http://localhost:5000"));
