const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Database connection
const db = new sqlite3.Database("./attendance.db", (err) => {
  if (err) {
    console.error("Error connecting to the database", err);
  } else {
    console.log("Connected to the attendance database");
  }
});

// Routes
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API endpoints
app.get("/api/attendance", (req, res) => {
  db.all(
    "SELECT * FROM attendance ORDER BY timestamp DESC",
    [],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ data: rows });
    }
  );
});

// Get attendance by student ID
app.get("/api/attendance/:studentId", (req, res) => {
  const studentId = req.params.studentId;
  db.all(
    "SELECT * FROM attendance WHERE student_id = ? ORDER BY timestamp DESC",
    [studentId],
    (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ data: rows });
    }
  );
});

// Add new attendance record (if you need it in the web interface)
app.post("/api/attendance", (req, res) => {
  const { student_id, qr_data } = req.body;
  const timestamp = new Date().toISOString();

  db.run(
    "INSERT INTO attendance (student_id, qr_data, timestamp) VALUES (?, ?, ?)",
    [student_id, qr_data, timestamp],
    function (err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ id: this.lastID });
    }
  );
});

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Close database connection when server stops
process.on("SIGINT", () => {
  db.close(() => {
    console.log("Database connection closed");
    process.exit(0);
  });
});
