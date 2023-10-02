const express = require("express");
const router = express.Router();
const db = require("../db");
const { v4: uuidv4 } = require("uuid");

// LOGIN ROUTE
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  const query = "SELECT * FROM users WHERE email = ? AND password = ?";
  const values = [email, password];

  db.query(query, values, (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      res
        .status(500)
        .json({ error: "An error occurred while processing the request" });
    } else if (results.length === 1) {
      const {password, registration_date, ...userDetails} = results[0];
      res.status(200).json({ user: userDetails });
    } else {
      res.status(401).json({ error: "Invalid Credentials" });
    }
  });
});

// SIGNUP ROUTE
router.post("/registration", (req, res) => {
  const { name, email, password } = req.body;
  const user_id = uuidv4();
  const query = "INSERT INTO users (user_id, name, email, password) VALUES (?, ?, ?, ?)";
  const values = [user_id, name, email, password];

  db.query(query, values, (err) => {
    if (err) {
      console.error("Database query error:", err);
      res
        .status(500)
        .json({ error: "An error occurred while processing the request" });
    } else {
      res.status(201).json({ message: "User registration successful", user: name });
    }
  });
});

module.exports = router;
