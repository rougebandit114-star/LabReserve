import React, { useState, useMemo, useEffect } from "react";
import { Booking, Resource, AnalyticsSummary, BookingStatus } from "../types";
import { 
  FileSpreadsheet, 
  FileDown, 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  BarChart4, 
  TrendingUp, 
  Clock, 
  Activity, 
  Layers, 
  Calendar,
  Users,
  Search,
  Check,
  X,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Trash2,
  RefreshCw,
  UserCheck,
  UserPlus
} from "lucide-react";
import { exportBookingsToExcel, exportBookingsToPDF } from "../utils/reports";

interface AdminDashboardProps {
  user: any;
  token: string;
  resources: Resource[];
  bookings: Booking[];
  analytics: AnalyticsSummary | null;
  onApproveBooking: (id: string, action: "approve" | "reject" | "pending") => Promise<void>;
  onApproveGroupBooking?: (groupId: string, action: "approve" | "reject" | "pending") => Promise<void>;
  onRefresh: () => void;
  initialTab?: "metrics" | "users" | "resources";
}

export default function AdminDashboard({
  user,
  token,
  resources,
  bookings,
  analytics,
  onApproveBooking,
  onApproveGroupBooking,
  onRefresh,
  initialTab = "metrics",
}: AdminDashboardProps) {
  const [adminSearch, setAdminSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  // Tab state for navigation
  const [activeTab, setActiveTab] = useState<"metrics" | "users" | "resources">(initialTab);

  React.useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  const [usersList, setUsersList] = useState<any[]>([]);

  // Resources administration states
  const [editingRes, setEditingRes] = useState<Resource | null>(null);
  const [resName, setResName] = useState("");
  const [resType, setResType] = useState<"workspace" | "equipment">("workspace");
  const [resCategory, setResCategory] = useState("");
  const [resLocation, setResLocation] = useState("");
  const [resDesc, setResDesc] = useState("");
  const [resImage, setResImage] = useState("");
  const [resCapacity, setResCapacity] = useState<number>(1);
  const [resAvailStart, setResAvailStart] = useState("08:00");
  const [resAvailEnd, setResAvailEnd] = useState("20:00");

  const [isAddingRes, setIsAddingRes] = useState(false);
  const [newResId, setNewResId] = useState("");
  const [resError, setResError] = useState("");
  const [resLoading, setResLoading] = useState(false);
  const [deleteResConfirmId, setDeleteResConfirmId] = useState<string | null>(null);

  const resetResForm = () => {
    setEditingRes(null);
    setIsAddingRes(false);
    setNewResId("");
    setResName("");
    setResType("workspace");
    setResCategory("");
    setResLocation("");
    setResDesc("");
    setResImage("");
    setResCapacity(1);
    setResAvailStart("08:00");
    setResAvailEnd("20:00");
    setResError("");
  };

  const startEditRes = (res: Resource) => {
    setEditingRes(res);
    setIsAddingRes(false);
    setResName(res.name);
    setResType(res.type);
    setResCategory(res.category);
    setResLocation(res.location);
    setResDesc(res.description);
    setResImage(res.image);
    setResCapacity(res.capacity || 1);
    setResAvailStart(res.availStart || "08:00");
    setResAvailEnd(res.availEnd || "20:00");
    setResError("");
  };

  const handleSaveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resName.trim() || !resCategory.trim() || !resLocation.trim()) {
      setResError("Required fields (Name, Category, and Location) must be provided.");
      return;
    }

    setResLoading(true);
    setResError("");

    const payload = {
      name: resName,
      type: resType,
      category: resCategory,
      description: resDesc,
      location: resLocation,
      image: resImage || "https://images.unsplash.com/photo-1579154204601-01588f351167?w=500&auto=format&fit=crop&q=60",
      capacity: Number(resCapacity),
      availStart: resAvailStart,
      availEnd: resAvailEnd
    };

    try {
      let resp;
      if (editingRes) {
        resp = await fetch(`/api/resources/${editingRes.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        });
      } else {
        const payloadWithId = {
          ...payload,
          id: newResId.trim() || "RES-" + Math.random().toString(36).substring(2, 7).toUpperCase()
        };
        resp = await fetch("/api/resources", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(payloadWithId)
        });
      }

      if (resp.ok) {
        triggerSuccessMsg(editingRes ? "Resource specifications updated." : "New resource registered successfully.");
        resetResForm();
        onRefresh();
      } else {
        const err = await resp.json();
        setResError(err.error || "Failed to commit resources update.");
      }
    } catch (err) {
      setResError("Error communicating with inventory management service.");
    } finally {
      setResLoading(false);
    }
  };

  const handleDeleteResource = async (resId: string) => {
    setResLoading(true);
    setResError("");
    try {
      const resp = await fetch(`/api/resources/${resId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (resp.ok) {
        triggerSuccessMsg("Resource successfully deleted and associated bookings canceled.");
        setDeleteResConfirmId(null);
        onRefresh();
      } else {
        const err = await resp.json();
        setResError(err.error || "Cannot delete that resource.");
      }
    } catch (err) {
      setResError("Error committing delete operation.");
    } finally {
      setResLoading(false);
    }
  };
  const [usersLoading, setUsersLoading] = useState(false);
  const [userError, setUserError] = useState("");
  const [userSuccessMessage, setUserSuccessMessage] = useState("");
  const [pwChangeUserId, setPwChangeUserId] = useState<string | null>(null);
  const [newPasswordVal, setNewPasswordVal] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Administration user addition form states
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [createUserName, setCreateUserName] = useState("");
  const [createUserEmail, setCreateUserEmail] = useState("");
  const [createUserPassword, setCreateUserPassword] = useState("");
  const [createUserDept, setCreateUserDept] = useState("");
  const [createUserRole, setCreateUserRole] = useState<"teacher" | "admin">("teacher");
  const [createUserLoading, setCreateUserLoading] = useState(false);

  const pendingBookings = useMemo(() => {
    return bookings.filter(b => b.status === "pending");
  }, [bookings]);

  const queueBookings = useMemo(() => {
    const groups: { [groupId: string]: Booking[] } = {};
    const singles: Booking[] = [];

    bookings.forEach(b => {
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

    return consolidated.sort((a, b) => {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (a.status !== "pending" && b.status === "pending") return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [bookings]);

  const groupedPendingBookings = useMemo(() => {
    const groups: { [groupId: string]: Booking[] } = {};
    bookings.forEach(b => {
      if (b.status === "pending" && b.groupId) {
        if (!groups[b.groupId]) {
          groups[b.groupId] = [];
        }
        groups[b.groupId].push(b);
      }
    });

    return Object.entries(groups).map(([groupId, list]) => {
      const sortedList = [...list].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      return {
        groupId,
        bookings: sortedList,
        userName: sortedList[0]?.userName || "Unknown",
        userEmail: sortedList[0]?.userEmail || "",
        resourceId: sortedList[0]?.resourceId || "",
        resourceName: sortedList[0]?.resourceName || "",
        startTime: sortedList[0]?.startTime || "",
        endTime: sortedList[0]?.endTime || "",
        purpose: sortedList[0]?.purpose || "",
        createdAt: sortedList[0]?.createdAt || sortedList[0]?.date || "",
      };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [bookings]);

  useEffect(() => {
    if (activeTab === "users") {
      fetchUsers();
    }
  }, [activeTab]);

  const fetchUsers = async () => {
    setUsersLoading(true);
    setUserError("");
    try {
      const resp = await fetch("/api/admin/users", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (resp.ok) {
        const data = await resp.json();
        setUsersList(data);
        try {
          localStorage.setItem("lab_backup_users", JSON.stringify(data));
        } catch (e) {
          console.error("Failed to backup users list:", e);
        }
      } else {
        const err = await resp.json();
        setUserError(err.error || "Cannot load users list.");
      }
    } catch (e) {
      setUserError("Failed to communicate with administration panel backend.");
    } finally {
      setUsersLoading(false);
    }
  };

  const triggerSuccessMsg = (msg: string) => {
    setUserSuccessMessage(msg);
    setTimeout(() => {
      setUserSuccessMessage("");
    }, 4000);
  };

  const handleToggleFreeze = async (userId: string) => {
    setUserError("");
    try {
      const resp = await fetch(`/api/admin/users/${userId}/toggle-freeze`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (resp.ok) {
        const result = await resp.json();
        triggerSuccessMsg(result.isFrozen ? "Account frozen successfully." : "Account reactivated successfully.");
        fetchUsers();
        onRefresh();
      } else {
        const err = await resp.json();
        setUserError(err.error || "Action failed.");
      }
    } catch (e) {
      setUserError("Failed to communicate action.");
    }
  };

  const handleSavePassword = async (userId: string) => {
    if (!newPasswordVal.trim()) {
      setUserError("Password cannot be empty.");
      return;
    }
    setUserError("");
    try {
      const resp = await fetch(`/api/admin/users/${userId}/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ newPassword: newPasswordVal })
      });
      if (resp.ok) {
        setPwChangeUserId(null);
        setNewPasswordVal("");
        triggerSuccessMsg("User password changed successfully.");
        fetchUsers();
      } else {
        const err = await resp.json();
        setUserError(err.error || "Password change failed.");
      }
    } catch (e) {
      setUserError("Credentials action failed.");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    setUserError("");
    try {
      const resp = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (resp.ok) {
        setDeleteConfirmId(null);
        triggerSuccessMsg("Account deleted from ledger and all scheduled reservations canceled.");
        fetchUsers();
        onRefresh();
      } else {
        const err = await resp.json();
        setUserError(err.error || "Failed to delete user.");
      }
    } catch (e) {
      setUserError("Failed to send deletion request.");
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUserName.trim() || !createUserEmail.trim() || !createUserPassword.trim() || !createUserDept.trim()) {
      setUserError("All fields are required to create a user account.");
      return;
    }
    setUserError("");
    setCreateUserLoading(true);

    try {
      const resp = await fetch("/api/admin/users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: createUserName,
          email: createUserEmail,
          password: createUserPassword,
          department: createUserDept,
          role: createUserRole
        })
      });

      if (resp.ok) {
        triggerSuccessMsg(`Successfully created new user account for ${createUserName}.`);
        setCreateUserName("");
        setCreateUserEmail("");
        setCreateUserPassword("");
        setCreateUserDept("");
        setCreateUserRole("teacher");
        setIsAddingUser(false);
        fetchUsers();
      } else {
        const err = await resp.json();
        setUserError(err.error || "Failed to create user account.");
      }
    } catch (err) {
      setUserError("Failed to communicate with authorization server.");
    } finally {
      setCreateUserLoading(false);
    }
  };

  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      const matchSearch = k => String(k || "").toLowerCase().includes(adminSearch.toLowerCase());
      const matchText = matchSearch(b.id) || 
                        matchSearch(b.resourceName) || 
                        matchSearch(b.userName) || 
                        matchSearch(b.userEmail) || 
                        matchSearch(b.purpose);
      const matchStatus = statusFilter === "All" || b.status === statusFilter.toLowerCase();
      return matchText && matchStatus;
    });
  }, [bookings, adminSearch, statusFilter]);

  // Handle report downloads containing current filtered data
  const handleExportPDF = () => {
    exportBookingsToPDF(filteredBookings, `Lab_Usage_Report_${statusFilter}`);
  };

  const handleExportExcel = () => {
    exportBookingsToExcel(filteredBookings, `Lab_Usage_Report_${statusFilter}`);
  };

  // Find max value in hourly distribution to normalize local SVG bar graphs
  const maxHourlyCount = useMemo(() => {
    if (!analytics || !analytics.hourlyDistribution) return 1;
    const vals = Object.values(analytics.hourlyDistribution);
    return Math.max(...vals, 1);
  }, [analytics]);

  const maxUtilizationRate = useMemo(() => {
    if (!analytics || !analytics.resourceUtilizationList) return 1;
    const rates = analytics.resourceUtilizationList.map(r => r.bookingCount);
    return Math.max(...rates, 1);
  }, [analytics]);

  return (
    <div className="font-sans space-y-6">
      {/* Welcome banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-100 p-6 rounded-2xl border border-gray-200">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2 font-display">
            <Activity className="w-5.5 h-5.5 text-blue-600 animate-pulse" />
            Administrative Analytics Console
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Signed in as lab compliance officer: <strong className="text-gray-800">{user.name}</strong> ({user.department}).
          </p>
        </div>

        {/* Global Export Options */}
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportPDF}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer"
          >
            <FileDown className="w-4 h-4 text-rose-400" />
            <span>Export Bookings PDF</span>
          </button>
          <button
            onClick={handleExportExcel}
            className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all shadow cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Export Bookings Excel</span>
          </button>
        </div>
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-gray-200">
        {activeTab === "metrics" && (
          <button
            onClick={() => setActiveTab("metrics")}
            className="pb-3 px-6 text-xs sm:text-sm font-bold border-b-2 border-blue-600 text-blue-600 transition-all cursor-pointer flex items-center gap-2"
          >
            <Activity className="w-4 h-4 text-blue-500" />
            <span>Usage Metrics & Slots Registry</span>
          </button>
        )}

        {activeTab === "users" && (
          <button
            onClick={() => setActiveTab("users")}
            className="pb-3 px-6 text-xs sm:text-sm font-bold border-b-2 border-blue-600 text-blue-600 transition-all cursor-pointer flex items-center gap-2"
          >
            <Users className="w-4 h-4 text-blue-500" />
            <span>User Registry & Access Controls</span>
            {usersList.length > 0 && (
              <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {usersList.length}
              </span>
            )}
          </button>
        )}

        {activeTab === "resources" && (
          <button
            onClick={() => setActiveTab("resources")}
            className="pb-3 px-6 text-xs sm:text-sm font-bold border-b-2 border-blue-600 text-blue-600 transition-all cursor-pointer flex items-center gap-2"
          >
            <Layers className="w-4 h-4 text-blue-500" />
            <span>Resource Inventory & Timetables</span>
            {resources.length > 0 && (
              <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                {resources.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* Inline Notifications */}
      {userError && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{userError}</span>
        </div>
      )}

      {userSuccessMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{userSuccessMessage}</span>
        </div>
      )}

      {activeTab === "users" && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 mb-5">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2 font-display">
                  <Users className="w-4.5 h-4.5 text-blue-500" />
                  Registered System Users Register
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Update passwords, toggle account freezes, and terminate authorized accounts.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setIsAddingUser(!isAddingUser)}
                  className={`px-3 py-1.5 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer ${
                    isAddingUser
                      ? "bg-slate-700 text-white hover:bg-slate-800"
                      : "bg-blue-600 text-white hover:bg-blue-750 shadow-sm"
                  }`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>{isAddingUser ? "Dismiss Form" : "Create User Account"}</span>
                </button>
                <button
                  type="button"
                  onClick={fetchUsers}
                  disabled={usersLoading}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${usersLoading ? "animate-spin" : ""}`} />
                  <span>Refresh List</span>
                </button>
              </div>
            </div>

            {isAddingUser && (
              <form onSubmit={handleCreateUser} className="mb-6 p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                <div className="flex items-center justify-between border-b border-gray-250 pb-2 mb-2">
                  <h4 className="text-xs font-bold text-slate-750 uppercase tracking-wider flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-blue-500" />
                    Register New Account
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAddingUser(false)}
                    className="text-gray-400 hover:text-gray-600 font-bold text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Name field */}
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Jane Doe"
                      value={createUserName}
                      onChange={(e) => setCreateUserName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                    />
                  </div>

                  {/* Email field */}
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                      Academic Email
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="e.g. jdoe@lab.edu"
                      value={createUserEmail}
                      onChange={(e) => setCreateUserEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                    />
                  </div>

                  {/* Password field */}
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                      Initial Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="At least 6 characters"
                      value={createUserPassword}
                      onChange={(e) => setCreateUserPassword(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                    />
                  </div>

                  {/* Department field */}
                  <div>
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                      College Department
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Bioengineering"
                      value={createUserDept}
                      onChange={(e) => setCreateUserDept(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 font-sans"
                    />
                  </div>

                  {/* Role Selection */}
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                      System Clearance Role
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setCreateUserRole("teacher")}
                        className={`py-2 px-3 border rounded-xl text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans ${
                          createUserRole === "teacher"
                            ? "bg-blue-50 border-blue-600 text-blue-700 font-extrabold shadow-2xs"
                            : "bg-white text-gray-500 border-gray-200 hover:bg-slate-50"
                        }`}
                      >
                        Teacher
                      </button>
                      <button
                        type="button"
                        onClick={() => setCreateUserRole("admin")}
                        className={`py-2 px-3 border rounded-xl text-xs font-bold text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer font-sans ${
                          createUserRole === "admin"
                            ? "bg-blue-50 border-blue-600 text-blue-700 font-extrabold shadow-2xs"
                            : "bg-white text-gray-500 border-gray-200 hover:bg-slate-50"
                        }`}
                      >
                        Coordinator / Admin
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-gray-200 font-sans">
                  <button
                    type="button"
                    onClick={() => setIsAddingUser(false)}
                    className="px-3 py-1.5 bg-slate-250 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                  >
                    Dismiss
                  </button>
                  <button
                    type="submit"
                    disabled={createUserLoading}
                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-2xs cursor-pointer flex items-center gap-1.5"
                  >
                    {createUserLoading ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <UserPlus className="w-3.5 h-3.5" />
                    )}
                    <span>{createUserLoading ? "Registering..." : "Save Account"}</span>
                  </button>
                </div>
              </form>
            )}

            {usersLoading && usersList.length === 0 ? (
              <div className="py-12 text-center text-gray-400 flex flex-col items-center justify-center gap-1.5">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                <span className="text-xs font-medium">Fetching secure records...</span>
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-100 rounded-2xl">
                <table className="w-full text-left border-collapse min-w-[700px] text-xs font-sans">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-150 text-gray-500 uppercase font-extrabold tracking-wider">
                      <th className="p-3">User</th>
                      <th className="p-3">Department</th>
                      <th className="p-3">Account Level</th>
                      <th className="p-3">Compliance Status</th>
                      <th className="p-3 text-right">Administrative Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersList.map((u) => {
                      const isCurrentUser = u.email === user.email;
                      const isFrozen = !!u.isFrozen;
                      
                      return (
                        <tr key={u.id} className="border-b border-gray-100 last:border-0 hover:bg-slate-50/50">
                          {/* User Column */}
                          <td className="p-3">
                            <div className="flex items-center gap-2.5">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs uppercase ${u.role === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-700'}`}>
                                {u.name.charAt(0)}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 flex items-center gap-1.5">
                                  {u.name}
                                  {isCurrentUser && (
                                    <span className="px-1.5 py-0.2 bg-blue-50 text-blue-600 border border-blue-100 text-[8.5px] font-extrabold rounded uppercase tracking-wider">YOU</span>
                                  )}
                                </span>
                                <div className="text-[10px] text-gray-400 font-mono">{u.email}</div>
                              </div>
                            </div>
                          </td>

                          {/* Department Column */}
                          <td className="p-3 text-slate-700 font-medium">
                            {u.department}
                          </td>

                          {/* Role Column */}
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                              u.role === "admin" 
                                ? "bg-amber-100 text-amber-800 border border-amber-200" 
                                : "bg-blue-50 text-blue-700 border border-blue-100"
                            }`}>
                              {u.role}
                            </span>
                          </td>

                          {/* Status Column */}
                          <td className="p-3">
                            <span className={`px-2.5 py-0.5 rounded-full font-bold text-[9px] uppercase inline-flex items-center gap-1 ${
                              isFrozen 
                                ? "bg-red-105 text-red-800 border border-red-200" 
                                : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${isFrozen ? "bg-red-500 animate-pulse" : "bg-emerald-500"}`} />
                              {isFrozen ? "FROZEN (Blocked)" : "ACTIVE"}
                            </span>
                          </td>

                          {/* Action Controls */}
                          <td className="p-3 text-right">
                            <div className="flex justify-end items-center gap-2">
                              {/* Open Password resets */}
                              {pwChangeUserId === u.id ? (
                                <div className="flex items-center gap-1.5 bg-slate-50 p-1 border border-slate-200 rounded-lg animate-fadeIn">
                                  <input
                                    type="text"
                                    placeholder="New Password"
                                    value={newPasswordVal}
                                    onChange={(e) => setNewPasswordVal(e.target.value)}
                                    className="px-2 py-1 bg-white border border-gray-200 rounded text-xs w-32 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                  <button
                                    onClick={() => handleSavePassword(u.id)}
                                    className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer"
                                    title="Save Credentials Update"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => { setPwChangeUserId(null); setNewPasswordVal(""); }}
                                    className="p-1 bg-slate-200 text-slate-600 rounded hover:bg-slate-300 cursor-pointer"
                                    title="Cancel"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => { setPwChangeUserId(u.id); setDeleteConfirmId(null); }}
                                  className="px-2.5 py-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 hover:border-indigo-150 rounded-lg text-[10.5px] font-bold text-slate-500 transition-colors flex items-center gap-1 cursor-pointer"
                                  title="Change password"
                                >
                                  <KeyRound className="w-3 h-3 text-indigo-500" />
                                  <span>Password</span>
                                </button>
                              )}

                              {/* Toggle freeze status, admins cannot self-freeze */}
                              {!isCurrentUser && (
                                <button
                                  onClick={() => handleToggleFreeze(u.id)}
                                  className={`px-2.5 py-1.5 border rounded-lg text-[10.5px] font-bold transition-colors flex items-center gap-1 cursor-pointer ${
                                    isFrozen 
                                      ? "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100" 
                                      : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                                  }`}
                                  title={isFrozen ? "Reactivate Account" : "Freeze Account"}
                                >
                                  {isFrozen ? <Unlock className="w-3.5 h-3.5 text-rose-500" /> : <Lock className="w-3.5 h-3.5 text-slate-500" />}
                                  <span>{isFrozen ? "Unfreeze" : "Freeze"}</span>
                                </button>
                              )}

                              {/* Delete option with inline confirmation, admins cannot delete themselves */}
                              {!isCurrentUser && (
                                deleteConfirmId === u.id ? (
                                  <div className="flex items-center gap-1.5 bg-red-50 p-1 border border-red-200 rounded-lg animate-fadeIn text-[10.5px]">
                                    <span className="text-red-850 font-bold px-1">Clear Bookings & Delete?</span>
                                    <button
                                      onClick={() => handleDeleteUser(u.id)}
                                      className="px-2 py-1 bg-red-650 hover:bg-red-700 text-white rounded font-bold cursor-pointer"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      onClick={() => setDeleteConfirmId(null)}
                                      className="px-2 py-1 bg-slate-200 text-slate-650 rounded hover:bg-slate-300 font-bold cursor-pointer"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => { setDeleteConfirmId(u.id); setPwChangeUserId(null); }}
                                    className="p-1.5 bg-slate-50 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-150 rounded-lg transition-colors cursor-pointer"
                                    title="Delete Account permanently"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* RESOURCE INVENTORY & TIMETABLE TAB */}
      {/* ========================================================================= */}
      {activeTab === "resources" && (
        <div className="space-y-6">
          {/* Header Action Card */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 mb-5">
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2 font-display">
                  <Layers className="w-4.5 h-4.5 text-blue-500" />
                  Resource Specifications, Timetables & Quantities
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Register workspaces, hoods, and equipment units, designate operating timetables, and restrict simultaneous slot availability.
                </p>
              </div>
              
              {!editingRes && !isAddingRes && (
                <button
                  type="button"
                  onClick={() => setIsAddingRes(true)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow cursor-pointer self-start sm:self-auto"
                >
                  <span>+ Add New Resource</span>
                </button>
              )}
            </div>

            {resError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-xl flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                <span>{resError}</span>
              </div>
            )}

            {/* FORM CONTAINER (ADD / EDIT) */}
            {(isAddingRes || editingRes) && (
              <form onSubmit={handleSaveResource} className="bg-slate-50 p-5 rounded-2xl border border-gray-200 space-y-4 mb-6">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 pb-2 border-b border-gray-200">
                  {editingRes ? `Edit Specifications: ${editingRes.id}` : "Register New Resource Item"}
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* ID Field (Only editable when adding) */}
                  {!editingRes && (
                    <div className="space-y-1">
                      <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Resource ID *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. WS-05, EQ-06"
                        value={newResId}
                        onChange={(e) => setNewResId(e.target.value)}
                        className="w-full p-2.5 bg-white border border-gray-200 text-xs rounded-xl focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Resource Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Biosafety Hood B"
                      value={resName}
                      onChange={(e) => setResName(e.target.value)}
                      className="w-full p-2.5 bg-white border border-gray-200 text-xs rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Resource Type *</label>
                    <select
                      value={resType}
                      onChange={(e: any) => setResType(e.target.value)}
                      className="w-full p-2.5 bg-white border border-gray-200 text-xs rounded-xl focus:border-blue-500 focus:outline-none"
                    >
                      <option value="workspace">Workspace / Bench Station</option>
                      <option value="equipment">Specialist Equipment</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Category *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Biotechnology, Fume Hood, Additive Mfg"
                      value={resCategory}
                      onChange={(e) => setResCategory(e.target.value)}
                      className="w-full p-2.5 bg-white border border-gray-200 text-xs rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Location *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Wing B, Room 304"
                      value={resLocation}
                      onChange={(e) => setResLocation(e.target.value)}
                      className="w-full p-2.5 bg-white border border-gray-200 text-xs rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Resource Units / Capacity *</label>
                    <input
                      type="number"
                      required
                      min={1}
                      max={100}
                      placeholder="e.g. 1"
                      value={resCapacity}
                      onChange={(e) => setResCapacity(Number(e.target.value))}
                      className="w-full p-2.5 bg-white border border-gray-200 text-xs rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                    <span className="text-[10px] text-gray-400 block mt-0.5 leading-snug">
                      Specifies quantity of physical units or concurrent researchers allowed.
                    </span>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Timetable: Start Availability Hour</label>
                    <select
                      value={resAvailStart}
                      onChange={(e) => setResAvailStart(e.target.value)}
                      className="w-full p-2.5 bg-white border border-gray-200 text-xs rounded-xl focus:border-blue-500 focus:outline-none"
                    >
                      {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0") + ":00").map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Timetable: End Availability Hour</label>
                    <select
                      value={resAvailEnd}
                      onChange={(e) => setResAvailEnd(e.target.value)}
                      className="w-full p-2.5 bg-white border border-gray-200 text-xs rounded-xl focus:border-blue-500 focus:outline-none"
                    >
                      {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0") + ":00").map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Image URL</label>
                    <input
                      type="url"
                      placeholder="https://images.unsplash.com/photo-..."
                      value={resImage}
                      onChange={(e) => setResImage(e.target.value)}
                      className="w-full p-2.5 bg-white border border-gray-200 text-xs rounded-xl focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1 md:col-span-2">
                    <label className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Resource Description</label>
                    <textarea
                      placeholder="Provide helpful operating instructions, checklist guidelines, or compliance standards..."
                      value={resDesc}
                      onChange={(e) => setResDesc(e.target.value)}
                      className="w-full h-20 p-2.5 bg-white border border-gray-200 text-xs rounded-xl focus:border-blue-500 focus:outline-none resize-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={resetResForm}
                    className="px-4 py-2 bg-white hover:bg-slate-100 border border-gray-250 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-750 text-white font-bold text-xs rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    {resLoading ? "Saving specifications..." : "Save Specifications"}
                  </button>
                </div>
              </form>
            )}

            {/* RESOURCE LIST GRID */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 pb-2 border-b border-gray-100">
                <span>Active Lab Resource Directory</span>
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 text-[10px] rounded-full">{resources.length}</span>
              </h4>

              {resources.length === 0 ? (
                <div className="p-8 text-center text-gray-400 italic">No resources registered in systems.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {resources.map(res => (
                    <div key={res.id} className="bg-white p-4 rounded-2xl border border-gray-150 shadow-sm flex flex-col justify-between hover:shadow-md transition-all">
                      <div>
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <span className="bg-slate-100 font-mono text-[10px] font-extrabold text-slate-600 px-2 py-0.5 rounded-md shrink-0">
                            {res.id}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase shrink-0 ${
                            res.type === "workspace" ? "bg-indigo-50 text-indigo-700 border border-indigo-150" : "bg-purple-50 text-purple-700 border border-purple-150"
                          }`}>
                            {res.type === "workspace" ? "Bench Station" : "Equipment Unit"}
                          </span>
                        </div>

                        <div className="flex gap-3 mb-3">
                          <img
                            src={res.image || "https://images.unsplash.com/photo-1579154204601-01588f351167?w=500&auto=format&fit=crop&q=60"}
                            alt={res.name}
                            referrerPolicy="no-referrer"
                            className="w-14 h-14 rounded-xl object-cover shrink-0 border border-gray-100"
                          />
                          <div>
                            <h5 className="text-xs font-extrabold text-slate-800 line-clamp-1">{res.name}</h5>
                            <p className="text-[10px] font-semibold text-gray-500 mt-0.5">{res.category}</p>
                            <p className="text-[10px] text-gray-400 mt-1 line-clamp-2">{res.description || "No description provided."}</p>
                          </div>
                        </div>

                        {/* Resource Properties Row */}
                        <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2.5 rounded-xl text-[10px] font-sans border border-gray-100 mb-3">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                            <span>Timetable: <strong className="text-slate-800">{res.availStart || "08:00"} - {res.availEnd || "20:00"}</strong></span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Layers className="w-3.5 h-3.5 text-blue-500" />
                            <span>Amount: <strong className="text-slate-800">{res.capacity || 1} {res.capacity === 1 ? "unit" : "units"}</strong></span>
                          </div>
                        </div>

                        {/* Location Details */}
                        <div className="text-[10px] text-gray-400 font-semibold mb-2 flex items-center gap-1">
                          <span>📍 Location:</span>
                          <span className="text-slate-700">{res.location}</span>
                        </div>
                      </div>

                      {/* Controls Footer */}
                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2 mt-2">
                        {deleteResConfirmId === res.id ? (
                          <div className="flex items-center gap-2 w-full justify-between bg-red-50 p-1.5 rounded-lg border border-red-200">
                            <span className="text-[10px] text-red-800 font-bold">Cancel and delete?</span>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleDeleteResource(res.id)}
                                className="px-2 py-1 bg-red-600 text-white rounded font-bold text-[9px] cursor-pointer"
                              >
                                Yes, Delete
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteResConfirmId(null)}
                                className="px-2 py-1 bg-white text-slate-700 rounded font-bold text-[9px] border border-gray-250 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => startEditRes(res)}
                              className="px-3 py-1.5 text-blue-600 hover:bg-blue-50 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all border border-blue-200"
                            >
                              <span>Edit Specifications</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteResConfirmId(res.id)}
                              className="px-3 py-1.5 text-red-600 hover:bg-red-50 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all border border-red-200"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* STANDARD ANALYTICS / METRICS TAB */}
      {/* ========================================================================= */}
      {activeTab === "metrics" && (
        <>
          {/* Metrics Cards row */}
          {analytics && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                  Total Reservations
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-extrabold text-slate-900">{analytics.totalBookings}</span>
                  <span className="text-xs font-semibold text-emerald-600 flex items-center">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    Live Feed
                  </span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                  Active Allocations
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-extrabold text-slate-900">{analytics.activeBookings}</span>
                  <span className="text-xs font-semibold text-blue-500">Scheduled slots</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                  Cancellations Percentage
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-extrabold text-rose-600">{analytics.cancellationRate}%</span>
                  <span className="text-xs text-gray-400 font-medium">Of overall tickets</span>
                </div>
              </div>

              <div className="bg-white p-5 rounded-2xl border border-gray-150 shadow-sm">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                  Resources Idle Limit
                </div>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-2xl font-extrabold text-blue-600">{analytics.unutilizedCount}</span>
                  <span className="text-xs text-gray-400 font-medium font-sans">Zero allocation counts</span>
                </div>
              </div>
            </div>
          )}

          {/* Global Administrative Reservation Queue & Compliance Hub */}
          {bookings.length > 0 && (
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-4.5 border-b border-gray-200 text-slate-800 gap-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-5.2 h-5.2 text-blue-600 shrink-0" />
                  <div>
                    <h3 className="text-sm font-extrabold uppercase tracking-wide font-display">
                      Global Administrative Reservation Queue ({bookings.length})
                    </h3>
                    <p className="text-[10px] text-gray-400 font-sans">
                      Verify slot allocations, coordinate equipment availability, and approve active researcher clearances.
                    </p>
                  </div>
                </div>
                
                {/* Visual Status Legend */}
                <div className="flex flex-wrap items-center gap-3 text-[10px] font-sans font-bold">
                  <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                    <span className="w-1.5 h-1.5 bg-amber-500 rounded-full inline-block animate-pulse" />
                    Pending: {bookings.filter(b => b.status === "pending").length}
                  </span>
                  <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block" />
                    Approved: {bookings.filter(b => b.status === "approved").length}
                  </span>
                  <span className="flex items-center gap-1.5 text-red-500 bg-red-50/50 px-2 py-0.5 rounded-full border border-red-100">
                    <span className="w-1.5 h-1.5 bg-red-400 rounded-full inline-block" />
                    Canceled: {bookings.filter(b => b.status === "canceled").length}
                  </span>
                </div>
              </div>

              {/* Group Approval Hub for Multi-Day Bookings */}
              {groupedPendingBookings.length > 0 && (
                <div className="mb-6 bg-indigo-50/40 border border-indigo-200/80 p-5 rounded-2xl animate-in fade-in slide-in-from-top-4 duration-200" id="grouped-clearance-hub">
                  <div className="flex items-center gap-2 mb-3.5">
                    <Calendar className="w-5 h-5 text-indigo-700 animate-pulse" />
                    <div>
                      <h4 className="text-xs font-extrabold uppercase tracking-widest text-indigo-950">
                        ⚡ Multi-Day Group Clearance Queue ({groupedPendingBookings.length} groups)
                      </h4>
                      <p className="text-[10px] text-indigo-650 font-medium">
                        These reservations were booked across multiple dates. Approve all requested days in one click.
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {groupedPendingBookings.map((gp) => (
                      <div 
                        key={gp.groupId}
                        className="bg-white p-4.5 rounded-xl border border-indigo-150 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-5 transition-all hover:shadow-sm"
                        id={`group-card-${gp.groupId}`}
                      >
                        <div className="space-y-2.5 max-w-2xl">
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            <span className="text-[10px] bg-indigo-100 text-indigo-800 font-mono font-black px-2 py-0.5 rounded-md uppercase">
                              Group ID: {gp.groupId}
                            </span>
                            <span className="text-xs font-extrabold text-slate-850 font-display">
                              {gp.resourceName}
                            </span>
                          </div>

                          <div className="text-xs space-y-1 text-slate-650">
                            <p>
                              <span className="text-gray-400 font-medium">Researcher: </span>
                              <strong className="text-slate-800">{gp.userName}</strong>{" "}
                              <span className="text-gray-400 font-mono text-[10.5px]">({gp.userEmail})</span>
                            </p>
                            <p>
                              <span className="text-gray-400 font-medium font-sans">Reserved Hours: </span>
                              <strong className="text-slate-850 font-mono">{gp.startTime} - {gp.endTime}</strong>
                            </p>
                            {gp.purpose && (
                              <p className="p-2.5 bg-slate-50 border border-slate-100 text-[10.5px] rounded-lg text-slate-700 italic leading-relaxed font-sans">
                                "{gp.purpose}"
                              </p>
                            )}
                          </div>

                          {/* List of Scheduled Days */}
                          <div className="space-y-1.5">
                            <span className="block text-[10px] font-extrabold text-indigo-900 uppercase tracking-wider">
                              Scheduled Days ({gp.bookings.length} dates)
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {gp.bookings.map((b) => (
                                <span 
                                  key={b.id}
                                  className="text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-100 px-2.5 py-0.8 rounded-lg"
                                  title={`Booking ID: ${b.id}`}
                                >
                                  {b.date}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Interactive One-Click Group Clearance Controls */}
                        <div className="flex sm:flex-row md:flex-col lg:flex-row items-center gap-2 shrink-0 self-start md:self-auto w-full md:w-auto">
                          <button
                            type="button"
                            onClick={async () => {
                              if (onApproveGroupBooking) {
                                await onApproveGroupBooking(gp.groupId, "approve");
                              } else {
                                // Fallback: approve sequentially
                                for (const b of gp.bookings) {
                                  await onApproveBooking(b.id, "approve");
                                }
                              }
                            }}
                            className="flex-1 md:flex-none px-4 py-2.5 bg-emerald-600 hover:bg-emerald-750 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-xs hover:scale-[1.01] active:scale-100 transition-all cursor-pointer whitespace-nowrap"
                            title="Clear all reserved dates in one click"
                          >
                            <Check className="w-4 h-4" />
                            <span>Clear All Days</span>
                          </button>

                          <button
                            type="button"
                            onClick={async () => {
                              if (onApproveGroupBooking) {
                                await onApproveGroupBooking(gp.groupId, "reject");
                              } else {
                                // Fallback: reject sequentially
                                for (const b of gp.bookings) {
                                  await onApproveBooking(b.id, "reject");
                                }
                              }
                            }}
                            className="flex-1 md:flex-none px-4 py-2.5 bg-white hover:bg-rose-50 text-rose-650 border border-rose-250 hover:border-rose-350 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 hover:scale-[1.01] active:scale-100 transition-all cursor-pointer whitespace-nowrap"
                            title="Decline all reserved dates in one click"
                          >
                            <X className="w-4 h-4 text-rose-500" />
                            <span>Decline All Days</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-[460px] overflow-y-auto pr-1">
                {queueBookings.map(b => {
                  const isApproved = b.status === "approved";
                  const isPending = b.status === "pending";
                  const isCanceled = b.status === "canceled";

                  return (
                    <div
                      key={b.id}
                      className={`relative p-4 rounded-xl border-2 shadow-xs space-y-3.5 transition-all flex flex-col justify-between ${
                        isCanceled 
                          ? "bg-rose-50/15 border-rose-500 hover:border-rose-600" 
                          : isPending 
                          ? "bg-amber-50/15 border-amber-400 hover:border-amber-500"
                          : "bg-emerald-50/15 border-emerald-500 hover:border-emerald-600"
                      }`}
                    >
                      <div>
                        {/* Header line */}
                        <div className="flex justify-between items-start gap-2">
                          <div>
                            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase ${
                              isApproved 
                                ? "bg-emerald-105 text-emerald-800" 
                                : isPending 
                                ? "bg-amber-105 text-amber-800 animate-pulse"
                                : "bg-rose-105 text-rose-800"
                            }`}>
                              {b.isGroup ? `GROUP: ${b.id}` : `ID: ${b.id}`}
                            </span>
                            <h4 className="text-xs font-bold text-slate-800 mt-2 font-display pr-16">{b.resourceName}</h4>
                          </div>

                          {/* Dynamic Top Right Status Message Indicator */}
                          <div className="absolute top-4 right-4 shrink-0 font-display">
                            {isPending && (
                              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-350 px-2 py-0.5 rounded-md shadow-xs">
                                Pending
                              </span>
                            )}
                            {isApproved && (
                              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-emerald-100 text-emerald-900 border border-emerald-350 px-2 py-0.5 rounded-md shadow-xs">
                                Approved
                              </span>
                            )}
                            {isCanceled && (
                              <span className="text-[10px] font-extrabold uppercase tracking-wider bg-rose-100 text-rose-900 border border-rose-350 px-2 py-0.5 rounded-md shadow-xs">
                                Cancel
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Direct scheduling dates info */}
                        <div className="space-y-1.5 mt-2.5 text-xs text-slate-500 font-sans">
                          {b.isGroup ? (
                            <div className="space-y-1">
                              <span className="text-[10px] uppercase font-extrabold text-indigo-900 tracking-wider">Scheduled {b.dates.length} Days:</span>
                              <div className="flex flex-wrap gap-1">
                                {b.dates.map(date => (
                                  <span key={date} className="text-[9.5px] font-mono font-bold bg-indigo-50/70 text-indigo-700 px-1.5 py-0.2 rounded border border-indigo-100/50">
                                    {date}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : (
                            <p className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              <span>Scheduled: <strong className="text-slate-700">{b.dates[0]}</strong></span>
                            </p>
                          )}
                        </div>

                        {/* Teacher Details and reason */}
                        <div className="text-xs space-y-1.5 font-sans text-gray-600 mt-2.5">
                          <p>
                            <span className="text-gray-400">Teacher: </span>
                            <strong className="text-slate-800">{b.userName}</strong>{" "}
                            <span className="text-gray-400 font-mono text-[10.5px]">({b.userEmail})</span>
                          </p>
                          <p>
                            <span className="text-gray-400">Hours: </span>
                            <strong className="text-slate-850 font-mono">{b.startTime} - {b.endTime}</strong>
                          </p>
                          {b.purpose && (
                            <p className="p-2.5 bg-white border border-gray-100 text-[10.5px] rounded-lg text-slate-700 italic leading-relaxed">
                              "{b.purpose}"
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Dynamic Action Suite: Toggle Between Approve (Pending status), Unapprove (Approved status), and Cancel */}
                      <div className="flex gap-1.5 text-[11px] pt-3 flex-wrap border-t border-gray-100">
                        {isPending && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (b.isGroup && onApproveGroupBooking) {
                                await onApproveGroupBooking(b.id, "approve");
                              } else {
                                await onApproveBooking(b.bookingId, "approve");
                              }
                            }}
                            className="flex-1 py-1.8 px-3 rounded-lg font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs hover:scale-[1.01] active:scale-100"
                            title="Approve Reservation Slot"
                          >
                            <Check className="w-4 h-4" />
                            <span>Approve Ticket</span>
                          </button>
                        )}

                        {isApproved && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (b.isGroup && onApproveGroupBooking) {
                                await onApproveGroupBooking(b.id, "pending");
                              } else {
                                await onApproveBooking(b.bookingId, "pending");
                              }
                            }}
                            className="flex-1 py-1.8 px-3 rounded-lg font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-amber-500 hover:bg-amber-600 text-white shadow-xs hover:scale-[1.01] active:scale-100"
                            title="Revert Reservation Back to Pending Status"
                          >
                            <Clock className="w-4 h-4" />
                            <span>Unapprove Ticket</span>
                          </button>
                        )}

                        {!isCanceled && (
                          <button
                            type="button"
                            onClick={async () => {
                              if (b.isGroup && onApproveGroupBooking) {
                                await onApproveGroupBooking(b.id, "reject");
                              } else {
                                await onApproveBooking(b.bookingId, "reject");
                              }
                            }}
                            className="flex-1 py-1.8 px-3 rounded-lg font-extrabold flex items-center justify-center gap-1.5 transition-all cursor-pointer bg-rose-600 hover:bg-rose-700 text-white shadow-xs hover:scale-[1.01] active:scale-100"
                            title="Reject/Cancel Reservation Slot"
                          >
                            <X className="w-4 h-4" />
                            <span>Cancel Ticket</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Visual Analytics Charts Section (Custom Crafted SVG) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Peak Hours custom interactive graph */}
            <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2 font-display">
                    <Clock className="w-4.5 h-4.5 text-blue-500" />
                    Laboratory Peak Hours Matrix
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Busiest hours computed across reservation starts on active tickets.
                  </p>
                </div>
                <span className="text-[11px] text-gray-400 font-bold bg-gray-100 px-2 py-0.5 rounded">
                  08:00 - 20:00
                </span>
              </div>

              <div className="mt-5 space-y-3.5">
                {analytics && Object.keys(analytics.hourlyDistribution).map(hour => {
                  const count = analytics.hourlyDistribution[hour];
                  const percent = maxHourlyCount > 0 ? (count / maxHourlyCount) * 100 : 0;
                  const isPeak = count === maxHourlyCount && count > 0;

                  return (
                    <div key={hour} className="flex items-center gap-4 text-xs font-sans">
                      <span className="w-12 text-gray-500 font-bold text-right shrink-0">{hour}</span>
                      <div className="flex-1 bg-gray-50 h-6.5 rounded-lg overflow-hidden relative border border-gray-100 flex items-center">
                        <div
                          className={`h-full transition-all duration-500 ${
                            isPeak 
                              ? "bg-gradient-to-r from-rose-500 to-amber-500" 
                              : percent > 50 
                              ? "bg-blue-600" 
                              : "bg-blue-400"
                          }`}
                          style={{ width: `${percent}%`, minWidth: count > 0 ? "4%" : "0%" }}
                        />
                        
                        {/* Floating counts inside horizontal tracks */}
                        <span className="absolute left-3 text-[10.5px] font-extrabold text-slate-800 z-10">
                          {count > 0 ? `${count} ${count === 1 ? 'reservation' : 'reservations'}` : "no bookings"}
                        </span>
                      </div>
                      {isPeak && (
                        <span className="px-2 py-0.2 bg-rose-50 text-rose-600 font-extrabold text-[9px] rounded-md tracking-wider shrink-0 animate-pulse">
                          PEAK HOUR
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Resources Popularity Indicator */}
            <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
              <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                <div>
                  <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-2 font-display">
                    <Layers className="w-4.5 h-4.5 text-blue-500" />
                    Resource Utilization Index
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Relative utilization coefficients calculated based on operational hour reserves.
                  </p>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                {analytics && analytics.resourceUtilizationList.map(item => {
                  const isHigh = item.utilizationRate > 50;

                  return (
                    <div key={item.id} className="space-y-1 text-xs">
                      <div className="flex justify-between items-center text-slate-800">
                        <span className="font-bold flex items-center gap-1.5">
                          <span className="text-[9.5px] font-mono bg-slate-100 px-1.5 py-0.2 rounded text-gray-500">
                            {item.id}
                          </span>
                          {item.name}
                        </span>
                        <span className="font-mono text-gray-500 font-extrabold">
                          {item.bookingCount} bookings ({item.utilizationRate}%)
                        </span>
                      </div>

                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden flex">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            isHigh ? "bg-emerald-500" : "bg-blue-600"
                          }`}
                          style={{ width: `${item.utilizationRate}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Comprehensive database listings */}
          <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm">
            <h3 className="text-sm font-extrabold uppercase tracking-wider text-slate-800 pb-3.5 border-b border-gray-100 mb-5">
              General Reservations Registry Ledger
            </h3>

            {/* Grid Filters */}
            <div className="flex flex-col sm:flex-row gap-3.5 mb-5">
              {/* Registry search query */}
              <div className="relative flex-1">
                <input
                  type="text"
                  value={adminSearch}
                  onChange={(e) => setAdminSearch(e.target.value)}
                  placeholder="Search registries by ID, Teacher, Department, Apparatus, or Scope..."
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs placeholder-gray-400 focus:outline-none"
                />
                <span className="absolute left-3 top-2.5 text-gray-400">
                  <Search className="w-4 h-4" />
                </span>
              </div>

              {/* Status selector */}
              <div className="flex bg-gray-50 p-1 border border-gray-200 rounded-xl shrink-0 text-xs">
                {["All", "Approved", "Pending", "Canceled"].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1 font-bold rounded-lg cursor-pointer ${
                      statusFilter === st ? "bg-white text-slate-950 shadow-sm" : "text-gray-500 hover:text-slate-800"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Desktop Table Registry */}
            <div className="overflow-x-auto border border-gray-100 rounded-2xl">
              <table className="w-full text-left border-collapse min-w-[800px] text-xs font-sans">
                <thead>
                  <tr className="bg-slate-50 border-b border-gray-150 text-gray-500 uppercase font-extrabold tracking-wider">
                    <th className="p-3">Ticket ID</th>
                    <th className="p-3">Equipment / Bench</th>
                    <th className="p-3">Reserved By</th>
                    <th className="p-3">Date Details</th>
                    <th className="p-3">Hours</th>
                    <th className="p-3">Brief Purpose</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">Override Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredBookings.map(b => (
                    <tr key={b.id} className="border-b border-gray-100 last:border-0 hover:bg-slate-50/50">
                      <td className="p-3 font-mono font-bold text-gray-400">{b.id}</td>
                      <td className="p-3">
                        <div className="font-bold text-gray-800">{b.resourceName}</div>
                        <span className="text-[10px] text-gray-400 uppercase font-bold">{b.resourceType}</span>
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-slate-700">{b.userName}</div>
                        <div className="text-[10px] text-gray-400 font-mono">{b.userEmail}</div>
                      </td>
                      <td className="p-3 text-slate-700 font-bold">{b.date}</td>
                      <td className="p-3 text-slate-700 font-medium font-mono">{b.startTime} - {b.endTime}</td>
                      <td className="p-3 max-w-[150px] truncate text-gray-500" title={b.purpose}>
                        {b.purpose}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                            b.status === "approved"
                              ? "bg-emerald-100 text-emerald-800"
                              : b.status === "pending"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-red-100 text-red-800"
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          {/* Approve option */}
                          <button
                            type="button"
                            onClick={() => onApproveBooking(b.id, "approve")}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                              b.status === "approved"
                                ? "bg-emerald-600 text-white shadow-xs"
                                : "border border-emerald-250 hover:bg-emerald-50 text-emerald-700 bg-white"
                            }`}
                          >
                            <Check className="w-3 h-3" />
                            <span>Approve</span>
                          </button>

                          {/* Pending option */}
                          <button
                            type="button"
                            onClick={() => onApproveBooking(b.id, "pending")}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                              b.status === "pending"
                                ? "bg-amber-500 text-white shadow-xs"
                                : "border border-amber-250 hover:bg-amber-50 text-amber-700 bg-white"
                            }`}
                          >
                            <Clock className="w-3 h-3" />
                            <span>Pending</span>
                          </button>

                          {/* Reject / Cancel option */}
                          <button
                            type="button"
                            onClick={() => onApproveBooking(b.id, "reject")}
                            className={`px-2 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-all ${
                              b.status === "canceled"
                                ? "bg-rose-600 text-white shadow-xs"
                                : "border border-rose-250 hover:bg-rose-50 text-rose-700 bg-white"
                            }`}
                          >
                            <X className="w-3 h-3" />
                            <span>Cancel</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredBookings.length === 0 && (
              <div className="p-12 text-center text-gray-400 italic">
                No matching reservation records located in lab directories.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
