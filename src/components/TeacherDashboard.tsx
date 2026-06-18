import React, { useState, useMemo } from "react";
import { Resource, Booking, Notification } from "../types";
import { 
  Search, 
  MapPin, 
  Calendar, 
  Clock, 
  Plus, 
  X, 
  Bell, 
  AlertTriangle, 
  CheckCircle,
  FileSpreadsheet,
  FileDown,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { exportBookingsToExcel, exportBookingsToPDF } from "../utils/reports";

interface TeacherDashboardProps {
  user: any;
  resources: Resource[];
  bookings: Booking[];
  notifications: Notification[];
  onAddBooking: (payload: any) => Promise<void>;
  onCancelBooking: (id: string) => Promise<void>;
  onMarkNotificationRead: (id: string) => Promise<void>;
  onMarkAllNotificationsRead: () => Promise<void>;
  selectedDate: string;
}

export default function TeacherDashboard({
  user,
  resources,
  bookings,
  notifications,
  onAddBooking,
  onCancelBooking,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  selectedDate,
}: TeacherDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedType, setSelectedType] = useState<"all" | "workspace" | "equipment">("all");
  
  // New Booking Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [bookingDate, setBookingDate] = useState(selectedDate);
  const [bookingDates, setBookingDates] = useState<string[]>([]);
  const [isMultiDay, setIsMultiDay] = useState(false);
  const [calMonth, setCalMonth] = useState<number>(() => new Date().getMonth());
  const [calYear, setCalYear] = useState<number>(() => new Date().getFullYear());
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("11:00");
  const [purpose, setPurpose] = useState("");
  
  const [bookingError, setBookingError] = useState("");
  const [bookingSubmitting, setBookingSubmitting] = useState(false);
  const [reservedAlertMessage, setReservedAlertMessage] = useState<string | null>(null);

  // My bookings (student reservations specifically)
  const myBookings = useMemo(() => {
    return bookings.filter(b => b.userId === user.id);
  }, [bookings, user]);

  const activeMyBookingsCount = useMemo(() => {
    return myBookings.filter(b => b.status === "approved" || b.status === "pending").length;
  }, [myBookings]);

  // Categories extraction
  const categories = useMemo(() => {
    const list = new Set(resources.map(r => r.category));
    return ["All", ...Array.from(list)];
  }, [resources]);

  // Filter inventory
  const filteredResources = useMemo(() => {
    return resources.filter(r => {
      const matchSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.id.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCategory = selectedCategory === "All" || r.category === selectedCategory;
      const matchType = selectedType === "all" || r.type === selectedType;
      return matchSearch && matchCategory && matchType;
    });
  }, [resources, searchQuery, selectedCategory, selectedType]);

  const getSystemDateString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const date = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${date}`;
  };

  const validateAndAdjustTimes = (newSingleDate: string, newMultiDates: string[]) => {
    if (!selectedResource) return;
    const startLimitHour = selectedResource.availStart ? selectedResource.availStart : "08:00";
    const startLimitHourInt = parseInt(startLimitHour.split(":")[0]);
    const endLimitHour = selectedResource.availEnd ? selectedResource.availEnd : "20:00";
    const endLimitHourInt = parseInt(endLimitHour.split(":")[0]);

    const isTodaySelected = !isMultiDay 
      ? (newSingleDate === getSystemDateString())
      : newMultiDates.includes(getSystemDateString());

    const currentStartHrNum = parseInt(startTime.split(":")[0]);

    let minAllowedStartHr = startLimitHourInt;
    if (isTodaySelected) {
      minAllowedStartHr = Math.max(startLimitHourInt, new Date().getHours() + 1);
    }

    // If current startTime is in the past/below the allowed limit or past the closing hour, adjust it
    if (currentStartHrNum < minAllowedStartHr || currentStartHrNum >= endLimitHourInt) {
      const defaultStartHr = minAllowedStartHr < endLimitHourInt ? minAllowedStartHr : startLimitHourInt;
      const startStr = String(defaultStartHr).padStart(2, "0") + ":00";
      const endStr = String(Math.min(endLimitHourInt, defaultStartHr + 2)).padStart(2, "0") + ":00";
      setStartTime(startStr);
      setEndTime(endStr);
    }
  };

  const openBookingModal = (res: Resource) => {
    setSelectedResource(res);
    setBookingError("");
    setIsMultiDay(false);

    // Get current system local date YYYY-MM-DD
    const systemDateStr = getSystemDateString();
    
    // Default to selectedDate, but if it is in the past compared to system local date, override to system local date
    let defaultDate = selectedDate;
    if (defaultDate < systemDateStr) {
      defaultDate = systemDateStr;
    }

    // Let's check operational hours bounds for this resource
    const startLimitHour = res.availStart ? res.availStart : "08:00";
    const startLimitHourInt = parseInt(startLimitHour.split(":")[0]);
    const endLimitHour = res.availEnd ? res.availEnd : "20:00";
    const endLimitHourInt = parseInt(endLimitHour.split(":")[0]);

    // Check if defaultDate is today, and if we are already past the operating hours of today
    const now = new Date();
    const systemHour = now.getHours();

    if (defaultDate === systemDateStr && systemHour >= endLimitHourInt - 1) {
      // Too late to book today! Increment defaultDate to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const year = tomorrow.getFullYear();
      const month = String(tomorrow.getMonth() + 1).padStart(2, "0");
      const date = String(tomorrow.getDate()).padStart(2, "0");
      defaultDate = `${year}-${month}-${date}`;
    }

    setBookingDate(defaultDate);
    setBookingDates([]); // Don't add default date when reserving to keep days added list empty as requested

    // Calculate start hour considering the current system hour if selected date is today
    let defaultStartHourInt = startLimitHourInt;
    if (defaultDate === systemDateStr) {
      // Shift start hour to at least next hour, or current hour if minutes is 0,
      // but ensure it's not in the past
      const nextHour = systemHour + 1;
      defaultStartHourInt = Math.max(startLimitHourInt, nextHour);
      if (defaultStartHourInt >= endLimitHourInt) {
        defaultStartHourInt = startLimitHourInt; // Fallback, though we advanced date above
      }
    }

    const startStr = String(defaultStartHourInt).padStart(2, "0") + ":00";
    const endLimitHourStr = String(Math.min(endLimitHourInt, defaultStartHourInt + 2)).padStart(2, "0") + ":00";

    setStartTime(startStr);
    setEndTime(endLimitHourStr);

    // Initialize calendar month and year using the defaultDate month & year
    const parsedDate = new Date(defaultDate + "T12:00:00");
    setCalMonth(parsedDate.getMonth());
    setCalYear(parsedDate.getFullYear());

    setIsModalOpen(true);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBookingError("");
    setBookingSubmitting(true);

    if (!selectedResource) return;

    if (isMultiDay && bookingDates.length === 0) {
      setBookingError("Please select at least one calendar date for multi-day reservations.");
      setBookingSubmitting(false);
      return;
    }

    // Safety validation block: Prevent submitting slots that are already in the past on today
    const systemDateStr = getSystemDateString();
    const isTodayIncluded = isMultiDay ? bookingDates.includes(systemDateStr) : (bookingDate === systemDateStr);
    
    if (isTodayIncluded) {
      const now = new Date();
      const systemHour = now.getHours();
      const selectedStartHr = parseInt(startTime.split(":")[0]);
      if (selectedStartHr <= systemHour) {
        setBookingError(`Invalid hours: the slot start time (${startTime}) is already in the past according to system local time.`);
        setBookingSubmitting(false);
        return;
      }
    }

    try {
      await onAddBooking({
        resourceId: selectedResource.id,
        date: isMultiDay ? bookingDates[0] : bookingDate,
        dates: isMultiDay ? bookingDates : [bookingDate],
        startTime,
        endTime,
        purpose,
      });
      // Success
      setIsModalOpen(false);
      setPurpose("");
    } catch (err: any) {
      setBookingError(err.message || "Failed to reserve slot. Standard collision detected.");
    } finally {
      setBookingSubmitting(false);
    }
  };

  const executePDFReport = () => {
    exportBookingsToPDF(myBookings, `My_Reservations_${user.name}`);
  };

  const executeExcelReport = () => {
    exportBookingsToExcel(myBookings, `My_Reservations_${user.name}`);
  };

  return (
    <div className="font-sans space-y-6">
      {/* Student Welcome & Notifications Bar */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 bg-slate-900 rounded-2xl text-white gap-4 relative overflow-hidden shadow-md">
        <div className="absolute right-0 top-0 opacity-10 animate-pulse pointer-events-none">
          <Sparkles className="w-48 h-48 text-blue-500" />
        </div>
        
        <div className="z-10">
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            Welcome back, {user.name}
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Department: <span className="font-semibold text-white">{user.department}</span> | Logged as <span className="font-semibold text-blue-400 capitalize">{user.role}</span>
          </p>
        </div>

        {/* Action Widgets */}
        {user.role === "admin" && (
          <div className="flex items-center gap-3.5 z-10 w-full sm:w-auto justify-end">
            <div className="flex flex-1 sm:flex-initial gap-2">
              <button
                onClick={executePDFReport}
                disabled={myBookings.length === 0}
                className="flex-1 sm:flex-initial px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold rounded-xl text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>PDF Logs</span>
              </button>
              <button
                onClick={executeExcelReport}
                disabled={myBookings.length === 0}
                className="flex-1 sm:flex-initial px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-xs font-bold rounded-xl text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" />
                <span>XLSX Logs</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Resource Listings */}
      <div className="w-full space-y-5">
        {/* Filtering Header */}
        <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search input */}
            <div className="relative flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search and reserve: e.g. Microscope, Fume Hood..."
                className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="absolute left-3 top-3.5 text-gray-400">
                <Search className="w-4.5 h-4.5" />
              </span>
            </div>

            {/* Type Switch */}
            <div className="flex bg-gray-50 p-1 border border-gray-200 rounded-xl shrink-0">
              <button
                type="button"
                onClick={() => setSelectedType("all")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                  selectedType === "all" ? "bg-white text-slate-950 shadow-sm" : "text-gray-500 hover:text-slate-800"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedType("workspace")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                  selectedType === "workspace" ? "bg-white text-slate-950 shadow-sm" : "text-gray-500 hover:text-slate-800"
                }`}
              >
                Spaces
              </button>
              <button
                type="button"
                onClick={() => setSelectedType("equipment")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg ${
                  selectedType === "equipment" ? "bg-white text-slate-950 shadow-sm" : "text-gray-500 hover:text-slate-800"
                }`}
              >
                Equipment
              </button>
            </div>
          </div>

          {/* Category horizontal scroller */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
            <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider shrink-0 mr-2">
              Category:
            </span>
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.2 text-xs font-semibold rounded-lg shrink-0 whitespace-nowrap transition-all cursor-pointer ${
                  selectedCategory === cat 
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "bg-gray-50 border border-gray-150 text-gray-600 hover:bg-gray-100"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-3 border-t border-slate-100 text-xs gap-2">
            <span className="text-slate-500 font-medium flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></span>
              Checking reservation slots for: <strong className="text-slate-800 font-bold bg-slate-100 px-2 py-0.5 rounded-md font-mono">{selectedDate}</strong>
            </span>
            <span className="text-[10px] text-slate-400 italic">
              Go to Timeline tab to switch dates
            </span>
          </div>
        </div>

        {/* Resources Cards Inventory */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredResources.map(res => {
            return (
              <div
                key={res.id}
                className="bg-white rounded-2xl border border-gray-150 overflow-hidden flex flex-col hover:shadow-md transition-all group"
              >
                <div className="h-40 bg-gray-100 relative overflow-hidden">
                  <img
                    src={res.image}
                    alt={res.name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300"
                  />
                  <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1.5">
                    <span className="text-[9px] font-extrabold bg-slate-900/80 backdrop-blur-md text-white px-2 py-0.5 rounded-md uppercase">
                      {res.type}
                    </span>
                    <span className="text-[9px] font-extrabold bg-blue-600/80 backdrop-blur-md text-white px-2 py-0.5 rounded-md uppercase">
                      {res.category}
                    </span>
                  </div>

                  <div className="absolute bottom-2.5 left-2.5">
                    <span className="text-[8.5px] font-bold bg-amber-500 text-slate-950 px-2.5 py-0.8 rounded-md flex items-center gap-1 shadow-sm uppercase">
                      <AlertTriangle className="w-3 h-3 text-slate-950 fill-white shrink-0 animate-bounce" />
                      Admin Approval Required
                    </span>
                  </div>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-start gap-2">
                      <h4 className="text-sm font-bold text-gray-900 leading-snug">{res.name}</h4>
                      <span className="text-[10px] font-mono font-bold bg-gray-100 p-1.2 text-gray-600 rounded">
                        {res.id}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 leading-relaxed text-slate-600 line-clamp-3">
                      {res.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider font-semibold">Location details</span>
                      <span className="flex items-center gap-1 text-gray-600 font-bold">
                        <MapPin className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                        {res.location}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => openBookingModal(res)}
                      className="py-2 px-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 shadow hover:shadow-md transition-all shrink-0 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Reserve
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredResources.length === 0 && (
          <div className="p-12 text-center bg-gray-50 border border-gray-200 rounded-2xl font-sans">
            <p className="text-sm font-bold text-gray-600">No resources match search filters.</p>
            <p className="text-xs text-gray-400 mt-1">Try clearing keywords, types, or scanning other categories.</p>
          </div>
        )}
      </div>

      {/* Reservation Dialog Modal */}
      {isModalOpen && selectedResource && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-2 sm:p-4">
          <div className={`bg-white rounded-2xl w-full ${isMultiDay ? 'max-w-[460px] md:max-w-2xl' : 'max-w-md'} border border-gray-200 overflow-hidden shadow-2xl relative animate-fadeIn font-sans flex flex-col max-h-[92vh] sm:max-h-[88vh] transition-all duration-200`}>
            <div className="bg-slate-900 px-5 py-3.5 text-white flex justify-between items-center shrink-0">
              <div>
                <span className="text-[9px] font-extrabold uppercase tracking-widest text-blue-400">
                  SLOT ALLOCATION REQUEST
                </span>
                <h4 className="text-sm font-bold truncate mt-0.5">{selectedResource.name}</h4>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-all hover:bg-slate-800 cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookingSubmit} className="flex flex-col flex-1 overflow-hidden">
              {/* Scrollable container for Form Fields */}
              <div className="p-4 sm:p-5 space-y-4 overflow-y-auto flex-1 text-slate-700">
                {bookingError && (
                  <div className="p-3 bg-red-50 border border-red-150 rounded-xl text-xs text-red-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{bookingError}</span>
                  </div>
                )}

                {/* Resource capacity indicator */}
                <div className="p-3 bg-blue-50/40 border border-blue-100 rounded-xl flex items-start gap-2.5 text-xs text-blue-950">
                  <Info className="w-4 h-4 shrink-0 text-blue-600 mt-0.5" />
                  <div>
                    <span className="font-bold">Operational Constraints</span>
                    <p className="text-[11px] text-blue-800 mt-0.5 leading-relaxed">
                      {selectedResource.type === "workspace" 
                        ? `Workstation capacity limits: ${selectedResource.capacity} simultaneous researcher occupancy at Station ${selectedResource.id}.`
                        : "Strict equipment exclusivity: Any timeline collision will reject the form instantly."}
                    </p>
                  </div>
                </div>

                {/* Select Reservation Mode */}
                <div>
                  <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block mb-1.5">
                    Reservation Mode
                  </label>
                  <div className="grid grid-cols-2 gap-1.5 bg-gray-100 p-1 rounded-xl">
                    <button
                      type="button"
                      onClick={() => setIsMultiDay(false)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        !isMultiDay 
                          ? "bg-white text-gray-800 shadow-xs" 
                          : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      📅 Single Day
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsMultiDay(true)}
                      className={`py-1.5 rounded-lg text-xs font-bold transition-all ${
                        isMultiDay 
                          ? "bg-white text-gray-800 shadow-xs" 
                          : "text-gray-500 hover:text-gray-800"
                      }`}
                    >
                      🗓️ Multi-Day Recurring
                    </button>
                  </div>
                </div>

                {/* Booking Date Selection */}
                {!isMultiDay ? (
                  <div>
                    <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block mb-1.5">
                      Select Calendar Date
                    </label>
                    <input
                      type="date"
                      required={!isMultiDay}
                      value={bookingDate}
                      min={getSystemDateString()}
                      onChange={(e) => {
                        const newD = e.target.value;
                        setBookingDate(newD);
                        validateAndAdjustTimes(newD, bookingDates);
                      }}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm"
                    />
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 pt-0.5">
                    {/* Left side: Calendar Selection */}
                    <div className="md:col-span-7 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <label className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider block">
                            🗓️ Select Calendar Dates
                          </label>
                          <p className="text-[10px] text-slate-400">
                            Toggle multiple days. Past days are disabled.
                          </p>
                        </div>
                      </div>

                      {/* Month Picker Controls */}
                      <div className="flex items-center justify-between py-1 border-b border-slate-100 mb-1 shrink-0">
                        <button
                          type="button"
                          disabled={calYear < new Date().getFullYear() || (calYear === new Date().getFullYear() && calMonth <= new Date().getMonth())}
                          onClick={() => {
                            if (calMonth === 0) {
                              setCalMonth(11);
                              setCalYear((prev) => prev - 1);
                            } else {
                              setCalMonth((prev) => prev - 1);
                            }
                          }}
                          className="p-1 px-1.5 text-[10px] rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-0.5 font-bold"
                        >
                          <ChevronLeft className="w-3 h-3" />
                          <span>Prev</span>
                        </button>
                        <span className="text-xs font-extrabold text-slate-700">
                          {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][calMonth]} {calYear}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (calMonth === 11) {
                              setCalMonth(0);
                              setCalYear((prev) => prev + 1);
                            } else {
                              setCalMonth((prev) => prev + 1);
                            }
                          }}
                          className="p-1 px-1.5 text-[10px] rounded-lg border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 cursor-pointer flex items-center gap-0.5 font-bold"
                        >
                          <span>Next</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Calendar grid */}
                      <div className="grid grid-cols-7 gap-0.5 text-center bg-slate-50 p-1.5 rounded-xl border border-slate-200 shrink-0">
                        {["S", "M", "T", "W", "T", "F", "S"].map((dayName, idx) => (
                          <span key={`day-${dayName}-${idx}`} className="text-[9px] font-extrabold text-slate-400 py-0.5">
                            {dayName}
                          </span>
                        ))}

                        {/* Padding cells before the 1st of the month */}
                        {(() => {
                          const firstDayIdx = new Date(calYear, calMonth, 1).getDay();
                          return Array.from({ length: firstDayIdx }).map((_, idx) => (
                            <div key={`cal-pad-${idx}`} className="aspect-square" />
                          ));
                        })()}

                        {/* Day cells */}
                        {(() => {
                          const totalDays = new Date(calYear, calMonth + 1, 0).getDate();
                          const systemToday = getSystemDateString();
                          return Array.from({ length: totalDays }).map((_, idx) => {
                            const dayNum = idx + 1;
                            const dateValue = `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
                            const isPast = dateValue < systemToday;
                            const isSelected = bookingDates.includes(dateValue);

                            return (
                              <button
                                key={dateValue}
                                type="button"
                                disabled={isPast}
                                onClick={() => {
                                  let updated;
                                  if (isSelected) {
                                    updated = bookingDates.filter((d) => d !== dateValue);
                                  } else {
                                    updated = [...bookingDates, dateValue].sort();
                                  }
                                  setBookingDates(updated);
                                  validateAndAdjustTimes(bookingDate, updated);
                                }}
                                className={`aspect-square rounded-md text-[10.5px] font-bold flex flex-col items-center justify-center relative transition-all ${
                                  isPast
                                    ? "text-slate-300 bg-slate-100/50 cursor-not-allowed line-through"
                                    : isSelected
                                      ? "bg-indigo-600 text-white shadow-xs"
                                      : "text-slate-700 bg-white border border-slate-100 hover:bg-slate-50 hover:border-slate-200 cursor-pointer"
                                }`}
                              >
                                <span>{dayNum}</span>
                                {isSelected && (
                                  <span className="absolute bottom-[2px] leading-none text-indigo-200 font-extrabold text-[8px]">✓</span>
                                )}
                              </button>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {/* Right side: Days Added List container */}
                    <div className="md:col-span-5 flex flex-col">
                      <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex-1 flex flex-col min-h-[160px] md:min-h-0 h-full">
                        <div className="flex justify-between items-center text-[10px] font-extrabold text-slate-500 uppercase tracking-widest mb-1.5 shrink-0">
                          <span>Dates Selected ({bookingDates.length})</span>
                          {bookingDates.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                setBookingDates([]);
                                validateAndAdjustTimes(bookingDate, []);
                              }}
                              className="text-[10px] font-extrabold text-red-600 hover:underline cursor-pointer lowercase"
                            >
                              clear
                            </button>
                          )}
                        </div>

                        {bookingDates.length === 0 ? (
                          <div className="flex-1 flex items-center justify-center text-center p-2.5 border border-dashed border-slate-200 rounded-lg bg-white">
                            <p className="text-[10.5px] text-gray-400 italic font-medium leading-relaxed">
                              No dates selected.<br />Tick calendar days to select.
                            </p>
                          </div>
                        ) : (
                          <div className="flex-1 overflow-y-auto max-h-[148px] pr-0.5 space-y-1 bg-white border border-slate-100 rounded-lg p-2">
                            <div className="grid grid-cols-1 gap-1">
                              {bookingDates.map((d) => (
                                <span
                                  key={d}
                                  className="inline-flex items-center justify-between gap-1 text-[10px] font-mono bg-slate-50 border border-slate-150 text-slate-700 px-2 py-0.5 rounded-md shadow-3xs animate-in zoom-in duration-100"
                                >
                                  <span>{d}</span>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const nextDates = bookingDates.filter((x) => x !== d);
                                      setBookingDates(nextDates);
                                      validateAndAdjustTimes(bookingDate, nextDates);
                                    }}
                                    className="text-gray-400 hover:text-red-500 text-[11px] font-extrabold cursor-pointer leading-none p-0.5"
                                    title="Delete Date"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Session hour bounds */}
                <div className="grid grid-cols-2 gap-3 shrink-0">
                  <div>
                    <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block mb-1.5">
                      Start Hour ({selectedResource?.availStart || "08:00"} - {selectedResource?.availEnd || "20:00"})
                    </label>
                    <select
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none"
                    >
                      {(() => {
                        let startLimitHr = selectedResource?.availStart ? parseInt(selectedResource.availStart.split(":")[0]) : 8;
                        const endLimitHr = selectedResource?.availEnd ? parseInt(selectedResource.availEnd.split(":")[0]) : 20;
                        
                        // If selected booking date is today, do not show/select hours in the past!
                        const isTodaySelected = !isMultiDay 
                          ? (bookingDate === getSystemDateString())
                          : bookingDates.includes(getSystemDateString());

                        if (isTodaySelected) {
                          const systemHour = new Date().getHours();
                          startLimitHr = Math.max(startLimitHr, systemHour + 1);
                        }
                        
                        const length = Math.max(1, endLimitHr - startLimitHr);
                        const availableHrs = Array.from({ length }, (_, i) => String(startLimitHr + i).padStart(2, "0") + ":00");
                        
                        return availableHrs.map((hr) => (
                          <option key={hr} value={hr}>{hr}</option>
                        ));
                      })()}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block mb-1.5">
                      End Hour
                    </label>
                    <select
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none"
                    >
                      {(() => {
                        const endLimitHr = selectedResource?.availEnd ? parseInt(selectedResource.availEnd.split(":")[0]) : 20;
                        const currentStartHourNum = parseInt(startTime?.split(":")[0] || "08");
                        const maxPossibleBookableHours = endLimitHr - currentStartHourNum;
                        return Array.from({ length: Math.max(1, maxPossibleBookableHours) }, (_, i) => String(currentStartHourNum + 1 + i).padStart(2, "0") + ":00").map((hr) => (
                          <option key={hr} value={hr}>{hr}</option>
                        ));
                      })()}
                    </select>
                  </div>
                </div>

                {/* Research purpose */}
                <div className="shrink-0">
                  <label className="text-[10px] font-extrabold text-gray-500 uppercase tracking-wider block mb-1.5">
                    Research Description / Project Scope
                  </label>
                  <textarea
                    required
                    rows={2}
                    value={purpose}
                    onChange={(e) => setPurpose(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs placeholder-gray-400 text-gray-700 focus:outline-none"
                    placeholder="Describe reagents, sample types, or experimental goal. Required for lab logging..."
                  />
                </div>
              </div>

              {/* Fixed Footer */}
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex gap-3 text-sm shrink-0">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 border border-gray-200 rounded-xl text-xs font-bold text-gray-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingSubmitting}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1 cursor-pointer"
                >
                  {bookingSubmitting ? "Allocating..." : "Submit Reservation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Already Reserved Overlay Dialog */}
      {reservedAlertMessage && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm border border-rose-100 overflow-hidden shadow-2xl relative animate-in fade-in zoom-in-95 duration-150 font-sans">
            <div className="bg-rose-50 px-5 py-6 text-center border-b border-rose-100/50">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <AlertTriangle className="w-6 h-6 text-rose-600 animate-bounce" />
              </div>
              <h4 className="text-sm font-extrabold text-rose-950 uppercase tracking-wider">Lab Reserved</h4>
              <p className="text-xs text-rose-800 mt-2 font-semibold">
                {reservedAlertMessage}
              </p>
            </div>
            <div className="p-4 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setReservedAlertMessage(null)}
                className="w-full sm:w-auto px-5 py-2 bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
