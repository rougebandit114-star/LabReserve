import React, { useState, useMemo } from "react";
import { Booking, BookingStatus } from "../types";
import { 
  Calendar, 
  Clock, 
  FileDown, 
  FileSpreadsheet, 
  Search,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Inbox,
  Filter,
  Eye,
  Check
} from "lucide-react";
import { exportBookingsToExcel, exportBookingsToPDF } from "../utils/reports";

interface MyQueueProps {
  user: any;
  bookings: Booking[];
  onCancelBooking: (id: string) => Promise<void>;
  onCancelGroupBooking?: (groupId: string) => Promise<void>;
  seenBookingIds?: string[];
  onMarkBookingSeen?: (id: string) => void;
  onMarkAllBookingsSeen?: () => void;
}

export default function MyQueue({ 
  user, 
  bookings, 
  onCancelBooking, 
  onCancelGroupBooking,
  seenBookingIds = [],
  onMarkBookingSeen,
  onMarkAllBookingsSeen
}: MyQueueProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<"all" | "pending" | "approved" | "canceled">("all");
  const [confirmingCancelId, setConfirmingCancelId] = useState<string | null>(null);

  // Filter user's specific bookings
  const myBookings = useMemo(() => {
    return bookings.filter(b => b.userId === user.id);
  }, [bookings, user]);

  // Consolidate bookings that share a groupId
  const consolidatedBookings = useMemo(() => {
    const groups: { [groupId: string]: Booking[] } = {};
    const singles: Booking[] = [];

    myBookings.forEach(b => {
      if (b.groupId) {
        if (!groups[b.groupId]) {
          groups[b.groupId] = [];
        }
        groups[b.groupId].push(b);
      } else {
        singles.push(b);
      }
    });

    const consolidated: {
      id: string;
      isGroup: boolean;
      groupId?: string;
      bookingId: string;
      resourceId: string;
      resourceName: string;
      userId: string;
      userName: string;
      userEmail: string;
      startTime: string;
      endTime: string;
      purpose: string;
      status: BookingStatus;
      createdAt: string;
      dates: string[];
      bookings: Booking[];
    }[] = [];

    // Process groups
    Object.entries(groups).forEach(([groupId, list]) => {
      const sortedList = [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      
      // Compute grouped status
      let overallStatus: BookingStatus = "approved";
      if (sortedList.some(b => b.status === "pending")) {
        overallStatus = "pending";
      } else if (sortedList.every(b => b.status === "canceled")) {
        overallStatus = "canceled";
      } else if (sortedList.some(b => b.status === "approved")) {
        overallStatus = "approved";
      } else if (sortedList.length > 0) {
        overallStatus = sortedList[0].status;
      }

      consolidated.push({
        id: groupId,
        isGroup: true,
        groupId,
        bookingId: sortedList[0].id,
        resourceId: sortedList[0].resourceId,
        resourceName: sortedList[0].resourceName,
        userId: sortedList[0].userId,
        userName: sortedList[0].userName,
        userEmail: sortedList[0].userEmail,
        startTime: sortedList[0].startTime,
        endTime: sortedList[0].endTime,
        purpose: sortedList[0].purpose || "",
        status: overallStatus,
        createdAt: sortedList[0].createdAt || sortedList[0].date,
        dates: sortedList.map(b => b.date),
        bookings: sortedList,
      });
    });

    // Process singles
    singles.forEach(b => {
      consolidated.push({
        id: b.id,
        isGroup: false,
        bookingId: b.id,
        resourceId: b.resourceId,
        resourceName: b.resourceName,
        userId: b.userId,
        userName: b.userName,
        userEmail: b.userEmail,
        startTime: b.startTime,
        endTime: b.endTime,
        purpose: b.purpose || "",
        status: b.status,
        createdAt: b.createdAt || b.date,
        dates: [b.date],
        bookings: [b],
      });
    });

    return consolidated;
  }, [myBookings]);

  // Statistics counters
  const stats = useMemo(() => {
    const total = consolidatedBookings.length;
    const pending = consolidatedBookings.filter(b => b.status === "pending").length;
    const approved = consolidatedBookings.filter(b => b.status === "approved").length;
    const canceled = consolidatedBookings.filter(b => b.status === "canceled").length;
    return { total, pending, approved, canceled };
  }, [consolidatedBookings]);

  // Apply filters
  const filteredBookings = useMemo(() => {
    return consolidatedBookings
      .filter(b => {
        const matchesStatus = selectedStatus === "all" || b.status === selectedStatus;
        const matchesSearch = 
          b.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.resourceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.dates.some(d => d.toLowerCase().includes(searchQuery.toLowerCase())) ||
          (b.purpose && b.purpose.toLowerCase().includes(searchQuery.toLowerCase()));
        return matchesStatus && matchesSearch;
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [consolidatedBookings, selectedStatus, searchQuery]);

  const anyUnseenBookings = useMemo(() => {
    return consolidatedBookings.some(cb => {
      if (cb.isGroup) {
        return cb.bookings.some(bk => !seenBookingIds.includes(bk.id));
      }
      return !seenBookingIds.includes(cb.bookingId);
    });
  }, [consolidatedBookings, seenBookingIds]);

  const executePDFReport = () => {
    exportBookingsToPDF(myBookings, `My_Reservations_${user.name}`);
  };

  const executeExcelReport = () => {
    exportBookingsToExcel(myBookings, `My_Reservations_${user.name}`);
  };

  return (
    <div className="font-sans space-y-6" id="my-reservation-queue-panel">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-slate-900 rounded-2xl text-white gap-4 relative overflow-hidden shadow-md">
        <div className="z-10">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            My Reservation Queue
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Displaying full tracking status and scheduled sessions for <span className="font-semibold text-blue-400">{user.name}</span>.
          </p>
        </div>

        {/* Actions Toolbar */}
        <div className="flex flex-wrap items-center gap-2 z-10 w-full sm:w-auto shrink-0">
          {onMarkAllBookingsSeen && anyUnseenBookings && (
            <button
              type="button"
              onClick={onMarkAllBookingsSeen}
              className="flex-1 sm:flex-initial px-4 py-2 bg-indigo-600 hover:bg-indigo-550 border border-indigo-500/20 text-xs font-bold rounded-xl text-white flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95 duration-100"
              title="Mark all tickets in queue as seen"
            >
              <Check className="w-3.5 h-3.5 text-indigo-200" />
              <span>Mark All Seen</span>
            </button>
          )}

          {user.role === "admin" && (
            <>
              <button
                onClick={executePDFReport}
                disabled={myBookings.length === 0}
                className="flex-1 sm:flex-initial px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold rounded-xl text-slate-200 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm border border-slate-700/60"
                title="Download PDF Booking Slips"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Export PDF</span>
              </button>
              <button
                onClick={executeExcelReport}
                disabled={myBookings.length === 0}
                className="flex-1 sm:flex-initial px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold rounded-xl text-slate-200 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm border border-slate-700/60"
                title="Download Excel Spreadsheet"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>Export XLSX</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Stats Summary Bento Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <button
          onClick={() => setSelectedStatus("all")}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            selectedStatus === "all"
              ? "bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200 dark:bg-indigo-900 dark:border-indigo-400 dark:text-indigo-200 dark:ring-indigo-950/50"
              : "bg-white dark:bg-slate-900 border-gray-150 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          <p className={`text-[10px] font-extrabold uppercase tracking-wider ${selectedStatus === "all" ? "text-indigo-200 dark:text-indigo-300" : "text-gray-400 dark:text-slate-500"}`}>
            All Forms
          </p>
          <p className="text-2xl font-black mt-1 font-display">{stats.total}</p>
        </button>

        <button
          onClick={() => setSelectedStatus("pending")}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            selectedStatus === "pending"
              ? "bg-amber-500 text-white border-amber-500 shadow-md ring-2 ring-amber-100 dark:bg-amber-955/60 dark:border-amber-500 dark:text-amber-250 dark:ring-amber-950/55"
              : "bg-white dark:bg-slate-900 border-gray-150 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          <p className={`text-[10px] font-extrabold uppercase tracking-wider ${selectedStatus === "pending" ? "text-amber-100 dark:text-amber-300" : "text-gray-400 dark:text-slate-500"}`}>
            Pending Clearance
          </p>
          <p className="text-2xl font-black mt-1 font-display">{stats.pending}</p>
        </button>

        <button
          onClick={() => setSelectedStatus("approved")}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            selectedStatus === "approved"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-100 dark:bg-emerald-950/60 dark:border-emerald-500 dark:text-emerald-300 dark:ring-emerald-950/55"
              : "bg-white dark:bg-slate-900 border-gray-150 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          <p className={`text-[10px] font-extrabold uppercase tracking-wider ${selectedStatus === "approved" ? "text-emerald-100 dark:text-emerald-300" : "text-gray-400 dark:text-slate-500"}`}>
            Approved Slots
          </p>
          <p className="text-2xl font-black mt-1 font-display">{stats.approved}</p>
        </button>

        <button
          onClick={() => setSelectedStatus("canceled")}
          className={`p-4 rounded-xl border text-left transition-all cursor-pointer ${
            selectedStatus === "canceled"
              ? "bg-slate-700 text-white border-slate-705 shadow-md ring-2 ring-slate-100 dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:ring-slate-950/50"
              : "bg-white dark:bg-slate-900 border-gray-150 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          }`}
        >
          <p className={`text-[10px] font-extrabold uppercase tracking-wider ${selectedStatus === "canceled" ? "text-slate-300 dark:text-slate-300" : "text-gray-400 dark:text-slate-500"}`}>
            Canceled Blocks
          </p>
          <p className="text-2xl font-black mt-1 font-display">{stats.canceled}</p>
        </button>
      </div>

      {/* Main Filter & Listing Panel */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-gray-150 dark:border-slate-800 shadow-sm overflow-hidden p-5">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800 mb-5">
          {/* Search bar */}
          <div className="relative w-full sm:max-w-md">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter queue by ID, Resource, Date or Purpose..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-slate-950 border border-gray-200 dark:border-slate-800 rounded-xl text-xs text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <span className="absolute left-3 top-2.5 text-gray-400 dark:text-slate-500">
              <Search className="w-4 h-4" />
            </span>
          </div>

          {/* Active status pill display */}
          <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-slate-400 self-end sm:self-auto font-medium">
            <Filter className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Showing: <strong className="text-slate-800 dark:text-slate-200 capitalize">{selectedStatus === "all" ? "All Reservations" : `${selectedStatus} Only`}</strong></span>
          </div>
        </div>

        {/* Listings Directory */}
        {filteredBookings.length === 0 ? (
          <div className="py-20 text-center max-w-sm mx-auto">
            <div className="w-12 h-12 bg-slate-50 dark:bg-slate-950 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-gray-150 dark:border-slate-800">
              <Inbox className="w-6 h-6 text-gray-400 dark:text-slate-500" />
            </div>
            <p className="text-sm font-bold text-gray-700 dark:text-slate-200">No matching reservations found</p>
            <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 leading-relaxed">
              We couldn't find any entries matching your filters. Try adjusting your search query or reset the filter pill above.
            </p>
            {myBookings.length === 0 && (
              <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-4">
                Head over to "Catalog & Slots" to schedule your first reservation slot!
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredBookings.map(b => {
              const isApproved = b.status === "approved";
              const isPending = b.status === "pending";
              const isCanceled = b.status === "canceled";

              const isUnseen = b.isGroup
                ? b.bookings.some(bk => !seenBookingIds.includes(bk.id))
                : !seenBookingIds.includes(b.bookingId);

              const handleCardClick = () => {
                if (isUnseen && onMarkBookingSeen) {
                  if (b.isGroup) {
                    b.bookings.forEach(bk => {
                      if (!seenBookingIds.includes(bk.id)) {
                        onMarkBookingSeen(bk.id);
                      }
                    });
                  } else {
                    onMarkBookingSeen(b.bookingId);
                  }
                }
              };

              return (
                <div
                  key={b.id}
                  onClick={handleCardClick}
                  className={`p-4 rounded-xl border-2 transition-all flex flex-col justify-between cursor-pointer ${
                    isUnseen 
                      ? "ring-2 ring-indigo-400 border-indigo-500 bg-indigo-55/10 dark:bg-indigo-950/30 dark:border-indigo-500 shadow-md"
                      : isCanceled 
                      ? "bg-red-50/5 dark:bg-red-950/10 border-red-500 dark:border-red-800 opacity-80" 
                      : isPending 
                      ? "bg-yellow-50/5 dark:bg-amber-950/10 border-yellow-400 dark:border-amber-650"
                      : "bg-green-50/5 dark:bg-emerald-950/10 border-green-500 dark:border-emerald-600"
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header line */}
                    <div className="flex justify-between items-start gap-1">
                      <span className="text-[10px] font-mono font-bold text-gray-400 dark:text-slate-500 flex items-center gap-1.5 flex-wrap">
                        <span>{b.isGroup ? `GROUP: ${b.id}` : `ID: ${b.id}`}</span>
                        {isUnseen && (
                          <span 
                            className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 px-1.5 py-0.5 rounded text-[8.5px] font-bold flex items-center gap-1"
                            title="Unseen booking ticket"
                          >
                            <span className="w-1.5 h-1.5 bg-indigo-600 dark:bg-indigo-400 rounded-full animate-ping shrink-0" />
                            <span>NEW TICKET</span>
                          </span>
                        )}
                      </span>
                      <span
                        className={`text-[10px] font-extrabold px-2.5 py-1 rounded-md uppercase tracking-wider border flex items-center gap-1 shrink-0 ${
                          isApproved
                            ? "bg-green-100 text-green-800 border-green-200 dark:bg-green-950/70 dark:text-green-300 dark:border-green-800"
                            : isPending
                            ? "bg-yellow-105 text-yellow-850 border-yellow-200 dark:bg-yellow-950/70 dark:text-yellow-300 dark:border-yellow-800 animate-pulse"
                            : "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/70 dark:text-red-300 dark:border-red-800"
                        }`}
                      >
                        {isApproved ? "APPROVED" : isPending ? "PENDING" : "CANCELLED"}
                      </span>
                    </div>

                    {/* Resource details */}
                    <div className="mt-1 text-sm font-bold text-gray-900 dark:text-white font-display">
                      {b.resourceName}
                    </div>

                    {/* Direct scheduling info */}
                    <div className="space-y-2 mt-3 text-xs text-gray-500 dark:text-slate-400 font-sans">
                      {b.isGroup ? (
                        <div className="space-y-1.5">
                          <p className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                            <Calendar className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                            <span>Scheduled ({b.dates.length} days):</span>
                          </p>
                          <div className="flex flex-wrap gap-1.5 pl-6">
                            {b.dates.map(d => (
                              <span 
                                key={d}
                                className="text-[10px] font-mono font-bold bg-indigo-50/65 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100/60 dark:border-indigo-900/50 px-2 py-0.5 rounded"
                              >
                                {d}
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400 dark:text-slate-500 shrink-0" />
                          <span>Scheduled: <strong className="text-gray-700 dark:text-slate-200">{b.dates[0]}</strong></span>
                        </p>
                      )}
                      <p className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400 dark:text-slate-500 shrink-0" />
                        <span>Session Hours: <strong className="text-gray-700 dark:text-slate-200">{b.startTime} - {b.endTime}</strong></span>
                      </p>
                    </div>

                    {/* Purpose clause */}
                    {b.purpose && (
                      <div className="mt-3 p-2.5 bg-slate-50 dark:bg-slate-950/60 border border-gray-100 dark:border-slate-800 rounded-lg text-xs italic text-gray-600 dark:text-slate-450 leading-normal">
                        "{b.purpose}"
                      </div>
                    )}
                  </div>

                  {/* Actions footer */}
                  {!isCanceled && (
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-slate-850 flex justify-end">
                      {confirmingCancelId === b.id ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-amber-600 dark:text-amber-400 font-extrabold">Confirm recycle?</span>
                          <button
                            type="button"
                            onClick={async () => {
                              if (b.isGroup && onCancelGroupBooking) {
                                  await onCancelGroupBooking(b.id);
                              } else {
                                await onCancelBooking(b.bookingId);
                              }
                              setConfirmingCancelId(null);
                            }}
                            className="text-[11px] bg-red-600 text-white px-2.5 py-1 rounded-lg font-extrabold hover:bg-red-700 transition-all cursor-pointer shadow-2xs"
                          >
                            Yes, Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmingCancelId(null)}
                            className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-705 dark:text-slate-300 px-2.5 py-1 rounded-lg font-extrabold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmingCancelId(b.id);
                          }}
                          className="text-xs text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300 font-bold hover:underline cursor-pointer flex items-center gap-1 transition-colors"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Cancel Booking</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
