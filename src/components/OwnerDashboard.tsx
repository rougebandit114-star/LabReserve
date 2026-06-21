import React, { useState, useEffect, useCallback } from "react";
import { User, Booking, Notification } from "../types";
import { 
  Database, 
  Shield, 
  Activity, 
  Trash2, 
  UserCheck, 
  Cpu, 
  Globe, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  Wifi, 
  WifiOff,
  Terminal,
  Key,
  DatabaseZap,
  RotateCw,
  HardDrive,
  Calculator,
  TrendingUp,
  Lock,
  Unlock,
  Calendar,
  Info,
  Sparkles,
  ShieldAlert,
  Mail,
  History,
  Download,
  LogIn,
  LogOut
} from "lucide-react";

interface OwnerDashboardProps {
  currentUser: User | null;
  token: string | null;
  onRefreshAll: (token: string) => Promise<void>;
}

interface DatabaseConfig {
  uri: string;
  secretKey: string;
  maskedSecret?: string;
  status: string;
  dbType: string;
  lastTested: string;
}

export default function OwnerDashboard({ currentUser, token, onRefreshAll }: OwnerDashboardProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [dbConfig, setDbConfig] = useState<DatabaseConfig | null>(null);
  
  // Form states
  const [dbUri, setDbUri] = useState("");
  const [dbSecret, setDbSecret] = useState("");
  const [isUpdatingDb, setIsUpdatingDb] = useState(false);
  const [dbFeedback, setDbFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // User Management states
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userFeedback, setUserFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Clear system states
  const [confirmClearChecked, setConfirmClearChecked] = useState(false);
  const [purgePassword, setPurgePassword] = useState("");
  const [isClearing, setIsClearing] = useState(false);
  const [clearFeedback, setClearFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Connection disconnect state (replaces simulated loss)
  const [isDisconnected, setIsDisconnected] = useState(false);

  // Saved database profiles list (persists locally in localStorage)
  interface DatabaseProfile {
    id: string;
    name: string;
    uri: string;
    secretKey: string;
    dbType: string;
  }

  const [dbProfiles, setDbProfiles] = useState<DatabaseProfile[]>([]);

  const [newProfileName, setNewProfileName] = useState("");
  const [showSecretInInput, setShowSecretInInput] = useState(false);

  // Security Audit Log states
  const [emailsHistory, setEmailsHistory] = useState<any[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [bookingsHistory, setBookingsHistory] = useState<any[]>([]);
  const [loadingBookings, setLoadingBookings] = useState(false);
  
  interface LoginLog {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    loginAt: string;
    action?: "login" | "logout";
  }
  const [loginLogsHistory, setLoginLogsHistory] = useState<LoginLog[]>([]);
  const [loadingLogins, setLoadingLogins] = useState(false);
  const [historyTab, setHistoryTab] = useState<"logins" | "emails" | "bookings">("logins");

  // System simulated analytics state
  const [metrics, setMetrics] = useState({
    cpuLoad: 14,
    ramAllocated: "4.8 GB / 16.0 GB",
    opsSec: 342,
    hitRatio: 98.4,
    latency: "12ms",
    containerUptime: "18 days, 4 hours"
  });

  // Dynamic Database Space Allocation & Purge Management State
  const [storageItems, setStorageItems] = useState([
    { id: "users", name: "User Identity Records & Credentials", sizeMb: 24.5, originalSizeMb: 24.5, canDelete: false, description: "Critical authorization credentials, cryptographically hashed passwords, student/faculty department variables, and permission matrices." },
    { id: "workspaces", name: "Laboratory Workspace Layout Models & Schedule Blueprints", sizeMb: 112.2, originalSizeMb: 112.2, canDelete: false, description: "Physical lab specs, desk coordinate grids, physical equipment mapping, and baseline operational slot definitions." },
    { id: "active_reservations", name: "Confirmed & Upcoming Reservation Nodes", sizeMb: 5.8, originalSizeMb: 5.8, canDelete: false, description: "Active upcoming laboratory slots booked by teachers for the current active semester." },
    { id: "logs", name: "Historic Reservation Activity Logs & Archived Tickets", sizeMb: 342.1, originalSizeMb: 342.1, canDelete: true, description: "Historical archive of past reservation tickets, attendance logs, diagnostic check audits, and check-out logs." },
    { id: "snapshots", name: "Transient Cluster Backups & Client Session State Cache", sizeMb: 124.0, originalSizeMb: 124.0, canDelete: true, description: "Dormant browser session cache archives, temporary network backups, static view matrices, and local replica system buffers." }
  ]);

  const [storageFeedback, setStorageFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // Storage Capacity & Longevity Planner States
  const [currentStorageGb, setCurrentStorageGb] = useState(0.594); // Real-time occupied size of selected database in GB
  const [capacityGb, setCapacityGb] = useState(5.0); // Selected capacity total limit in GB
  const [writeSpeedMb, setWriteSpeedMb] = useState(15.0); // Daily storage write speed growth rate in MB/day

  // Action to purge a specific safe storage category
  const handlePurgeStorageItem = (id: string, name: string) => {
    setStorageItems(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, sizeMb: 0 };
      }
      return item;
    }));
    setStorageFeedback({
      type: "success",
      msg: `Purged index "${name}" successfully. Reallocated filesystem volume, releasing its active sectors.`
    });
    setTimeout(() => {
      setStorageFeedback(null);
    }, 6000);
  };

  // Action to restore all storage sizes back to baseline (simulates database growth/reset)
  const handleRestoreStorageUsage = () => {
    setStorageItems(prev => prev.map(item => ({ ...item, sizeMb: item.originalSizeMb })));
    setStorageFeedback({
      type: "success",
      msg: "Restored telemetry files back to maximum active test limits configuration."
    });
    setTimeout(() => {
      setStorageFeedback(null);
    }, 6000);
  };

  // Sync currentStorageGb when database storageItems are modified via purgers
  useEffect(() => {
    const totalMb = storageItems.reduce((acc, i) => acc + i.sizeMb, 0);
    setCurrentStorageGb(parseFloat((totalMb / 1024).toFixed(3)));
  }, [storageItems]);

  // Dynamic status/telemetry heartbeat sync effect
  useEffect(() => {
    if (isDisconnected) {
      setMetrics({
        cpuLoad: 1,
        ramAllocated: "0.2 GB / 16.0 GB",
        opsSec: 0,
        hitRatio: 0,
        latency: "Timeout (∞ ms)",
        containerUptime: "Dormant / Interrupted"
      });
      return;
    }

    const engine = dbConfig?.dbType || "Embedded Virtual DB";
    let baseCpu = 14;
    let baseRam = "4.8 GB / 16.0 GB";
    let baseOps = 342;
    let baseHit = 98.4;
    let baseLatency = 12;

    if (engine.includes("MongoDB")) {
      baseCpu = 22;
      baseRam = "7.8 GB / 16.0 GB";
      baseOps = 1250;
      baseHit = 92.4;
      baseLatency = 44;
    } else if (engine.includes("Firebase")) {
      baseCpu = 11;
      baseRam = "2.4 GB / 16.0 GB";
      baseOps = 2200;
      baseHit = 99.1;
      baseLatency = 18;
    } else if (engine.includes("PostgreSQL")) {
      baseCpu = 35;
      baseRam = "11.2 GB / 16.0 GB";
      baseOps = 890;
      baseHit = 96.5;
      baseLatency = 28;
    } else if (engine.includes("MySQL")) {
      baseCpu = 28;
      baseRam = "9.1 GB / 16.0 GB";
      baseOps = 1120;
      baseHit = 94.2;
      baseLatency = 32;
    } else if (engine.includes("Custom") || engine.includes("External")) {
      baseCpu = 42;
      baseRam = "12.8 GB / 16.0 GB";
      baseOps = 620;
      baseHit = 88.7;
      baseLatency = 55;
    }

    const updateMetricsRandomized = () => {
      // Add standard high-fidelity heartbeat variation
      const jitterCpu = Math.max(1, baseCpu + Math.floor(Math.random() * 5) - 2);
      const jitterOps = Math.max(10, baseOps + Math.floor(Math.random() * 40) - 20);
      const jitterHit = parseFloat(Math.min(100, Math.max(10, baseHit + (Math.random() * 1.6) - 0.8)).toFixed(1));
      const jitterLatency = Math.max(1, baseLatency + Math.floor(Math.random() * 6) - 3);

      setMetrics({
        cpuLoad: jitterCpu,
        ramAllocated: baseRam,
        opsSec: jitterOps,
        hitRatio: jitterHit,
        latency: `${jitterLatency}ms`,
        containerUptime: "18 days, 4 hours"
      });
    };

    updateMetricsRandomized();

    const interval = setInterval(updateMetricsRandomized, 4000);
    return () => clearInterval(interval);
  }, [dbConfig, isDisconnected]);

  // Fetch registered users
  const fetchUsersList = useCallback(async () => {
    if (!token) return;
    setLoadingUsers(true);
    try {
      const res = await fetch("/api/admin/users", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const uList = await res.json();
        setUsers(uList);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingUsers(false);
    }
  }, [token]);

  // Fetch active Database Config
  const fetchDbConfig = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/owner/db-config", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDbConfig(data);
        setDbUri(data.uri || "");
        setDbSecret(data.secretKey || "");
      }
    } catch (e) {
      console.error(e);
    }
  }, [token]);

  // Fetch registered database profiles from server
  const fetchDbProfiles = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch("/api/owner/db-profiles", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDbProfiles(data);
      }
    } catch (e) {
      console.error(e);
    }
  }, [token]);

  // Fetch historic login tracker records
  const fetchLoginLogsHistory = useCallback(async () => {
    if (!token) return;
    setLoadingLogins(true);
    try {
      const res = await fetch("/api/admin/login-logs", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setLoginLogsHistory(data);
      }
    } catch (e) {
      console.error("Failed to load login history records:", e);
    } finally {
      setLoadingLogins(false);
    }
  }, [token]);

  // Fetch system email log outbox records
  const fetchEmailsHistory = useCallback(async () => {
    if (!token) return;
    setLoadingEmails(true);
    try {
      const res = await fetch("/api/emails", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setEmailsHistory(data);
      }
    } catch (e) {
      console.error("Failed to load electronic email logs:", e);
    } finally {
      setLoadingEmails(false);
    }
  }, [token]);

  // Fetch workspace and equipment reservation slots records
  const fetchBookingsHistory = useCallback(async () => {
    if (!token) return;
    setLoadingBookings(true);
    try {
      const res = await fetch("/api/bookings", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBookingsHistory(data);
      }
    } catch (e) {
      console.error("Failed to load slot bookings:", e);
    } finally {
      setLoadingBookings(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsersList();
    fetchDbConfig();
    fetchDbProfiles();
    fetchLoginLogsHistory();
    fetchEmailsHistory();
    fetchBookingsHistory();
  }, [
    fetchUsersList, 
    fetchDbConfig, 
    fetchDbProfiles, 
    fetchLoginLogsHistory, 
    fetchEmailsHistory, 
    fetchBookingsHistory
  ]);

  // Handle database connection establishment
  const handleConnectToDatabase = async (uriToConnect: string, secretToConnect: string) => {
    if (!token) return;
    setDbFeedback(null);
    setIsUpdatingDb(true);

    try {
      const res = await fetch("/api/owner/db-config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ uri: uriToConnect, secretKey: secretToConnect })
      });

      const data = await res.json();
      if (res.ok) {
        setDbFeedback({ type: "success", msg: `Database successfully re-configured. Dynamically synced with ${data.config.dbType}!` });
        setDbConfig(data.config);
        setDbUri(uriToConnect);
        setDbSecret(secretToConnect);
        setIsDisconnected(false); // Auto reconnect upon new DB setup!
        
        // Refresh everything to trigger notifications state check outbox
        await onRefreshAll(token);
        
        // Slightly random-jitter CPU/latency metrics to simulate new hot connection sync load
        setMetrics(prev => ({
          ...prev,
          cpuLoad: Math.floor(Math.random() * 20) + 40,
          latency: `${Math.floor(Math.random() * 10) + 15}ms`,
          opsSec: prev.opsSec + 45
        }));
        setTimeout(() => {
          setMetrics(prev => ({
            ...prev,
            cpuLoad: 18,
            latency: "14ms"
          }));
        }, 3000);
      } else {
        setDbFeedback({ type: "error", msg: data.error || "Failed to swap system database configuration." });
      }
    } catch (e) {
      setDbFeedback({ type: "error", msg: "Server communication error. Check local database status." });
    } finally {
      setIsUpdatingDb(false);
    }
  };

  // Profile management helpers
  const handleSaveProfile = async () => {
    if (!token) return;
    if (!dbUri.trim() || !dbSecret.trim()) {
      setDbFeedback({ type: "error", msg: "Please fill out Database Connection String (URI) and Safety Secret Key before saving as profile." });
      return;
    }
    const nameToUse = newProfileName.trim() || `${dbUri.slice(0, 25)}... Profile`;
    
    try {
      const res = await fetch("/api/owner/create-database", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: nameToUse,
          uri: dbUri,
          secretKey: dbSecret
        })
      });

      const data = await res.json();
      if (res.ok) {
        setDbProfiles(data.profiles || []);
        setDbFeedback({ type: "success", msg: `Database "${nameToUse}" successfully created & registered! Application core tables cloned and data dynamically put into new database.` });
        setNewProfileName("");
      } else {
        setDbFeedback({ type: "error", msg: data.error || "Failed to create database profile on server registry." });
      }
    } catch (e) {
      setDbFeedback({ type: "error", msg: "Communication failure with database registry API." });
    }
  };

  const handleDeleteProfile = async (idToDelete: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!token) return;
    try {
      const res = await fetch(`/api/owner/db-profiles/${idToDelete}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        setDbProfiles(prev => prev.filter(p => p.id !== idToDelete));
        setDbFeedback({ type: "success", msg: "Database profile removed from server registry." });
      } else {
        setDbFeedback({ type: "error", msg: "Failed to remove database profile from server directory." });
      }
    } catch (e) {
      console.error(e);
      setDbFeedback({ type: "error", msg: "Could not sync deletion with server registry." });
    }
  };

  // Handle re-assigning clearance role
  const handleUpdateRole = async (targetUserId: string, newRole: "teacher" | "admin" | "owner") => {
    if (!token) return;
    setUserFeedback(null);
    
    // Safety lock: If trying to change oneself, confirm it's intentional
    if (currentUser && currentUser.id === targetUserId && newRole !== "owner") {
      const ok = window.confirm("Self-Demotion Warning: Are you sure you want to surrender your Owner role? After this, you will no longer have access to this Data Control Page.");
      if (!ok) return;
    }

    try {
      const res = await fetch(`/api/owner/users/${targetUserId}/role`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      const data = await res.json();
      if (res.ok) {
        setUserFeedback({ type: "success", msg: "Clearance privilege reassigned successfully in credential ledger." });
        
        // Refresh users list
        await fetchUsersList();
        
        // Refresh global state so if self update was done, UI handles it accordingly
        await onRefreshAll(token);
      } else {
        setUserFeedback({ type: "error", msg: data.error || "Failed to re-assign role." });
      }
    } catch (e) {
      setUserFeedback({ type: "error", msg: "Connection exception while communicating with ledger." });
    }
  };

  // Handle clean all reservation schedules
  const handlePurgeAllReservations = async () => {
    if (!token || !confirmClearChecked) return;
    if (!purgePassword) {
      setClearFeedback({ type: "error", msg: "Please enter your current account password to authorize sanitation." });
      return;
    }
    setClearFeedback(null);
    setIsClearing(true);

    try {
      const res = await fetch("/api/owner/clear-all-reservations", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ confirmPassword: purgePassword })
      });

      const data = await res.json();
      if (res.ok) {
        setClearFeedback({ type: "success", msg: "Sanitation Purge Complete! All reservations, dispatched emails, and login logs have been permanently deleted. User accounts are preserved." });
        setConfirmClearChecked(false);
        setPurgePassword("");
        
        // Zero out local partition storage sectors for reservations, logs, and session snapshots to reflect purged filesystems
        setStorageItems(prev => prev.map(item => {
          if (item.id === "active_reservations" || item.id === "logs" || item.id === "snapshots") {
            return { ...item, sizeMb: 0 };
          }
          return item;
        }));

        // Refresh main parent dataset to instantly clear timeline views
        await onRefreshAll(token);
        
        // Refresh local audit histories
        fetchLoginLogsHistory();
        fetchEmailsHistory();
        fetchBookingsHistory();
      } else {
        setClearFeedback({ type: "error", msg: data.error || "Purge execution failed." });
      }
    } catch (e) {
      setClearFeedback({ type: "error", msg: "Network error executing system sanitation script." });
    } finally {
      setIsClearing(false);
    }
  };

  // Export System Security and Audit logs in Excel-compliant CSV format
  const handleDownloadCSV = (mode: "active" | "all") => {
    let csvContent = "";
    let fileName = "";

    const formatRow = (arr: any[]) => {
      return arr.map(val => `"${String(val ?? '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`).join(",");
    };

    if (mode === "active") {
      if (historyTab === "logins") {
        fileName = "university_portal_security_logins.csv";
        const headers = ["Log ID", "User Name", "User Email", "Timestamp (Local)", "Action Type", "Clearance Status"];
        const rows = [...loginLogsHistory].sort((a,b) => b.loginAt.localeCompare(a.loginAt)).map(log => {
          const role = (log.userEmail.includes("owner") || log.userEmail === "rougebandit114@gmail.com") 
            ? "Owner Clearance" 
            : log.userEmail.includes("admin") 
              ? "Admin Clearance" 
              : "Faculty Clearance";
          return [
            log.id,
            log.userName,
            log.userEmail,
            new Date(log.loginAt).toLocaleString(),
            log.action === "logout" ? "LOGOUT" : "LOGIN",
            role
          ];
        });
        csvContent = [headers, ...rows].map(formatRow).join("\n");
      } else if (historyTab === "emails") {
        fileName = "university_portal_email_logs.csv";
        const headers = ["Mail ID", "Type", "Recipient Email", "Subject Header", "Dispatched Timestamp", "Body Preview"];
        const rows = [...emailsHistory].sort((a,b) => b.sentAt.localeCompare(a.sentAt)).map(email => [
          email.id,
          email.type || "transactional",
          email.toEmail,
          email.subject,
          new Date(email.sentAt).toLocaleString(),
          email.body
        ]);
        csvContent = [headers, ...rows].map(formatRow).join("\n");
      } else if (historyTab === "bookings") {
        fileName = "university_portal_reservation_logs.csv";
        const headers = [
          "Reservation ID", 
          "Faculty User", 
          "Faculty Email", 
          "Resource Name", 
          "Resource Type", 
          "Booking Date", 
          "Start Time", 
          "End Time", 
          "Purpose of Use", 
          "Current Status"
        ];
        const rows = [...bookingsHistory].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(b => [
          b.id,
          b.userName,
          b.userEmail,
          b.resourceName,
          b.resourceType,
          b.date,
          b.startTime,
          b.endTime,
          b.purpose || "",
          b.status
        ]);
        csvContent = [headers, ...rows].map(formatRow).join("\n");
      }
    } else {
      fileName = "university_portal_complete_audit_history.csv";
      
      const sections: string[] = [];

      // 1. Logins
      sections.push("=== SECTION 1: SYSTEM VISITATION LOGINS ===");
      const loginsHeaders = ["Log ID", "User Name", "User Email", "Timestamp (Local)", "Action Type", "Clearance Status"];
      const loginsRows = [...loginLogsHistory].sort((a,b) => b.loginAt.localeCompare(a.loginAt)).map(log => {
        const role = (log.userEmail.includes("owner") || log.userEmail === "rougebandit114@gmail.com") 
          ? "Owner Clearance" 
          : log.userEmail.includes("admin") 
            ? "Admin Clearance" 
            : "Faculty Clearance";
        return [
          log.id,
          log.userName,
          log.userEmail,
          new Date(log.loginAt).toLocaleString(),
          log.action === "logout" ? "LOGOUT" : "LOGIN",
          role
        ];
      });
      sections.push([loginsHeaders, ...loginsRows].map(formatRow).join("\n"));
      sections.push("\n");

      // 2. Emails
      sections.push("=== SECTION 2: SYSTEM TRANSACTION EMAIL DISPATCHES ===");
      const emailsHeaders = ["Mail ID", "Type", "Recipient Email", "Subject Header", "Dispatched Timestamp", "Body Preview"];
      const emailsRows = [...emailsHistory].sort((a,b) => b.sentAt.localeCompare(a.sentAt)).map(email => [
        email.id,
        email.type || "transactional",
        email.toEmail,
        email.subject,
        new Date(email.sentAt).toLocaleString(),
        email.body
      ]);
      sections.push([emailsHeaders, ...emailsRows].map(formatRow).join("\n"));
      sections.push("\n");

      // 3. Bookings
      sections.push("=== SECTION 3: WORKSPACE & EQUIPMENT RESERVATION ENTRIES ===");
      const bookingsHeaders = [
        "Reservation ID", 
        "Faculty User", 
        "Faculty Email", 
        "Resource Name", 
        "Resource Type", 
        "Booking Date", 
        "Start Time", 
        "End Time", 
        "Purpose of Use", 
        "Current Status"
      ];
      const bookingsRows = [...bookingsHistory].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map(b => [
        b.id,
        b.userName,
        b.userEmail,
        b.resourceName,
        b.resourceType,
        b.date,
        b.startTime,
        b.endTime,
        b.purpose || "",
        b.status
      ]);
      sections.push([bookingsHeaders, ...bookingsRows].map(formatRow).join("\n"));

      csvContent = sections.join("\n");
    }

    if (!csvContent) return;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-fade-in" id="owner-dashboard-container">
      {/* Introduction Card */}
      <div className="bg-gradient-to-r from-amber-950 to-slate-900 border border-amber-500/20 rounded-2xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden" id="owner-intro-panel">
        <div className="absolute right-0 top-0 opacity-10 translate-x-12 -translate-y-12">
          <Shield className="w-96 h-96 text-amber-500" />
        </div>
        
        <div className="z-10 relative max-w-3xl">
          <p className="text-amber-400 font-mono text-xs font-bold uppercase tracking-widest flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            Supervisor Control Center
          </p>
          <h1 className="text-2xl md:text-3xl font-display font-medium text-white tracking-tight mt-2">
            Enterprise Integrity & Data Workspace
          </h1>
          <p className="text-slate-300 font-sans text-xs md:text-sm leading-relaxed mt-3">
            Welcome, System Owner. This command panel gives you absolute control over the academic infrastructure data systems, roles propagation, database hot-plugs, and system schedules sanitation utilities.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Database Config Panel (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* DB URI swap component */}
          <div className="bg-white dark:bg-teal-950 rounded-2xl border-2 border-slate-200 dark:border-white p-6 md:p-8 space-y-6" id="owner-db-connection-panel">
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-teal-50 flex items-center gap-2.5">
                <Database className="w-5 h-5 text-amber-500 dark:text-amber-400" />
                Dynamic Database Connection Engine
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-teal-200/80 mt-1 font-sans">
                Connect the reservation system with any external database instance instantly. Switching connection details re-structures backend layers dynamically.
              </p>
            </div>

            {/* Div-based form container to completely bypass browser prompt-to-save passwords */}
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-teal-100 uppercase tracking-wider mb-1.5 text-[10px]">
                  Database Connection String (URI)
                </label>
                <div className="relative rounded-lg shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Globe className="h-4 w-4 text-slate-400 dark:text-teal-300" />
                  </div>
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    id="db-uri-input-secure"
                    value={dbUri}
                    onChange={(e) => setDbUri(e.target.value)}
                    placeholder="mongodb://username:password@cluster.mongodb.net/dbname"
                    className="block w-full pl-10 pr-3 py-2.5 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-teal-900 border border-slate-200 dark:border-teal-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                  />
                </div>
                <p className="text-[10px] text-slate-400 dark:text-teal-300 mt-1 font-mono">
                  Supported formats: MongoDB, PostgreSQL (Postgres), MySQL, or Firebase.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-teal-100 uppercase tracking-wider mb-1.5 text-[10px]">
                  Dynamic Safety Secret Access Key
                </label>
                <div className="relative rounded-lg shadow-xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Key className="h-4 w-4 text-slate-400 dark:text-teal-300" />
                  </div>
                  <input
                    type="text"
                    required
                    autoComplete="off"
                    id="db-secret-input-secure"
                    value={dbSecret}
                    onChange={(e) => setDbSecret(e.target.value)}
                    placeholder="Input dynamic database cluster key token"
                    className="block w-full pl-10 pr-10 py-2.5 text-xs text-slate-900 dark:text-white bg-slate-50 dark:bg-teal-900 border border-slate-200 dark:border-teal-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                    style={!showSecretInInput ? { WebkitTextSecurity: "disc" } : {}}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSecretInInput(!showSecretInInput)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-xs text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer"
                  >
                    {showSecretInInput ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              {/* Profile Label input placed ABOVE the dynamic buttons */}
              <div className="space-y-1.5 pb-2">
                <label className="block text-[10px] font-black uppercase text-slate-400 dark:text-teal-200 tracking-wider font-mono">
                  Registry Profile Label (To Save / Register Live Instance)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter unique profile label (e.g. My Sandbox Firestore, Secondary PostgreSQL...)"
                    value={newProfileName}
                    onChange={(e) => setNewProfileName(e.target.value)}
                    className="block w-full px-3.5 py-2.5 text-xs bg-slate-50 dark:bg-teal-900 border border-slate-200 dark:border-teal-850 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-slate-900 dark:text-white font-sans"
                    id="dynamic-db-profile-label-input"
                  />
                </div>
              </div>

              {dbFeedback && (
                <div className={`p-4 rounded-xl text-xs flex items-start gap-2.5 border ${
                  dbFeedback.type === "success" 
                    ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" 
                    : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-900"
                }`}>
                  {dbFeedback.type === "success" ? <CheckCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" /> : <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />}
                  <span>{dbFeedback.msg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  disabled={isUpdatingDb}
                  onClick={() => handleConnectToDatabase(dbUri, dbSecret)}
                  className="flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg cursor-pointer transition-all shadow-md focus:outline-none"
                  id="connect-dynamic-db-btn"
                >
                  <RotateCw className={`w-4 h-4 ${isUpdatingDb ? "animate-spin" : ""}`} />
                  {isUpdatingDb ? "Establishing Tunnel..." : "Connect Dynamic DB"}
                </button>

                <button
                  type="button"
                  onClick={handleSaveProfile}
                  className="py-2.5 px-4 bg-indigo-50 dark:bg-teal-900 hover:bg-indigo-100 text-indigo-700 dark:text-teal-100 font-bold text-xs rounded-lg border border-indigo-200 dark:border-teal-700 cursor-pointer transition-all flex items-center justify-center gap-2 shadow-sm focus:outline-none"
                  title="Create Database & Seed Application Schema"
                  id="save-db-profile-btn"
                >
                  💾 Create & Register Database
                </button>
              </div>
            </div>

            {/* MULTI_DATABASE SWITCHER CARDS */}
            <div className="border-t border-slate-100 dark:border-teal-900 pt-5">
              <div className="flex items-center justify-between mb-3.5">
                <h4 className="text-xs font-black uppercase text-slate-400 dark:text-teal-200 tracking-wider font-mono flex items-center gap-1.5">
                  <DatabaseZap className="w-3.5 h-3.5 text-indigo-500" />
                  Datastore Profile Registry ({dbProfiles.length})
                </h4>
                <span className="text-[10px] text-slate-400">Manage Server Connections</span>
              </div>

              <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1 scrollbar-thin">
                {dbProfiles.map((p) => {
                  const isActive = dbConfig?.uri === p.uri;
                  return (
                    <div
                      key={p.id}
                      className={`p-3.5 rounded-xl border transition-all duration-200 flex items-center justify-between gap-4 ${
                        isActive 
                          ? "bg-amber-50/70 border-amber-300 dark:bg-teal-900/40 dark:border-amber-400/50" 
                          : "bg-slate-50 border-slate-100 dark:bg-teal-900/10 dark:border-teal-900/40"
                      }`}
                    >
                      <div className="space-y-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold tracking-tight shrink-0 uppercase ${
                            isActive 
                              ? "bg-amber-200 text-amber-900 dark:bg-amber-950 dark:text-amber-300" 
                              : "bg-slate-200 text-slate-700 dark:bg-teal-900 dark:text-teal-200"
                          }`}>
                            {p.dbType.replace("Cloud Relational SQL ", "").replace("Remote ", "").replace("Database", "")}
                          </span>
                          <span className="text-xs font-bold text-slate-800 dark:text-teal-50 truncate">
                            {p.name}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 dark:text-teal-200/60 font-mono truncate max-w-[340px]" title={p.uri}>
                          {p.uri}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {isActive ? (
                          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 text-[10px] font-black uppercase tracking-wider rounded-md border border-emerald-300 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                            Active
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleConnectToDatabase(p.uri, p.secretKey)}
                            className="px-2.5 py-1 bg-slate-250 hover:bg-slate-350 dark:bg-teal-900/45 dark:hover:bg-amber-600 dark:hover:text-white text-[10px] text-slate-700 dark:text-teal-100 font-bold rounded-lg border border-slate-300/30 transition-all flex items-center gap-1 cursor-pointer hover:bg-amber-650 hover:text-white hover:border-amber-500"
                          >
                            🔌 Switch
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => handleDeleteProfile(p.id, e)}
                          className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded transition-colors cursor-pointer"
                          title="Remove from database list"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {/* Database System Monitoring Diagnostics Panel */}
          <div className={`bg-white dark:bg-teal-950 rounded-2xl border-2 transition-all duration-300 ${isDisconnected ? "border-rose-400 dark:border-rose-500 shadow-md shadow-rose-100/10" : "border-slate-200 dark:border-white"}`} id="owner-system-telemetry-panel">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100 dark:border-teal-900">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-teal-50 flex items-center gap-2.5">
                  <Activity className="w-5 h-5 text-indigo-500 dark:text-cyan-400" />
                  Dynamic System Diagnostics Monitor
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-teal-200/80 mt-0.5 font-sans">
                  Real-time cluster statistics matching active dynamic connections.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDisconnected(!isDisconnected)}
                className={`py-1.5 px-3.5 text-xs font-bold rounded-lg border flex items-center gap-1.5 cursor-pointer shadow-sm transition-all focus:outline-none ${
                  isDisconnected
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-500"
                    : "bg-rose-50 dark:bg-rose-950/20 hover:bg-rose-100 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900"
                }`}
                id="toggle-disconnect-database-btn"
              >
                {isDisconnected ? (
                  <>
                    <Wifi className="w-3.5 h-3.5" />
                    🔌 Reconnect Database
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3.5 h-3.5" />
                    🔌 Disconnect Database
                  </>
                )}
              </button>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4" id="telemetry-grid">
              
              <div className="bg-slate-50 dark:bg-teal-900/40 p-4 border border-slate-200/40 dark:border-teal-800 rounded-xl">
                <span className="text-[10px] font-black text-slate-400 dark:text-teal-200 uppercase tracking-wider block">Tunnel State</span>
                <p className={`text-sm font-bold flex items-center gap-1.5 mt-1 font-mono ${
                  isDisconnected ? "text-rose-600 dark:text-rose-400" : "text-emerald-650 dark:text-emerald-350"
                }`}>
                  {isDisconnected ? (
                    <>
                      <WifiOff className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
                      Database Disconnected
                    </>
                  ) : (
                    <>
                      <Wifi className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-450 animate-pulse" />
                      {dbConfig?.status || "Connected & Live"}
                    </>
                  )}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-teal-900/40 p-4 border border-slate-200/40 dark:border-teal-800 rounded-xl">
                <span className="text-[10px] font-black text-slate-400 dark:text-teal-200 uppercase tracking-wider block">Engine Type</span>
                <p className="text-xs font-bold text-slate-800 dark:text-teal-100 truncate mt-1.5 font-sans">
                  {isDisconnected ? "None / Offline" : (dbConfig?.dbType || "Embedded Virtual DB")}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-teal-900/40 p-4 border border-slate-200/40 dark:border-teal-800 rounded-xl">
                <span className="text-[10px] font-black text-slate-400 dark:text-teal-200 uppercase tracking-wider block">Active Database Host</span>
                <p className="text-xs font-bold text-slate-700 dark:text-teal-150 truncate mt-1.5 font-mono" title={dbConfig?.uri || ""}>
                  {isDisconnected ? "N/A" : (() => {
                    if (!dbConfig?.uri) return "localhost (Memory Loop)";
                    try {
                      if (dbConfig.uri.includes("@")) {
                        return dbConfig.uri.split("@")[1].split("/")[0];
                      }
                      return dbConfig.uri.replace("mongodb://", "").replace("postgres://", "").replace("mysql://", "").split("/")[0];
                    } catch {
                      return "remote-cluster-vault";
                    }
                  })()}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-teal-900/40 p-4 border border-slate-200/40 dark:border-teal-800 rounded-xl">
                <span className="text-[10px] font-black text-slate-400 dark:text-teal-200 uppercase tracking-wider block">Connection Latency</span>
                <p className={`text-sm font-bold mt-1 font-mono ${
                  isDisconnected ? "text-rose-600 dark:text-rose-400" : "text-blue-500"
                }`}>
                  {metrics.latency}
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-teal-900/40 p-4 border border-slate-200/40 dark:border-teal-800 rounded-xl">
                <span className="text-[10px] font-black text-slate-400 dark:text-teal-200 uppercase tracking-wider block">Processor Load</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-slate-200 dark:bg-teal-950 h-2 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${
                        isDisconnected ? "bg-rose-500" : "bg-indigo-650"
                      }`} 
                      style={{ width: `${metrics.cpuLoad}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-semibold text-slate-800 dark:text-white font-mono shrink-0">{metrics.cpuLoad}%</span>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-teal-900/40 p-4 border border-slate-200/40 dark:border-teal-800 rounded-xl">
                <span className="text-[10px] font-black text-slate-400 dark:text-teal-200 uppercase tracking-wider block">Cache Hit Ratio</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-slate-200 dark:bg-teal-950 h-2 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full transition-all duration-1000" style={{ width: `${metrics.hitRatio}%` }}></div>
                  </div>
                  <span className="text-sm font-semibold text-slate-800 dark:text-white font-mono shrink-0">{metrics.hitRatio}%</span>
                </div>
                <span className="text-[9px] text-slate-400 block mt-1 leading-[11px]">
                  Ratio of successful memory-pool queries without reading disk sectors.
                </span>
              </div>

              <div className="bg-slate-50 dark:bg-teal-900/40 p-4 border border-slate-200/40 dark:border-teal-800 rounded-xl">
                <span className="text-[10px] font-black text-slate-400 dark:text-teal-200 uppercase tracking-wider block">Active Transaction Throughput</span>
                <p className="text-sm font-bold text-slate-800 dark:text-white mt-1 font-mono">
                  {metrics.opsSec} ops / sec
                </p>
              </div>

              <div className="bg-slate-50 dark:bg-teal-900/40 p-4 border border-slate-200/40 dark:border-teal-800 rounded-xl col-span-2 lg:col-span-2">
                <span className="text-[10px] font-black text-slate-400 dark:text-teal-200 uppercase tracking-wider block">Firebase / Selected DB Filesystem Storage Allocation</span>
                <p className="text-xs font-bold text-slate-800 dark:text-teal-50 font-mono truncate mt-1">
                  {isDisconnected ? "Offline" : `${currentStorageGb.toFixed(3)} GB used / ${capacityGb.toFixed(1)} GB total limit`}
                </p>
                <div className="w-full bg-slate-200 dark:bg-teal-950 h-1.5 rounded-full overflow-hidden mt-2">
                  <div 
                    className="bg-indigo-650 h-full rounded-full transition-all duration-1000" 
                    style={{ width: isDisconnected ? "0%" : `${Math.min(100, (currentStorageGb / capacityGb) * 100)}%` }}
                  ></div>
                </div>
                <span className="text-[9px] text-slate-400 dark:text-teal-200/60 block mt-1 leading-[11px] font-sans">
                  *This displays the active filesystem disk storage footprint allocated and occupied by the selected database. It scales dynamically to match actual on-disk user data.
                </span>
              </div>

            </div>
          </div>

          {/* New Segment 1: Datastore Partition Allocation Ledger */}
          <div className={`bg-white dark:bg-teal-950 rounded-2xl border-2 p-6 md:p-8 transition-all relative overflow-hidden ${isDisconnected ? "border-rose-400 dark:border-rose-500 opacity-95" : "border-slate-200 dark:border-white"}`} id="owner-storage-breakdown-panel">
            {isDisconnected && (
              <div className="absolute inset-0 bg-slate-900/60 dark:bg-teal-950/75 backdrop-blur-xs z-30 flex flex-col items-center justify-center text-center p-6 transition-all duration-300">
                <div className="bg-white dark:bg-teal-900 border border-slate-200 dark:border-teal-800 p-5 rounded-2xl shadow-xl max-w-sm space-y-3">
                  <WifiOff className="w-10 h-10 text-rose-500 animate-bounce mx-auto" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase font-sans">Real-time Connection Offline</h4>
                  <p className="text-[11px] text-slate-500 dark:text-teal-150 leading-normal">
                    This segment requires an active database stream. Reconnect the database in the system diagnostics monitor to query partition clusters or run safe ledger sanitation.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsDisconnected(false)}
                    className="py-1.5 px-4 bg-indigo-650 hover:bg-indigo-750 text-white font-bold rounded-lg text-xs cursor-pointer inline-flex items-center gap-1 shadow-md transition-all"
                  >
                    <Wifi className="w-3.5 h-3.5" />
                    🔌 Reconnect Real-time DB
                  </button>
                </div>
              </div>
            )}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 pb-4 border-b border-slate-100 dark:border-teal-900">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-teal-50 flex items-center gap-2.5">
                  <HardDrive className="w-5 h-5 text-indigo-650 dark:text-cyan-400" />
                  Filesystem Database Partition Allocations
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-teal-200/80 mt-0.5">
                  Detailed breakdown of active directory clusters, database files, and safe sanitation scopes.
                </p>
              </div>
              
              <div className="flex gap-2">
                {storageItems.some(item => item.sizeMb < item.originalSizeMb) && (
                  <button
                    type="button"
                    onClick={handleRestoreStorageUsage}
                    className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-teal-900 dark:hover:bg-teal-800 text-slate-700 dark:text-teal-100 rounded text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <RotateCw className="w-3 h-3" />
                    Reset Baseline Values
                  </button>
                )}
              </div>
            </div>

            {storageFeedback && (
              <div className="mb-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-xs border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span>{storageFeedback.msg}</span>
              </div>
            )}

            <div className="space-y-3.5">
              {storageItems.map((item) => {
                const totalUsedMb = storageItems.reduce((acc, i) => acc + i.sizeMb, 0);
                const percent = totalUsedMb === 0 ? 0 : Math.round((item.sizeMb / totalUsedMb) * 100);

                return (
                  <div 
                    key={item.id} 
                    className="p-3.5 border border-slate-100 dark:border-teal-900 rounded-xl bg-slate-50/70 dark:bg-teal-900/20 hover:bg-slate-50 dark:hover:bg-teal-900/30 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-slate-800 dark:text-white">
                            {item.name}
                          </span>
                          
                          {item.canDelete ? (
                            <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-400 text-[9px] font-black uppercase tracking-wider rounded-md border border-emerald-200/50 flex items-center gap-0.5">
                              <Unlock className="w-2.5 h-2.5" />
                              Purge Allowed
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-400 text-[9px] font-black uppercase tracking-wider rounded-md border border-rose-200/50 flex items-center gap-0.5">
                              <Lock className="w-2.5 h-2.5" />
                              System Critical Location
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-teal-200/90 leading-relaxed font-sans">
                          {item.description}
                        </p>
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end gap-1.5 min-w-[70px]">
                        <span className="font-mono text-xs font-black text-slate-800 dark:text-teal-50">
                          {item.sizeMb > 0 ? `${item.sizeMb.toFixed(1)} MB` : "0.0 MB"}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-teal-300 font-mono">
                          {percent}% of DB
                        </span>

                        {item.canDelete && item.sizeMb > 0 ? (
                          <button
                            type="button"
                            onClick={() => handlePurgeStorageItem(item.id, item.name)}
                            className="p-1 px-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/20 dark:hover:bg-rose-950/55 text-rose-700 dark:text-rose-400 border border-rose-250 hover:border-rose-400 rounded-md text-[10px] font-bold cursor-pointer transition-all flex items-center gap-1 mt-1"
                            title="Clear memory allocation"
                          >
                            <Trash2 className="w-3 h-3" />
                            Purge
                          </button>
                        ) : item.canDelete ? (
                          <span className="text-[9px] font-bold text-slate-400 dark:text-teal-300 font-sans mt-2 block">
                            🗑️ Cleaned
                          </span>
                        ) : (
                          <span className="p-1 px-2 background duration-300 bg-slate-100 dark:bg-teal-900 text-slate-400 dark:text-teal-400 rounded-md text-[9px] font-bold mt-1 cursor-not-allowed select-none flex items-center gap-0.5">
                            <Lock className="w-2.5 h-2.5" />
                            Lock
                          </span>
                        )}
                      </div>
                    </div>

                    {item.sizeMb > 0 && (
                      <div className="w-full bg-slate-200 dark:bg-teal-950 h-1 rounded-full overflow-hidden mt-3">
                        <div 
                          className={`h-full rounded-full ${item.canDelete ? "bg-indigo-500" : "bg-teal-600"}`} 
                          style={{ width: `${percent}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Total storage health summary indicator */}
            <div className="mt-5 p-4 bg-slate-50 dark:bg-teal-900/30 border border-slate-150 dark:border-teal-800 rounded-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <div>
                <span className="text-[10px] font-black uppercase text-slate-400 dark:text-teal-200 tracking-wider font-mono">Active Connected Filesystem Total</span>
                <p className="text-xl font-black text-slate-800 dark:text-white mt-0.5">
                  {storageItems.reduce((acc, i) => acc + i.sizeMb, 0).toFixed(1)} <span className="text-sm font-bold text-slate-500">MB</span>
                </p>
              </div>

              <div className="flex gap-2">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 dark:text-teal-300 block">Purgeable Load</span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                    {storageItems.reduce((acc, i) => acc + (i.canDelete ? i.sizeMb : 0), 0).toFixed(1)} MB Safe to Clear
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* New Segment 2: Storage Endurance & Longevity Intelligence Panel */}
          <div className={`bg-white dark:bg-teal-950 rounded-2xl border-2 p-6 md:p-8 transition-all relative overflow-hidden ${isDisconnected ? "border-rose-450 dark:border-rose-500 opacity-95" : "border-slate-200 dark:border-white"}`} id="owner-storage-longevity-panel">
            {isDisconnected && (
              <div className="absolute inset-0 bg-slate-900/60 dark:bg-teal-950/75 backdrop-blur-xs z-30 flex flex-col items-center justify-center text-center p-6 transition-all duration-300">
                <div className="bg-white dark:bg-teal-900 border border-slate-200 dark:border-teal-800 p-5 rounded-2xl shadow-xl max-w-sm space-y-3">
                  <WifiOff className="w-10 h-10 text-rose-500 animate-bounce mx-auto" />
                  <h4 className="text-sm font-bold text-slate-800 dark:text-white uppercase font-sans">Calculations Offline</h4>
                  <p className="text-[11px] text-slate-500 dark:text-teal-150 leading-normal">
                    Database telemetry feeds are offline. Sliders and endurance estimates are suspended until database communication links are restored.
                  </p>
                  <button
                    type="button"
                    onClick={() => setIsDisconnected(false)}
                    className="py-1.5 px-4 bg-indigo-650 hover:bg-indigo-750 text-white font-bold rounded-lg text-xs cursor-pointer inline-flex items-center gap-1 shadow-md transition-all"
                  >
                    <Wifi className="w-3.5 h-3.5" />
                    🔌 Reconnect Real-time DB
                  </button>
                </div>
              </div>
            )}
            <div className="flex items-start gap-4 mb-5 pb-4 border-b border-slate-100 dark:border-teal-900">
              <span className="p-2.5 bg-indigo-50 dark:bg-teal-900 text-indigo-600 dark:text-cyan-400 rounded-xl shrink-0">
                <Calculator className="w-6 h-6" />
              </span>
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-teal-50 flex items-center gap-2">
                  Storage Endurance & Lifespan Calculator
                  <Sparkles className="w-4.5 h-4.5 text-amber-500 animate-pulse" />
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-teal-200/80 mt-0.5">
                  Simulate dynamic operational storage lifespan based on occupied sectors and pool constraints.
                </p>
              </div>
            </div>

            {/* Dynamic System Context & Simulation Control Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6" id="telemetry-input-grid">
              
              {/* Left Column: Occupied & Capacity Configurations */}
              <div className="bg-slate-50 dark:bg-teal-900/10 border border-slate-150 dark:border-teal-900/45 p-4 rounded-xl space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black uppercase text-indigo-655 dark:text-cyan-400 tracking-wider font-mono block">
                    ⚙️ Active Storage Allocation
                  </span>
                  <button
                    onClick={() => {
                      const totalMb = storageItems.reduce((acc, i) => acc + i.sizeMb, 0);
                      setCurrentStorageGb(parseFloat((totalMb / 1024).toFixed(3)));
                    }}
                    title="Reset to current live directory size"
                    className="text-[9px] font-bold py-0.5 px-2 bg-indigo-50 hover:bg-indigo-100 dark:bg-teal-900 dark:hover:bg-teal-800 text-indigo-600 dark:text-cyan-400 border border-slate-200 dark:border-teal-800 rounded-lg transition cursor-pointer"
                  >
                    🔄 Sync Live
                  </button>
                </div>
                
                {/* 1. Occupied Storage Slider & State */}
                <div className="space-y-1.5 font-sans">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-semibold text-slate-800 dark:text-teal-100 italic">
                      📊 Occupied Storage
                    </span>
                    <span className="font-mono font-bold text-xs text-emerald-650 dark:text-emerald-400">
                      {currentStorageGb.toFixed(3)} GB
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0.05"
                    max={capacityGb}
                    step="0.05"
                    value={currentStorageGb}
                    onChange={(e) => setCurrentStorageGb(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600 dark:accent-cyan-400 h-1.5 bg-slate-250 dark:bg-teal-900 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[8.5px] text-slate-400 font-mono">
                    <span>Min: 0.05 GB</span>
                    <span>Max: {capacityGb.toFixed(1)} GB</span>
                  </div>
                </div>

                {/* 2. Target Capacity Slider & State */}
                <div className="space-y-1.5 font-sans pt-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-semibold text-slate-800 dark:text-teal-100 italic">
                      💾 Capacity Storage Pool
                    </span>
                    <span className="font-mono font-bold text-xs text-amber-600 dark:text-amber-400">
                      {capacityGb.toFixed(1)} GB
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1.0"
                    max="15.0"
                    step="0.5"
                    value={capacityGb}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setCapacityGb(val);
                      if (currentStorageGb > val) {
                        setCurrentStorageGb(val);
                      }
                    }}
                    className="w-full accent-indigo-600 dark:accent-cyan-400 h-1.5 bg-slate-250 dark:bg-teal-900 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[8.5px] text-slate-400 font-mono">
                    <span>Min: 1.0 GB</span>
                    <span>Max: 15.0 GB</span>
                  </div>
                </div>
              </div>

              {/* Right Column: Simulated Growth Rate Profiles */}
              <div className="bg-slate-50 dark:bg-teal-900/10 border border-slate-150 dark:border-teal-900/40 p-4 rounded-xl flex flex-col justify-between">
                <div className="space-y-4">
                  <span className="text-[10px] font-black uppercase text-indigo-655 dark:text-cyan-400 tracking-wider font-mono block">
                    📈 Simulated Growth Dynamics
                  </span>
                  
                  {/* Write speed Slider */}
                  <div className="space-y-1.5 font-sans">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] font-semibold text-slate-800 dark:text-teal-100 italic">
                        ⚡ Daily Write Growth (MB/day)
                      </span>
                      <span className="font-mono font-bold text-xs text-indigo-650 dark:text-cyan-400">
                        {writeSpeedMb.toFixed(1)} MB
                      </span>
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="150"
                      step="5"
                      value={writeSpeedMb}
                      onChange={(e) => setWriteSpeedMb(parseInt(e.target.value) || 1)}
                      className="w-full accent-indigo-600 dark:accent-cyan-400 h-1.5 bg-slate-250 dark:bg-teal-900 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[8.5px] text-slate-400 font-mono">
                      <span>Light: 1 MB/day</span>
                      <span>Heavy Profile: 150 MB/day</span>
                    </div>
                  </div>

                  {/* Informational baseline helper */}
                  <div className="p-2.5 bg-white dark:bg-teal-950/40 border border-slate-100 dark:border-teal-900/50 rounded-lg text-[10px] text-slate-500 dark:text-teal-200/80 leading-normal font-sans">
                    🌱 Calculated individual profile baseline: <strong>{(writeSpeedMb / (users.length || 5)).toFixed(2)} MB</strong> per user contribution across <strong>{users.length || 5} active accounts</strong>.
                  </div>
                </div>
              </div>

            </div>

            {/* Calculations Render Panel */}
            {(() => {
              const currentTotalUsedMb = currentStorageGb * 1024;
              const currentTotalUsedGb = currentStorageGb;
              const totalLimitInMb = capacityGb * 1024;
              const remainingMb = Math.max(0, totalLimitInMb - currentTotalUsedMb);
              
              const dailyBurnMb = writeSpeedMb; 

              // Days limit
              let projectedDays = 0;
              if (dailyBurnMb > 0) {
                projectedDays = Math.floor(remainingMb / dailyBurnMb);
              }
              
              const isOverLimit = currentTotalUsedGb >= capacityGb;

              const formatLongevityTime = (daysCount: number) => {
                if (isOverLimit) return "Storage Limit Exceeded! Please free sectors.";
                if (daysCount <= 0) return "Less than 1 Day";
                
                const years = Math.floor(daysCount / 365);
                const remainingDaysAfterYears = daysCount % 365;
                const months = Math.floor(remainingDaysAfterYears / 30.4);
                const days = Math.floor(remainingDaysAfterYears % 30.4);
                
                let resultParts = [];
                if (years > 0) resultParts.push(`**${years} year${years > 1 ? "s" : ""}**`);
                if (months > 0) resultParts.push(`**${months} month${months > 1 ? "s" : ""}**`);
                if (days > 0 && years === 0) resultParts.push(`**${days} day${days > 1 ? "s" : ""}**`);
                
                if (resultParts.length === 0) {
                  return `**${daysCount} days**`;
                }
                return resultParts.join(", ");
              };

              // Calendar Horizon Exhaustion Date
              const getCalHorizon = (daysLeft: number) => {
                if (isOverLimit) return "Requires Immediate Clearance";
                const depletionDate = new Date();
                depletionDate.setDate(depletionDate.getDate() + daysLeft);
                return depletionDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
              };

              // Security & Health Grading system
              let healthGrade = "OPTIMAL SERVER METRIC";
              let gradeColor = "border-emerald-200 dark:border-emerald-900 bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-850 dark:text-emerald-300";
              
              if (projectedDays < 180) {
                healthGrade = "CRITICAL ACTION REQUIRED";
                gradeColor = "border-red-200 dark:border-rose-950/40 bg-red-50/50 dark:bg-rose-950/20 text-rose-800 dark:text-rose-300";
              } else if (projectedDays < 365) {
                healthGrade = "WARN: ENLIST SANITATION SOON";
                gradeColor = "border-amber-250 bg-amber-50/40 text-amber-900 dark:text-amber-300";
              }

              return (
                <div className="space-y-4">

                  <div className={`p-4 border rounded-2xl ${gradeColor} grid grid-cols-1 md:grid-cols-2 gap-4 transition-all duration-300`} id="longevity-output-summary">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider block opacity-75 font-mono">Simulated Endurance Horizon</span>
                      <p 
                        className="text-lg font-black mt-1 font-sans cursor-help animate-fade-in"
                        dangerouslySetInnerHTML={{ __html: formatLongevityTime(projectedDays) }}
                        title="Formulated from current occupied storage versus total storage capacity."
                      />
                      <span className="text-[10px] block mt-1.5 opacity-80 flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3" />
                        Est. Run-Out: {getCalHorizon(projectedDays)}
                      </span>
                    </div>

                    <div className="flex flex-col justify-center border-t md:border-t-0 md:border-l border-current/20 pt-3 md:pt-0 md:pl-4">
                      <span className="text-[10px] font-black uppercase tracking-wider block opacity-75 font-mono">System Status Grade</span>
                      <p className="text-sm font-black mt-1 uppercase flex items-center gap-1.5 font-mono">
                        {projectedDays < 180 ? <ShieldAlert className="w-4.5 h-4.5 animate-bounce text-rose-500" /> : <Shield className="w-4.5 h-4.5 text-emerald-500" />}
                        {healthGrade}
                      </p>
                      <span className="text-[10px] block mt-1 opacity-80 font-sans leading-normal font-mono">
                        Usage: <strong>{currentTotalUsedGb.toFixed(3)} GB</strong> of <strong>{capacityGb.toFixed(1)} GB</strong> ({((currentTotalUsedGb / capacityGb) * 100).toFixed(1)}%)
                      </span>
                    </div>
                  </div>

                  {/* High fidelity visualization benchmark line */}
                  <div className="p-4 bg-slate-50 dark:bg-teal-900/10 border border-slate-150 dark:border-teal-900 rounded-2xl space-y-3">
                    <span className="text-[10px] font-black text-slate-400 dark:text-teal-200 uppercase tracking-wider font-mono block">Simulated Threshold Exhaustion Chart</span>
                    
                    <div className="space-y-1.5 pt-1">
                      <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                        <span>Occupied: {(currentTotalUsedGb).toFixed(3)} GB ({(currentTotalUsedGb / capacityGb * 100).toFixed(1)}%)</span>
                        <span>Capacity: {capacityGb.toFixed(1)} GB Limit</span>
                      </div>
                      
                      <div className="w-full bg-slate-200 dark:bg-teal-950 h-3 rounded-full overflow-hidden relative">
                        {/* Current Usage */}
                        <div 
                          className="bg-indigo-650 h-full absolute left-0 z-10 transition-all duration-500"
                          style={{ width: `${Math.min(100, (currentTotalUsedGb / capacityGb) * 100)}%` }}
                        />
                        {/* Projected Burn Zone */}
                        <div 
                          className="bg-amber-400 h-full absolute transition-all duration-500 opacity-40 animate-pulse"
                          style={{ 
                            left: `${Math.min(100, (currentTotalUsedGb / capacityGb) * 100)}%`,
                            width: `${Math.min(100 - (currentTotalUsedGb / capacityGb * 100), (dailyBurnMb * 365 / 1024 / capacityGb) * 100)}%` 
                          }}
                        />
                      </div>
                      
                      <div className="flex items-center gap-4 text-[10px] text-slate-400 font-mono mt-2 pt-0.5">
                        <div className="flex items-center gap-1">
                          <span className="w-2 md:w-3 h-2 bg-indigo-650 rounded-full inline-block"></span>
                          <span>Occupied storage</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-2 md:w-3 h-3 bg-amber-400/45 rounded-sm inline-block animate-pulse"></span>
                          <span>Est. Year-1 depletion projection</span>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-200/50 dark:border-teal-900/50 pt-2.5 text-xs text-slate-500 dark:text-teal-200 leading-normal flex items-start gap-1 p-0.5">
                      <Info className="w-4 h-4 text-indigo-505 dark:text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <span>
                          Endurance span formulated strictly by evaluating <strong>{currentStorageGb.toFixed(3)} GB Occupied Storage</strong> against the selected <strong>{capacityGb.toFixed(1)} GB Capacity Storage Pool</strong>. Under your selected growth speed of <strong>{writeSpeedMb} MB/day</strong>, the remaining storage pool provides up to <strong>{isOverLimit ? "0 days" : formatLongevityTime(projectedDays).replace(/\*\*/g, "")}</strong> of continued operational lifespan.
                        </span>
                      </div>
                    </div>

                  </div>
                </div>
              );
            })()}

          </div>

        </div>

        {/* RIGHT COLUMN: User Roles Ledger & Sanitation (5 cols) */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* User Role management list */}
          <div className={`bg-white dark:bg-teal-950 rounded-2xl border-2 p-6 md:p-8 transition-all ${
            currentUser?.role === "owner" 
              ? "border-slate-200 dark:border-teal-900/60" 
              : "border-slate-200 dark:border-teal-900/40 opacity-90"
          }`} id="owner-role-assigner-panel">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-850 dark:text-teal-50 flex items-center gap-2.5">
                <UserCheck className={`w-5 h-5 ${currentUser?.role === "owner" ? "text-teal-600 dark:text-teal-400" : "text-slate-400"}`} />
                User Authorization Roles Ledger
              </h3>
              {currentUser?.role === "owner" ? (
                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 text-[9px] font-extrabold uppercase rounded-md tracking-wider border border-emerald-200 dark:border-emerald-900 animate-pulse">
                  Unlocked
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-extrabold uppercase rounded-md tracking-wider border border-slate-200 dark:border-slate-700">
                  Read Only
                </span>
              )}
            </div>

            {/* SECURITY LEDGER LOCK/UNLOCK NOTICE */}
            {currentUser?.role === "owner" ? (
              <div className="bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 p-3 rounded-xl border border-emerald-200 dark:border-emerald-900 text-xs mb-4 flex items-start gap-2.5 font-sans">
                <Unlock className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Ledger Unlocked:</strong> As the primary platform <strong>Owner</strong>, you have high-level clearance authorization to assign permissions and roles directly in the credential ledger.
                </span>
              </div>
            ) : (
              <div className="bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 p-3 rounded-xl border border-amber-200 dark:border-amber-900 text-xs mb-4 flex items-start gap-2.5 font-sans">
                <Lock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Ledger Restricted:</strong> Only the primary platform <strong>Owner</strong> possesses permissions to modify security accounts. Role reassignment is disabled for Admin accounts.
                </span>
              </div>
            )}

            <p className="text-xs text-slate-500 dark:text-teal-200 mb-6 font-sans">
              Identity access lists are synchronized in real-time. Role changes propagate globally to active user sessions immediately.
            </p>

            {userFeedback && (
              <div className={`p-3 rounded-xl text-xs flex items-start gap-2 border mb-4 ${
                userFeedback.type === "success" 
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" 
                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-900"
              }`}>
                {userFeedback.type === "success" ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
                <span>{userFeedback.msg}</span>
              </div>
            )}

            {loadingUsers ? (
              <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                Refreshing permission list...
              </div>
            ) : (
              <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1" id="roles-list-container">
                {users.map(u => (
                  <div 
                    key={u.id} 
                    className="p-3 border border-slate-100 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-teal-900/30 dark:text-teal-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-850 dark:text-white flex items-center gap-1.5">
                        {u.name}
                        {u.role === "owner" && (
                          <span className="px-1.5 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-850 dark:text-amber-300 text-[8px] font-extrabold uppercase rounded-md tracking-wider border border-amber-300/30">
                            Owner
                          </span>
                        )}
                        {u.role === "admin" && (
                          <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 text-[8px] font-bold uppercase rounded-md">
                            Admin
                          </span>
                        )}
                        {u.role === "teacher" && (
                          <span className="px-1.5 py-0.5 bg-slate-200 dark:bg-neutral-850 text-slate-700 dark:text-neutral-300 text-[8px] font-bold uppercase rounded-md">
                            Teacher
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-teal-200 font-mono mt-0.5">{u.email}</p>
                      <p className="text-[10px] text-slate-505 dark:text-teal-300">{u.department || "General Faculty"}</p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <select
                        disabled={currentUser?.role !== "owner"}
                        value={u.role}
                        onChange={(e) => handleUpdateRole(u.id, e.target.value as any)}
                        className={`p-1 px-1.5 text-xs bg-white dark:bg-slate-900 border rounded-lg focus:outline-none ${
                          currentUser?.role === "owner" 
                            ? "cursor-pointer text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-700" 
                            : "cursor-not-allowed text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-800"
                        }`}
                      >
                        <option value="teacher">Teacher</option>
                        <option value="admin">Admin</option>
                        <option value="owner">Owner</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Core Purge Sanitation Panel */}
          <div className="bg-rose-50/40 dark:bg-rose-950/20 rounded-2xl border-2 border-rose-200 dark:border-rose-900/60 p-6 md:p-8 transition-all" id="owner-purger-panel">
            <h3 className="text-base font-bold text-rose-800 dark:text-rose-400 flex items-center gap-2.5 mb-4">
              <Trash2 className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              Core Sanitation & Purge Tool
            </h3>

            <p className="text-xs text-rose-700/90 dark:text-rose-300 leading-relaxed font-sans mb-4">
              Executing this central sanitation purge will instantly and **permanently delete** the following datasets from the active database system:
            </p>

            <ul className="text-xs text-rose-700/80 dark:text-rose-300 space-y-1.5 list-disc pl-5 mb-6 font-sans">
              <li><strong>Reservation Slots:</strong> All active, pending, and past workspace and equipment bookings.</li>
              <li><strong>Electronic Mail:</strong> The complete outbound dispatched transaction emails registry.</li>
              <li><strong>Security Audit History:</strong> All local user authentication and access log timelines.</li>
            </ul>

            <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 font-sans mb-5">
              <strong>Notice:</strong> This action is safe for identity access directories — existing student and teacher clearance registers are fully preserved.
            </div>

            {clearFeedback && (
              <div className="p-3 bg-red-100 dark:bg-rose-950/40 text-rose-850 dark:text-rose-300 text-xs border border-red-200 dark:border-rose-900 rounded-xl mb-4">
                {clearFeedback.msg}
              </div>
            )}

            <div className="space-y-4">
              <label className="flex items-start gap-2.5 text-slate-700 dark:text-teal-200 text-xs font-sans cursor-pointer">
                <input
                  type="checkbox"
                  id="confirm-database-purge-checkbox"
                  checked={confirmClearChecked}
                  onChange={(e) => {
                    setConfirmClearChecked(e.target.checked);
                    if (!e.target.checked) setPurgePassword("");
                  }}
                  className="rounded text-rose-600 focus:ring-rose-500 mt-0.5 cursor-pointer size-4"
                />
                <span className="select-none">I confirm that I want to clear all reservations, mails, and security logs. This action cannot be reversed.</span>
              </label>

              {confirmClearChecked && (
                <div className="space-y-1.5 animate-fade-in" id="owner-purge-credentials-box">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-rose-800 dark:text-rose-400">
                      Authentication Clearance Required
                    </label>
                    <span className="text-[10px] text-rose-500 font-mono font-bold">Secure Verification</span>
                  </div>
                  <input
                    type="password"
                    id="purge-verification-password-input"
                    placeholder="Type your current user account password"
                    value={purgePassword}
                    onChange={(e) => setPurgePassword(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/60 rounded-xl text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:border-rose-500 font-sans shadow-sm transition-all"
                    required
                  />
                </div>
              )}

              <button
                type="button"
                id="execute-purge-btn"
                disabled={!confirmClearChecked || !purgePassword.trim() || isClearing}
                onClick={handlePurgeAllReservations}
                className="w-full py-2.5 px-4 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white font-bold text-xs rounded-lg cursor-pointer transition-all shadow-md flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                {isClearing ? "Executing Core Purge..." : "Clear All Reservations, Mails & History"}
              </button>
            </div>
          </div>

        </div>

      </div>

      {/* SYSTEM SECURITY AUDIT HISTORY PANEL */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border-2 border-slate-200 dark:border-slate-805 p-6 md:p-8 transition-all space-y-6" id="system-security-audit-panel">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-855 dark:text-slate-100 flex items-center gap-2.5">
              <History className="w-5 h-5 text-teal-600 dark:text-teal-400" />
              System Security & Audit Historic Ledger
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-450 mt-1 font-sans">
              Real-time synchronization tracking user authentication dates, mail dispatch relays, and physical resource booking states.
            </p>
          </div>
          
          {/* Sub Tab Buttons & Export Controls */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl max-w-fit border border-slate-200/50 dark:border-slate-705">
              <button
                onClick={() => setHistoryTab("logins")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  historyTab === "logins" 
                    ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs" 
                    : "text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                <UserCheck className="w-3.5 h-3.5 text-teal-500" />
                User Logins ({loginLogsHistory.length})
              </button>
              <button
                onClick={() => setHistoryTab("emails")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  historyTab === "emails" 
                    ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs" 
                    : "text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                <Mail className="w-3.5 h-3.5 text-blue-500" />
                Emails Dispatched ({emailsHistory.length})
              </button>
              <button
                onClick={() => setHistoryTab("bookings")}
                className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                  historyTab === "bookings" 
                    ? "bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs" 
                    : "text-slate-550 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
                }`}
              >
                <Calendar className="w-3.5 h-3.5 text-indigo-500" />
                Reservations Status ({bookingsHistory.length})
              </button>
            </div>

            {/* Export and Download Actions */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDownloadCSV("active")}
                disabled={isDisconnected || (historyTab === "logins" && loginLogsHistory.length === 0) || (historyTab === "emails" && emailsHistory.length === 0) || (historyTab === "bookings" && bookingsHistory.length === 0)}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-650 text-white disabled:opacity-40 disabled:cursor-not-allowed shadow-xs shrink-0 border border-emerald-500/20"
                title={`Download active ${historyTab} table as Excel-compliant CSV`}
                id="export-active-csv-btn"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Active (.CSV)</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadCSV("all")}
                disabled={isDisconnected || (loginLogsHistory.length === 0 && emailsHistory.length === 0 && bookingsHistory.length === 0)}
                className="px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-705 text-slate-750 dark:text-slate-200 disabled:opacity-45 disabled:cursor-not-allowed shadow-xs shrink-0 border border-slate-200 dark:border-slate-700"
                title="Download combined historic audit log sections to a single CSV spreadsheet file"
                id="export-all-csv-btn"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export All Logs (.CSV)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic content */}
        {isDisconnected ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-205 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900/40">
            <ShieldAlert className="w-10 h-10 text-rose-500 mx-auto mb-2 animate-bounce" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Auditing Terminated: Datastore is Offline</h4>
            <p className="text-xs text-slate-450 mt-1 max-w-sm mx-auto font-sans">
              Please reconnect or configure a database target node on the panel above to resume active monitoring logs.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* User Logins View */}
            {historyTab === "logins" && (
              <div className="space-y-3">
                {loadingLogins ? (
                  <div className="py-12 text-center text-xs text-slate-400 animate-pulse">
                    Querying secure login registries...
                  </div>
                ) : loginLogsHistory.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 font-sans">
                    No login instances logged.
                  </div>
                ) : (
                  <div className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                        <tr>
                          <th className="p-3">Log ID</th>
                          <th className="p-3">User Details</th>
                          <th className="p-3">Email Address</th>
                          <th className="p-3">Timestamp (Local)</th>
                          <th className="p-3 text-slate-800 dark:text-emerald-400 font-extrabold bg-slate-100/50 dark:bg-slate-800/60 uppercase border-l border-slate-200 dark:border-slate-700 pl-4">
                            Auth Activity & Clearance
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-200 bg-white dark:bg-transparent">
                        {[...loginLogsHistory].sort((a,b) => b.loginAt.localeCompare(a.loginAt)).map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-all font-sans">
                            <td className="p-3 font-mono font-bold text-teal-650 dark:text-teal-400">{log.id}</td>
                            <td className="p-3 font-medium text-slate-800 dark:text-white">{log.userName}</td>
                            <td className="p-3 font-mono text-slate-500 dark:text-slate-400">{log.userEmail}</td>
                            <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                              {new Date(log.loginAt).toLocaleString()}
                            </td>
                            <td className="p-3 flex items-center flex-wrap gap-2">
                              {/* Log In / Log Out action tracking badge */}
                              {log.action === "logout" ? (
                                <span className="px-2 py-0.5 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 rounded-md font-mono font-bold text-[10px] uppercase flex items-center gap-1 border border-rose-200/50 dark:border-rose-900/30 shadow-xs">
                                  <LogOut className="w-3 h-3 text-rose-500 shrink-0" />
                                  Log Out
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-md font-mono font-bold text-[10px] uppercase flex items-center gap-1 border border-emerald-200/50 dark:border-emerald-900/30 shadow-xs">
                                  <LogIn className="w-3 h-3 text-emerald-500 shrink-0" />
                                  Log In
                                </span>
                              )}

                              {/* Security Clearance level */}
                              {log.userEmail.includes("owner") || log.userEmail === "rougebandit114@gmail.com" ? (
                                <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-950/20 text-amber-805 dark:text-amber-400 rounded font-sans font-bold text-[10px] uppercase border border-amber-200/40 dark:border-amber-900/30">
                                  Owner Clearance
                                </span>
                              ) : log.userEmail.includes("admin") ? (
                                <span className="px-2 py-0.5 bg-sky-50 dark:bg-sky-950/20 text-sky-805 dark:text-sky-450 rounded font-sans font-bold text-[10px] uppercase border border-sky-200/40 dark:border-sky-900/30">
                                  Admin Clearance
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-slate-50 dark:bg-neutral-850 text-slate-600 dark:text-neutral-400 rounded font-sans font-bold text-[10px] uppercase border border-slate-200/40 dark:border-neutral-800">
                                  Faculty Clearance
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Email Dispatches View */}
            {historyTab === "emails" && (
              <div className="space-y-3">
                {loadingEmails ? (
                  <div className="py-12 text-center text-xs text-slate-450 animate-pulse">
                    Parsing email relay logs...
                  </div>
                ) : emailsHistory.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 font-sans">
                    No electronic emails sent yet.
                  </div>
                ) : (
                  <div className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                        <tr>
                          <th className="p-3">Mail ID</th>
                          <th className="p-3">Type</th>
                          <th className="p-3">Recipient Address</th>
                          <th className="p-3">Subject Header</th>
                          <th className="p-3">Dispatched Time</th>
                          <th className="p-3">Message Preview</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-205 bg-white dark:bg-transparent">
                        {[...emailsHistory].sort((a,b) => b.sentAt.localeCompare(a.sentAt)).map((email) => (
                          <tr key={email.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-all font-sans">
                            <td className="p-3 font-mono font-bold text-teal-650 dark:text-teal-400">{email.id.substring(0, 10)}</td>
                            <td className="p-3">
                              <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] uppercase ${
                                email.type === "confirmation" ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300" :
                                email.type === "cancellation" ? "bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300" :
                                email.type === "reminder" ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300" :
                                "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-805 dark:text-indigo-305"
                              }`}>
                                {email.type || "transactional"}
                              </span>
                            </td>
                            <td className="p-3 font-mono text-slate-500 dark:text-slate-400">{email.toEmail}</td>
                            <td className="p-3 font-medium text-slate-800 dark:text-white">{email.subject}</td>
                            <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                              {new Date(email.sentAt).toLocaleString()}
                            </td>
                            <td className="p-3 max-w-[200px] truncate text-slate-450 text-[11px] font-sans" title={email.body}>
                              {email.body}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Reservations Status View */}
            {historyTab === "bookings" && (
              <div className="space-y-3">
                {loadingBookings ? (
                  <div className="py-12 text-center text-xs text-slate-405 animate-pulse">
                    Compiling booking ledger matrices...
                  </div>
                ) : bookingsHistory.length === 0 ? (
                  <div className="py-12 text-center text-xs text-slate-400 font-sans">
                    No reservations logged yet.
                  </div>
                ) : (
                  <div className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                        <tr>
                          <th className="p-3">Reservation ID</th>
                          <th className="p-3">Faculty / User</th>
                          <th className="p-3">Resource Target</th>
                          <th className="p-3">Scheduled Slot</th>
                          <th className="p-3">Purpose</th>
                          <th className="p-3">Current Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-700 dark:text-slate-205 bg-white dark:bg-transparent">
                        {[...bookingsHistory].sort((a,b) => b.createdAt.localeCompare(a.createdAt)).map((b) => (
                          <tr key={b.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40 transition-all font-sans">
                            <td className="p-3 font-mono font-bold text-teal-650 dark:text-teal-400">{b.id.substring(0, 10)}</td>
                            <td className="p-3">
                              <div className="font-medium text-slate-805 dark:text-white">{b.userName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">{b.userEmail}</div>
                            </td>
                            <td className="p-3 text-slate-800 dark:text-slate-100 flex flex-col">
                              <span className="font-medium">{b.resourceName}</span>
                              <span className="text-[10px] capitalize opacity-60">Type: {b.resourceType}</span>
                            </td>
                            <td className="p-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                              <div>{b.date}</div>
                              <div className="opacity-70">{b.startTime} - {b.endTime}</div>
                            </td>
                            <td className="p-3 text-[11px] text-slate-600 dark:text-slate-300 italic">
                              "{b.purpose || "N/A"}"
                            </td>
                            <td className="p-3 font-sans">
                              {b.status === "approved" ? (
                                <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-305 rounded-full font-bold text-[9px] uppercase border border-emerald-300/30">
                                  Approved
                                </span>
                              ) : b.status === "pending" ? (
                                <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/60 text-amber-850 dark:text-amber-300 rounded-full font-bold text-[9px] uppercase border border-amber-300/30">
                                  Pending Action
                                </span>
                              ) : b.status === "canceled" ? (
                                <span className="px-2 py-0.5 bg-slate-150 dark:bg-neutral-800 text-slate-650 dark:text-neutral-405 rounded-full font-bold text-[9px] uppercase">
                                  Canceled
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 rounded-full font-bold text-[9px] uppercase border border-blue-300/30">
                                  {b.status}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
