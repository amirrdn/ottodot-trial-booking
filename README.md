# Ottodot Trial Booking System

A minimal, production-grade trial booking system built with Next.js App Router, Prisma ORM, and PostgreSQL, strictly focused on data integrity, duplicate booking prevention, and concurrency handling under concurrent load, wrapped in a modern EdTech admin dashboard.

---

## 1. How to Run

### Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **PostgreSQL**: Running instance with an accessible database (e.g. `ottodot_db`).

### Steps

1. **Configure Environment Variables**:
   Verify your `.env` file contains your PostgreSQL connection string:
   ```env
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ottodot_db?schema=public"
   ```

2. **Install Dependencies**:
   ```bash
   npm install
   ```

3. **Push Prisma Schema to PostgreSQL**:
   Sync tables, enums, and database-level constraints:
   ```bash
   npx prisma db push
   ```

4. **Seed Test Data**:
   Populate test parents, students, and trial classes (including "Class Almost Full" with 3/4 confirmed bookings):
   ```bash
   npx prisma db seed
   ```

5. **Start Next.js Development Server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 2. What Was Built

A minimal trial booking system strictly focused on **data integrity** and **concurrency handling**, wrapped in a professional EdTech Admin Dashboard:
- **Relational Domain Models**: `Parent`, `Student`, `TrialClass`, `Booking`, and `PaymentAttempt` with UUID primary keys.
- **Strict Duplicate Prevention**: Compound database-level unique constraint (`@@unique([studentId, trialClassId])`) on the `Booking` model to prevent multiple bookings by the same student.
- **Atomic Server Actions**:
  - `createPendingBooking`: Initializes reservations in `PENDING_PAYMENT` status while gracefully handling Prisma `P2002` duplicate errors.
  - `confirmPayment`: Atomically validates capacity and processes payment inside an isolated transaction.
- **Professional Admin Dashboard**: A clean EdTech SaaS interface showing live session rosters, attendance indicators, dynamic capacity progress bars, and a built-in diagnostic test rig.

---

## 3. Time Spent

- **Approximately 3.5 hours** total across backend architecture, schema modeling, PostgreSQL synchronization, concurrency locking implementation, and SaaS dashboard UI development.

---

## 4. Assumptions Made

- **Simplified Authentication**: Bypassed full user session cookies and OAuth flows, passing student and parent identities directly to actions for straightforward testing and verification.
- **Mock Payment Gateways**: Modeled payment authorization through synchronous status responses rather than external third-party webhook integrations.
- **Fixed Default Capacity**: Trial classes operate with a default seat limit of 4 (`capacity: 4`).

---

## 5. Key Architecture Decisions & The Last-Seat Race Solution

### Architecture Stack
- **Framework**: Next.js (App Router with Server Actions)
- **ORM**: Prisma Client v6
- **Database**: PostgreSQL

### Solving the Last-Seat Race Condition: Pessimistic Row Locking (`SELECT ... FOR UPDATE`)

#### The Problem
In standard web applications running on PostgreSQL's default `READ COMMITTED` isolation level, a critical race condition occurs when two parents attempt to confirm payment for the final available seat simultaneously:
1. "Class Almost Full" has capacity 4 with 3 confirmed bookings (1 seat remaining).
2. Client A and Client B trigger payment confirmation at the exact same millisecond.
3. In a naive transaction without locking, both transactions query `count = 3 < 4`.
4. Both transactions proceed to update their status to `CONFIRMED`.
5. Both commit, producing 5 confirmed bookings and **overbooking the class**.

#### The Solution
To guarantee strict isolation, `confirmPayment` runs inside a Prisma interactive transaction (`prisma.$transaction`) with an explicit raw SQL **pessimistic row lock**:

```typescript
await tx.$queryRaw`SELECT id FROM "TrialClass" WHERE id = ${booking.trialClassId} FOR UPDATE`;
```

#### How it Resolves the Race Condition:
1. **Exclusive Lock Acquisition**: The first transaction immediately locks the target `TrialClass` row.
2. **Serialization**: Any competing concurrent transaction attempting to book or confirm payment for that class is forced by PostgreSQL to wait until the first transaction finishes.
3. **Re-Evaluation**:
   - The first transaction reads `confirmedCount = 3 < 4`, marks the booking as `CONFIRMED`, logs a `SUCCESS` payment attempt, and commits.
   - The second transaction unblocks, re-evaluates the confirmed count: `confirmedCount = 4 >= 4`.
   - The second transaction detects that capacity is exhausted, updates the booking to `PAYMENT_FAILED`, logs a `FAILED` payment attempt, and returns:
     ```json
     { "success": false, "message": "Class reached maximum capacity during payment." }
     ```
4. **Guaranteed Outcome**: The database strictly preserves the capacity limit without overbooking.

---

## 6. Verification Step: The BookingSimulator UI

Instead of relying solely on isolated unit tests, a dedicated client component (**`BookingSimulator`**) was built directly into the admin dashboard as an explicit verification tool:
- **Mechanism**: The simulator identifies the session with exactly one seat open, selects two available students, and launches two concurrent booking and payment flows simultaneously using:
  ```typescript
  const [res1, res2] = await Promise.all([
    executeBookingFlow(student1),
    executeBookingFlow(student2),
  ]);
  ```
- **Visible Proof**: The results stream directly into a dark monospace terminal console on the dashboard. One transaction receives a green `[CONFIRMED]` outcome while the competing transaction receives a red `[REJECTED]` outcome with the message `"Class reached maximum capacity during payment."`, visually and deterministically verifying the row-level database lock in real time.

---

## 7. What Was Deliberately Cut

- **Real Payment Gateway Integration**: Omitted Stripe/PayPal webhook lifecycles, refunds, and delayed asynchronous settlements.
- **Actual User Authentication**: Omitted JWT/OAuth login mechanisms, password reset flows, and role-based access control (RBAC).

---

## 8. Future Monitoring

Once deployed to production, the following metrics must be closely observed:
- **Database Lock Wait Times**: Monitor PostgreSQL `pg_stat_activity` wait event durations for `FOR UPDATE` queries to ensure transactions commit rapidly without holding row locks or causing connection pool bottlenecks.
- **Transaction Rollback Rates**: Track aborted transactions, deadlock exceptions, and statement timeout spikes under high-concurrency registration spikes.
