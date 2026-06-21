import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { User, Resource, Booking, Notification, EmailLog, AnalyticsSummary } from "./types";
import Auth from "./components/Auth";
import TeacherDashboard from "./components/TeacherDashboard";
import MyQueue from "./components/MyQueue";
import AdminDashboard from "./components/AdminDashboard";
import CalendarTimeline from "./components/CalendarTimeline";
import SimulatedEmails from "./components/SimulatedEmails";
import ProfileSettings from "./components/ProfileSettings";
import OwnerDashboard from "./components/OwnerDashboard";
import { 
  LogOut, 
  Layers, 
  Calendar, 
  Mail, 
  Activity, 
  Wrench, 
  GraduationCap,
  Bell,
  ListTodo,
  Users,
  Settings,
  Database
} from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("lab_session_token"));
  
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">(() => {
    return (localStorage.getItem("alis_theme_mode") as "light" | "dark" | "system") || "system";
  });

  // Monitor dynamic local-storage theme updates inside our React state
  useEffect(() => {
    const handleThemeChange = () => {
      const mode = (localStorage.getItem("alis_theme_mode") as "light" | "dark" | "system") || "system";
      setThemeMode(mode);
    };
    window.addEventListener("theme-mode-changed", handleThemeChange);
    return () => window.removeEventListener("theme-mode-changed", handleThemeChange);
  }, []);

  // Update HTML class variables for Tailwind CSS engine based on the active preference
  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    function applyTheme() {
      const isDark = 
        themeMode === "dark" || 
        (themeMode === "system" && mediaQuery.matches);
      
      if (isDark) {
        root.classList.add("dark");
      } else {
        root.classList.remove("dark");
      }
    }

    applyTheme();

    const mediaListener = () => {
      if (themeMode === "system") {
        applyTheme();
      }
    };

    mediaQuery.addEventListener("change", mediaListener);
    return () => mediaQuery.removeEventListener("change", mediaListener);
  }, [themeMode]);
  
  const [resources, setResources] = useState<Resource[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [seenBookingIds, setSeenBookingIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("lab_seen_bookings") || "[]");
    } catch {
      return [];
    }
  });
  const notificationRef = useRef<HTMLDivElement>(null);

  // Track the seen booking IDs in local storage
  useEffect(() => {
    localStorage.setItem("lab_seen_bookings", JSON.stringify(seenBookingIds));
  }, [seenBookingIds]);

  const handleMarkBookingSeen = (id: string) => {
    setSeenBookingIds(prev => {
      if (prev.includes(id)) return prev;
      return [...prev, id];
    });
  };

  const handleMarkAllBookingsSeen = () => {
    if (!user) return;
    const userBookingIds = bookings
      .filter(b => b.userId === user.id && (b.status === "approved" || b.status === "pending"))
      .map(b => b.id);
    setSeenBookingIds(prev => {
      const next = [...prev];
      userBookingIds.forEach(id => {
        if (!next.includes(id)) {
          next.push(id);
        }
      });
      return next;
    });
  };

  const unreadEmailsCount = useMemo(() => {
    if (!user) return 0;
    return emails.filter(e => 
      (e.toEmail === user.email || !e.fromEmail || e.fromEmail !== user.email) && !e.isRead
    ).length;
  }, [emails, user]);

  const unseenBookingsCount = useMemo(() => {
    if (!user) return 0;
    return bookings.filter(b => 
      b.userId === user.id && 
      (b.status === "approved" || b.status === "pending") && 
      !seenBookingIds.includes(b.id)
    ).length;
  }, [bookings, user, seenBookingIds]);

  // Close notifications on outside clicks
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Close when user log in/out/switches
  useEffect(() => {
    setIsNotifOpen(false);
  }, [user]);
  
  // Set default lookup to our current workspace timezone date YYYY-MM-DD
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const date = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${date}`;
  });
  const [activePanel, setActivePanel] = useState<"reservation" | "timeline" | "queue" | "emails" | "analytics" | "users" | "resources" | "data">("reservation");
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Backup user profiles to browser cache
  const backupUserToLocal = (userToBackup: any) => {
    try {
      const existingUsersStr = localStorage.getItem("lab_backup_users") || "[]";
      const existingList: any[] = JSON.parse(existingUsersStr);
      if (!existingList.some(u => u.email === userToBackup.email)) {
        existingList.push(userToBackup);
        localStorage.setItem("lab_backup_users", JSON.stringify(existingList));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Synchronize client local backups with server to persist across container resets
  const restoreClientBackups = async () => {
    try {
      const usersStr = localStorage.getItem("lab_backup_users") || "[]";
      const bookingsStr = localStorage.getItem("lab_backup_bookings") || "[]";
      const emailsStr = localStorage.getItem("lab_backup_emails") || "[]";
      const notifsStr = localStorage.getItem("lab_backup_notifications") || "[]";

      const usersObj = JSON.parse(usersStr);
      const bookingsObj = JSON.parse(bookingsStr);
      const emailsObj = JSON.parse(emailsStr);
      const notifsObj = JSON.parse(notifsStr);

      if (usersObj.length > 0 || bookingsObj.length > 0 || emailsObj.length > 0 || notifsObj.length > 0) {
        await fetch("/api/backup/restore", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            users: usersObj,
            bookings: bookingsObj,
            emails: emailsObj,
            notifications: notifsObj
          })
        });
      }
    } catch (e) {
      console.error("Backup sync error:", e);
    }
  };

  // Synchronize data states from server
  const fetchAllData = useCallback(async (sessionToken: string) => {
    try {
      const headers = { "Authorization": `Bearer ${sessionToken}` };

      // Load resources, bookings, notifications, and simulated outbox emails in parallel
      const [resResources, resBookings, resNotifs, resEmails] = await Promise.all([
        fetch("/api/resources"),
        fetch("/api/bookings", { headers }),
        fetch("/api/notifications", { headers }),
        fetch("/api/emails", { headers })
      ]);

      if (resResources.ok && resBookings.ok && resNotifs.ok && resEmails.ok) {
        const [dataRes, dataBookings, dataNotifs, dataEmails] = await Promise.all([
          resResources.json(),
          resBookings.json(),
          resNotifs.json(),
          resEmails.json()
        ]);

        setResources(dataRes);
        setBookings(dataBookings);
        setNotifications(dataNotifs);
        setEmails(dataEmails);

        // Auto backup bookings, notifications, and emails to local storage
        try {
          localStorage.setItem("lab_backup_bookings", JSON.stringify(dataBookings));
          localStorage.setItem("lab_backup_notifications", JSON.stringify(dataNotifs));
          localStorage.setItem("lab_backup_emails", JSON.stringify(dataEmails));
        } catch (e) {
          console.error("Failed to backup to localStorage:", e);
        }

        // Fetch analytical ratios if Admin or Owner
        const decodedUser = JSON.parse(localStorage.getItem("lab_user_profile") || "null");
        if (decodedUser && (decodedUser.role === "admin" || decodedUser.role === "owner")) {
          const resAnalytics = await fetch("/api/analytics", { headers });
          if (resAnalytics.ok) {
            const dataAnalytics = await resAnalytics.json();
            setAnalytics(dataAnalytics);
          }
        }
      }
    } catch (err) {
      console.error("Standard synchronisation cycle exception:", err);
    }
  }, []);

  // Check login state on initial render
  useEffect(() => {
    const initAuthCheck = async () => {
      // First restore local database backup safely on startup
      await restoreClientBackups();

      const savedToken = localStorage.getItem("lab_session_token");
      const savedUser = localStorage.getItem("lab_user_profile");
      
      if (savedToken && savedUser) {
        const decodedUser = JSON.parse(savedUser);
        setUser(decodedUser);
        setToken(savedToken);
        backupUserToLocal(decodedUser);
        await fetchAllData(savedToken);
      }
      setLoadingInitial(false);
    };
    initAuthCheck();
  }, [fetchAllData]);

  // Periodic polling refresh to reflect concurrent reservations & background reminders
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      fetchAllData(token);
    }, 15000);
    return () => clearInterval(interval);
  }, [token, fetchAllData]);

  const handleLoginSuccess = async (newUser: User, sessionToken: string) => {
    localStorage.setItem("lab_session_token", sessionToken);
    localStorage.setItem("lab_user_profile", JSON.stringify(newUser));
    setUser(newUser);
    setToken(sessionToken);
    backupUserToLocal(newUser);
    
    // Default panels based on roles
    if (newUser.role === "admin") {
      setActivePanel("analytics");
    } else {
      setActivePanel("reservation");
    }

    await fetchAllData(sessionToken);
  };

  const handleLogout = async () => {
    if (token) {
      try {
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`
          }
        });
      } catch (err) {
        console.error("Error logging logout on server:", err);
      }
    }
    localStorage.removeItem("lab_session_token");
    localStorage.removeItem("lab_user_profile");
    setUser(null);
    setToken(null);
    setBookings([]);
    setNotifications([]);
    setEmails([]);
    setAnalytics(null);
  };

  // Submit new booking record to Express with strict conflict management
  const handleAddBooking = async (payload: { resourceId: string; date?: string; dates?: string[]; startTime: string; endTime: string; purpose: string }) => {
    if (!token) return;

    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Failed to submit booking allocation ticket.");
    }

    // Reload booking and telemetry profiles
    await fetchAllData(token);
  };

  // Cancel reservation ticket
  const handleCancelBooking = async (id: string) => {
    if (!token) return;

    const res = await fetch(`/api/bookings/${id}/cancel`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (res.ok) {
      await fetchAllData(token);
    } else {
      const err = await res.json();
      alert(err.error || "Unauthorized action.");
    }
  };

  // Cancel grouped reservation ticket
  const handleCancelGroupBooking = async (groupId: string) => {
    if (!token) return;

    const res = await fetch(`/api/bookings/group/${groupId}/cancel`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (res.ok) {
      await fetchAllData(token);
    } else {
      const err = await res.json();
      alert(err.error || "Group action cancellation failed.");
    }
  };

  // Mark personal notification read
  const handleMarkNotificationRead = async (id: string) => {
    if (!token) return;

    const res = await fetch(`/api/notifications/${id}/read`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (res.ok) {
      await fetchAllData(token);
    }
  };

  // Clear all notifications
  const handleMarkAllNotificationsRead = async () => {
    if (!token) return;

    const res = await fetch("/api/notifications/read-all", {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` }
    });

    if (res.ok) {
      await fetchAllData(token);
    }
  };

  const isAdmin = user ? (user.role === "admin" || user.role === "owner") : false;
  const isOwner = user ? user.role === "owner" : false;

  const handleUserUpdate = (updatedUser: User) => {
    setUser(updatedUser);
    localStorage.setItem("lab_user_profile", JSON.stringify(updatedUser));
  };

  const displayedNotifications = useMemo(() => {
    if (!user) return [];
    // Keep all notifications so nothing gets lost for both Admins and Teachers
    const filtered = notifications;

    // Sort so new notifications always appear above older ones
    return [...filtered].sort((a, b) => {
      const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (timeB !== timeA) {
        return timeB - timeA;
      }
      return b.id.localeCompare(a.id);
    });
  }, [notifications, user]);

  const handleNotificationClick = async (n: Notification) => {
    // 1. Mark as read
    if (!n.isRead) {
      await handleMarkNotificationRead(n.id);
    }
    
    // 2. Redirect accordingly
    const titleLower = n.title.toLowerCase();
    const msgLower = n.message.toLowerCase();
    
    if (n.emailId) {
      setSelectedEmailId(n.emailId);
      setActivePanel("emails");
    } else if (isAdmin) {
      // For Admin:
      // - "reservation queue for approval mail" (i.e. Reservation Approval Required etc) -> Redirect to analytics (Usage Metrics & Slots Registry)
      if (titleLower.includes("approval") || titleLower.includes("booking") || titleLower.includes("reservation") || msgLower.includes("requested reservation")) {
        setActivePanel("analytics");
      } else if (titleLower.includes("email") || titleLower.includes("mail")) {
        setActivePanel("emails");
      }
    } else {
      // For Teacher (non-admin):
      // Show approve notification, cancel notification, new mail, reminder mail
      const combined = (titleLower + " " + msgLower);
      if (
        combined.includes("approve") || 
        combined.includes("confirm") || 
        combined.includes("cancel") || 
        combined.includes("decline") || 
        combined.includes("reject") ||
        combined.includes("booking") || 
        combined.includes("reservation") ||
        combined.includes("director") ||
        combined.includes("granted") ||
        combined.includes("clearance")
      ) {
        setActivePanel("queue");
      } else if (combined.includes("email") || combined.includes("mail") || combined.includes("reminder")) {
        setActivePanel("emails");
      }
    }
    setIsNotifOpen(false);
  };

  // Admin overrides clearance approve/reject/pending
  const handleApproveBooking = async (id: string, action: "approve" | "reject" | "pending") => {
    if (!token) return;

    const res = await fetch(`/api/bookings/${id}/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ action })
    });

    if (res.ok) {
      await fetchAllData(token);
    } else {
      const err = await res.json();
      alert(err.error || "... override failed.");
    }
  };

  // Admin overrides a group of bookings (multi-day) with a single click
  const handleApproveGroupBooking = async (groupId: string, action: "approve" | "reject" | "pending") => {
    if (!token) return;

    const res = await fetch(`/api/bookings/group/${groupId}/approve`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      },
      body: JSON.stringify({ action })
    });

    if (res.ok) {
      await fetchAllData(token);
    } else {
      const err = await res.json();
      alert(err.error || "Group action clearance failed.");
    }
  };

  if (loadingInitial) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
        <div className="text-center space-y-4">
          <Wrench className="w-10 h-10 text-indigo-600 animate-spin mx-auto" />
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
            Connecting Lab Kernels...
          </p>
        </div>
      </div>
    );
  }

  // Not LoggedIn -> display Auth Form screen
  if (!user || !token) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      
      {/* Sidebar Navigation (Hidden on mobile by default, adaptive height) */}
      <aside className="w-full md:w-64 bg-slate-900 text-slate-300 flex flex-col border-b md:border-b-0 md:border-r border-slate-800 shrink-0">
        <div className="p-6 flex items-center gap-3 border-b border-slate-800">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold font-display">L</div>
          <div>
            <span className="text-lg font-bold text-white tracking-tight font-display block">LabReserve</span>
            <span className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider block -mt-1">Research Hub</span>
          </div>
        </div>

        <nav className="hidden md:flex flex-1 flex-col px-4 py-6 space-y-1.5 overflow-y-auto">
          {/* Reservation tab */}
          <button
            type="button"
            onClick={() => setActivePanel("reservation")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all text-left ${
              activePanel === "reservation" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
            }`}
          >
            <Layers className="w-4 h-4 text-blue-500" />
            <span>Catalog & Slots</span>
          </button>

          {/* My Queue tab */}
          <button
            type="button"
            onClick={() => setActivePanel("queue")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all text-left ${
              activePanel === "queue" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-3">
              <ListTodo className="w-4 h-4 text-blue-500" />
              <span>Reservation Queue</span>
            </span>
          </button>

          {/* Usage Metrics & Slots Registry tab (Admins only) */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActivePanel("analytics")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all text-left ${
                activePanel === "analytics" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <Activity className="w-4 h-4 text-blue-500" />
              <span>Usage Metrics & Slots Registry</span>
            </button>
          )}

          {/* User Registry & Access Controls tab */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActivePanel("users")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all text-left ${
                activePanel === "users" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <Users className="w-4 h-4 text-blue-500" />
              <span>User Registry & Access Controls</span>
            </button>
          )}

          {/* Resource Inventory & Timetables tab */}
          {isAdmin && (
            <button
              type="button"
              onClick={() => setActivePanel("resources")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all text-left ${
                activePanel === "resources" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
              }`}
            >
              <Settings className="w-4 h-4 text-blue-500" />
              <span>Resource Inventory & Timetables</span>
            </button>
          )}

          {/* Data config (Owner and Admin) */}
          {isAdmin && (
            <button
              type="button"
              id="owner-data-menu-btn"
              onClick={() => setActivePanel("data")}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all text-left ${
                activePanel === "data" ? "bg-slate-800 text-amber-300 border border-amber-500/20" : "text-amber-400 hover:bg-slate-800/50 hover:text-amber-300"
              }`}
            >
              <Database className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Data & System Monitor</span>
            </button>
          )}
          
          {/* Timeline Grid Tab */}
          <button
            type="button"
            onClick={() => setActivePanel("timeline")}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all text-left ${
              activePanel === "timeline" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
            }`}
          >
            <Calendar className="w-4 h-4 text-blue-500" />
            <span>Timeline Grid</span>
          </button>

          {/* Mail console tab */}
          <button
            type="button"
            onClick={() => setActivePanel("emails")}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all text-left ${
              activePanel === "emails" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
            }`}
          >
            <span className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-blue-500" />
              <span>Mail</span>
            </span>
            {unreadEmailsCount > 0 && (
              <span className="bg-blue-600 text-white font-bold text-[9px] px-1.5 py-0.5 rounded-md animate-pulse">
                {unreadEmailsCount}
              </span>
            )}
          </button>

          {/* Profile & Settings tab */}
          <button
            type="button"
            onClick={() => setActivePanel("profile")}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-xs font-bold transition-all text-left ${
              activePanel === "profile" ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
            }`}
          >
            <Settings className="w-4 h-4 text-blue-500" />
            <span>Profile & Settings</span>
          </button>
        </nav>

        {/* Sidebar Info Section */}
        <div className="hidden md:block p-4 border-t border-slate-800">
          <div className="bg-blue-900/20 p-4 rounded-xl border border-blue-900/30">
            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">compliance outbox</p>
            <p className="text-[11px] text-slate-300 leading-normal font-sans">
              {isAdmin 
                ? "Administrative elevated access active." 
                : "Simulation client syncing with system services."}
            </p>
          </div>
        </div>
      </aside>

      {/* Main layout container (Right panel) */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Top Header */}
        <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 sm:px-8 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 uppercase tracking-wider font-display hidden sm:block">
              {activePanel === "reservation" && "Catalog & Station Booking"}
              {activePanel === "queue" && "My Reservation Queue"}
              {activePanel === "users" && "User Registry & Access Controls"}
              {activePanel === "resources" && "Resource Inventory & Timetables"}
              {activePanel === "timeline" && "Real-time Access Scheduler"}
              {activePanel === "emails" && "Mail System Relay outbox"}
              {activePanel === "analytics" && "Compliance Metrics Board"}
              {activePanel === "profile" && "Account Profile & Settings Registry"}
              {activePanel === "data" && "Enterprise Data & Monitoring"}
            </h2>
            <span className="px-2.5 py-0.8 bg-green-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 text-[10px] font-bold rounded-full flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
              Live Status
            </span>
          </div>

          <div className="flex items-center gap-3 divide-x divide-slate-200 dark:divide-slate-800">
            <div className="flex items-center gap-3 pl-3">
              {/* Notification Button */}
              <div ref={notificationRef} className="relative shrink-0">
                <button
                  onClick={() => setIsNotifOpen(!isNotifOpen)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition-colors relative cursor-pointer"
                  title="Notifications"
                >
                  <Bell className="w-4.5 h-4.5" />
                  {displayedNotifications.filter(n => !n.isRead).length > 0 && (
                    <span className="absolute -top-1 -right-1 bg-blue-600 text-white font-bold text-[8px] w-4 h-4 rounded-full flex items-center justify-center border border-white animate-pulse">
                      {displayedNotifications.filter(n => !n.isRead).length}
                    </span>
                  )}
                </button>

                {/* Dropdown Drawer */}
                {isNotifOpen && (
                  <div className="absolute right-0 mt-3 w-80 bg-white dark:bg-slate-900 border border-gray-150 dark:border-slate-800 rounded-2xl shadow-xl z-50 text-gray-800 dark:text-slate-100 p-4 font-sans">
                    <div className="flex items-center justify-between pb-2.5 border-b border-gray-100 dark:border-slate-800 mb-2">
                      <span className="text-xs font-bold text-gray-800 dark:text-slate-200 font-display">Notifications Feed</span>
                      {displayedNotifications.filter(n => !n.isRead).length > 0 && (
                        <button 
                          onClick={handleMarkAllNotificationsRead}
                          className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline cursor-pointer"
                        >
                          Clear All
                        </button>
                      )}
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2 pr-0.5">
                      {displayedNotifications.length === 0 ? (
                        <p className="text-[10px] text-gray-400 dark:text-slate-500 py-6 text-center italic font-mono">No new activity logged.</p>
                      ) : (
                        displayedNotifications.map(n => (
                          <div 
                            key={n.id} 
                            onClick={() => handleNotificationClick(n)}
                            className={`p-2.5 rounded-lg border text-xs relative text-left cursor-pointer hover:scale-[1.01] active:scale-100 transition-all ${
                              n.isRead 
                                ? "bg-gray-50 border-gray-200 dark:bg-slate-950/40 dark:border-slate-850 hover:bg-gray-100 dark:hover:bg-slate-900 text-slate-500 dark:text-slate-400" 
                                : "bg-indigo-50/35 border-indigo-150 dark:bg-indigo-950/20 dark:border-indigo-900/50 hover:bg-indigo-100/50 dark:hover:bg-indigo-950/30 text-slate-800 dark:text-slate-200 font-medium"
                            }`}
                            title="Click to view and mark as read"
                          >
                            <div className="flex justify-between items-start gap-1">
                              <p className="font-bold text-gray-800 dark:text-slate-200">{n.title}</p>
                              {!n.isRead && (
                                <span className="text-[8px] bg-indigo-600 text-white font-bold px-1.5 py-0.2 rounded-full uppercase tracking-wider shrink-0">
                                  New
                                </span>
                              )}
                            </div>
                            <p className="text-[10.5px] text-gray-500 dark:text-slate-400 mt-1 leading-normal">{n.message}</p>
                            <span className="block text-[8px] text-gray-400 dark:text-slate-500 mt-1 font-mono">
                              {new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => setActivePanel("profile")}
                className="flex items-center gap-2 cursor-pointer hover:bg-slate-50 p-1 rounded-lg transition-colors text-right hidden sm:flex"
              >
                <div className="text-right">
                  <p className="text-xs font-bold text-slate-900">{user.name}</p>
                  <p className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider">{user.role}</p>
                </div>
              </button>
              <button
                onClick={() => setActivePanel("profile")}
                className="w-9 h-9 rounded-lg bg-blue-100 border border-blue-200 flex items-center justify-center font-bold text-xs text-blue-700 uppercase cursor-pointer hover:bg-blue-200 transition-colors"
                title="View Profile Settings"
              >
                {user.name.charAt(0)}
              </button>
              <button
                onClick={() => setActivePanel("profile")}
                className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-indigo-600 rounded-lg transition-colors cursor-pointer"
                title="Account Settings"
              >
                <Settings className="w-4 h-4" />
              </button>
              <button
                onClick={handleLogout}
                className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-lg text-slate-400 transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Mobile Navigation controls */}
        <div className="block md:hidden bg-slate-100 p-2 border-b border-slate-200 shadow-xs">
          <div className="flex flex-wrap gap-1 justify-center font-sans text-center">
            <button
              onClick={() => setActivePanel("reservation")}
              className={`flex-1 min-w-[70px] py-1.5 px-2.5 text-[10px] font-bold rounded-lg transition-all ${
                activePanel === "reservation" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 bg-white border border-slate-200/80"
              }`}
            >
              Slots
            </button>
            <button
               onClick={() => setActivePanel("queue")}
              className={`flex-1 min-w-[70px] py-1.5 px-2.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                activePanel === "queue" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 bg-white border border-slate-200/80"
              }`}
            >
              <span>Queue</span>
            </button>
            <button
              onClick={() => setActivePanel("timeline")}
              className={`flex-1 min-w-[70px] py-1.5 px-2.5 text-[10px] font-bold rounded-lg transition-all ${
                activePanel === "timeline" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 bg-white border border-slate-200/80"
              }`}
            >
              Grid
            </button>
            <button
              onClick={() => setActivePanel("emails")}
              className={`flex-1 min-w-[70px] py-1.5 px-2.5 text-[10px] font-bold rounded-lg transition-all flex items-center justify-center gap-1 ${
                activePanel === "emails" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 bg-white border border-slate-200/80"
              }`}
            >
              <span>Mail</span>
              {unreadEmailsCount > 0 && (
                <span className="bg-blue-600 text-white font-mono font-bold text-[8.5px] px-1.5 py-0.2 rounded-md">
                  {unreadEmailsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActivePanel("profile")}
              className={`flex-1 min-w-[70px] py-1.5 px-2.5 text-[10px] font-bold rounded-lg transition-all ${
                activePanel === "profile" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 bg-white border border-slate-200/80"
              }`}
            >
              Profile
            </button>
            {isAdmin && (
              <>
                <button
                  onClick={() => setActivePanel("users")}
                  className={`flex-1 min-w-[70px] py-1.5 px-2.5 text-[10px] font-bold rounded-lg transition-all ${
                    activePanel === "users" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 bg-white border border-slate-200/80"
                  }`}
                >
                  Registry
                </button>
                <button
                  onClick={() => setActivePanel("resources")}
                  className={`flex-1 min-w-[70px] py-1.5 px-2.5 text-[10px] font-bold rounded-lg transition-all ${
                    activePanel === "resources" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 bg-white border border-slate-200/80"
                  }`}
                >
                  Inventory
                </button>
                <button
                  onClick={() => setActivePanel("analytics")}
                  className={`flex-1 min-w-[70px] py-1.5 px-2.5 text-[10px] font-bold rounded-lg transition-all ${
                    activePanel === "analytics" ? "bg-slate-900 text-white shadow-xs" : "text-slate-600 bg-white border border-slate-200/80"
                  }`}
                >
                  Analysis
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content Viewbox State Area */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto max-w-full">
          <div className="transition-all duration-300">
            {activePanel === "reservation" && (
              <TeacherDashboard
                user={user}
                resources={resources}
                bookings={bookings}
                notifications={displayedNotifications}
                onAddBooking={handleAddBooking}
                onCancelBooking={handleCancelBooking}
                onMarkNotificationRead={handleMarkNotificationRead}
                onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
                selectedDate={selectedDate}
              />
            )}

            {activePanel === "queue" && (
              <MyQueue
                user={user}
                bookings={bookings}
                onCancelBooking={handleCancelBooking}
                onCancelGroupBooking={handleCancelGroupBooking}
                seenBookingIds={seenBookingIds}
                onMarkBookingSeen={handleMarkBookingSeen}
                onMarkAllBookingsSeen={handleMarkAllBookingsSeen}
              />
            )}

            {activePanel === "timeline" && (
              <CalendarTimeline
                bookings={bookings}
                resources={resources}
                selectedDate={selectedDate}
                onDateChange={setSelectedDate}
              />
            )}

            {activePanel === "emails" && (
              <SimulatedEmails
                emails={emails}
                onRefresh={() => fetchAllData(token)}
                currentUser={user}
                token={token}
                bookings={bookings}
                onApproveBooking={handleApproveBooking}
                selectedEmailId={selectedEmailId}
                onClearSelectedEmailId={() => setSelectedEmailId(null)}
              />
            )}

            {activePanel === "analytics" && isAdmin && (
              <AdminDashboard
                user={user}
                token={token}
                resources={resources}
                bookings={bookings}
                analytics={analytics}
                onApproveBooking={handleApproveBooking}
                onApproveGroupBooking={handleApproveGroupBooking}
                onRefresh={() => fetchAllData(token)}
                initialTab="metrics"
              />
            )}

            {activePanel === "users" && isAdmin && (
              <AdminDashboard
                user={user}
                token={token}
                resources={resources}
                bookings={bookings}
                analytics={analytics}
                onApproveBooking={handleApproveBooking}
                onApproveGroupBooking={handleApproveGroupBooking}
                onRefresh={() => fetchAllData(token)}
                initialTab="users"
              />
            )}

            {activePanel === "resources" && isAdmin && (
              <AdminDashboard
                user={user}
                token={token}
                resources={resources}
                bookings={bookings}
                analytics={analytics}
                onApproveBooking={handleApproveBooking}
                onApproveGroupBooking={handleApproveGroupBooking}
                onRefresh={() => fetchAllData(token)}
                initialTab="resources"
              />
            )}

            {activePanel === "profile" && (
              <ProfileSettings
                currentUser={user}
                token={token}
                onRefresh={fetchAllData}
                onUserUpdate={handleUserUpdate}
              />
            )}

             {activePanel === "data" && isAdmin && (
              <OwnerDashboard
                currentUser={user}
                token={token}
                onRefreshAll={fetchAllData}
              />
            )}

            {/* Fallback panel if Teacher/Admin selects analytics, administration, or data panels by mistake */}
            {((activePanel === "analytics" || activePanel === "users" || activePanel === "resources") && !isAdmin) && (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 mt-12 max-w-md mx-auto shadow-sm">
                <Layers className="w-12 h-12 text-blue-500 mx-auto" />
                <p className="text-sm font-bold text-slate-800 mt-4">Unauthorised access</p>
                <p className="text-xs text-slate-500 mt-1">Teachers are not authorized to view access control lists or structural inventory assets.</p>
                <button 
                  onClick={() => setActivePanel("reservation")}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all"
                >
                  Go to Slot Bookings
                </button>
              </div>
            )}

            {(activePanel === "data" && !isAdmin) && (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 mt-12 max-w-md mx-auto shadow-sm">
                <Database className="w-12 h-12 text-amber-500 mx-auto animate-pulse" />
                <p className="text-sm font-bold text-slate-800 mt-4">Unauthorised access</p>
                <p className="text-xs text-slate-500 mt-1">Only system Admins and Owners have authorization to dynamic database URI structures.</p>
                <button 
                  onClick={() => setActivePanel("reservation")}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-all"
                >
                  Go to Slot Bookings
                </button>
              </div>
            )}
          </div>
        </main>

        {/* Footer */}
        <footer className="h-14 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-850 px-6 md:px-8 flex items-center justify-between text-[11px] text-slate-400 dark:text-slate-500 font-medium shrink-0">
          <div className="flex gap-4 sm:gap-6">
            <span>Academic Laboratory Infrastructure System (ALIS)</span>
            <span className="hidden sm:flex items-center gap-1.5 text-emerald-605 dark:text-emerald-500">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block"></span>
              Secure Mail Active
            </span>
          </div>
          <div className="flex gap-4 sm:gap-6 uppercase tracking-widest text-[10px]">
            <span>System v2.4.0</span>
          </div>
        </footer>

      </div>

    </div>
  );;
}
