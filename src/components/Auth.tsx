import React, { useState } from "react";
import { Lock, Mail, Building2, User as UserIcon, ShieldAlert } from "lucide-react";

interface AuthProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export default function Auth({ onLoginSuccess }: AuthProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("");
  const [role, setRole] = useState<"teacher" | "admin">("teacher");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleQuickFill = (emailVal: string) => {
    setEmail(emailVal);
    setPassword("password");
    setErrorMsg("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const payload = isLogin 
      ? { email, password } 
      : { name, email, password, department, role };

    const endpoint = isLogin ? "/api/auth/login" : "/api/auth/register";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Authentication failed. Clear details and try again.");
      }

      // Success
      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setErrorMsg(err.message || "Server unreachable. Please verify network status.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-2xl shadow-xl border border-gray-100 transition-all">
        {/* App Title */}
        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-50 text-indigo-600 mb-3">
            <Building2 className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">
            Academic Lab Portal
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {isLogin 
              ? "Sign in to reserve equipment & workspace slots" 
              : "Register your teacher credentials to reserve laboratory slots"}
          </p>
        </div>

        {errorMsg && (
          <div className="flex gap-2 items-center p-3.5 text-xs text-red-700 bg-red-50 border border-red-100 rounded-xl animate-shake">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              {/* Full Name */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                    <UserIcon className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                    placeholder="e.g., Alex Mercer"
                  />
                </div>
              </div>

              {/* Department */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1.5">
                  Academic Department
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                    <Building2 className="w-4 h-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                    placeholder="e.g., Bioengineering"
                  />
                </div>
              </div>

              {/* Account Role */}
              <div>
                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1.5">
                  Academic Role
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole("teacher")}
                    className={`py-2 px-3 h-12 rounded-xl text-xs font-bold text-center border transition-all relative flex flex-col items-center justify-center gap-0.5 cursor-pointer overflow-hidden ${
                      role === "teacher"
                        ? "bg-indigo-50 border-indigo-600 text-indigo-700 shadow-sm ring-1 ring-indigo-500"
                        : "bg-white text-gray-500 border-gray-200 hover:bg-slate-50 hover:text-gray-700"
                    }`}
                  >
                    <span>Teacher</span>
                    {role === "teacher" && (
                      <span className="text-[9px] font-medium text-indigo-500 scale-95 origin-center">Requires Approval</span>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole("admin")}
                    className={`py-2 px-3 h-12 rounded-xl text-xs font-bold text-center border transition-all relative flex flex-col items-center justify-center gap-0.5 cursor-pointer overflow-hidden ${
                      role === "admin"
                        ? "bg-amber-50 border-amber-600 text-amber-900 shadow-sm ring-1 ring-amber-500"
                        : "bg-white text-gray-500 border-gray-200 hover:bg-slate-50 hover:text-gray-700"
                    }`}
                  >
                    <span>Faculty Coordinator</span>
                    {role === "admin" && (
                      <span className="text-[9px] font-medium text-amber-700 scale-95 origin-center">Privileged Role</span>
                    )}
                  </button>
                </div>

                {/* Role Specific Approval and Verification Issues */}
                <div className="mt-2.5 transition-all duration-300">
                  {role === "teacher" ? (
                    <div className="text-blue-800 bg-blue-50/50 border border-blue-100 p-2.5 rounded-xl flex items-start gap-2 text-[11px] font-medium leading-relaxed">
                      <span className="text-base leading-none">ℹ️</span>
                      <span>
                        <strong>Reservation Flow Policy:</strong> Under updated compliance standards, Teacher reservations are initialized as <strong>Pending</strong>. You cannot access the lab or equipment until a Coordinator approves your request.
                      </span>
                    </div>
                  ) : (
                    <div className="text-amber-900 bg-amber-50/50 border border-amber-150 p-2.5 rounded-xl flex items-start gap-2 text-[11px] font-medium leading-relaxed animate-pulse">
                      <span className="text-base leading-none">⚠️</span>
                      <span>
                        <strong>Coordinator Notice:</strong> Coordinator status receives total override capabilities. All registrations must be manually audited and verified by department administrators.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Email Address */}
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                <Mail className="w-4 h-4" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                placeholder="e.g., teacher@lab.edu"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider block mb-1.5">
              Secure Password
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400">
                <Lock className="w-4 h-4" />
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-bold rounded-xl text-sm shadow-md hover:shadow-lg transition-all"
          >
            {loading ? "Authenticating session..." : isLogin ? "Access System Portal" : "Complete Registration"}
          </button>
        </form>

         {/* Quick Fill Testing Console */}
        <div className="pt-6 border-t border-gray-150">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center mb-2.5">
            Quick-Fill Simulator Profiles
          </p>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={() => handleQuickFill("teacher@lab.edu")}
              className={`px-2.5 py-2.5 text-left border rounded-lg transition-all cursor-pointer relative ${
                email === "teacher@lab.edu"
                  ? "border-indigo-600 bg-indigo-50/70 shadow-sm ring-1 ring-indigo-500"
                  : "border-gray-200 hover:bg-slate-50"
              }`}
            >
              <div className={`text-xs font-bold ${
                email === "teacher@lab.edu" ? "text-indigo-900" : "text-gray-800"
              }`}>
                Teacher Account
              </div>
              <div className={`text-[9.5px] font-mono truncate ${
                email === "teacher@lab.edu" ? "text-indigo-600" : "text-gray-500"
              }`}>
                teacher@lab.edu
              </div>
              {email === "teacher@lab.edu" && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-indigo-600 rounded-full" />
              )}
            </button>
            <button
              onClick={() => handleQuickFill("rougebandit114@gmail.com")}
              className={`px-2.5 py-2.5 text-left border rounded-lg transition-all cursor-pointer relative ${
                email === "rougebandit114@gmail.com"
                  ? "border-amber-600 bg-amber-50/40 shadow-sm ring-1 ring-amber-500"
                  : "border-gray-200 hover:bg-slate-50"
              }`}
            >
              <div className="text-xs font-bold flex justify-between items-center">
                <span className={email === "rougebandit114@gmail.com" ? "text-amber-900" : "text-indigo-900"}>
                  Faculty Admin
                </span>
                <span className={`px-1 py-0.2 text-[8px] font-semibold rounded ${
                  email === "rougebandit114@gmail.com" ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700"
                }`}>
                  Owner
                </span>
              </div>
              <div className={`text-[9.5px] font-mono truncate ${
                email === "rougebandit114@gmail.com" ? "text-amber-700" : "text-indigo-600"
              }`}>
                rougebandit114@gmail.com
              </div>
              {email === "rougebandit114@gmail.com" && (
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-600 rounded-full" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
