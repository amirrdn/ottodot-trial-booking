# AI Usage Report & Retrospective

This report documents the usage of Artificial Intelligence tools throughout the development of the Ottodot Trial Booking System, highlighting productivity gains, technical course-corrections, and key workflow takeaways.

---

## 1. AI Tools Used

- **Antigravity IDE (Google AI)**: Leveraged as the primary autonomous full-stack engineering agent for project scaffolding, schema modeling, script generation, frontend development, and terminal execution.

---

## 2. What AI Was Used For

- **Next.js Boilerplate Generation**: Initializing the Next.js App Router foundation with TypeScript, PostCSS, and Tailwind CSS.
- **Prisma Schema & DDL**: Generating the relational schema definition covering `Parent`, `Student`, `TrialClass`, `Booking`, and `PaymentAttempt` along with compound unique constraints.
- **Synthetic Seeder Scripts**: Generating `prisma/seed.ts` to populate initial parents, students, classes, and the exact 3/4 pre-booked setup for race condition testing.
- **Tailwind UI Dashboard**: Scaffolding the SaaS EdTech admin dashboard, responsive session grid cards, attendee rosters, and the interactive simulator widget.

---

## 3. Where AI Helped Move Faster

- **Initial Schema Setup & Data Modeling**: Rapidly defining relations, foreign keys, compound indexes, and database migrations without manual boilerplate writing.
- **Frontend Styling Scaffolding**: Generating clean, modern Tailwind utility layouts (cards, progress bars, responsive grids, and dark terminal outputs) in minutes rather than hours of CSS tweaking.

---

## 4. Where I Disagreed With, Corrected, or Rejected AI Output

- **Basic Transaction vs. Explicit Pessimistic Row Locking (`FOR UPDATE`)**:
  - **AI Proposal**: The AI initially suggested a basic Prisma interactive transaction (`prisma.$transaction`) with a standard `booking.count()` check followed by an `update()`.
  - **My Correction**: I explicitly rejected this naive approach because checking a count inside a standard `READ COMMITTED` transaction still permits race conditions under concurrent load (both concurrent transactions read `count = 3` before either commits, leading to overbooking).
  - **Resolution**: I forced the AI to inject raw SQL pessimistic locking:
    ```typescript
    await tx.$queryRaw`SELECT id FROM "TrialClass" WHERE id = ${booking.trialClassId} FOR UPDATE`;
    ```
    This guarantees that concurrent checkouts are strictly serialized on the target `TrialClass` row before checking capacity limits.

---

## 5. What to Change About the AI Workflow Next Time

- **Specify Non-Functional Concurrency Constraints Upfront**:
  - Rather than allowing the AI to propose naive transaction patterns and correcting them later, provide strict architectural concurrency constraints (such as pessimistic row-level locking or distributed lock requirements) directly in the initial prompt.
  - This eliminates unnecessary refactoring loops and immediately guides the agent to production-grade patterns.

---

## 6. Verification Method

- **Custom UI Concurrency Simulator**:
  - Rather than relying solely on automated unit test mocks, a custom `BookingSimulator` UI was built directly into the admin dashboard.
  - It dispatches two concurrent checkout transactions simultaneously via `Promise.all()` to explicitly test the last-seat race against PostgreSQL, proving that exactly one transaction succeeds while the other is rejected with `"Class reached maximum capacity during payment."`