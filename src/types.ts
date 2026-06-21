export type UserRole = "teacher" | "admin" | "owner";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  isFrozen?: boolean;
}

export type ResourceType = "workspace" | "equipment";

export interface Resource {
  id: string;
  name: string;
  type: ResourceType;
  category: string;
  description: string;
  image: string;
  capacity?: number; // only for workspaces
  location: string;
  availStart?: string;
  availEnd?: string;
}

export type BookingStatus = "approved" | "pending" | "canceled" | "completed";

export interface Booking {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  resourceId: string;
  resourceName: string;
  resourceType: ResourceType;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM (24h)
  endTime: string; // HH:MM (24h)
  status: BookingStatus;
  purpose: string;
  createdAt: string;
  groupId?: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: "success" | "alert" | "info";
  isRead: boolean;
  createdAt: string;
  emailId?: string;
}

export interface EmailLog {
  id: string;
  bookingId?: string;
  toEmail: string;
  fromEmail?: string;
  isRead?: boolean;
  subject: string;
  body: string;
  sentAt: string;
  type: "confirmation" | "reminder" | "cancellation" | "update" | "user_email";
}

export interface AnalyticsSummary {
  totalBookings: number;
  activeBookings: number;
  cancellationRate: number;
  unutilizedCount: number;
  hourlyDistribution: Record<string, number>; // "09:00" -> count
  resourceUtilizationList: { id: string; name: string; type: ResourceType; bookingCount: number; utilizationRate: number }[];
  peakHours: { hour: string; count: number }[];
}
