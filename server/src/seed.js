import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { pool, initializeDatabase } from "./db.js";

dotenv.config();

try {
  await initializeDatabase();
  const email = "demo@sweety.app";
  const password = "SweetyDemo123!";
  const passwordHash = await bcrypt.hash(password, 12);
  const userResult = await pool.query(
    `INSERT INTO users(name,email,password_hash) VALUES($1,$2,$3)
     ON CONFLICT(email) DO UPDATE SET name=EXCLUDED.name
     RETURNING id`,
    ["Sweety Demo", email, passwordHash]
  );
  const userId = userResult.rows[0].id;
  await pool.query("DELETE FROM readings WHERE user_id=$1", [userId]);

  const today = new Date();
  const date = (offset) => {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - offset));
    return d.toISOString().slice(0, 10);
  };
  const samples = [
    [date(0), "Morning (fasting)", 105],
    [date(0), "After breakfast", 142],
    [date(0), "After lunch", 136],
    [date(1), "Morning (fasting)", 99],
    [date(1), "After dinner", 128],
    [date(3), "Morning (fasting)", 110],
    [date(3), "After lunch", 151]
  ];
  for (const [day, slot, value] of samples) {
    await pool.query(
      "INSERT INTO readings(user_id,reading_date,time_slot,value) VALUES($1,$2,$3,$4)",
      [userId, day, slot, value]
    );
  }
  console.log("Demo user ready:");
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
} catch (error) {
  console.error(error);
  process.exitCode = 1;
} finally {
  await pool.end();
}
