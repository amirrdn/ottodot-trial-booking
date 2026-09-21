import { PrismaClient, BookingStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning up existing data...");
  await prisma.paymentAttempt.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.student.deleteMany();
  await prisma.trialClass.deleteMany();
  await prisma.parent.deleteMany();

  console.log("Seeding database...");

  // 1. Create 2 Parents
  const parentA = await prisma.parent.create({
    data: {
      name: "Parent A",
      email: "parent.a@example.com",
    },
  });

  const parentB = await prisma.parent.create({
    data: {
      name: "Parent B",
      email: "parent.b@example.com",
    },
  });

  // 2. Create 4 Students linked to these parents
  const student1 = await prisma.student.create({
    data: {
      name: "Student 1 (Parent A)",
      parentId: parentA.id,
    },
  });

  const student2 = await prisma.student.create({
    data: {
      name: "Student 2 (Parent A)",
      parentId: parentA.id,
    },
  });

  const student3 = await prisma.student.create({
    data: {
      name: "Student 3 (Parent B)",
      parentId: parentB.id,
    },
  });

  const student4 = await prisma.student.create({
    data: {
      name: "Student 4 (Parent B)",
      parentId: parentB.id,
    },
  });

  const student5 = await prisma.student.create({
    data: {
      name: "Student 5 (Parent B)",
      parentId: parentB.id,
    },
  });

  // 3. Create 2 TrialClasses
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const classEmpty = await prisma.trialClass.create({
    data: {
      name: "Class Empty",
      capacity: 4,
      startTime: tomorrow,
    },
  });

  const classAlmostFull = await prisma.trialClass.create({
    data: {
      name: "Class Almost Full",
      capacity: 4,
      startTime: tomorrow,
    },
  });

  // 4. Create 3 Bookings with status 'CONFIRMED' for "Class Almost Full" using 3 of the students
  const booking1 = await prisma.booking.create({
    data: {
      studentId: student1.id,
      trialClassId: classAlmostFull.id,
      status: BookingStatus.CONFIRMED,
    },
  });

  const booking2 = await prisma.booking.create({
    data: {
      studentId: student2.id,
      trialClassId: classAlmostFull.id,
      status: BookingStatus.CONFIRMED,
    },
  });

  const booking3 = await prisma.booking.create({
    data: {
      studentId: student3.id,
      trialClassId: classAlmostFull.id,
      status: BookingStatus.CONFIRMED,
    },
  });

  // 5. Console log the generated Class IDs and Student IDs
  console.log("\n==========================================");
  console.log("🎉 Database Seed Completed Successfully!");
  console.log("==========================================");
  console.log("\n--- Trial Classes ---");
  console.log(`Class Empty ID       : ${classEmpty.id} (Capacity: 4, Booked: 0)`);
  console.log(`Class Almost Full ID : ${classAlmostFull.id} (Capacity: 4, Booked: 3, Seats Left: 1)`);

  console.log("\n--- Students ---");
  console.log(`Student 1 ID (Booked): ${student1.id} (${student1.name})`);
  console.log(`Student 2 ID (Booked): ${student2.id} (${student2.name})`);
  console.log(`Student 3 ID (Booked): ${student3.id} (${student3.name})`);
  console.log(`Student 4 ID (FREE)  : ${student4.id} (${student4.name} - Available for race condition test)`);

  console.log("\n--- Confirmed Bookings for Class Almost Full ---");
  console.log(`Booking 1: ${booking1.id} -> Student: ${student1.id}`);
  console.log(`Booking 2: ${booking2.id} -> Student: ${student2.id}`);
  console.log(`Booking 3: ${booking3.id} -> Student: ${student3.id}`);
  console.log("==========================================\n");
}

main()
  .catch((e) => {
    console.error("Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
