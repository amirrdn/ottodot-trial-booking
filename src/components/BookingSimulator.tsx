"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createPendingBooking, confirmPayment } from "@/app/actions/booking";

interface Parent {
  id: string;
  name: string;
}

interface Student {
  id: string;
  name: string;
  parentId: string;
  parent?: Parent | null;
}

interface Booking {
  id: string;
  studentId: string;
  trialClassId: string;
  status: string;
  student: Student;
}

interface TrialClass {
  id: string;
  name: string;
  startTime: Date | string;
  capacity: number;
  bookings: Booking[];
}

interface BookingSimulatorProps {
  classes: TrialClass[];
  students: Student[];
}

interface ExecutionLog {
  id: string;
  message: string;
  success: boolean;
  timestamp: string;
  details?: string;
}

export default function BookingSimulator({
  classes,
  students,
}: BookingSimulatorProps) {
  const router = useRouter();
  const [logs, setLogs] = useState<ExecutionLog[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);

  // Identify current class with exactly 1 seat remaining
  const targetClass = classes.find((c) => {
    const confirmedCount = c.bookings.filter(
      (b) => b.status === "CONFIRMED"
    ).length;
    return c.capacity - confirmedCount === 1;
  });

  const handleSimulateRace = async () => {
    setIsSimulating(true);

    try {
      // 1. Locate the class with exactly one seat remaining
      const foundTargetClass = classes.find((c) => {
        const confirmedCount = c.bookings.filter(
          (b) => b.status === "CONFIRMED"
        ).length;
        return c.capacity - confirmedCount === 1;
      });

      if (!foundTargetClass) {
        setLogs((prev) => [
          {
            id: crypto.randomUUID(),
            message:
              "SIMULATION_ABORTED: No trial class with exactly 1 seat remaining was found.",
            success: false,
            timestamp: new Date().toLocaleTimeString(),
          },
          ...prev,
        ]);
        setIsSimulating(false);
        return;
      }

      // 2. Select two available students who do not already have confirmed bookings in this class
      const confirmedStudentIds = new Set(
        foundTargetClass.bookings
          .filter((b) => b.status === "CONFIRMED")
          .map((b) => b.studentId)
      );

      const availableStudents = students.filter(
        (s) => !confirmedStudentIds.has(s.id)
      );

      if (availableStudents.length < 2) {
        setLogs((prev) => [
          {
            id: crypto.randomUUID(),
            message: `SIMULATION_ABORTED: Requires 2 eligible students to race. Found ${availableStudents.length}.`,
            success: false,
            timestamp: new Date().toLocaleTimeString(),
          },
          ...prev,
        ]);
        setIsSimulating(false);
        return;
      }

      const student1 = availableStudents[0];
      const student2 = availableStudents[1];

      // Atomic flow: createPendingBooking -> confirmPayment
      const executeBookingAndPaymentFlow = async (
        student: Student,
        tag: string
      ) => {
        const pendingResult = await createPendingBooking(
          student.id,
          foundTargetClass.id
        );

        if (!pendingResult.success || !pendingResult.booking) {
          return {
            studentName: student.name,
            success: false,
            message: `[${tag}] ${student.name} -> Booking creation failed: ${
              pendingResult.message || "Unknown error"
            }`,
          };
        }

        const paymentResult = await confirmPayment(pendingResult.booking.id);

        if (!paymentResult.success) {
          return {
            studentName: student.name,
            success: false,
            message: `[${tag}] ${student.name} -> Payment REJECTED: ${paymentResult.message}`,
          };
        }

        return {
          studentName: student.name,
          success: true,
          message: `[${tag}] ${student.name} -> Payment CONFIRMED! Successfully claimed seat.`,
        };
      };

      // 3. Execute two concurrent booking and payment flows simultaneously using Promise.all
      const [res1, res2] = await Promise.all([
        executeBookingAndPaymentFlow(student1, "CLIENT_THREAD_ALPHA"),
        executeBookingAndPaymentFlow(student2, "CLIENT_THREAD_BETA"),
      ]);

      // 4. Update state with exact success or error messages returned by both transactions
      setLogs((prev) => [
        {
          id: crypto.randomUUID(),
          message: res1.message,
          success: res1.success,
          timestamp: new Date().toLocaleTimeString(),
        },
        {
          id: crypto.randomUUID(),
          message: res2.message,
          success: res2.success,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);

      // Refresh server-side roster state
      router.refresh();
    } catch (error) {
      setLogs((prev) => [
        {
          id: crypto.randomUUID(),
          message: `FATAL_ERROR: ${
            error instanceof Error ? error.message : "Unexpected simulation error"
          }`,
          success: false,
          timestamp: new Date().toLocaleTimeString(),
        },
        ...prev,
      ]);
    } finally {
      setIsSimulating(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-indigo-100 shadow-xl shadow-indigo-50/50 p-6 sm:p-8 space-y-6">
      {/* Top Banner: Tool Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-indigo-100 text-indigo-800">
              Diagnostic Rig
            </span>
            <span className="text-xs text-slate-400 font-mono">
              PostgreSQL &bull; SELECT ... FOR UPDATE
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">
            Last-Seat Concurrency Simulator
          </h2>
          <p className="text-xs text-slate-500 max-w-xl">
            Simulates two customers clicking &ldquo;Pay Now&rdquo; at the exact same microsecond for the last remaining seat using{" "}
            <code className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono text-indigo-600 font-semibold">
              Promise.all()
            </code>
            . Verifies row-level locking consistency.
          </p>
        </div>

        {/* Status & CTA */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col justify-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Session In Scope
            </span>
            <span className="text-xs font-bold text-slate-800 truncate max-w-[180px]">
              {targetClass ? targetClass.name : "None (1-seat required)"}
            </span>
          </div>

          <button
            onClick={handleSimulateRace}
            disabled={isSimulating || !targetClass}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-indigo-600 via-indigo-700 to-violet-700 hover:from-indigo-500 hover:to-violet-600 active:scale-[0.98] shadow-lg shadow-indigo-200 hover:shadow-indigo-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 transition-all duration-200 cursor-pointer"
          >
            {isSimulating ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8H4z"
                  />
                </svg>
                <span>Running Race Condition...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-4 h-4 text-indigo-200"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2.5"
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <span>Simulate Last-Seat Race</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Terminal / System Console Logs Output */}
      <div className="rounded-xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden font-mono">
        {/* Terminal Header Bar */}
        <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
              <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            </div>
            <span className="text-xs text-slate-400 font-semibold ml-2">
              concurrency_audit_stream.log
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-500 uppercase tracking-wider">
              PostgreSQL Read Committed + Row Lock
            </span>
            {logs.length > 0 && (
              <button
                onClick={() => setLogs([])}
                className="text-[11px] text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Terminal Content Body */}
        <div className="p-4 sm:p-5 max-h-80 overflow-y-auto space-y-2 text-xs">
          {logs.length === 0 ? (
            <div className="py-8 text-center text-slate-600 select-none">
              <p className="text-slate-500">
                // System awaiting test trigger...
              </p>
              <p className="text-[11px] text-slate-600 mt-1">
                Click &quot;Simulate Last-Seat Race&quot; to initiate dual concurrent payment dispatch.
              </p>
            </div>
          ) : (
            logs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2.5 py-1 leading-relaxed border-b border-slate-900 last:border-0"
              >
                <span className="text-slate-500 select-none shrink-0 font-mono text-[11px]">
                  {log.timestamp}
                </span>

                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider shrink-0 uppercase ${
                    log.success
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {log.success ? "CONFIRMED" : "REJECTED"}
                </span>

                <span
                  className={`flex-1 break-all ${
                    log.success ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {log.message}
                </span>
              </div>
            ))
          )}
        </div>

        {/* Terminal Footer Bar */}
        <div className="px-4 py-2 bg-slate-900/60 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-500">
          <span>Concurrency Level: 2 parallel requests</span>
          <span className="text-slate-400">
            {logs.length} events recorded
          </span>
        </div>
      </div>
    </div>
  );
}
