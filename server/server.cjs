const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Connessione al database SQLite
const db = new sqlite3.Database("./server/database.sqlite", (err) => {
  if (err) console.error("❌ Errore connessione SQLite:", err.message);
  else console.log("✅ Connessione a SQLite riuscita!");
});

// Creazione delle tabelle
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS watches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      price INTEGER NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL
  )`);

  console.log("✅ Tabelle pronte!");
});

// API REST per gli orologi
app.get("/api/watches", (req, res) => {
  db.all("SELECT * FROM watches", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/watches", (req, res) => {
  const { brand, model, price } = req.body;
  db.run(
    "INSERT INTO watches (brand, model, price) VALUES (?, ?, ?)",
    [brand, model, price],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Orologio aggiunto", id: this.lastID });
    }
  );
});

app.put("/api/watches/:id", (req, res) => {
  const { id } = req.params;
  const { brand, model, price } = req.body;
  db.run(
    "UPDATE watches SET brand = ?, model = ?, price = ? WHERE id = ?",
    [brand, model, price, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Orologio aggiornato" });
    }
  );
});

app.delete("/api/watches/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM watches WHERE id = ?", id, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Orologio eliminato" });
  });
});

// API REST per i clienti
app.get("/api/customers", (req, res) => {
  db.all("SELECT * FROM customers", [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/customers", (req, res) => {
  const { name, email, phone } = req.body;
  db.run(
    "INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)",
    [name, email, phone],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Cliente aggiunto", id: this.lastID });
    }
  );
});

app.put("/api/customers/:id", (req, res) => {
  const { id } = req.params;
  const { name, email, phone } = req.body;
  db.run(
    "UPDATE customers SET name = ?, email = ?, phone = ? WHERE id = ?",
    [name, email, phone, id],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Cliente aggiornato" });
    }
  );
});

app.delete("/api/customers/:id", (req, res) => {
  const { id } = req.params;
  db.run("DELETE FROM customers WHERE id = ?", id, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Cliente eliminato" });
  });
});

// Avvio del server
app.listen(PORT, () => {
  console.log(`✅ Server avviato su http://localhost:${PORT}`);
});
