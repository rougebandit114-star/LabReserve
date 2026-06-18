import { useState, useMemo } from "react";
import { Booking, Resource } from "../types";
import { Clock, Calendar, ShieldCheck, Box } from "lucide-react";

interface CalendarTimelineProps {
  bookings: Booking[];
  resources: Resource[];
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export default function CalendarTimeline({
  bookings,
  resources,
  selectedDate,
  onDateChange,
}: CalendarTimelineProps) {
  const [activeTab, setActiveTab] = useState<"workspace" | "equipment">("workspace");

  // Generate hourly blocks from 08:00 to 20:00 (12 hours)
  const hours = useMemo(() => {
    const list = [];
    for (let h = 8; h <= 20; h++) {
      list.push(String(h).padStart(2, "0") + ":00");
    }
    return list;
  }, []);

  // Filter resources based on selected type
  const filteredResources = useMemo(() => {
    return resources.filter((r) => r.type === activeTab);
  }, [resources, activeTab]);

  // Helper to check if a specific time slot date & hour has already passed
  const isPastSlot = useMemo(() => {
    return (dateStr: string, hourStr: string) => {
      const todayStr = new Date().toISOString().split("T")[0];
      if (dateStr < todayStr) return true;
      if (dateStr === todayStr) {
        const currentHour = new Date().getHours();
        const slotHour = parseInt(hourStr.split(":")[0]);
        return slotHour <= currentHour;
      }
      return false;
    };
  }, []);

  // Compute availability state for each hour block for each resource
  const scheduleMatrix = useMemo(() => {
    const matrix: Record<string, Record<string, Booking | null>> = {};

    filteredResources.forEach((res) => {
      matrix[res.id] = {};
      hours.forEach((hr) => {
        matrix[res.id][hr] = null;
      });

      // Filter active (approved or pending) bookings for this resource on this selected date
      const activeBookings = bookings.filter(
        (b) => b.resourceId === res.id && b.date === selectedDate && b.status !== "canceled"
      );

      activeBookings.forEach((b) => {
        const startHour = parseInt(b.startTime.split(":")[0]);
        const endHour = parseInt(b.endTime.split(":")[0]);

        hours.forEach((hr) => {
          const blockHour = parseInt(hr.split(":")[0]);
          if (blockHour >= startHour && blockHour < endHour) {
            matrix[res.id][hr] = b;
          }
        });
      });
    });

    return matrix;
  }, [filteredResources, bookings, selectedDate, hours]);

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm font-sans" id="real-time-scheduler-hub">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-gray-100">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2 font-display">
            <Clock className="w-5 h-5 text-blue-600" />
            Real-Time Lab Reservation Board
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            Visual hourly slot availability lookup matrix for any inventory asset on any date.
          </p>
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-gray-600 uppercase tracking-wide">
            Date Lookup:
          </label>
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="py-1.5 pl-9 pr-3 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-800 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="absolute left-2.5 top-2.2 text-blue-600">
              <Calendar className="w-4 h-4" />
            </span>
          </div>
        </div>
      </div>

      {/* Resource Category Filter */}
      <div className="flex gap-2.5 mt-5">
        <button
          onClick={() => setActiveTab("workspace")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "workspace"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Workspaces & Hoods
        </button>
        <button
          onClick={() => setActiveTab("equipment")}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeTab === "equipment"
              ? "bg-slate-900 text-white shadow-sm"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Specialist Equipment
        </button>
      </div>

      {/* Grid Timeline Scrollbox */}
      <div className="mt-5 overflow-x-auto border border-gray-100 rounded-2xl">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="p-3.5 text-xs font-bold text-gray-500 uppercase tracking-wider w-56">
                Resource Name
              </th>
              {hours.map((hr) => (
                <th
                  key={hr}
                  className="p-2 text-center text-[10px] font-bold text-gray-500 uppercase tracking-wider min-w-[45px] border-l border-gray-100"
                >
                  {hr}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredResources.map((res) => (
              <tr key={res.id} className="border-b border-gray-150 last:border-0 hover:bg-slate-50/50">
                <td className="p-4">
                  <div className="text-xs font-bold text-gray-900 leading-tight">{res.name}</div>
                  <div className="text-[10px] text-gray-500 mt-0.5 mt-1 font-sans flex items-center gap-1.5">
                    <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded-md font-semibold text-[8px]">
                      {res.id}
                    </span>
                    <span>{res.location}</span>
                  </div>
                </td>

                {hours.map((hr) => {
                  const rsv = scheduleMatrix[res.id]?.[hr];
                  const hourInt = parseInt(hr.split(":")[0]);
                  const label = `${hourInt}:00 - ${hourInt + 1}:00`;

                  const startLimit = res.availStart ? parseInt(res.availStart.split(":")[0]) : 8;
                  const endLimit = res.availEnd ? parseInt(res.availEnd.split(":")[0]) : 20;

                  const isClosed = hourInt < startLimit || hourInt >= endLimit;

                  if (isClosed) {
                    return (
                      <td
                        key={hr}
                        className="p-1 border-l border-gray-100 bg-gray-50/50"
                        title={`${label} [Closed / Unavailable in operating timetable: ${res.availStart || "08:00"} - ${res.availEnd || "20:00"}]`}
                      >
                        <div className="h-9 w-full bg-slate-100 border border-slate-200 text-[8px] text-gray-400 font-bold rounded-md flex flex-col items-center justify-center opacity-70">
                          <span>CLOSED</span>
                        </div>
                      </td>
                    );
                  }

                  const hasPassed = isPastSlot(selectedDate, hr);

                  if (hasPassed) {
                    return (
                      <td
                        key={hr}
                        className="p-1 border-l border-gray-100 bg-gray-50/50"
                        title={`${label} [Past time slot]`}
                      >
                        <div className="h-9 w-full bg-gray-100 border border-gray-200 text-[8px] text-gray-400 font-bold rounded-md flex flex-col items-center justify-center opacity-70">
                          <span>PAST</span>
                        </div>
                      </td>
                    );
                  }

                  if (rsv) {
                    const isPending = rsv.status === "pending";
                    return (
                      <td
                        key={hr}
                        className="p-1 p-y border-l border-gray-100"
                        title={`${label} [Occupied: ${rsv.userName} - ${rsv.purpose}] (${rsv.status})`}
                      >
                        <div
                          className={`h-9 w-full rounded-md flex flex-col items-center justify-center text-[8px] font-bold tracking-tight px-1 text-center truncate select-none ${
                            isPending
                              ? "bg-yellow-50 text-yellow-800 border border-yellow-250 animate-pulse"
                              : "bg-blue-50 text-blue-700 border border-blue-150"
                          }`}
                        >
                          <span className="truncate max-w-[50px] block">{rsv.userName.split(" ")[0]}</span>
                          <span className="opacity-70 scale-90 text-[7px]" style={{ fontSize: "7px" }}>{rsv.id}</span>
                        </div>
                      </td>
                    );
                  }

                  return (
                    <td
                      key={hr}
                      className="p-1 border-l border-gray-100"
                      title={`${label} [Available for registration]`}
                    >
                      <div className="h-9 w-full bg-green-50 hover:bg-green-100 border border-green-200 text-[8px] text-green-700 font-bold rounded-md flex items-center justify-center opacity-75 hover:opacity-100 transition-all cursor-pointer">
                        FREE
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-4.5 xs:flex-row flex-col items-start xs:items-center mt-3 text-[11px] text-gray-500 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 bg-green-50 border border-green-200 rounded" />
          <span>Available (Green)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 bg-blue-50 border border-blue-200 rounded" />
          <span>Active Reservation (Blue)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 bg-yellow-50 border border-yellow-200 rounded animate-pulse" />
          <span>Pending Director Clearance (Yellow)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 bg-gray-100 border border-gray-200 rounded" />
          <span>Past Time Slot (Grey)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 bg-slate-100 border border-slate-200 rounded" />
          <span>Closed / Out of Timetable</span>
        </div>
      </div>
    </div>
  );
}
