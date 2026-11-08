import { Router } from "express";
import { pool } from "../db.js";
import { requireAuth } from "../auth.js";

const router = Router();
router.use(requireAuth);

async function getStats(userId, from, to) {
  const result = await pool.query(
    `SELECT COUNT(*)::int AS count, MIN(value)::int AS lowest,
            MAX(value)::int AS highest, ROUND(AVG(value)::numeric,1)::float AS average
     FROM readings WHERE user_id=$1 AND reading_date BETWEEN $2 AND $3`,
    [userId, from, to]
  );
  const row = result.rows[0];
  return {
    count: row.count,
    lowest: row.lowest,
    highest: row.highest,
    average: row.average
  };
}

router.get("/", async (req, res) => {
  try {
    const selected = req.query.date;
    if (!selected || !/^\d{4}-\d{2}-\d{2}$/.test(selected)) {
      return res.status(400).json({ message: "Please provide a date in YYYY-MM-DD format." });
    }
    const dateObj = new Date(`${selected}T00:00:00Z`);
    if (Number.isNaN(dateObj.getTime()) || dateObj.toISOString().slice(0, 10) !== selected) {
      return res.status(400).json({ message: "Please provide a valid date." });
    }
    const monthStart = `${selected.slice(0, 7)}-01`;
    const previousMonthEndDate = new Date(Date.UTC(
      Number(selected.slice(0, 4)), Number(selected.slice(5, 7)) - 1, 0
    ));
    const previousMonthStartDate = new Date(Date.UTC(
      previousMonthEndDate.getUTCFullYear(), previousMonthEndDate.getUTCMonth(), 1
    ));
    const previousMonthStart = previousMonthStartDate.toISOString().slice(0, 10);
    const previousMonthEnd = previousMonthEndDate.toISOString().slice(0, 10);

    const [daily, monthToDate, previousMonth, dailyRows] = await Promise.all([
      getStats(req.user.id, selected, selected),
      getStats(req.user.id, monthStart, selected),
      getStats(req.user.id, previousMonthStart, previousMonthEnd),
      pool.query(
        `SELECT id,reading_date::text AS date,time_slot AS slot,value
         FROM readings WHERE user_id=$1 AND reading_date=$2
         ORDER BY CASE time_slot WHEN 'Morning (fasting)' THEN 1
           WHEN 'After breakfast' THEN 2 WHEN 'After lunch' THEN 3 ELSE 4 END`,
        [req.user.id, selected]
      )
    ]);
    res.json({
      selectedDate: selected,
      daily: { ...daily, readings: dailyRows.rows },
      monthToDate: { ...monthToDate, from: monthStart, to: selected },
      previousMonth: { ...previousMonth, from: previousMonthStart, to: previousMonthEnd }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Could not load reports." });
  }
});

export default router;
