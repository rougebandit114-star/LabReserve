import { useState, useMemo, useEffect, MouseEvent, FormEvent } from "react";
import { EmailLog, Booking, User } from "../types";
import { 
  Mail, 
  Send, 
  Clock, 
  Inbox, 
  Sparkles, 
  CheckCircle, 
  XCircle, 
  PenSquare, 
  Check, 
  Eye, 
  EyeOff, 
  ArrowLeftRight 
} from "lucide-react";

interface SimulatedEmailsProps {
  emails: EmailLog[];
  onRefresh: () => void;
  currentUser: User;
  token: string;
  bookings?: Booking[];
  onApproveBooking?: (id: string, action: "approve" | "reject") => Promise<void>;
  selectedEmailId?: string | null;
  onClearSelectedEmailId?: () => void;
}

export default function SimulatedEmails({ 
  emails, 
  onRefresh, 
  currentUser,
  token,
  bookings,
  onApproveBooking,
  selectedEmailId,
  onClearSelectedEmailId
}: SimulatedEmailsProps) {
  const [activeTab, setActiveTab] = useState<"inbox" | "sent" | "compose">("inbox");
  const [processingBookingId, setProcessingBookingId] = useState<string | null>(null);
  const [processingReadId, setProcessingReadId] = useState<string | null>(null);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);

  // Compose Email states
  const [composeTo, setComposeTo] = useState("");
  const [composeSubject, setComposeSubject] = useState("");
  const [composeBody, setComposeBody] = useState("");
  const [composeLoading, setComposeLoading] = useState(false);
  const [composeSuccess, setComposeSuccess] = useState("");
  const [composeError, setComposeError] = useState("");

  const handleAction = async (bookingId: string, action: "approve" | "reject") => {
    if (!onApproveBooking) return;
    setProcessingBookingId(bookingId);
    try {
      await onApproveBooking(bookingId, action);
      onRefresh();
    } catch (err) {
      console.error("Action error in SMTP console:", err);
    } finally {
      setProcessingBookingId(null);
    }
  };

  const handleMarkAsRead = async (emailId: string, e?: MouseEvent) => {
    if (e) {
      e.stopPropagation(); // prevent collapsing/expanding toggle
    }
    setProcessingReadId(emailId);
    try {
      const response = await fetch(`/api/emails/${emailId}/read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        }
      });
      if (response.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error("Error marking email as read:", err);
    } finally {
      setProcessingReadId(null);
    }
  };

  const handleMarkAllAsRead = async () => {
    const unreadInboxIds = emails
      .filter(e => (e.toEmail === currentUser.email || !e.fromEmail || e.fromEmail !== currentUser.email) && !e.isRead)
      .map(e => e.id);
    if (unreadInboxIds.length === 0) return;

    try {
      const response = await fetch(`/api/emails/mark-all-read`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ids: unreadInboxIds })
      });
      if (response.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error("Error bulk marking emails as read:", err);
    }
  };

  const toggleExpandEmail = async (email: EmailLog) => {
    if (expandedEmailId === email.id) {
      setExpandedEmailId(null);
    } else {
      setExpandedEmailId(email.id);
      if (!email.isRead && email.toEmail === currentUser.email) {
        await handleMarkAsRead(email.id);
      }
    }
  };

  // Trigger tab switch and auto-expand when selectedEmailId is updated
  useEffect(() => {
    if (selectedEmailId) {
      // Find the email
      const match = emails.find(e => e.id === selectedEmailId);
      if (match) {
        // Is it inbox or sent?
        if (match.toEmail === currentUser.email) {
          setActiveTab("inbox");
        } else if (match.fromEmail === currentUser.email) {
          setActiveTab("sent");
        }
        setExpandedEmailId(selectedEmailId);
        
        // Mark as read immediately if it's incoming and unread
        if (!match.isRead && match.toEmail === currentUser.email) {
          handleMarkAsRead(match.id);
        }

        // Scroll to that element or container
        setTimeout(() => {
          const el = document.getElementById(`email-item-${selectedEmailId}`);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "center" });
          }
        }, 300);
        
        // Clear selectedEmailId so user can select/toggle other emails freely
        if (onClearSelectedEmailId) {
          onClearSelectedEmailId();
        }
      }
    }
  }, [selectedEmailId, emails, currentUser.email, onClearSelectedEmailId]);

  const handleSendEmail = async (e: FormEvent) => {
    e.preventDefault();
    setComposeError("");
    setComposeSuccess("");
    
    if (!composeTo.trim() || !composeSubject.trim() || !composeBody.trim()) {
      setComposeError("Please fill in all email compose fields.");
      return;
    }

    setComposeLoading(true);
    try {
      const response = await fetch("/api/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          toEmail: composeTo.trim(),
          subject: composeSubject,
          body: composeBody
        })
      });

      const data = await response.json();
      if (response.ok) {
        setComposeSuccess(`Email successfully dispatched via local relay to "${composeTo.trim()}".`);
        setComposeTo("");
        setComposeSubject("");
        setComposeBody("");
        onRefresh();
        // Shift tab to Sent to view the email
        setTimeout(() => {
          setActiveTab("sent");
          setComposeSuccess("");
        }, 1500);
      } else {
        setComposeError(data.error || "Failed to dispatch simulated mail.");
      }
    } catch (err) {
      setComposeError("Failed to communicate with authorization server.");
    } finally {
      setComposeLoading(false);
    }
  };

  // Divide emails into Inbox & Sent categories
  const inboxEmails = useMemo(() => {
    return emails.filter(e => e.toEmail === currentUser.email || !e.fromEmail || e.fromEmail !== currentUser.email);
  }, [emails, currentUser.email]);

  const sentEmails = useMemo(() => {
    return emails.filter(e => e.fromEmail === currentUser.email);
  }, [emails, currentUser.email]);

  // Sort lists
  const sortedInbox = useMemo(() => {
    return [...inboxEmails].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }, [inboxEmails]);

  const sortedSent = useMemo(() => {
    return [...sentEmails].sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }, [sentEmails]);

  const displayedEmails = activeTab === "inbox" ? sortedInbox : sortedSent;

  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-150 shadow-sm font-sans" id="email-outbox-simulator">
      {/* Upper header action desk */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-5 border-b border-gray-100">
        <div>
          <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Mail className="w-5 h-5 text-indigo-600 animate-pulse" />
            Academic Mail Terminal
          </h3>
          <p className="text-xs text-gray-400 mt-1">
            Simulate secure academic notifications, clearance triggers, and dispatch messages directly between workspace accounts.
          </p>
        </div>

        <button
          onClick={onRefresh}
          className="self-start lg:self-auto px-4 py-2 border border-gray-200 rounded-xl hover:bg-slate-50 text-xs font-bold text-gray-700 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          Force Sync Daemon
        </button>
      </div>

      {/* Tabs and Navigation Row */}
      <div className="flex items-center justify-between border-b border-gray-150 mt-4 pb-0">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab("inbox")}
            className={`px-4 py-2 text-xs font-bold transition-all relative flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === "inbox"
                ? "border-b-indigo-600 text-indigo-600 font-extrabold"
                : "border-b-transparent text-gray-400 hover:text-gray-700"
            }`}
          >
            <Inbox className="w-4 h-4" />
            <span>Inbox</span>
            {inboxEmails.filter(e => !e.isRead).length > 0 && (
              <span className="ml-1 bg-indigo-600 text-white font-bold text-[9px] px-1.5 py-0.2 rounded-full">
                {inboxEmails.filter(e => !e.isRead).length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("sent")}
            className={`px-4 py-2 text-xs font-bold transition-all relative flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === "sent"
                ? "border-b-indigo-600 text-indigo-600 font-extrabold"
                : "border-b-transparent text-gray-400 hover:text-gray-700"
            }`}
          >
            <Send className="w-3.5 h-3.5 rotate-45" />
            <span>Sent Outbox</span>
          </button>
          <button
            onClick={() => setActiveTab("compose")}
            className={`px-4 py-2 text-xs font-bold transition-all relative flex items-center gap-1.5 border-b-2 cursor-pointer ${
              activeTab === "compose"
                ? "border-b-indigo-600 text-indigo-600 font-extrabold"
                : "border-b-transparent text-gray-400 hover:text-gray-700"
            }`}
          >
            <PenSquare className="w-3.5 h-3.5" />
            <span>Compose Mail</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === "inbox" && inboxEmails.some(e => !e.isRead) && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              className="px-2.5 py-1.5 text-[10.5px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 border border-indigo-250/30"
              title="Mark all emails in inbox as read"
            >
              <Check className="w-3.5 h-3.5 text-indigo-600" />
              <span>Mark All Read</span>
            </button>
          )}
          <span className="text-[10px] text-gray-400 uppercase tracking-wider font-mono font-bold hidden sm:inline">
            Active: {currentUser.email}
          </span>
        </div>
      </div>

      {/* Compose Form */}
      {activeTab === "compose" && (
        <form onSubmit={handleSendEmail} className="mt-5 space-y-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Write Simulated Message</h4>
          
          {composeSuccess && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2 font-sans">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{composeSuccess}</span>
            </div>
          )}

          {composeError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-sans">
              <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{composeError}</span>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
              Recipient Email Address
            </label>
            <input
              type="email"
              required
              placeholder="e.g. teacher@lab.edu or admin@mit.edu"
              value={composeTo}
              onChange={(e) => setComposeTo(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Tip: If sending to a registered user address, an instant mail notification alert will trigger on their profile.
            </p>
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
              Subject Line
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Workspace Reservation Details"
              value={composeSubject}
              onChange={(e) => setComposeSubject(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans font-semibold"
            />
          </div>

          <div>
            <label className="block text-[10px] font-extrabold uppercase tracking-wider text-slate-500 mb-1">
              Email Content / Body
            </label>
            <textarea
              required
              rows={5}
              placeholder="Dear Collaborator,&#10;&#10;Please review our scheduled slot on the Bioengineering workstation...&#10;&#10;Best regards,&#10;Laboratory Staff"
              value={composeBody}
              onChange={(e) => setComposeBody(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-50 border border-gray-200 rounded-xl text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono leading-relaxed"
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={composeLoading}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{composeLoading ? "Relaying..." : "Dispatch Mail"}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setComposeTo("");
                setComposeSubject("");
                setComposeBody("");
                setActiveTab("inbox");
              }}
              className="px-4 py-2 border border-gray-200 text-gray-500 hover:bg-slate-50 text-xs font-bold rounded-xl cursor-pointer"
            >
              Discard
            </button>
          </div>
        </form>
      )}

      {/* Inbox & Sent List */}
      {activeTab !== "compose" && (
        <div className="mt-5 font-sans">
          {displayedEmails.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="p-4 rounded-full bg-slate-50 text-gray-400 mb-3.5">
                <Inbox className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-gray-600">This mailbox folder is empty</p>
              <p className="text-[11px] text-gray-400 max-w-sm mt-1">
                {activeTab === "inbox"
                  ? "Incoming notifications, reservation clearance tickets, and reminders will list in this folder."
                  : "Any custom emails you compose and dispatch to other members will display in this outbox."}
              </p>
            </div>
          ) : (
            <div className="space-y-3.5 max-h-[520px] overflow-y-auto pr-1">
              {displayedEmails.map((email) => {
                const isExpanded = expandedEmailId === email.id;
                const isIncoming = email.toEmail === currentUser.email;
                const isRead = email.isRead ?? false;

                const isReminder = email.type === "reminder";
                const isCancel = email.type === "cancellation";
                const isClearance = email.type === "update";
                const isConfirmation = email.type === "confirmation";

                // Retrieve booking associated
                let associatedBooking = email.bookingId ? bookings?.find(b => b.id === email.bookingId) : null;
                if (!associatedBooking && bookings) {
                  const match = email.body.match(/RSV-[A-Z0-9]{8}/i) || email.subject.match(/RSV-[A-Z0-9]{8}/i);
                  if (match) {
                    associatedBooking = bookings.find(b => b.id === match[0].toUpperCase()) || null;
                  }
                }

                const isPendingStudentBooking = associatedBooking && 
                                               associatedBooking.status === "pending" && 
                                               associatedBooking.userEmail !== "admin@mit.edu";

                return (
                  <div
                    id={`email-item-${email.id}`}
                    key={email.id}
                    onClick={() => toggleExpandEmail(email)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isExpanded
                        ? "bg-slate-50/70 border-indigo-200 ring-1 ring-indigo-100 shadow-xs"
                        : isRead 
                        ? "bg-white hover:bg-slate-50/40 border-gray-200"
                        : "bg-indigo-50/20 hover:bg-indigo-50/30 border-indigo-150 font-semibold"
                    } ${
                      isReminder && !isExpanded ? "border-l-4 border-l-yellow-400" : ""
                    } ${
                      isCancel && !isExpanded ? "border-l-4 border-l-red-500" : ""
                    } ${
                      isClearance && !isExpanded ? "border-l-4 border-l-cyan-400" : ""
                    } ${
                      isConfirmation && !isExpanded ? "border-l-4 border-l-green-500" : ""
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {/* Read/Unread Indicator */}
                        {isIncoming && (
                          <div className="flex items-center" title={isRead ? "Read" : "Unread Message"}>
                            {isRead ? (
                              <Eye className="w-3.5 h-3.5 text-gray-400" />
                            ) : (
                              <div className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-indigo-600" />
                              </div>
                            )}
                          </div>
                        )}
                        
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest leading-none">
                            {isIncoming ? "FROM / SENDER" : "TO / RECIPIENT"}
                          </span>
                          <span className="text-[11.5px] font-mono font-extrabold text-slate-800 mt-1">
                            {isIncoming ? (email.fromEmail || "system@lab.edu") : email.toEmail}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <span
                          className={`text-[9px] font-bold px-1.8 py-0.5 rounded-full uppercase ${
                            isReminder
                              ? "bg-yellow-400 text-black dark:bg-yellow-500 dark:text-white"
                              : isCancel
                              ? "bg-red-500 text-black dark:bg-red-650 dark:text-white"
                              : isClearance
                              ? "bg-cyan-400 text-black dark:bg-cyan-500 dark:text-white"
                              : isConfirmation || email.type === "confirmation"
                              ? "bg-green-500 text-black dark:bg-green-600 dark:text-white"
                              : "bg-slate-200 text-black dark:bg-slate-700 dark:text-white"
                          }`}
                        >
                          {email.type || "text"}
                        </span>
                        
                        <span className="text-[10px] text-gray-400 font-medium flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          {new Date(email.sentAt).toLocaleDateString()} {new Date(email.sentAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>

                    {/* Subject Line */}
                    <div className="mt-2 flex items-center justify-between gap-4">
                      <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5 truncate">
                        <Send className="w-3 h-3 text-indigo-500 rotate-45 shrink-0" />
                        <span className={!isRead && isIncoming ? "font-extrabold text-indigo-900" : "font-semibold"}>
                          Subject: {email.subject}
                        </span>
                      </p>

                      {/* Manual Mark as Read Button */}
                      {isIncoming && !isRead && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(email.id, e)}
                          disabled={processingReadId === email.id}
                          className="px-2 py-0.8 bg-indigo-50 hover:bg-indigo-100 text-[10px] font-extrabold text-indigo-700 rounded-lg shrink-0 flex items-center gap-1 cursor-pointer"
                        >
                          <Check className="w-3 h-3" />
                          <span>{processingReadId === email.id ? "Reading..." : "Mark Read"}</span>
                        </button>
                      )}
                    </div>

                    {/* Expandable Preview Body */}
                    {isExpanded ? (
                      <div className="mt-3.5 space-y-3 font-sans animate-fadeIn">
                        {/* Email Details details */}
                        <div className="text-[10.5px] text-gray-500 border-t border-b border-gray-100 py-1.5 space-y-0.5 font-mono">
                          <p><span className="text-gray-400">Date Sent:</span> {new Date(email.sentAt).toUTCString()}</p>
                          <p><span className="text-gray-400 font-mono">Sender ID:</span> {email.fromEmail || "system@lab.edu"}</p>
                          <p><span className="text-gray-400">Recipient:</span> {email.toEmail}</p>
                        </div>

                        {/* Monospaced Body plaintext */}
                        <div className="text-xs text-slate-700 bg-white p-3.5 border border-slate-100 rounded-xl leading-relaxed whitespace-pre-wrap font-mono">
                          {email.body}
                        </div>

                        {/* Administrative booking clearance slot */}
                        {currentUser.role === "admin" && isPendingStudentBooking && (
                          <div className="mt-3 bg-indigo-50/40 border border-indigo-150 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-sans">
                            <div className="space-y-1">
                              <p className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                                <CheckCircle className="w-4 h-4 text-indigo-600 shrink-0" />
                                Interactive Clearance Terminal: Authorization Required
                              </p>
                              <p className="text-[10.5px] text-gray-500 leading-normal font-sans">
                                Requested by <strong className="text-gray-700">{associatedBooking.userName}</strong> ({associatedBooking.userEmail})
                                <br />
                                Station: {associatedBooking.resourceName} ({associatedBooking.date} • {associatedBooking.startTime} - {associatedBooking.endTime})
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAction(associatedBooking.id, "approve");
                                }}
                                disabled={processingBookingId === associatedBooking.id}
                                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-sm"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                <span>{processingBookingId === associatedBooking.id ? "Approving..." : "Approve Request"}</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAction(associatedBooking.id, "reject");
                                }}
                                disabled={processingBookingId === associatedBooking.id}
                                className="px-3.5 py-1.5 bg-white hover:bg-rose-50 disabled:opacity-50 text-rose-600 border border-rose-200 text-[11px] font-bold rounded-xl cursor-pointer transition-all flex items-center gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>Decline</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400 mt-1 lines-ellipsis font-mono truncate">
                        {email.body}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
