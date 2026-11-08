import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../auth.js";
import { validateReading } from "../validation.js";

const router = Router();
router.use(requireAuth);

router.get("/", async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page || "1", 10));
    const limit = Math.min(100, Math.max(1, Number.parseInt(req.query.limit || "100", 10)));
    const offset = (page - 1) * limit;
    const result = await pool.query(
      `SELECT id, reading_date::text AS date, time_slot AS slot, value
       FROM readings WHERE user_id=$1
       ORDER BY reading_date DESC, CASE time_slot
         WHEN 'Morning (fasting)' THEN 1 WHEN 'After breakfast' THEN 2
         WHEN 'After lunch' THEN 3 ELSE 4 END
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );
    res.json({ readings: result.rows, page, limit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not load readings." });
  }
});

router.post("/", async (req, res) => {
  const { date, slot, value } = req.body;
  const errors = validateReading({ date, slot, value });
  if (errors.length) return res.status(400).json({ message: errors[0], errors });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // Serialize changes for this user/date so the four-reading limit is safe under concurrent requests.
    await client.query("SELECT pg_advisory_xact_lock($1, hashtext($2))", [req.user.id, date]);
    const count = await client.query(
      "SELECT COUNT(*)::int AS count FROM readings WHERE user_id=$1 AND reading_date=$2",
      [req.user.id, date]
    );
    if (count.rows[0].count >= 4) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "You can add only 4 readings per day." });
    }
    const result = await client.query(
      `INSERT INTO readings(user_id,reading_date,time_slot,value)
       VALUES($1,$2,$3,$4)
       RETURNING id, reading_date::text AS date, time_slot AS slot, value`,
      [req.user.id, date, slot, Number(value)]
    );
    await client.query("COMMIT");
    res.status(201).json({ reading: result.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") return res.status(409).json({ message: `You already have a ${slot} reading for this date.` });
    console.error(error);
    res.status(500).json({ message: "Could not save reading." });
  } finally {
    client.release();
  }
});

router.put("/:id", async (req, res) => {
  const { date, slot, value } = req.body;
  const errors = validateReading({ date, slot, value });
  if (errors.length) return res.status(400).json({ message: errors[0], errors });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock($1, hashtext($2))", [req.user.id, date]);
    const existing = await client.query(
      "SELECT id FROM readings WHERE id=$1 AND user_id=$2",
      [req.params.id, req.user.id]
    );
    if (!existing.rowCount) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Reading not found." });
    }
    const duplicate = await client.query(
      `SELECT id FROM readings WHERE user_id=$1 AND reading_date=$2
       AND time_slot=$3 AND id<>$4`,
      [req.user.id, date, slot, req.params.id]
    );
    if (duplicate.rowCount) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: `You already have a ${slot} reading for this date.` });
    }
    const count = await client.query(
      "SELECT COUNT(*)::int AS count FROM readings WHERE user_id=$1 AND reading_date=$2 AND id<>$3",
      [req.user.id, date, req.params.id]
    );
    if (count.rows[0].count >= 4) {
      await client.query("ROLLBACK");
      return res.status(400).json({ message: "You can add only 4 readings per day." });
    }
    const result = await client.query(
      `UPDATE readings SET reading_date=$1,time_slot=$2,value=$3
       WHERE id=$4 AND user_id=$5
       RETURNING id,reading_date::text AS date,time_slot AS slot,value`,
      [date, slot, Number(value), req.params.id, req.user.id]
    );
    await client.query("COMMIT");
    res.json({ reading: result.rows[0] });
  } catch (error) {
    await client.query("ROLLBACK");
    if (error.code === "23505") return res.status(409).json({ message: `You already have a ${slot} reading for this date.` });
    console.error(error);
    res.status(500).json({ message: "Could not update reading." });
  } finally {
    client.release();
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const result = await pool.query(
      "DELETE FROM readings WHERE id=$1 AND user_id=$2 RETURNING id",
      [req.params.id, req.user.id]
    );
    if (!result.rowCount) return res.status(404).json({ message: "Reading not found." });
    res.json({ message: "Reading deleted." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not delete reading." });
  }
});

export default router;
