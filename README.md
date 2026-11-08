# Sweety – Blood Glucose Tracker

A fresher-level full-stack application built for the Kenpath Junior Full Stack Developer – JavaScript & AI assignment.

## Features

- User registration and login with bcrypt password hashing and JWT authentication.
- Each user can access only their own readings.
- Create, view, edit and delete glucose readings.
- Four fixed time slots and a maximum of four readings per day.
- Validation for required values, whole numbers from 40–600 mg/dl, duplicate slots and future dates.
- Daily, month-to-date and previous-month reports with highest, lowest, average (one decimal) and reading count.
- Daily report lists individual readings.
- Responsive React interface.
- PostgreSQL schema initialization on server startup.
- Seed demo user and automated validation tests.

## Technology

- Frontend: React 18, Vite, CSS
- Backend: Node.js, Express
- Database: PostgreSQL
- Authentication: bcryptjs + JSON Web Tokens
- Tests: Node.js built-in test runner

## Requirements

Install:
- Node.js 18 or newer (Node.js 20 LTS recommended)
- npm
- PostgreSQL 14 or newer
- Git

## 1. Create the database

Open pgAdmin Query Tool or the PostgreSQL SQL Shell (psql), then run:

```sql
CREATE DATABASE sweety_db;
```

If you use a different PostgreSQL username, password, host or port, use those values in `server/.env`.

## 2. Configure environment files

In the `server` folder, copy `.env.example` to `.env` and update the database password and JWT secret:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:YOUR_POSTGRES_PASSWORD@localhost:5432/sweety_db
JWT_SECRET=use_a_long_random_secret_here
CLIENT_URL=http://localhost:5173
```

In the `client` folder, copy `.env.example` to `.env`:

```env
VITE_API_URL=http://localhost:5000/api
```

Do not commit `.env` files. They are excluded by `.gitignore`.

## 3. Install dependencies

From the project root:

```bash
npm install
npm run install:all
```

## 4. Start the application

From the project root:

```bash
npm run dev
```

Open the frontend at http://localhost:5173. The API runs at http://localhost:5000.

The backend creates the `users` and `readings` tables automatically when it starts.

If you prefer separate terminals:

Terminal 1:
```bash
cd server
npm install
npm run dev
```

Terminal 2:
```bash
cd client
npm install
npm run dev
```

## 5. Add demo data

Stop neither server; open a new terminal at the project root:

```bash
npm run seed
```

Demo login:
- Email: `demo@sweety.app`
- Password: `SweetyDemo123!`

The seed script resets readings for this demo account and inserts sample readings. Do not use this demo password for a real account.

## 6. Run tests

From the project root:

```bash
npm test
```

The tests cover valid readings, missing values, allowed range, whole-number validation, future dates and allowed slots.

## API endpoints

All request and response bodies use JSON.

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Create account |
| POST | `/api/auth/login` | Log in |

### Readings (Bearer token required)

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/readings` | List the signed-in user's readings |
| POST | `/api/readings` | Add a reading |
| PUT | `/api/readings/:id` | Edit one of the user's readings |
| DELETE | `/api/readings/:id` | Delete one of the user's readings |

Example reading body:

```json
{
  "date": "2026-11-08",
  "slot": "Morning (fasting)",
  "value": 105
}
```

Optional pagination is supported: `GET /api/readings?page=1&limit=20`.

### Reports (Bearer token required)

`GET /api/reports?date=YYYY-MM-DD`

Returns:
- `daily`: selected date stats and individual readings
- `monthToDate`: first day of selected month through selected date
- `previousMonth`: entire previous calendar month

## Database design

### users
- `id` – primary key
- `name`
- `email` – unique
- `password_hash` – bcrypt hash, never plain text
- `created_at`

### readings
- `id` – primary key
- `user_id` – foreign key to users
- `reading_date`
- `time_slot`
- `value`
- `created_at`
- Unique constraint on `(user_id, reading_date, time_slot)`

## Assumptions and notes

1. A reading is associated with a calendar date and one of the four exact slots supplied in the assignment.
2. Glucose values are stored as whole-number mg/dl values.
3. A user can edit or delete only readings that belong to their account.
4. The previous-month report always means the complete calendar month immediately before the selected date's month.
5. Reports with no readings return null high/low/average values and a count of zero; the UI displays an empty state.
6. The app uses JWT bearer tokens with a seven-day expiry. For a production deployment, use secure HTTP-only cookies, HTTPS, rate limiting, stronger operational logging and managed secret storage.
7. The app is an assignment demonstration and is not intended to provide medical advice or emergency alerts.

## Improvements with more time

- Add React Testing Library component tests.
- Add a chart for monthly trends.
- Add Docker Compose for the database and services.
- Add password reset, rate limiting and stronger session handling.
- Add accessibility checks and end-to-end tests.

## Suggested Git commit plan

Make small commits as you complete each part, for example:

```bash
git init
git add README.md .gitignore package.json
git commit -m "chore: initialize Sweety project"

git add server
git commit -m "feat: add Express API and PostgreSQL schema"

git add client
git commit -m "feat: build React glucose tracker interface"

git add server/test
git commit -m "test: add glucose reading validation tests"
```
