import { PrismaClient, BookingStatus } from "@prisma/client";
import BookingSimulator from "@/components/BookingSimulator";

export const dynamic = "force-dynamic";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default async function HomePage() {
  // Query all trial classes with confirmed bookings, student info, and parent details
  const classes = await prisma.trialClass.findMany({
    include: {
      bookings: {
        where: {
          status: BookingStatus.CONFIRMED,
        },
        include: {
          student: {
            include: {
              parent: true,
            },
          },
        },
      },
    },
    orderBy: {
      startTime: "asc",
    },
  });

  // Query all students
  const students = await prisma.student.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return (
    <div className="space-y-10">
      {/* Dashboard Top Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-slate-200/80">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-indigo-50 border border-indigo-100 text-[11px] font-semibold text-indigo-700 uppercase tracking-wider mb-2">
            Operations &bull; Trial Bookings
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Class Management &amp; Roster
          </h1>
          <p className="mt-1 text-sm text-slate-500 max-w-2xl">
            Live trial session attendee tracking, real-time seat capacities, and high-concurrency reservation controls.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-xs text-xs font-medium text-slate-700">
            <span className="text-slate-400">Total Classes:</span>
            <span className="font-semibold text-slate-900">{classes.length}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-xs text-xs font-medium text-slate-700">
            <span className="text-slate-400">Students:</span>
            <span className="font-semibold text-slate-900">{students.length}</span>
          </div>
        </div>
      </div>

      {/* Section 1: Admin Roster */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Scheduled Sessions
          </h2>
          <span className="text-xs text-slate-400">
            Updated via PostgreSQL transactions
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {classes.map((cls) => {
            const confirmedCount = cls.bookings.length;
            const remainingSeats = cls.capacity - confirmedCount;
            const isFull = remainingSeats <= 0;
            const isAlmostFull = remainingSeats === 1;

            const sessionDate = new Date(cls.startTime);

            return (
              <div
                key={cls.id}
                className="bg-white rounded-xl shadow-xs border border-slate-200 hover:shadow-md transition-all duration-200 flex flex-col justify-between overflow-hidden"
              >
                {/* Card Header & Capacity Status */}
                <div className="p-5 border-b border-slate-100 bg-gradient-to-b from-slate-50/50 to-white">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-bold text-base text-slate-900 line-clamp-1">
                      {cls.name}
                    </h3>

                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap shadow-2xs ${
                        isFull
                          ? "bg-rose-50 text-rose-700 border border-rose-200"
                          : isAlmostFull
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                      }`}
                    >
                      <span
                        className={`w-1.5 h-1.5 rounded-full ${
                          isFull
                            ? "bg-rose-500"
                            : isAlmostFull
                            ? "bg-amber-500 animate-ping"
                            : "bg-emerald-500"
                        }`}
                      />
                      {isFull
                        ? "Class Full"
                        : isAlmostFull
                        ? "1 Seat Left!"
                        : `${remainingSeats} Seats Available`}
                    </span>
                  </div>

                  {/* Date & Time display */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <svg
                      className="w-3.5 h-3.5 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    <span>
                      {sessionDate.toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                    <span className="text-slate-300">&bull;</span>
                    <svg
                      className="w-3.5 h-3.5 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <span>
                      {sessionDate.toLocaleTimeString(undefined, {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>

                  {/* Capacity Progress Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium mb-1">
                      <span>Enrollment</span>
                      <span>
                        {confirmedCount} / {cls.capacity} students
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isFull
                            ? "bg-rose-500"
                            : isAlmostFull
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                        }`}
                        style={{
                          width: `${(confirmedCount / cls.capacity) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Enrolled Students Roster List */}
                <div className="p-5 flex-1 flex flex-col justify-start">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3 block">
                    Confirmed Attendees ({confirmedCount})
                  </span>

                  {cls.bookings.length === 0 ? (
                    <div className="py-6 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50/50 my-auto">
                      <p className="text-xs text-slate-400 italic">
                        No students enrolled yet
                      </p>
                    </div>
                  ) : (
                    <ul className="space-y-2.5">
                      {cls.bookings.map((booking) => {
                        const studentName = booking.student.name;
                        const parentName = booking.student.parent?.name;
                        const initials = studentName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase();

                        return (
                          <li
                            key={booking.id}
                            className="flex items-center gap-3 p-2 rounded-lg bg-slate-50/80 hover:bg-slate-100/80 border border-slate-100 transition-colors"
                          >
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-indigo-600 text-white font-semibold text-[11px] flex items-center justify-center shrink-0 shadow-2xs">
                              {initials}
                            </div>
                            <div className="flex flex-col min-w-0 flex-1">
                              <span className="text-xs font-semibold text-slate-800 truncate">
                                {studentName}
                              </span>
                              {parentName && (
                                <span className="text-[10px] text-slate-400 truncate">
                                  Parent: {parentName}
                                </span>
                              )}
                            </div>
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-100/70 text-emerald-800">
                              Confirmed
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Section 2: Concurrency & Booking Simulator */}
      <section>
        <BookingSimulator classes={classes} students={students} />
      </section>
    </div>
  );
}
