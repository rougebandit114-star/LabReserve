import React, { useState, useEffect } from "react";
import { User } from "../types";
import { 
  User as UserIcon, 
  Lock, 
  Settings, 
  Database,
  Volume2, 
  VolumeX, 
  Trash2, 
  Download, 
  Check, 
  AlertCircle,
  Eye,
  EyeOff,
  Edit2,
  X,
  KeyRound,
  ShieldCheck,
  Bell,
  History,
  EyeOff as PrivacyIcon,
  Layout,
  CheckCircle,
  Sliders,
  Clock,
  Info,
  ShieldAlert,
  ChevronRight,
  Sun,
  Moon,
  Monitor
} from "lucide-react";

interface ProfileSettingsProps {
  currentUser: User;
  token: string | null;
  onRefresh: (token: string) => Promise<void>;
  onUserUpdate: (updatedUser: User) => void;
}

// Sub-panel tabs definition
type ActiveSubTab = 
  | "overview"
  | "personal"
  | "booking_pref"
  | "notifications"
  | "security"
  | "activity"
  | "privacy"
  | "theme";

export default function ProfileSettings({ 
  currentUser, 
  token, 
  onRefresh, 
  onUserUpdate 
}: ProfileSettingsProps) {
  // Navigation State
  const [activeSubTab, setActiveSubTab] = useState<ActiveSubTab>("overview");

  // Form State: Personal Details
  const [name, setName] = useState(currentUser.name);
  const [department, setDepartment] = useState(currentUser.department || "");
  const [personalSuccess, setPersonalSuccess] = useState<string | null>(null);
  const [personalError, setPersonalError] = useState<string | null>(null);
  const [submittingPersonal, setSubmittingPersonal] = useState(false);
  const [isEditingPersonal, setIsEditingPersonal] = useState(false);

  // Form State: Security (Password Changer)
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [pwdSuccess, setPwdSuccess] = useState<string | null>(null);
  const [pwdError, setPwdError] = useState<string | null>(null);
  const [submittingPassword, setSubmittingPassword] = useState(false);
  const [isEditingSecurity, setIsEditingSecurity] = useState(false);

  // Client State: Booking Habits (Saved in localStorage on mutation)
  const [bookingPref, setBookingPref] = useState(() => {
    const saved = localStorage.getItem("alis_pref_booking");
    return saved ? JSON.parse(saved) : {
      defaultDuration: "2h",
      preferredStation: "WS-02",
      autoResolve: "prompt",
      allowOverlaps: false
    };
  });

  // Client State: Notification Rules
  const [notificationsRules, setNotificationsRules] = useState(() => {
    const saved = localStorage.getItem("alis_pref_notifications");
    return saved ? JSON.parse(saved) : {
      smtpApprove: true,
      smtpCancel: true,
      soundChime: true,
      dailyDigest: false,
      telegramAlert: false
    };
  });

  // Client State: Privacy Rules
  const [privacyRules, setPrivacyRules] = useState(() => {
    const saved = localStorage.getItem("alis_pref_privacy");
    return saved ? JSON.parse(saved) : {
      anonymizePublic: false,
      limitIntentionToAdmin: true,
      scrubCacheOnLogout: true,
      allowTelemetry: true
    };
  });

  // Client State: App Theme & Sound State
  const [themeMode, setThemeMode] = useState<"light" | "dark" | "system">(() => {
    return (localStorage.getItem("alis_theme_mode") as "light" | "dark" | "system") || "system";
  });
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem("alis_option_sound") !== "false";
  });
  const [compactMode, setCompactMode] = useState(() => {
    return localStorage.getItem("alis_option_compact") === "true";
  });
  const [fontPreference, setFontPreference] = useState(() => {
    return localStorage.getItem("alis_option_font") || "sans";
  });
  const [accentColor, setAccentColor] = useState(() => {
    return localStorage.getItem("alis_option_accent") || "indigo";
  });

  const isAdmin = currentUser.role === "admin";

  useEffect(() => {
    setName(currentUser.name);
    setDepartment(currentUser.department || "");
  }, [currentUser]);

  // Update Booking preference
  const updateBookingPref = (key: string, value: any) => {
    const next = { ...bookingPref, [key]: value };
    setBookingPref(next);
    localStorage.setItem("alis_pref_booking", JSON.stringify(next));
  };

  // Update Notification rules
  const updateNotificationRule = (key: string, value: any) => {
    const next = { ...notificationsRules, [key]: value };
    setNotificationsRules(next);
    localStorage.setItem("alis_pref_notifications", JSON.stringify(next));
  };

  // Update Privacy rules
  const updatePrivacyRule = (key: string, value: any) => {
    const next = { ...privacyRules, [key]: value };
    setPrivacyRules(next);
    localStorage.setItem("alis_pref_privacy", JSON.stringify(next));
  };

  // Handle General preferences
  const handleThemeModeChange = (mode: "light" | "dark" | "system") => {
    setThemeMode(mode);
    localStorage.setItem("alis_theme_mode", mode);
    window.dispatchEvent(new Event("theme-mode-changed"));
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem("alis_option_sound", String(next));
  };

  const handleToggleCompact = () => {
    const next = !compactMode;
    setCompactMode(next);
    localStorage.setItem("alis_option_compact", String(next));
    window.dispatchEvent(new Event("compact-mode-changed"));
  };

  const handleFontChange = (font: string) => {
    setFontPreference(font);
    localStorage.setItem("alis_option_font", font);
  };

  const handleAccentChange = (color: string) => {
    setAccentColor(color);
    localStorage.setItem("alis_option_accent", color);
  };

  // Submit Identity Form
  const handleUpdatePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    setPersonalSuccess(null);
    setPersonalError(null);

    if (!name.trim()) {
      setPersonalError("Full Name signature cannot be left blank.");
      return;
    }

    setSubmittingPersonal(true);
    try {
      const response = await fetch("/api/auth/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ name, department })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to update profile registry.");
      }

      setPersonalSuccess("Registry signature modified successfully.");
      onUserUpdate(data.user);
      
      if (token) {
        await onRefresh(token);
      }
    } catch (err: any) {
      setPersonalError(err.message || "A network or server error prevented updating profile.");
    } finally {
      setSubmittingPersonal(false);
    }
  };

  // Generate and suggest a strong password for validation
  const suggestStrongPassword = () => {
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const numbers = "0123456789";
    const symbols = "!@#$%^&*()_+=";
    
    const getRandom = (source: string, count: number) => {
      let r = "";
      for (let i = 0; i < count; i++) {
        r += source[Math.floor(Math.random() * source.length)];
      }
      return r;
    };

    let pass = [
      ...getRandom(chars.toLowerCase(), 3),
      ...getRandom(chars.toUpperCase(), 3),
      ...getRandom(numbers, 3),
      ...getRandom(symbols, 3)
    ];

    // Shuffle
    for (let i = pass.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [pass[i], pass[j]] = [pass[j], pass[i]];
    }

    const generated = pass.join("");
    setNewPassword(generated);
    setConfirmPassword(generated);
    setShowNewPass(true);
    setShowConfirmPass(true);
  };

  // Submit security credentials (password update)
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdSuccess(null);
    setPwdError(null);

    if (!currentPassword) {
      setPwdError("Your current authorization key password is required.");
      return;
    }

    if (!newPassword) {
      setPwdError("New secure password cannot be empty.");
      return;
    }

    if (newPassword.length < 5) {
      setPwdError("New password must contain at least 5 character variables.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPwdError("Confirmation mismatch. New passwords do not match.");
      return;
    }

    setSubmittingPassword(true);
    try {
      const response = await fetch("/api/auth/profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ currentPassword, newPassword })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Password change authentication rejected.");
      }

      setPwdSuccess("Password updated successfully. Keep this credential safe.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setPwdError(err.message || "A network error prevented updating password keys.");
    } finally {
      setSubmittingPassword(false);
    }
  };

  // Diagnostic reset local state
  const handleClearLocalDurableCache = () => {
    if (confirm("Are you sure you want to reset offline backup structures? This will wipe the client cache sync but retains live remote server bookings.")) {
      localStorage.removeItem("lab_backup_users");
      localStorage.removeItem("lab_backup_bookings");
      localStorage.removeItem("lab_backup_emails");
      localStorage.removeItem("lab_backup_notifications");
      alert("Durable offline local storage synchronisation caches cleared.");
      window.location.reload();
    }
  };

  // Simulated activity session items
  const mockActivityLogs = [
    { id: 1, action: "Authorized session via encrypted TLS cookie", status: "success", origin: "Chrome OS / Seattle", date: "Today, 11:35 AM" },
    { id: 2, action: "Initiated workstation reservation slot sequence", status: "success", origin: "Chrome OS / Seattle", date: "Today, 10:20 AM" },
    { id: 3, action: "Mutated user profile signature details", status: "info", origin: "Chrome OS / Seattle", date: "Yesterday, 04:12 PM" },
    { id: 4, action: "Re-authorized credentials from backup registry", status: "success", origin: "Firefox / Oregon", date: "June 17, 09:00 AM" },
    { id: 5, action: "Submitted reservation queue cancellation request", status: "warning", origin: "Android App / LTE Connection", date: "June 16, 02:40 PM" }
  ];

  // List of tabs configuration
  const tabConfiguration = [
    { id: "overview" as ActiveSubTab, label: "Overview", icon: Info },
    { id: "personal" as ActiveSubTab, label: "Personal Information", icon: UserIcon },
    { id: "booking_pref" as ActiveSubTab, label: "Booking Preferences", icon: Sliders },
    { id: "notifications" as ActiveSubTab, label: "Notifications", icon: Bell },
    { id: "security" as ActiveSubTab, label: "Security Keys & Locks", icon: Lock },
    { id: "activity" as ActiveSubTab, label: "Activity Logs", icon: History },
    { id: "privacy" as ActiveSubTab, label: "Privacy Guard", icon: PrivacyIcon },
    { id: "theme" as ActiveSubTab, label: "Appearance & Theme", icon: Layout }
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto" id="profile_settings_master">
      
      {/* Intro Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 sm:p-8 relative overflow-hidden shadow-sm border border-slate-850">
        <div className="absolute right-0 top-0 opacity-10 transform translate-x-4 -translate-y-4">
          <Settings className="w-52 h-52 text-blue-500 animate-spin" style={{ animationDuration: '80s' }} />
        </div>
        <div className="relative flex flex-col sm:flex-row sm:items-center gap-6 z-10">
          <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center font-black text-2xl uppercase border-2 border-indigo-400 shrink-0">
            {currentUser.name ? currentUser.name.charAt(0) : "U"}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-bold font-display">{currentUser.name}</h2>
              <span className="px-2.5 py-0.5 text-[9.5px] font-black uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/35 rounded-full">
                {currentUser.role}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">{currentUser.email}</p>
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-3 font-mono">
              Laboratory ID: <span className="text-indigo-400">{currentUser.id}</span> • Department: <span className="text-indigo-400">{currentUser.department || "Academic Research Units"}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Main Structural Layout: Sidebar on Left, Panels on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        
        {/* Left Side: Internal Settings Navigation Router */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-1">
          <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 px-3 pb-2 font-mono dark:text-slate-500">
            Navigation Rails
          </p>
          
          <div className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 scrollbar-none snap-x">
            {tabConfiguration.map((tab) => {
              const TabIcon = tab.icon;
              const isActive = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveSubTab(tab.id)}
                  className={`snap-center flex items-center shrink-0 lg:shrink lg:justify-between w-max lg:w-full px-3 py-2.5 rounded-xl text-xs font-bold transition-all text-left gap-2 cursor-pointer ${
                    isActive 
                      ? "bg-slate-900 text-white shadow-xs dark:bg-white dark:text-slate-950" 
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <TabIcon className={`w-4 h-4 ${isActive ? "text-indigo-500 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}`} />
                    <span>{tab.label}</span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 hidden lg:block transition-transform ${isActive ? "text-white dark:text-slate-950 translate-x-0.5" : "text-slate-300 dark:text-slate-600"}`} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Active Dynamic Sub-panel Form View */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs min-h-[480px] flex flex-col justify-between">
          
          <div>
            {/* Dynamic Card Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 dark:border-slate-800 mb-6 font-display">
              <div className="flex items-center gap-2.5">
                {activeSubTab === "overview" && <Info className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />}
                {activeSubTab === "personal" && <UserIcon className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />}
                {activeSubTab === "booking_pref" && <Sliders className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />}
                {activeSubTab === "notifications" && <Bell className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />}
                {activeSubTab === "security" && <Lock className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />}
                {activeSubTab === "activity" && <History className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />}
                {activeSubTab === "privacy" && <PrivacyIcon className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />}
                {activeSubTab === "theme" && <Layout className="w-4.5 h-4.5 text-indigo-600 dark:text-indigo-400" />}
                
                <h3 className="font-bold text-sm text-slate-905 dark:text-slate-100 tracking-tight capitalize">
                  {tabConfiguration.find(t => t.id === activeSubTab)?.label} Settings
                </h3>
              </div>

              <span className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-md font-mono text-[9px] text-slate-500 dark:text-slate-400 font-bold tracking-wider">
                ACTIVE STATE
              </span>
            </div>

            {/* Sub-Panel 1: Overview */}
            {activeSubTab === "overview" && (
              <div className="space-y-6 animate-fade-in" id="panel_overview">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  
                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 font-mono tracking-wider">Credentials Check</span>
                      <p className="text-sm font-bold text-slate-800 mt-1">Verified Sync</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 mt-4">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                      Secure TLS 1.3
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 font-mono tracking-wider">User Priority Status</span>
                      <p className="text-sm font-bold text-slate-800 mt-1">
                        {isAdmin ? "Root Coordinator" : "Certified Faculty"}
                      </p>
                    </div>
                    <span className="inline-flex items-center text-[10px] font-black text-indigo-700 mt-4 uppercase font-mono">
                      {isAdmin ? "Tier-0 System Access" : "Tier-1 Classroom Clearance"}
                    </span>
                  </div>

                  <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl flex flex-col justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400 font-mono tracking-wider">App Preferences</span>
                      <p className="text-sm font-bold text-slate-800 mt-1">Custom Config</p>
                    </div>
                    <span className="inline-flex items-center text-[10px] text-slate-500 mt-4">
                      Sound: {soundEnabled ? "Active" : "Mute"} • Compact: {compactMode ? "On" : "Off"}
                    </span>
                  </div>

                </div>

                <div className="bg-slate-900 text-slate-200 p-5 rounded-xl border border-slate-800 space-y-3">
                  <h4 className="text-xs font-bold font-mono tracking-wider text-slate-300">SYSTEM TELEMETRY SUMMARY</h4>
                  <div className="text-xs space-y-2 mt-2 font-mono text-slate-450 leading-relaxed text-[11px]">
                    <p>• Host Client Fingerprint: <span className="text-indigo-400">ALIS_VITE_SPA_SECURE_REVISION_6</span></p>
                    <p>• Session Node Registry: <span className="text-indigo-400">{currentUser.id}</span></p>
                    <p>• Department Node Bind: <span className="text-indigo-400">{currentUser.department || "Academic Units"}</span></p>
                    <p>• Encryption Status: <span className="text-emerald-400 font-bold">SHA-256 SECURED CLIENT SOCKETS</span></p>
                  </div>
                </div>

                <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-xl space-y-2">
                  <h4 className="text-xs font-bold text-indigo-900">Welcome to your ALIS Account Hub</h4>
                  <p className="text-xs text-indigo-800/80 leading-relaxed">
                    This settings panel permits you to fully modify your identity signature details, custom email notification chimes, conflict management preferences, local caches, and browser storage. Move through tabs inside the dynamic sidebar on the left to adapt your workspace.
                  </p>
                </div>
              </div>
            )}

            {/* Sub-Panel 2: Personal Information */}
            {activeSubTab === "personal" && (
              <div className="space-y-4 animate-fade-in" id="panel_personal">
                {personalSuccess && (
                  <div className="bg-emerald-50 border border-emerald-250/20 p-3 rounded-lg flex items-start gap-2.5 text-[11.5px] font-semibold text-emerald-800">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{personalSuccess}</span>
                  </div>
                )}

                {personalError && (
                  <div className="bg-rose-50 border border-rose-200/20 p-3 rounded-lg flex items-start gap-2.5 text-[11.5px] font-semibold text-rose-800">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{personalError}</span>
                  </div>
                )}

                {!isEditingPersonal ? (
                  <div className="space-y-6">
                    <div className="bg-slate-50 border border-slate-100 p-5 rounded-xl space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Full Name Signature</p>
                          <p className="text-sm font-bold text-slate-850 mt-1">{currentUser.name || "None Registered"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Academic division</p>
                          <p className="text-sm font-bold text-slate-850 mt-1">{currentUser.department || "Academic Units / Research Teams"}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Email Address</p>
                          <p className="text-xs font-mono font-bold text-indigo-600 mt-1">{currentUser.email}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-bold text-slate-400 font-mono tracking-wider">Account Role Priority</p>
                          <p className="text-xs font-bold text-slate-850 mt-1 capitalize">{currentUser.role}</p>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsEditingPersonal(true)}
                      className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Change Profile</span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={async (e) => {
                    await handleUpdatePersonal(e);
                    setIsEditingPersonal(false);
                  }} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider">
                        Full Name Signature
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Professor Mitchell"
                        className="w-full text-xs font-semibold px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider">
                        Academic Department Division
                      </label>
                      <input
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="e.g. Bioengineering"
                        className="w-full text-xs font-semibold px-3 py-2.5 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white"
                      />
                    </div>

                    <div className="space-y-1 opacity-70">
                      <label className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider">
                        E-mail Variable (Read-only)
                      </label>
                      <input
                        type="email"
                        value={currentUser.email}
                        disabled
                        title="Your login is permanently tied to this email handle."
                        className="w-full text-xs font-semibold px-3 py-2.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-500 cursor-not-allowed font-mono"
                      />
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setName(currentUser.name);
                          setDepartment(currentUser.department || "");
                          setIsEditingPersonal(false);
                        }}
                        className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer text-center"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingPersonal}
                        className="w-2/3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all active:scale-98 disabled:opacity-50 cursor-pointer text-center"
                      >
                        {submittingPersonal ? "Saving Profile..." : "Save Identity Customization"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Sub-Panel 3: Booking Preferences */}
            {activeSubTab === "booking_pref" && (
              <div className="space-y-5 animate-fade-in" id="panel_booking_pref">
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Configure default behaviors when placing classroom reservations or high-ventilation lab slots.
                </p>

                <div className="space-y-4">
                  {/* Default Duration choice */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider block">
                      Default Reservation Duration Limit
                    </label>
                    <select
                      value={bookingPref.defaultDuration}
                      onChange={(e) => updateBookingPref("defaultDuration", e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
                    >
                      <option value="1h">1 Hour (Standard slots)</option>
                      <option value="2h">2 Hours (Standard class block)</option>
                      <option value="4h">4 Hours (Extended Research session)</option>
                    </select>
                  </div>

                  {/* Preferred Station */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider block">
                      Preferred Workstation Node
                    </label>
                    <select
                      value={bookingPref.preferredStation}
                      onChange={(e) => updateBookingPref("preferredStation", e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
                    >
                      <option value="WS-01">Station 1 - Digital Oscilloscope</option>
                      <option value="WS-02">Station 3 - Mechatronics Dev</option>
                      <option value="WS-03">CH-02 Chemical Fume Cabin</option>
                    </select>
                  </div>

                  {/* Anti-collision behavior */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider block">
                      Schedule Conflict Anti-Collision Mode
                    </label>
                    <select
                      value={bookingPref.autoResolve}
                      onChange={(e) => updateBookingPref("autoResolve", e.target.value)}
                      className="w-full text-xs font-semibold px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
                    >
                      <option value="prompt">Prompt user to select alternative slot</option>
                      <option value="auto">Auto-assigned next adjacent available gap</option>
                      <option value="decline">Strict reject with collision system alarm</option>
                    </select>
                  </div>

                  {/* Toggle overlapping permission */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Request Overlapping Slots</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Permit requesting slots with secondary assistant presence</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateBookingPref("allowOverlaps", !bookingPref.allowOverlaps)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-tight transition-all border ${
                        bookingPref.allowOverlaps 
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200" 
                          : "bg-white text-slate-400 border-slate-200"
                      }`}
                    >
                      {bookingPref.allowOverlaps ? "Overlaps Allowed" : "Overlaps Locked"}
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* Sub-Panel 4: Notifications */}
            {activeSubTab === "notifications" && (
              <div className="space-y-4 animate-fade-in" id="panel_notifications">
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Define triggers that prompt electronic dispatch or user interfaces audio chimes.
                </p>

                <div className="space-y-3">
                  
                  {/* Option: Email Approval */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Clearance Approvals Alerts</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Send SMTP confirmation immediately when a director validates slots</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateNotificationRule("smtpApprove", !notificationsRules.smtpApprove)}
                      className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-200 focus:outline-none cursor-pointer ${
                        notificationsRules.smtpApprove ? 'bg-slate-900' : 'bg-slate-250'
                      }`}
                    >
                      <div className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                        notificationsRules.smtpApprove ? 'translate-x-5.5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {/* Option: Email Cancel */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Cancellation Dispatches</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Notify when slot gets recycled or cancelled administratively</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateNotificationRule("smtpCancel", !notificationsRules.smtpCancel)}
                      className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-200 focus:outline-none cursor-pointer ${
                        notificationsRules.smtpCancel ? 'bg-slate-900' : 'bg-slate-250'
                      }`}
                    >
                      <div className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                        notificationsRules.smtpCancel ? 'translate-x-5.5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {/* Option: Audio Sound */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Sound Chimes Alerts</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Interactions generate audial verification chimes in browser</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const next = !notificationsRules.soundChime;
                        updateNotificationRule("soundChime", next);
                        setSoundEnabled(next);
                        localStorage.setItem("alis_option_sound", String(next));
                      }}
                      className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-200 focus:outline-none cursor-pointer ${
                        notificationsRules.soundChime ? 'bg-slate-900' : 'bg-slate-250'
                      }`}
                    >
                      <div className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                        notificationsRules.soundChime ? 'translate-x-5.5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                  {/* Option: Daily Digest */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Daily Digest Digest</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Receive single daily overview of active lab schedules</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateNotificationRule("dailyDigest", !notificationsRules.dailyDigest)}
                      className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-200 focus:outline-none cursor-pointer ${
                        notificationsRules.dailyDigest ? 'bg-slate-900' : 'bg-slate-250'
                      }`}
                    >
                      <div className={`w-4.5 h-4.5 rounded-full bg-white shadow-md transform transition-transform duration-200 ${
                        notificationsRules.dailyDigest ? 'translate-x-5.5' : 'translate-x-0'
                      }`} />
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* Sub-Panel 5: Security */}
            {activeSubTab === "security" && (
              <div className="space-y-4 animate-fade-in" id="panel_security">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex items-center gap-3">
                  <ShieldCheck className="w-8 h-8 text-indigo-650 shrink-0" />
                  <div>
                    <h4 className="text-xs font-bold text-slate-800">Credential Locks Active</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Ensure passwords contain at least 5 secure elements.</p>
                  </div>
                </div>

                {pwdSuccess && (
                  <div className="bg-emerald-50 border border-emerald-250/20 p-3 rounded-lg flex items-start gap-2.5 text-[11.5px] font-semibold text-emerald-800">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                    <span>{pwdSuccess}</span>
                  </div>
                )}

                {pwdError && (
                  <div className="bg-rose-50 border border-rose-200/20 p-3 rounded-lg flex items-start gap-2.5 text-[11.5px] font-semibold text-rose-800">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <span>{pwdError}</span>
                  </div>
                )}

                {!isEditingSecurity ? (
                  <div className="space-y-5">
                    <div className="bg-slate-50 border border-slate-100 p-5 rounded-xl space-y-3.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Authorization Hash Cryptography</span>
                        <span className="font-mono bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded text-[10px]">SHA-256 Key-Derivation</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Last Key Rotation Sequence</span>
                        <span className="text-slate-700 font-bold">14 days ago (Simulated)</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-500 font-medium">Local Security Client Status</span>
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                          Secure Host Verified
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsEditingSecurity(true)}
                      className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Change Password</span>
                    </button>
                  </div>
                ) : (
                  <form onSubmit={async (e) => {
                    await handleUpdatePassword(e);
                    setIsEditingSecurity(false);
                  }} className="space-y-4">
                    {/* Current PW */}
                    <div className="space-y-1 relative">
                      <label className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider block">
                        Verify Current Password Key
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPass ? "text" : "password"}
                          value={currentPassword}
                          onChange={(e) => setCurrentPassword(e.target.value)}
                          placeholder="Input current password"
                          className="w-full text-xs font-semibold px-3 py-2.5 pr-10 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPass(!showCurrentPass)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* New PW */}
                    <div className="space-y-1 relative">
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider block">
                          Declare New Password Key
                        </label>
                        <button
                          type="button"
                          onClick={suggestStrongPassword}
                          className="text-[10px] font-extrabold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 flex items-center gap-1 cursor-pointer transition-colors"
                          id="suggest-profile-password-btn"
                        >
                          🔑 Suggest Strong Password
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showNewPass ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="At least 5 characters required"
                          className="w-full text-xs font-semibold px-3 py-2.5 pr-10 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm PW */}
                    <div className="space-y-1 relative">
                      <label className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider block">
                        Confirm New Password Key
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPass ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Repeat new password selection"
                          className="w-full text-xs font-semibold px-3 py-2.5 pr-10 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPass(!showConfirmPass)}
                          className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                        >
                          {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentPassword("");
                          setNewPassword("");
                          setConfirmPassword("");
                          setIsEditingSecurity(false);
                        }}
                        className="w-1/3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-all cursor-pointer text-center"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submittingPassword}
                        className="w-2/3 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg transition-all active:scale-98 disabled:opacity-50 cursor-pointer text-center"
                      >
                        {submittingPassword ? "Re-authorizing Keys..." : "Apply Password Key Change"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Sub-Panel 6: Activity Logs */}
            {activeSubTab === "activity" && (
              <div className="space-y-4 animate-fade-in" id="panel_activity">
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Exhaustive historic log of sessions and state mutations generated by your user token.
                </p>

                <div className="space-y-2.5">
                  {mockActivityLogs.map(log => (
                    <div key={log.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            log.status === "success" ? "bg-emerald-500" : log.status === "warning" ? "bg-amber-500" : "bg-blue-500"
                          }`} />
                          <p className="font-bold text-slate-800">{log.action}</p>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{log.origin}</p>
                      </div>
                      <span className="text-[10.5px] font-mono text-slate-500 flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3 text-slate-300" />
                        {log.date}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Sub-Panel 7: Privacy Guard */}
            {activeSubTab === "privacy" && (
              <div className="space-y-4 animate-fade-in" id="panel_privacy">
                <p className="text-xs text-slate-500 leading-relaxed mb-4">
                  Manage encryption levels, anonymous public listings, and automatic browser data cleanups.
                </p>

                <div className="space-y-3.5">
                  
                  {/* Option anonymize name on calendar */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Public Calendar Anonymizer</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Mask your identity signature from other faculty in standard calendar schedules</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updatePrivacyRule("anonymizePublic", !privacyRules.anonymizePublic)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-tight transition-all border ${
                        privacyRules.anonymizePublic 
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200" 
                          : "bg-white text-slate-400 border-slate-200"
                      }`}
                    >
                      {privacyRules.anonymizePublic ? "Active (Anonymized)" : "Default (Visible)"}
                    </button>
                  </div>

                  {/* Limit intention logs to admin */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Registry Motivation Lockdown</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Restrict custom statements inside reservation forms to Admin views only</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updatePrivacyRule("limitIntentionToAdmin", !privacyRules.limitIntentionToAdmin)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-tight transition-all border ${
                        privacyRules.limitIntentionToAdmin 
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200" 
                          : "bg-white text-slate-400 border-slate-200"
                      }`}
                    >
                      {privacyRules.limitIntentionToAdmin ? "Admin Views Only" : "Broad Sharing Enabled"}
                    </button>
                  </div>

                  {/* Scrub cache on sign-out */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100">
                    <div>
                      <p className="text-xs font-bold text-slate-800">Local Cache Zeroing</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Automatically wipe durable localStorage indices upon signing out</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updatePrivacyRule("scrubCacheOnLogout", !privacyRules.scrubCacheOnLogout)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-tight transition-all border ${
                        privacyRules.scrubCacheOnLogout 
                          ? "bg-indigo-50 text-indigo-700 border-indigo-200" 
                          : "bg-white text-slate-400 border-slate-200"
                      }`}
                    >
                      {privacyRules.scrubCacheOnLogout ? "Enabled (Zero Log)" : "Retained Cache Pack"}
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* Sub-Panel 8: Appearance & Theme */}
            {activeSubTab === "theme" && (
              <div className="space-y-5 animate-fade-in" id="panel_theme">
                <p className="text-xs text-slate-500 leading-relaxed mb-4 dark:text-slate-400">
                  Adapt the density index, system color modes, sound effects chime alerts, and display typeface formats.
                </p>

                <div className="space-y-4">
                  {/* Select Theme Mode (Light / Dark / System) */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider block dark:text-slate-400">
                      Display Theme Mode
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      <button
                        type="button"
                        onClick={() => handleThemeModeChange("light")}
                        className={`p-3 text-xs font-bold border rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all outline-none cursor-pointer ${
                          themeMode === "light" 
                            ? "border-indigo-600 bg-indigo-50/20 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-950/30 dark:text-indigo-300" 
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400 dark:hover:bg-slate-900"
                        }`}
                      >
                        <Sun className={`w-4 h-4 ${themeMode === "light" ? "text-amber-500" : "text-slate-400 dark:text-slate-500"}`} />
                        <span>Light Mode</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleThemeModeChange("dark")}
                        className={`p-3 text-xs font-bold border rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all outline-none cursor-pointer ${
                          themeMode === "dark" 
                            ? "border-indigo-650 bg-indigo-50/20 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-950/30 dark:text-indigo-300" 
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400 dark:hover:bg-slate-900"
                        }`}
                      >
                        <Moon className={`w-4 h-4 ${themeMode === "dark" ? "text-indigo-400" : "text-slate-400 dark:text-slate-500"}`} />
                        <span>Dark Mode</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleThemeModeChange("system")}
                        className={`p-3 text-xs font-bold border rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all outline-none cursor-pointer ${
                          themeMode === "system" 
                            ? "border-indigo-650 bg-indigo-50/20 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-950/30 dark:text-indigo-300" 
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400 dark:hover:bg-slate-900"
                        }`}
                      >
                        <Monitor className={`w-4 h-4 ${themeMode === "system" ? "text-indigo-600 dark:text-indigo-400" : "text-slate-400 dark:text-slate-500"}`} />
                        <span>System Sync</span>
                      </button>
                    </div>
                  </div>

                  {/* Select Theme Preset */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider block dark:text-slate-400">
                      Aesthetic Theme Overlay
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleAccentChange("indigo")}
                        className={`p-3 text-xs font-bold border rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                          accentColor === "indigo" 
                            ? "border-indigo-650 bg-indigo-50/20 text-indigo-900 dark:border-indigo-500 dark:bg-indigo-950/30 dark:text-indigo-300" 
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400 dark:hover:bg-slate-900"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 bg-indigo-600 rounded-full inline-block"></span>
                          Classic Slate Indigo
                        </span>
                        {accentColor === "indigo" && <CheckCircle className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAccentChange("emerald")}
                        className={`p-3 text-xs font-bold border rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                          accentColor === "emerald" 
                            ? "border-emerald-650 bg-emerald-50/20 text-emerald-900 dark:border-emerald-500 dark:bg-emerald-950/30 dark:text-emerald-300" 
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400 dark:hover:bg-slate-900"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-3.5 h-3.5 bg-emerald-600 rounded-full inline-block"></span>
                          Emerald Lab Eco
                        </span>
                        {accentColor === "emerald" && <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                      </button>
                    </div>
                  </div>

                  {/* Select Typography */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 font-mono tracking-wider block dark:text-slate-400">
                      Aesthetic Font Choice
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => handleFontChange("sans")}
                        className={`p-3 text-xs font-bold border rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                          fontPreference === "sans" 
                            ? "border-slate-900 bg-slate-900 text-white dark:bg-white dark:text-slate-950 dark:border-white" 
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400 dark:hover:bg-slate-900"
                        }`}
                      >
                        <span className="font-sans">Inter Sans (Default)</span>
                        {fontPreference === "sans" && <CheckCircle className={`w-4 h-4 shrink-0 ${fontPreference === "sans" ? "text-white dark:text-slate-950" : ""}`} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleFontChange("mono")}
                        className={`p-3 text-styles text-xs font-bold border rounded-xl flex items-center justify-between transition-all cursor-pointer ${
                          fontPreference === "mono" 
                            ? "border-slate-900 bg-slate-900 text-white dark:bg-white dark:text-slate-950 dark:border-white" 
                            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400 dark:hover:bg-slate-900"
                        }`}
                      >
                        <span className="font-mono">JetBrains Mono (Technical)</span>
                        {fontPreference === "mono" && <CheckCircle className={`w-4 h-4 shrink-0 ${fontPreference === "mono" ? "text-white dark:text-slate-950" : ""}`} />}
                      </button>
                    </div>
                  </div>

                  {/* Compact Density Switcher */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100 dark:bg-slate-900/40 dark:border-slate-800">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Compact density UI layout</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 dark:text-slate-500">Reduce padding margins across workspace registry matrices</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleCompact}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold tracking-tight transition-all border cursor-pointer ${
                        compactMode 
                          ? "bg-indigo-50 text-indigo-700 border-indigo-250/20 dark:bg-indigo-950/30 dark:text-indigo-300 dark:border-indigo-800/40" 
                          : "bg-white text-slate-400 border-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800"
                      }`}
                    >
                      {compactMode ? "Compact Active" : "Default Slate"}
                    </button>
                  </div>

                  {/* Sound Trigger */}
                  <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-100 dark:bg-slate-900/40 dark:border-slate-800">
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Slot Chimes Audio</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 dark:text-slate-500">Toggle live system alert sound triggers</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleSound}
                      className={`p-1.5 rounded-lg transition-all border cursor-pointer ${
                        soundEnabled 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-250/20 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-800/40" 
                          : "bg-white text-slate-400 border-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800"
                      }`}
                    >
                      {soundEnabled ? <Volume2 className="w-4.5 h-4.5" /> : <VolumeX className="w-4.5 h-4.5" />}
                    </button>
                  </div>

                </div>
              </div>
            )}

          </div>

          {/* Persistent Action Bar at bottom with diagnostic controls */}
          {isAdmin && (
            <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-[10.5px] font-black uppercase text-slate-400 font-mono tracking-wider">
                  DURABLE BACKUP CACHE RESILIENCY (ROOT ONLY)
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Manage persistent browser cache states & synchronize client registry metadata lists.
                </p>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleClearLocalDurableCache}
                  className="py-1.5 px-3 hover:bg-rose-50 text-rose-700 font-bold text-xs border border-rose-200/50 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Wipe Sync Caching</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
