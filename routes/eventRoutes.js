// eventRoutes.js
const express = require("express");
const router = express.Router();
const webpush = require("web-push");
const db = require("../db");
const {CronJob} = require("cron");
const { v4: uuidv4 } = require("uuid");
const { getLocalTime, getCronExpression } = require("../utils");
const btoa = require('btoa')
const atob = require('atob')
const publicKey = process.env.VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;

webpush.setVapidDetails(
  `mailto:${process.env.VAPID_EMAIL}`,
  publicKey,
  privateKey
);

const allJobs = new Map();

// ADD THE SCHEDULED NOTIFICATION TO THE DB ALONG WITH ASSOCIATED EVENT ID
const addJobToDb = (event_id, job_id, push) => {
  const encodedPush = btoa(JSON.stringify(push));
  const query = "INSERT INTO jobs (event_id, job_id, push) VALUES (?, ?, ?)";
  const values = [event_id, job_id, encodedPush];
  db.query(query, values, (err) => {
    if (err) {
      console.log("ERROR while adding notification to DB:", err);
    }
  });
};

// DEL THE SCHEDULED NOTIFICATION WHEN AN EVENT IS DELETED
const deleteJob = (event_id) => {
  return new Promise((resolve, reject) => {
    const query = "SELECT job_id FROM jobs WHERE event_id = ?";
    const values = [event_id];

    db.query(query, values, (err, results) => {
      if (err) {
        console.log("ERROR while deleting notification from DB", err);
        reject("ERROR while deleting notification from DB");
      } else {
        const jobID = results?.[0]?.job_id
        const jobToCancel = allJobs?.get(jobID);
        jobToCancel?.stop();
        resolve();
      }
    });
  });
};

// DELETE OLD SCHEDULED NOTIFICATION AND CREATE A NEW ONE WITH A NEW SCHEDULE
const editJob = (event_id, cron_expression, type, description) =>{
  const query = "SELECT job_id, push FROM jobs WHERE event_id = ?";
  const values = [event_id];
  db.query(query, values, (err, results) => {
    if (err) {
      console.log("ERROR while deleting notification from DB", err);
    } else {
      const jobID = results?.[0]?.job_id;
      const pushString = results?.[0]?.push
      const push = JSON.parse(atob(pushString))
      const jobToCancel = allJobs?.get(jobID);
      jobToCancel?.stop();
      const job = new CronJob(cron_expression, function () {
        const payload = JSON.stringify({ title: type, body: description });
        webpush.sendNotification(push, payload);
      });
      job.start()
    }
  });
}

// CREATE AN EVENT
router.post("/createNewEvent", (req, res) => {
  const { description, event_date, type, priority, push } = req.body;
  const { user_id } = req.headers;
  const event_id = uuidv4();
  const query =
    "INSERT INTO events (event_id, user_id, description, event_date, type, priority) VALUES (?, ?, ?, ?, ?, ?)";
  const values = [event_id, user_id, description, event_date, type, priority];

  const event_date_local = process.env.ENVIRONMENT === 'local' ? getLocalTime(event_date) : getLocalTime(event_date, 0);
  db.query(query, values, (err) => {
    if (err) {
      console.error("Database query error:", err);
      res
        .status(500)
        .json({ error: "An error occurred while processing the request" });
    } else {
      const cronExpression = getCronExpression(event_date_local);
      res.status(201).json({ message: "Event Created successful" });
      const job = new CronJob(cronExpression, function () {
        const payload = JSON.stringify({ title: type, body: description });
        webpush.sendNotification(push, payload);
      });
      const jobID = uuidv4()
      allJobs.set(jobID, job)
      job.start();
      addJobToDb(event_id, jobID, push);
    }
  });
});

// VIEW ALL EVENTS
router.get("/events", (req, res) => {
  const { user_id } = req.headers;
  const timAadjustedQuery = "SELECT event_id, user_id, description, priority, type, ADDTIME(event_date, '-5:30') AS adjusted_event_date FROM events WHERE user_id = ?";
  const normalQuery = "SELECT event_id, user_id, description, priority, type, event_date AS adjusted_event_date FROM events WHERE user_id = ?";
  const query = process.env.ENVIRONMENT === 'local' ? normalQuery : timAadjustedQuery;
  const values = [user_id];
  db.query(query, values, (err, results) => {
    if (err) {
      console.error("Database query error:", err);
      res
        .status(500)
        .json({ error: "An error occurred while processing the request" });
    } else {
      res.status(201).json({ events: results });
    }
  });
});

// DELETE AN EVENT
router.delete("/events/:event_id", async (req, res) => {
  const { event_id } = req.params;
  if (!event_id) {
    return res
      .status(400)
      .json({ error: "Event ID is required in the request body" });
  }
  const query = "DELETE FROM events WHERE event_id = ?";
  const values = [event_id];

  deleteJob(event_id)
    .then(() => {
      db.query(query, values, (err, result) => {
        if (err) {
          console.error("Database query error:", err);
          res
            .status(500)
            .json({ error: "An error occurred while processing the request" });
        } else if (result.affectedRows === 0) {
          res.status(404).json({ error: "Event not found" });
        } else {
          res.status(200).json({ message: "Event deleted successfully" });
        }
      });
    })
    .catch((err) => console.log(err));
});

// EDIT AN EVENT
router.put("/events/:event_id", (req, res) => {
  const { event_id } = req.params;
  const { description, event_date, priority, type } = req.body;

  if (!description || !event_date || !priority || !type) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const query =
    "UPDATE events SET description = ?, event_date = ?, priority = ?, type = ? WHERE event_id = ?";
  const values = [description, event_date, priority, type, event_id];

  db.query(query, values, (err, result) => {
    if (err) {
      console.error("Database query error:", err);
      res
        .status(500)
        .json({ error: "An error occurred while processing the request" });
    } else if (result.affectedRows === 0) {
      res.status(404).json({ error: "Event not found" });
      console.log("Event not found")
    } else {
      console.log("Event updated successfully")
      const newCronExpression = getCronExpression(getLocalTime(event_date))
      editJob(event_id, newCronExpression, type, description)
      res.status(200).json({ message: "Event updated successfully" });
    }
  });
});

module.exports = router;
