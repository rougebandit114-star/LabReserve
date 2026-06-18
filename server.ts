import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import crypto from "crypto";
import { 
  User, 
  Resource, 
  Booking, 
  Notification, 
  EmailLog, 
  BookingStatus,
  AnalyticsSummary,
  ResourceType
} from "./src/types";
import { startAndSyncMongoDB, syncWriteToMongoDB } from "./server_db_mongo";

const app = express();
const PORT = 3000;

// Ensure persistent data folder exists
const DATA_DIR = path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const USERS_FILE = path.join(DATA_DIR, "users.json");
const BOOKINGS_FILE = path.join(DATA_DIR, "bookings.json");
const NOTIFICATIONS_FILE = path.join(DATA_DIR, "notifications.json");
const EMAILS_FILE = path.join(DATA_DIR, "emails.json");
const RESOURCES_FILE = path.join(DATA_DIR, "resources.json");

// Helper to read JSON file safely
const readJsonFile = <T>(filePath: string, defaultValue: T): T => {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultValue, null, 2));
      return defaultValue;
    }
    const content = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(content) as T;
  } catch (err) {
    console.error(`Error reading file ${filePath}:`, err);
    return defaultValue;
  }
};

// Helper to write JSON file and sync to MongoDB in background
const writeJsonFile = <T>(filePath: string, data: T): void => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    syncWriteToMongoDB(filePath, data);
  } catch (err) {
    console.error(`Error writing file ${filePath}:`, err);
  }
};

// Initial Core Workspaces and Lab Equipments Seed
const DEFAULT_RESOURCES: Resource[] = [
  {
    id: "WS-01",
    name: "Bio-Safety Cabinet Hood (BSL-2)",
    type: "workspace",
    category: "Cell Biology & Culture",
    description: "Class II biological safety hood engineered for cell culture work, pipette calibration, and sterile reagent preparations. Heavy airflow control.",
    location: "Room 402, Biotech Wing",
    image: "https://images.unsplash.com/photo-1579154204601-01588f351167?w=500&auto=format&fit=crop&q=60",
    capacity: 1
  },
  {
    id: "WS-02",
    name: "Mechatronics Development Workbench (Station 3)",
    type: "workspace",
    category: "Electrical Engineering",
    description: "Equipped with DC power supplies, active Weller soldering heads, Rigol pulse function generators, and anti-static shielding.",
    location: "Room 105, Mechatronics Wing",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500&auto=format&fit=crop&q=60",
    capacity: 2
  },
  {
    id: "WS-03",
    name: "High-Ventilation Chemical Fume Cabin (CH-02)",
    type: "workspace",
    category: "Organic Chemistry",
    description: "Engineered high-velocity fume extraction cabinet safe for acid digestions, standard solvent titrations, and chemical synthesis phases.",
    location: "Room 312, Secondary Fume Annex",
    image: "https://images.unsplash.com/photo-1617155093730-a8bf47be792d?w=500&auto=format&fit=crop&q=60",
    capacity: 1
  },
  {
    id: "WS-04",
    name: "Ergonomic CAD/CAM Collaborative Pod 1",
    type: "workspace",
    category: "General Hardware Design",
    description: "Equipped with a core brainstorming secondary monitor, 4 ergonomic swivel units, and a dedicated workspace for draft design and general review.",
    location: "Main Lobby, Design Center",
    image: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=500&auto=format&fit=crop&q=60",
    capacity: 4
  },
  {
    id: "EQ-01",
    name: "Ultimaker S5 Dual-Extrusion 3D Printer",
    type: "equipment",
    category: "Additive Manufacturing",
    description: "Dual-core physical printing setup support for highly structural engineering plastics (Nylon, ABS, PLA) and water-soluble PVA filament structures.",
    location: "Room 102, Fabrication Corridor",
    image: "https://images.unsplash.com/photo-1615840287214-7fe58a8f3685?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "EQ-02",
    name: "Rigol MSO5000 Mixed Signal Oscilloscope",
    type: "equipment",
    category: "Diagnostic Testing",
    description: "350 MHz dual-analogue, 16-channel digital mixed waveform debugger. Essential for capturing transients, logic decodes, and noise ratios.",
    location: "Room 105, Mechatronics Wing",
    image: "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "EQ-03",
    name: "Eppendorf Mastercycler PCR Cycler",
    type: "equipment",
    category: "Genetics Instrumentation",
    description: "High-throughput rapid thermal replication cycler. Custom biological profile creation with precise standard temperature curves.",
    location: "Room 402, Biotech Wing",
    image: "https://images.unsplash.com/photo-1544377193-33dcf4d68fb5?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "EQ-04",
    name: "Scanning Electron Microscope (SEM) JEOL",
    type: "equipment",
    category: "Microscopy & Nanotech",
    description: "High-magnification sub-nanometer electron imaging scanner. Crucial for surface crystallography. REQUIRES direct admin certification clearance.",
    location: "Souterrain Hall, microscopy Suite",
    image: "https://images.unsplash.com/photo-1551244072-5d12893278ab?w=500&auto=format&fit=crop&q=60"
  },
  {
    id: "EQ-05",
    name: "Formlabs Form 3 SLA Resin 3D Printer",
    type: "equipment",
    category: "Additive Manufacturing",
    description: "Stereolithographic resin desktop printing. Superior smooth micro-finishes and watertight mechanical fits.",
    location: "Room 102, Fabrication Corridor",
    image: "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&auto=format&fit=crop&q=60"
  }
];

// Seed standard users if users file is empty
const defaultUsersList = [
  {
    "id": "teacher-01",
    "name": "Alex Mercer",
    "email": "teacher@lab.edu",
    "password": "password",
    "role": "teacher",
    "department": "Bioengineering"
  },
  {
    id: "admin-1",
    name: "Dr. Sarah Jenkins",
    email: "rougebandit114@gmail.com",
    password: "password",
    role: "admin",
    department: "Lab Administration"
  },
  {
    id: "admin-2",
    name: "Core Faculty Liaison",
    email: "admin@lab.edu",
    password: "password",
    role: "admin",
    department: "Mechatronics"
  }
];

// Initialize Files if they do not exist
const users = readJsonFile(USERS_FILE, defaultUsersList);
const bookings = readJsonFile<Booking[]>(BOOKINGS_FILE, []);
const notifications = readJsonFile<Notification[]>(NOTIFICATIONS_FILE, []);
const emails = readJsonFile<EmailLog[]>(EMAILS_FILE, []);
const resources = readJsonFile<Resource[]>(RESOURCES_FILE, DEFAULT_RESOURCES);

// Initialize MongoDB Sync
startAndSyncMongoDB({
  files: {
    users: USERS_FILE,
    bookings: BOOKINGS_FILE,
    notifications: NOTIFICATIONS_FILE,
    emails: EMAILS_FILE,
    resources: RESOURCES_FILE
  },
  defaults: {
    users: defaultUsersList,
    bookings: [],
    notifications: [],
    emails: [],
    resources: DEFAULT_RESOURCES
  }
});

app.use(express.json());

// Auth Token Simulation Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: "Access Denied. Token is missing." });
  }

  // Token is user email for simplicity
  const allUsers = readJsonFile<any[]>(USERS_FILE, defaultUsersList);
  const foundUser = allUsers.find(u => u.email === token);
  
  if (!foundUser) {
    return res.status(403).json({ error: "Invalid Session Session Token." });
  }

  if (foundUser.isFrozen) {
    return res.status(403).json({ error: "Your account is frozen. Please contact administrative clearance." });
  }

  const { password, ...safeUser } = foundUser;
  req.user = safeUser;
  next();
};

// ==========================================
// AUTH ROUTING
// ==========================================

// Register
app.post("/api/auth/register", (req, res) => {
  const { name, email, password, department, role } = req.body;
  if (!name || !email || !password || !department) {
    return res.status(400).json({ error: "Required fields are missing." });
  }

  const allUsers = readJsonFile<any[]>(USERS_FILE, defaultUsersList);
  if (allUsers.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: "User with this email already exists." });
  }

  const newUser = {
    id: "user-" + crypto.randomUUID().slice(0, 8),
    name,
    email: email.toLowerCase(),
    password,
    role: role === "admin" ? "admin" : "teacher", // safeguard
    department
  };

  allUsers.push(newUser);
  writeJsonFile(USERS_FILE, allUsers);

  // Send registration confirmation notification
  const notifyId = crypto.randomUUID();
  const allNotifications = readJsonFile<Notification[]>(NOTIFICATIONS_FILE, []);
  allNotifications.push({
    id: notifyId,
    userId: newUser.id,
    title: "Account Created Successfully",
    message: `Welcome to the Lab Booking System, ${name}. You can now schedule workspaces and apparatus.`,
    type: "success",
    isRead: false,
    createdAt: new Date().toISOString()
  });
  writeJsonFile(NOTIFICATIONS_FILE, allNotifications);

  const { password: _, ...safeUser } = newUser;
  res.status(201).json({ user: safeUser, token: safeUser.email });
});

// Login
app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are key requirements." });
  }

  const allUsers = readJsonFile<any[]>(USERS_FILE, defaultUsersList);
  const foundUser = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());

  if (!foundUser || foundUser.password !== password) {
    return res.status(400).json({ error: "Incorrect email credentials or password." });
  }

  if (foundUser.isFrozen) {
    return res.status(400).json({ error: "Your account is frozen. Please contact administrative clearance." });
  }

  const { password: _, ...safeUser } = foundUser;
  res.json({ user: safeUser, token: safeUser.email });
});

// Get Session Me
app.get("/api/auth/me", authenticateToken, (req: any, res) => {
  res.json({ user: req.user });
});

// Update User Profile
app.post("/api/auth/profile", authenticateToken, (req: any, res) => {
  const { name, department, currentPassword, newPassword } = req.body;
  const allUsers = readJsonFile<any[]>(USERS_FILE, defaultUsersList);
  const userIdx = allUsers.findIndex(u => u.id === req.user.id);
  
  if (userIdx === -1) {
    return res.status(404).json({ error: "User profile not found." });
  }

  const existingUser = allUsers[userIdx];

  // Validate and handle password change
  if (newPassword) {
    if (!currentPassword) {
      return res.status(400).json({ error: "Current password is required to authorize password change." });
    }
    if (existingUser.password !== currentPassword) {
      return res.status(400).json({ error: "Incorrect current password." });
    }
    existingUser.password = newPassword;
  }

  if (name && name.trim()) {
    existingUser.name = name.trim();
  }
  if (department && department.trim()) {
    existingUser.department = department.trim();
  }

  allUsers[userIdx] = existingUser;
  writeJsonFile(USERS_FILE, allUsers);

  // Auto-backup users on server to localStorage through next client load
  const allNotifications = readJsonFile<Notification[]>(NOTIFICATIONS_FILE, []);
  allNotifications.push({
    id: crypto.randomUUID(),
    userId: existingUser.id,
    title: "🔒 Profile Securely Updated",
    message: "Your profile details have been successfully modified in the system registry.",
    type: "info",
    isRead: false,
    createdAt: new Date().toISOString()
  });
  writeJsonFile(NOTIFICATIONS_FILE, allNotifications);

  const { password: _, ...safeUser } = existingUser;
  res.json({ success: true, user: safeUser });
});

// Restore backup from client browser cache to survive Cloud Run container restarts
app.post("/api/backup/restore", (req, res) => {
  const { users: clientUsers, bookings: clientBookings, emails: clientEmails, notifications: clientNotifications } = req.body;

  let modified = false;

  if (Array.isArray(clientUsers) && clientUsers.length > 0) {
    const serverUsers = readJsonFile<any[]>(USERS_FILE, defaultUsersList);
    let usersModified = false;
    clientUsers.forEach(u => {
      if (u && u.email && !serverUsers.some(su => su.email === u.email)) {
        serverUsers.push(u);
        usersModified = true;
        modified = true;
      }
    });
    if (usersModified) writeJsonFile(USERS_FILE, serverUsers);
  }

  if (Array.isArray(clientBookings) && clientBookings.length > 0) {
    const serverBookings = readJsonFile<any[]>(BOOKINGS_FILE, []);
    let bookingsModified = false;
    clientBookings.forEach(b => {
      if (b && b.id && !serverBookings.some(sb => sb.id === b.id)) {
        // verify fields
        serverBookings.push(b);
        bookingsModified = true;
        modified = true;
      }
    });
    if (bookingsModified) writeJsonFile(BOOKINGS_FILE, serverBookings);
  }

  if (Array.isArray(clientEmails) && clientEmails.length > 0) {
    const serverEmails = readJsonFile<any[]>(EMAILS_FILE, []);
    let emailsModified = false;
    clientEmails.forEach(e => {
      if (e && e.id && !serverEmails.some(se => se.id === e.id)) {
        serverEmails.push(e);
        emailsModified = true;
        modified = true;
      }
    });
    if (emailsModified) writeJsonFile(EMAILS_FILE, serverEmails);
  }

  if (Array.isArray(clientNotifications) && clientNotifications.length > 0) {
    const serverNotifications = readJsonFile<any[]>(NOTIFICATIONS_FILE, []);
    let notifsModified = false;
    clientNotifications.forEach(n => {
      if (n && n.id && !serverNotifications.some(sn => sn.id === n.id)) {
        serverNotifications.push(n);
        notifsModified = true;
        modified = true;
      }
    });
    if (notifsModified) writeJsonFile(NOTIFICATIONS_FILE, serverNotifications);
  }

  res.json({ success: true, restored: modified, message: "Backup successfully synchronized into server virtual database." });
});

// ==========================================
// RESOURCES ROUTING
// ==========================================
// ==========================================
// RESOURCES ROUTING
// ==========================================
app.get("/api/resources", (req, res) => {
  const currentResources = readJsonFile<Resource[]>(RESOURCES_FILE, DEFAULT_RESOURCES);
  res.json(currentResources);
});

// Admin Add resource
app.post("/api/resources", authenticateToken, (req: any, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized access. Requires Admin status." });
  }

  const { id, name, type, category, description, location, image, capacity, availStart, availEnd } = req.body;

  if (!id || !name || !type || !category || !location) {
    return res.status(400).json({ error: "Required fields (ID, name, type, category, location) must be provided." });
  }

  const currentResources = readJsonFile<Resource[]>(RESOURCES_FILE, DEFAULT_RESOURCES);
  
  if (currentResources.some(r => r.id === id)) {
    return res.status(400).json({ error: `Resource ID '${id}' is already registered.` });
  }

  const newResource: Resource = {
    id,
    name,
    type,
    category,
    description: description || "",
    location,
    image: image || "https://images.unsplash.com/photo-1579154204601-01588f351167?w=500&auto=format&fit=crop&q=60",
    capacity: capacity !== undefined ? Number(capacity) : 1,
    availStart: availStart || "08:00",
    availEnd: availEnd || "20:00"
  };

  currentResources.push(newResource);
  writeJsonFile(RESOURCES_FILE, currentResources);

  res.json({ success: true, resource: newResource });
});

// Admin Update resource
app.put("/api/resources/:id", authenticateToken, (req: any, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized access. Requires Admin status." });
  }

  const { id } = req.params;
  const { name, type, category, description, location, image, capacity, availStart, availEnd } = req.body;

  if (!name || !type || !category || !location) {
    return res.status(400).json({ error: "Required fields (name, type, category, location) must be provided." });
  }

  const currentResources = readJsonFile<Resource[]>(RESOURCES_FILE, DEFAULT_RESOURCES);
  const resourceIdx = currentResources.findIndex(r => r.id === id);

  if (resourceIdx === -1) {
    return res.status(404).json({ error: "Resource item not located in lab inventory." });
  }

  currentResources[resourceIdx] = {
    ...currentResources[resourceIdx],
    name,
    type,
    category,
    description: description || "",
    location,
    image: image || currentResources[resourceIdx].image,
    capacity: capacity !== undefined ? Number(capacity) : currentResources[resourceIdx].capacity,
    availStart: availStart || "08:00",
    availEnd: availEnd || "20:00"
  };

  writeJsonFile(RESOURCES_FILE, currentResources);
  res.json({ success: true, resource: currentResources[resourceIdx] });
});

// Admin Delete resource
app.delete("/api/resources/:id", authenticateToken, (req: any, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized access. Requires Admin status." });
  }

  const { id } = req.params;

  const currentResources = readJsonFile<Resource[]>(RESOURCES_FILE, DEFAULT_RESOURCES);
  const resourceIdx = currentResources.findIndex(r => r.id === id);

  if (resourceIdx === -1) {
    return res.status(404).json({ error: "Resource not found." });
  }

  const deletedResource = currentResources[resourceIdx];
  currentResources.splice(resourceIdx, 1);
  writeJsonFile(RESOURCES_FILE, currentResources);

  // Cancel associated pending or approved bookings
  const allBookings = readJsonFile<Booking[]>(BOOKINGS_FILE, []);
  const updatedBookings = allBookings.map(b => {
    if (b.resourceId === id && b.status !== "canceled") {
      b.status = "canceled";
    }
    return b;
  });
  writeJsonFile(BOOKINGS_FILE, updatedBookings);

  res.json({ success: true, message: `Resource ${deletedResource.name} removed successfully.` });
});

// ==========================================
// BOOKING ROUTING
// ==========================================

// Get list of reservations (filtered by role constraints)
app.get("/api/bookings", authenticateToken, (req: any, res) => {
  const allBookings = readJsonFile<Booking[]>(BOOKINGS_FILE, []);
  
  if (req.user.role === "admin") {
    return res.json(allBookings);
  } else {
    // Return all bookings so calendar and timeline can block overlaps,
    // but the client can redact sensitive student detail for other users.
    return res.json(allBookings);
  }
});

// Create Bookings with Overlap validations (Supports multi-day reservations)
app.post("/api/bookings", authenticateToken, (req: any, res) => {
  const { resourceId, date, dates, startTime, endTime, purpose } = req.body;

  if (!resourceId || (!date && !dates) || !startTime || !endTime || !purpose) {
    return res.status(400).json({ error: "All booking details (resource, date/dates, timeslots, purpose) must be provided." });
  }

  const targetDates: string[] = dates && Array.isArray(dates) ? dates : [date];
  if (targetDates.length === 0) {
    return res.status(400).json({ error: "At least one booking date must be selected." });
  }

  const currentResources = readJsonFile<Resource[]>(RESOURCES_FILE, DEFAULT_RESOURCES);
  const targetResource = currentResources.find(r => r.id === resourceId);
  if (!targetResource) {
    return res.status(404).json({ error: "Resource item not located in lab inventory." });
  }

  // Calculate block overlaps
  const reqStart = Number(startTime.replace(":", ""));
  const reqEnd = Number(endTime.replace(":", ""));

  if (reqStart >= reqEnd) {
    return res.status(400).json({ error: "End time must fall strictly after start time." });
  }

  // Custom timetable operating bounds
  const startHourHour = targetResource.availStart ? parseInt(targetResource.availStart.split(":")[0]) : 8;
  const endHourHour = targetResource.availEnd ? parseInt(targetResource.availEnd.split(":")[0]) : 20;
  
  const reqStartHour = parseInt(startTime.split(":")[0]);
  const reqEndHour = parseInt(endTime.split(":")[0]);

  if (reqStartHour < startHourHour || reqEndHour > endHourHour) {
    return res.status(400).json({ 
      error: `Operating Timetable Exception: This resource is only available from ${targetResource.availStart || "08:00"} to ${targetResource.availEnd || "20:00"}.` 
    });
  }

  const allBookings = readJsonFile<Booking[]>(BOOKINGS_FILE, []);

  // Validate conflict for every target date first
  for (const d of targetDates) {
    const overlapping = allBookings.filter(b => {
      if (b.resourceId !== resourceId || b.date !== d || b.status === "canceled") {
        return false;
      }
      const bStart = Number(b.startTime.replace(":", ""));
      const bEnd = Number(b.endTime.replace(":", ""));
      
      // Condition of overlap: Start is before End AND End is after Start
      return reqStart < bEnd && reqEnd > bStart;
    });

    const capacityNum = targetResource.capacity !== undefined ? targetResource.capacity : 1;
    if (overlapping.length >= capacityNum) {
      const firstConflict = overlapping[0];
      return res.status(400).json({ 
        error: `${targetResource.name} is reserve by ${firstConflict.userName} from ${firstConflict.startTime} to ${firstConflict.endTime} on this day`
      });
    }
  }

  // Every reservation slot request starts as "pending" until approved by the administrator
  const needsManualApproval = true;
  const createdBookings: Booking[] = [];
  const allNotifications = readJsonFile<Notification[]>(NOTIFICATIONS_FILE, []);
  const allEmails = readJsonFile<EmailLog[]>(EMAILS_FILE, []);

  // For multi-day bookings, generate a shared correlation ID
  const groupId = targetDates.length > 1 ? "GRP-" + crypto.randomUUID().slice(0, 8).toUpperCase() : undefined;

  for (const d of targetDates) {
    const newBooking: Booking = {
      id: "RSV-" + crypto.randomUUID().slice(0, 8).toUpperCase(),
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      resourceId,
      resourceName: targetResource.name,
      resourceType: targetResource.type,
      date: d,
      startTime,
      endTime,
      status: needsManualApproval ? "pending" : "approved",
      purpose,
      createdAt: new Date().toISOString(),
      groupId
    };

    allBookings.push(newBooking);
    createdBookings.push(newBooking);

    // Generate Real-time Notification
    allNotifications.push({
      id: crypto.randomUUID(),
      userId: req.user.id,
      title: needsManualApproval ? "Booking Pending Review" : "Reservation Confirmed",
      message: needsManualApproval
        ? `Your reservation request for ${targetResource.name} on ${d} has been submitted for director clearance.`
        : `You secured a slot for ${targetResource.name} on ${d} at ${startTime}-${endTime}.`,
      type: needsManualApproval ? "info" : "success",
      isRead: false,
      createdAt: new Date().toISOString()
    });

  }

  // Generate automated outbound email simulation: exactly ONE combined email
  const isMultiDay = targetDates.length > 1;
  const emailId = crypto.randomUUID();
  const dateListStr = targetDates.map(d => `  - ${d}`).join("\n");
  
  const emailSubject = isMultiDay 
    ? `[Multi-Day Reservation Clearance Required] ${targetResource.name}`
    : `[Reservation Clearance Required] ${targetResource.name} on ${targetDates[0]}`;

  const emailBody = `Dear Administrative Board,\n\n` +
    `A new laboratory reservation request has been submitted by ${req.user.name} (${req.user.email}).\n\n` +
    `• Apparatus / Workstation: ${targetResource.name}\n` +
    `• Department / Location: ${targetResource.location}\n` +
    `• Time Duration: ${startTime} - ${endTime}\n` +
    `• Scheduled Date(s):\n${dateListStr}\n` +
    `• Brief Purpose / Comments: "${purpose || 'No comments provided.'}"\n\n` +
    `Current clearance level: PENDING. Please coordinate compliance reviews soon.`;

  // Put the mail in the sent outbox of requesting user only (fromEmail = user's email), 
  // but when the admin (receiving user) gets the mail, put it in inbox (toEmail = admin@mit.edu).
  allEmails.push({
    id: emailId,
    bookingId: createdBookings[0].id,
    toEmail: "admin@mit.edu",
    fromEmail: req.user.email,
    isRead: false,
    subject: emailSubject,
    body: emailBody,
    sentAt: new Date().toISOString(),
    type: "confirmation"
  });

  // Since admin is the recipient/receiving user, notify the admin files/feed of the new email
  const adminUsersList = readJsonFile<any[]>(USERS_FILE, defaultUsersList).filter(u => u.role === "admin");
  adminUsersList.forEach(adm => {
    allNotifications.push({
      id: crypto.randomUUID(),
      userId: adm.id,
      title: "✉️ Reservation Approval Required / New Email Received",
      message: `New Mail: "${emailSubject}"`,
      type: "info",
      isRead: false,
      createdAt: new Date().toISOString(),
      emailId: emailId
    });
  });

  writeJsonFile(BOOKINGS_FILE, allBookings);
  writeJsonFile(NOTIFICATIONS_FILE, allNotifications);
  writeJsonFile(EMAILS_FILE, allEmails);

  // Return the first/main booking record to satisfy existing frontend expectations, or the main result
  res.status(201).json(createdBookings[0]);
});

// Cancel booking (Supports Admin override or Teacher identity check)
app.post("/api/bookings/:id/cancel", authenticateToken, (req: any, res) => {
  const { id } = req.params;
  const allBookings = readJsonFile<Booking[]>(BOOKINGS_FILE, []);
  const idx = allBookings.findIndex(b => b.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: "Booking reservation ticket not found." });
  }

  const booking = allBookings[idx];
  
  // Guard access
  if (req.user.role !== "admin" && booking.userId !== req.user.id) {
    return res.status(403).json({ error: "Unauthorised action: Cannot modify other teachers' bookings." });
  }

  booking.status = "canceled";
  allBookings[idx] = booking;
  writeJsonFile(BOOKINGS_FILE, allBookings);

  // Email simulation
  const allEmails = readJsonFile<EmailLog[]>(EMAILS_FILE, []);
  const cancelEmailId = crypto.randomUUID();
  const fromEmail = req.user.role === "admin" ? "admin@mit.edu" : booking.userEmail;
  const toEmail = req.user.role === "admin" ? booking.userEmail : "admin@mit.edu";

  allEmails.push({
    id: cancelEmailId,
    bookingId: booking.id,
    toEmail,
    fromEmail,
    isRead: false,
    subject: "Lab Booking Cancellation Alert",
    body: `Dear ${booking.userName},\n\nWe confirm that your reservation for "${booking.resourceName}" on ${booking.date} at ${booking.startTime} has been officially cancelled.\n\nSlots have been recycled back to public availability. If this wasn't you, please reset your password immediately.`,
    sentAt: new Date().toISOString(),
    type: "cancellation"
  });
  writeJsonFile(EMAILS_FILE, allEmails);

  const allNotifications = readJsonFile<Notification[]>(NOTIFICATIONS_FILE, []);

  // Send "New Email Received" notification ONLY to the recipient
  const recipientUserId = req.user.role === "admin" 
    ? booking.userId 
    : (readJsonFile<any[]>(USERS_FILE, defaultUsersList).find(u => u.role === "admin")?.id || booking.userId);

  allNotifications.push({
    id: crypto.randomUUID(),
    userId: recipientUserId,
    title: "✉️ Reservation Canceled / New Email Received",
    message: `New Mail: "Lab Booking Cancellation Alert"`,
    type: "info",
    isRead: false,
    createdAt: new Date().toISOString(),
    emailId: cancelEmailId
  });

  writeJsonFile(NOTIFICATIONS_FILE, allNotifications);

  res.json({ success: true, booking });
});

// Cancel a group of bookings (Supports Admin override or Teacher identity check)
app.post("/api/bookings/group/:groupId/cancel", authenticateToken, (req: any, res) => {
  const { groupId } = req.params;
  const allBookings = readJsonFile<Booking[]>(BOOKINGS_FILE, []);
  
  const groupBookings = allBookings.filter(b => b.groupId === groupId);
  if (groupBookings.length === 0) {
    return res.status(404).json({ error: "No bookings found matching this group." });
  }

  // Guard access: Ensure user either is admin or owns the bookings
  const isAuthorized = req.user.role === "admin" || groupBookings.every(b => b.userId === req.user.id);
  if (!isAuthorized) {
    return res.status(403).json({ error: "Unauthorised action: Cannot cancel other teachers' bookings in group." });
  }

  const allNotifications = readJsonFile<Notification[]>(NOTIFICATIONS_FILE, []);
  const allEmails = readJsonFile<EmailLog[]>(EMAILS_FILE, []);

  groupBookings.forEach(booking => {
    if (booking.status === "canceled") return;

    booking.status = "canceled";
    
    // Find and update in original array
    const bIdx = allBookings.findIndex(b => b.id === booking.id);
    if (bIdx !== -1) {
      allBookings[bIdx] = booking;
    }

    // Email simulation
    const cancelEmailId = crypto.randomUUID();
    const fromEmail = req.user.role === "admin" ? "admin@mit.edu" : booking.userEmail;
    const toEmail = req.user.role === "admin" ? booking.userEmail : "admin@mit.edu";

    allEmails.push({
      id: cancelEmailId,
      bookingId: booking.id,
      toEmail,
      fromEmail,
      isRead: false,
      subject: "Lab Booking Cancellation Alert",
      body: `Dear ${booking.userName},\n\nWe confirm that your reservation for "${booking.resourceName}" on ${booking.date} at ${booking.startTime} has been officially cancelled.\n\nSlots have been recycled back to public availability.`,
      sentAt: new Date().toISOString(),
      type: "cancellation"
    });

    // Send "New Email Received" notification ONLY to the recipient
    const recipientUserId = req.user.role === "admin" 
      ? booking.userId 
      : (readJsonFile<any[]>(USERS_FILE, defaultUsersList).find(u => u.role === "admin")?.id || booking.userId);

    allNotifications.push({
      id: crypto.randomUUID(),
      userId: recipientUserId,
      title: "✉️ Reservation Canceled / New Email Received",
      message: `New Mail: "Lab Booking Cancellation Alert"`,
      type: "info",
      isRead: false,
      createdAt: new Date().toISOString(),
      emailId: cancelEmailId
    });
  });

  writeJsonFile(BOOKINGS_FILE, allBookings);
  writeJsonFile(NOTIFICATIONS_FILE, allNotifications);
  writeJsonFile(EMAILS_FILE, allEmails);

  res.json({ success: true, message: "Group bookings canceled successfully." });
});

// Admin Approval/Rejection Gate
app.post("/api/bookings/:id/approve", authenticateToken, (req: any, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized access. Requires Admin status." });
  }

  const { id } = req.params;
  const { action } = req.body; // 'approve' or 'reject' or 'pending'

  const allBookings = readJsonFile<Booking[]>(BOOKINGS_FILE, []);
  const idx = allBookings.findIndex(b => b.id === id);

  if (idx === -1) {
    return res.status(404).json({ error: "Booking record was not found." });
  }

  const booking = allBookings[idx];
  let title = "Reservation Request Updated";
  let message = "";
  let subject = "Notice: reservation status changed";
  let body = "";
  let type: "success" | "info" | "alert" = "info";

  if (action === "approve") {
    booking.status = "approved";
    title = "Director Approval Granted";
    message = `Your high-clearance request for ${booking.resourceName} on ${booking.date} is approved.`;
    type = "success";
    subject = `[APPROVED & REMINDER] Clearance Approved + Schedule Reminder for ${booking.resourceName}`;
    body = `Hi ${booking.userName},\n\nFollowing compliance review, your scheduled reservation for ${booking.resourceName} on ${booking.date} has been officially APPROVED.\n\n⏰ DEPARTURE / TIME REMINDER:\nYour workstation access is scheduled for ${booking.date} from ${booking.startTime} to ${booking.endTime}.\nPlease ensure you arrive punctually (recommend 1 hour early for complex setup), verify apparatus safety controls, and sanitise the workstation post-use.`;
  } else if (action === "pending") {
    booking.status = "pending";
    title = "Reservation Placed Pending";
    message = `Your reservation request for ${booking.resourceName} on ${booking.date} has been returned to pending review.`;
    type = "info";
    subject = "Notice: Lab Booking Set to Pending Review";
    body = `Hi ${booking.userName},\n\nYour reservation request for ${booking.resourceName} on ${booking.date} at ${booking.startTime} has been set back to PENDING review status by the administrator.\n\nPlease check back for final confirmation before arriving.`;
  } else {
    booking.status = "canceled";
    title = "Reservation Request Declined";
    message = `Your request for ${booking.resourceName} on ${booking.date} was declined by lab coordinator.`;
    type = "alert";
    subject = "Notice: Reservation Clearance Not Approved";
    body = `Hi ${booking.userName},\n\nFollowing compliance review, your scheduled reservation for ${booking.resourceName} on ${booking.date} has been officially DECLINED.\n\nReview comments: Equipment usage during selected hours exceeds peak thermal cycles, or licensing credentials could not be validated.`;
  }

  allBookings[idx] = booking;
  writeJsonFile(BOOKINGS_FILE, allBookings);

  // Email simulation
  const allEmails = readJsonFile<EmailLog[]>(EMAILS_FILE, []);
  const approveEmailId = crypto.randomUUID();
  
  // Since admin is approving/updating, we put the email in admin's sent outbox (fromEmail = admin@mit.edu)
  // and in the user's inbox (toEmail = booking.userEmail)
  allEmails.push({
    id: approveEmailId,
    bookingId: booking.id,
    toEmail: booking.userEmail,
    fromEmail: "admin@mit.edu",
    isRead: false,
    subject,
    body,
    sentAt: new Date().toISOString(),
    type: action === "reject" ? "cancellation" : "update"
  });
  writeJsonFile(EMAILS_FILE, allEmails);

  const allNotifications = readJsonFile<Notification[]>(NOTIFICATIONS_FILE, []);

  let combinedTitle = "✉️ New Email Received";
  if (action === "approve") {
    combinedTitle = "✉️ Director Approval Granted / New Email Received";
  } else if (action === "pending") {
    combinedTitle = "✉️ Reservation Placed Pending / New Email Received";
  } else {
    combinedTitle = "✉️ Reservation Request Declined / New Email Received";
  }

  // Alert in notification when the mail is received: goes to the receiving user (booking.userId)
  allNotifications.push({
    id: crypto.randomUUID(),
    userId: booking.userId,
    title: combinedTitle,
    message: `New Mail: "${subject}"`,
    type: "info",
    isRead: false,
    createdAt: new Date().toISOString(),
    emailId: approveEmailId
  });

  writeJsonFile(NOTIFICATIONS_FILE, allNotifications);

  res.json({ success: true, booking });
});

// Admin Group-wide Approval/Rejection Gate (one-click multi-day action)
app.post("/api/bookings/group/:groupId/approve", authenticateToken, (req: any, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized access. Requires Admin status." });
  }

  const { groupId } = req.params;
  const { action } = req.body; // 'approve' | 'reject' | 'pending'

  const allBookings = readJsonFile<Booking[]>(BOOKINGS_FILE, []);
  const groupBookings = allBookings.filter(b => b.groupId === groupId);

  if (groupBookings.length === 0) {
    return res.status(404).json({ error: "No bookings found matching this group." });
  }

  const allNotifications = readJsonFile<Notification[]>(NOTIFICATIONS_FILE, []);
  const allEmails = readJsonFile<EmailLog[]>(EMAILS_FILE, []);

  groupBookings.forEach(booking => {
    // skip already canceled unless changing to pending/approved
    if (booking.status === "canceled" && action !== "approve" && action !== "pending") return;

    let title = "Reservation Request Updated";
    let message = "";
    let subject = "Notice: reservation status changed";
    let body = "";
    let type: "success" | "info" | "alert" = "info";

    if (action === "approve") {
      booking.status = "approved";
      title = "Director Approval Granted";
      message = `Your high-clearance request for ${booking.resourceName} on ${booking.date} is approved.`;
      type = "success";
      subject = `[APPROVED & REMINDER] Clearance Approved + Schedule Reminder for ${booking.resourceName}`;
      body = `Hi ${booking.userName},\n\nFollowing compliance review, your scheduled reservation for ${booking.resourceName} on ${booking.date} has been officially APPROVED.\n\n⏰ DEPARTURE / TIME REMINDER:\nYour workstation access is scheduled for ${booking.date} from ${booking.startTime} to ${booking.endTime}.\nPlease ensure you arrive punctually (recommend 1 hour early for complex setup), verify apparatus safety controls, and sanitise the workstation post-use.`;
    } else if (action === "pending") {
      booking.status = "pending";
      title = "Reservation Placed Pending";
      message = `Your reservation request for ${booking.resourceName} on ${booking.date} has been returned to pending review.`;
      type = "info";
      subject = "Notice: Lab Booking Set to Pending Review";
      body = `Hi ${booking.userName},\n\nYour reservation request for ${booking.resourceName} on ${booking.date} at ${booking.startTime} has been set back to PENDING review status by the administrator.\n\nPlease check back for final confirmation before arriving.`;
    } else {
      booking.status = "canceled";
      title = "Reservation Request Declined";
      message = `Your request for ${booking.resourceName} on ${booking.date} was declined by lab coordinator.`;
      type = "alert";
      subject = "Notice: Reservation Clearance Not Approved";
      body = `Hi ${booking.userName},\n\nFollowing compliance review, your scheduled reservation for ${booking.resourceName} on ${booking.date} has been officially DECLINED.\n\nReview comments: Equipment usage during selected hours exceeds peak thermal cycles, or licensing credentials could not be validated.`;
    }

    // Find in original array and update
    const bIdx = allBookings.findIndex(b => b.id === booking.id);
    if (bIdx !== -1) {
      allBookings[bIdx] = booking;
    }

    // Email simulation
    const approveEmailId = crypto.randomUUID();
    
    // Put approved/unapproved update in admin's outbox and user's inbox
    allEmails.push({
      id: approveEmailId,
      bookingId: booking.id,
      toEmail: booking.userEmail,
      fromEmail: "admin@mit.edu",
      isRead: false,
      subject,
      body,
      sentAt: new Date().toISOString(),
      type: action === "reject" ? "cancellation" : "update"
    });

    let combinedTitle = "✉️ New Email Received";
    if (action === "approve") {
      combinedTitle = "✉️ Director Approval Granted / New Email Received";
    } else if (action === "pending") {
      combinedTitle = "✉️ Reservation Placed Pending / New Email Received";
    } else {
      combinedTitle = "✉️ Reservation Request Declined / New Email Received";
    }

    // Alert in notification when the mail is received: user only
    allNotifications.push({
      id: crypto.randomUUID(),
      userId: booking.userId,
      title: combinedTitle,
      message: `New Mail: "${subject}"`,
      type: "info",
      isRead: false,
      createdAt: new Date().toISOString(),
      emailId: approveEmailId
    });
  });

  writeJsonFile(BOOKINGS_FILE, allBookings);
  writeJsonFile(NOTIFICATIONS_FILE, allNotifications);
  writeJsonFile(EMAILS_FILE, allEmails);

  res.json({ success: true, message: `Successfully changed status of all bookings in group.` });
});

// ==========================================
// NOTIFICATIONS & EMAILS MANAGEMENT
// ==========================================
app.get("/api/notifications", authenticateToken, (req: any, res) => {
  const allNotifications = readJsonFile<Notification[]>(NOTIFICATIONS_FILE, []);
  const userNotif = allNotifications.filter(n => n.userId === req.user.id);
  res.json(userNotif);
});

app.post("/api/notifications/read-all", authenticateToken, (req: any, res) => {
  const allNotifications = readJsonFile<Notification[]>(NOTIFICATIONS_FILE, []);
  const updated = allNotifications.map(n => {
    if (n.userId === req.user.id) {
      n.isRead = true;
    }
    return n;
  });
  writeJsonFile(NOTIFICATIONS_FILE, updated);
  res.json({ success: true });
});

app.post("/api/notifications/:id/read", authenticateToken, (req: any, res) => {
  const { id } = req.params;
  const allNotifications = readJsonFile<Notification[]>(NOTIFICATIONS_FILE, []);
  const idx = allNotifications.findIndex(n => n.id === id && n.userId === req.user.id);
  
  if (idx !== -1) {
    const notif = allNotifications[idx];
    allNotifications[idx].isRead = true;
    
    // If it is linked to an email, mark the email as read too
    if (notif.emailId) {
      const allEmails = readJsonFile<EmailLog[]>(EMAILS_FILE, []);
      const emailIdx = allEmails.findIndex(e => e.id === notif.emailId);
      if (emailIdx !== -1) {
        allEmails[emailIdx].isRead = true;
        writeJsonFile(EMAILS_FILE, allEmails);
      }
    }

    writeJsonFile(NOTIFICATIONS_FILE, allNotifications);
  }
  res.json({ success: true });
});

// Simulated Emails outbox
app.get("/api/emails", authenticateToken, (req: any, res) => {
  const allEmails = readJsonFile<EmailLog[]>(EMAILS_FILE, []);
  
  if (req.user.role === "admin") {
    const allBookings = readJsonFile<Booking[]>(BOOKINGS_FILE, []);
    const teachersList = readJsonFile<any[]>(USERS_FILE, defaultUsersList);
    const teacherEmails = new Set(teachersList.filter(u => u.role === "teacher").map(u => u.email));

    const filteredEmails = allEmails.filter(email => {
      // If it involves admin directly, do not filter it out
      if (email.toEmail === req.user.email || email.fromEmail === req.user.email) {
        return true;
      }
      
      let isApprovedTeacherBooking = false;
      if (email.bookingId) {
        const booking = allBookings.find(b => b.id === email.bookingId);
        if (booking) {
          const isTeacher = teacherEmails.has(booking.userEmail) || booking.userEmail !== "admin@mit.edu";
          if (isTeacher && booking.status === "approved") {
            isApprovedTeacherBooking = true;
          }
        }
      } else {
        // Fallback for older emails that don't have bookingId mapped
        const isTeacher = teacherEmails.has(email.toEmail) || email.toEmail !== "admin@mit.edu";
        if (isTeacher) {
          const matchingApprovedBooking = allBookings.some(b => b.userEmail === email.toEmail && b.status === "approved");
          if (matchingApprovedBooking) {
            isApprovedTeacherBooking = true;
          }
        }
      }

      if (isApprovedTeacherBooking) {
        const isApprovedMail = email.type === "update" || email.subject.toLowerCase().includes("approved");
        const isRemainderMail = email.type === "reminder" || email.subject.toLowerCase().includes("reminder");
        if (isApprovedMail || isRemainderMail) {
          return false; // hide from admin
        }
      }
      return true;
    });

    res.json(filteredEmails);
  } else {
    // Teachers see emails sent to them (Inbox) and emails sent by them (Sent)
    res.json(allEmails.filter(e => e.toEmail === req.user.email || e.fromEmail === req.user.email));
  }
});

// Mark email as read and remove associated notification
app.post("/api/emails/:id/read", authenticateToken, (req: any, res) => {
  const { id } = req.params;
  const allEmails = readJsonFile<EmailLog[]>(EMAILS_FILE, []);
  const emailIdx = allEmails.findIndex(e => e.id === id);

  if (emailIdx !== -1) {
    allEmails[emailIdx].isRead = true;
    writeJsonFile(EMAILS_FILE, allEmails);

    // After the mail is read, remove it from notification
    const allNotifications = readJsonFile<Notification[]>(NOTIFICATIONS_FILE, []);
    const filteredNotifs = allNotifications.filter(n => n.emailId !== id);
    if (allNotifications.length !== filteredNotifs.length) {
      writeJsonFile(NOTIFICATIONS_FILE, filteredNotifs);
    }
  }
  res.json({ success: true });
});

// Mark multiple emails as read and remove associated notifications
app.post("/api/emails/mark-all-read", authenticateToken, (req: any, res) => {
  const { ids } = req.body;
  if (!ids || !Array.isArray(ids)) {
    return res.status(400).json({ error: "ids must be an array" });
  }
  const allEmails = readJsonFile<EmailLog[]>(EMAILS_FILE, []);
  let updated = false;
  const idSet = new Set(ids);
  
  allEmails.forEach(e => {
    if (idSet.has(e.id) && !e.isRead) {
      e.isRead = true;
      updated = true;
    }
  });

  if (updated) {
    writeJsonFile(EMAILS_FILE, allEmails);

    // After the mails are read, remove them from notifications
    const allNotifications = readJsonFile<Notification[]>(NOTIFICATIONS_FILE, []);
    const filteredNotifs = allNotifications.filter(n => !n.emailId || !idSet.has(n.emailId));
    if (allNotifications.length !== filteredNotifs.length) {
      writeJsonFile(NOTIFICATIONS_FILE, filteredNotifs);
    }
  }

  res.json({ success: true });
});

// Compose and Send email
app.post("/api/emails", authenticateToken, (req: any, res) => {
  const { toEmail, subject, body } = req.body;
  
  if (!toEmail || !subject || !body) {
    return res.status(400).json({ error: "All email fields (to, subject, body) are required." });
  }

  const allEmails = readJsonFile<EmailLog[]>(EMAILS_FILE, []);
  const allUsers = readJsonFile<any[]>(USERS_FILE, defaultUsersList);
  const recipientUser = allUsers.find(u => u.email.toLowerCase() === toEmail.trim().toLowerCase());

  const emailId = crypto.randomUUID();
  const newEmail: EmailLog = {
    id: emailId,
    toEmail: toEmail.trim().toLowerCase(),
    fromEmail: req.user.email,
    isRead: false,
    subject,
    body,
    sentAt: new Date().toISOString(),
    type: "user_email"
  };

  allEmails.push(newEmail);
  writeJsonFile(EMAILS_FILE, allEmails);

  // If the target recipient exists, generate a real-time email-linked notification for them!
  if (recipientUser) {
    const allNotifications = readJsonFile<Notification[]>(NOTIFICATIONS_FILE, []);
    allNotifications.push({
      id: crypto.randomUUID(),
      userId: recipientUser.id,
      title: "✉️ New Email Received",
      message: `From: ${req.user.name} • Subject: "${subject}"`,
      type: "info",
      isRead: false,
      createdAt: new Date().toISOString(),
      emailId: emailId
    });
    writeJsonFile(NOTIFICATIONS_FILE, allNotifications);
  }

  res.status(201).json({ success: true, email: newEmail });
});

// ==========================================
// ANALYTICS & HOURLY REPORTING
// ==========================================
app.get("/api/analytics", authenticateToken, (req: any, res) => {
  const allBookings = readJsonFile<Booking[]>(BOOKINGS_FILE, []);
  
  const totalBookings = allBookings.length;
  const activeBookings = allBookings.filter(b => b.status === "approved").length;
  const canceledBookings = allBookings.filter(b => b.status === "canceled").length;
  const cancellationRate = totalBookings > 0 ? Math.round((canceledBookings / totalBookings) * 100) : 0;
  
  // Calculate Peak hours based on booked start times
  const hourMap: Record<string, number> = {};
  for (let i = 8; i <= 21; i++) {
    const hrStr = String(i).padStart(2, "0") + ":00";
    hourMap[hrStr] = 0;
  }

  allBookings.forEach(b => {
    if (b.status !== "canceled") {
      const hr = b.startTime.split(":")[0] + ":00";
      if (hourMap[hr] !== undefined) {
        hourMap[hr]++;
      } else {
        hourMap[hr] = 1;
      }
    }
  });

  const peakHours = Object.keys(hourMap).map(hour => ({
    hour,
    count: hourMap[hour]
  })).sort((a, b) => b.count - a.count);

  // Resource utilization
  // We compute based on booking occurrences in standard slots
  const currentResList = readJsonFile<Resource[]>(RESOURCES_FILE, DEFAULT_RESOURCES);
  const resourceUtilizationList = currentResList.map(resItem => {
    const counts = allBookings.filter(b => b.resourceId === resItem.id && b.status === "approved").length;
    // utilization rating estimation
    // simple indicator: counts * 2 hours of use / total active lab operating hours (estimate 14 hours over 30 days = 420 hrs)
    const usageHours = counts * 2;
    const estTotalHours = 14 * 10; // estimate 10 day window
    const utilizationRate = Math.min(100, Math.round((usageHours / estTotalHours) * 100));

    return {
      id: resItem.id,
      name: resItem.name,
      type: resItem.type,
      bookingCount: counts,
      utilizationRate: counts === 0 ? 0 : Math.max(5, utilizationRate)
    };
  });

  const summary: AnalyticsSummary = {
    totalBookings,
    activeBookings,
    cancellationRate,
    unutilizedCount: currentResList.length - resourceUtilizationList.filter(r => r.bookingCount > 0).length,
    hourlyDistribution: hourMap,
    resourceUtilizationList,
    peakHours: peakHours.slice(0, 5) // return top peak hours list
  };

  res.json(summary);
});


// ==========================================
// USER ADMINISTRATION GATE
// ==========================================
app.get("/api/admin/users", authenticateToken, (req: any, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized access. Requires Admin status." });
  }
  const allUsers = readJsonFile<any[]>(USERS_FILE, defaultUsersList);
  const safeUsers = allUsers.map(u => {
    const { password, ...safeUser } = u;
    return { ...safeUser, hasPassword: !!password };
  });
  res.json(safeUsers);
});

app.post("/api/admin/users", authenticateToken, (req: any, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized access. Requires Admin status." });
  }

  const { name, email, password, department, role } = req.body;
  if (!name || !email || !password || !department || !role) {
    return res.status(400).json({ error: "Required fields are missing." });
  }

  if (role !== "admin" && role !== "teacher") {
    return res.status(400).json({ error: "Role must be either 'admin' or 'teacher'." });
  }

  const allUsers = readJsonFile<any[]>(USERS_FILE, defaultUsersList);
  if (allUsers.find(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: "User with this email already exists." });
  }

  const newUser = {
    id: "user-" + crypto.randomUUID().slice(0, 8),
    name,
    email: email.toLowerCase(),
    password,
    role,
    department
  };

  allUsers.push(newUser);
  writeJsonFile(USERS_FILE, allUsers);

  // Send registration confirmation notification
  const notifyId = crypto.randomUUID();
  const allNotifications = readJsonFile<Notification[]>(NOTIFICATIONS_FILE, []);
  allNotifications.push({
    id: notifyId,
    userId: newUser.id,
    title: `Account Created by Admin (${role})`,
    message: `An administrator has created your account (${name}). You can now log in using the credentials configured.`,
    type: "success",
    isRead: false,
    createdAt: new Date().toISOString()
  });
  writeJsonFile(NOTIFICATIONS_FILE, allNotifications);

  res.status(201).json({ success: true, user: { id: newUser.id, name: newUser.name, email: newUser.email, role: newUser.role, department: newUser.department } });
});

app.post("/api/admin/users/:id/change-password", authenticateToken, (req: any, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized access. Requires Admin status." });
  }
  const { id } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.trim() === "") {
    return res.status(400).json({ error: "A valid new password must be provided." });
  }

  const allUsers = readJsonFile<any[]>(USERS_FILE, defaultUsersList);
  const userIdx = allUsers.findIndex(u => u.id === id);

  if (userIdx === -1) {
    return res.status(404).json({ error: "User not found." });
  }

  allUsers[userIdx].password = newPassword;
  writeJsonFile(USERS_FILE, allUsers);

  // Notify the user via internal system channel
  const allNotifications = readJsonFile<Notification[]>(NOTIFICATIONS_FILE, []);
  allNotifications.push({
    id: crypto.randomUUID(),
    userId: id,
    title: "Password Reset by Admin",
    message: "An administrative coordinator has reset your account password. Use your new password on next login.",
    type: "alert",
    isRead: false,
    createdAt: new Date().toISOString()
  });
  writeJsonFile(NOTIFICATIONS_FILE, allNotifications);

  res.json({ success: true, message: "Password updated successfully." });
});

app.post("/api/admin/users/:id/toggle-freeze", authenticateToken, (req: any, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized access. Requires Admin status." });
  }
  const { id } = req.params;

  const allUsers = readJsonFile<any[]>(USERS_FILE, defaultUsersList);
  const userIdx = allUsers.findIndex(u => u.id === id);

  if (userIdx === -1) {
    return res.status(404).json({ error: "User not found." });
  }

  if (allUsers[userIdx].id === req.user.id) {
    return res.status(400).json({ error: "You cannot freeze your own administrative account." });
  }

  const currentlyFrozen = !!allUsers[userIdx].isFrozen;
  allUsers[userIdx].isFrozen = !currentlyFrozen;
  writeJsonFile(USERS_FILE, allUsers);

  // Send notification about frozen status
  const allNotifications = readJsonFile<Notification[]>(NOTIFICATIONS_FILE, []);
  allNotifications.push({
    id: crypto.randomUUID(),
    userId: id,
    title: allUsers[userIdx].isFrozen ? "Account Frozen" : "Account Reactivated",
    message: allUsers[userIdx].isFrozen 
      ? "Your researcher profile has been frozen. You won't be able to log in or book resources."
      : "Your researcher profile has been restored. Standard operation levels resumed.",
    type: "alert",
    isRead: false,
    createdAt: new Date().toISOString()
  });
  writeJsonFile(NOTIFICATIONS_FILE, allNotifications);

  res.json({ success: true, isFrozen: allUsers[userIdx].isFrozen });
});

app.delete("/api/admin/users/:id", authenticateToken, (req: any, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Unauthorized access. Requires Admin status." });
  }
  const { id } = req.params;

  const allUsers = readJsonFile<any[]>(USERS_FILE, defaultUsersList);
  const userIdx = allUsers.findIndex(u => u.id === id);

  if (userIdx === -1) {
    return res.status(404).json({ error: "User not found." });
  }

  if (allUsers[userIdx].id === req.user.id) {
    return res.status(400).json({ error: "You cannot delete your own administrative account." });
  }

  const deletedUser = allUsers[userIdx];
  allUsers.splice(userIdx, 1);
  writeJsonFile(USERS_FILE, allUsers);

  // Cancel any existing approved/pending bookings for this deleted user
  const allBookings = readJsonFile<Booking[]>(BOOKINGS_FILE, []);
  const updatedBookings = allBookings.map(b => {
    if (b.userId === id && b.status !== "canceled") {
      b.status = "canceled";
    }
    return b;
  });
  writeJsonFile(BOOKINGS_FILE, updatedBookings);

  res.json({ success: true, message: `Account for ${deletedUser.name} deleted successfully.` });
});


// ==========================================
// BACKGROUND AUTOMATED EMAIL REMINDER SIMULATOR
// ==========================================
// Every 25 seconds, we search for upcoming sessions within 24 hours of current time,
// and generate "automated email reminders" for bookings that do not have their reminder sent yet.
const runAutomatedReminders = () => {
  try {
    const allBookings = readJsonFile<Booking[]>(BOOKINGS_FILE, []);
    const allEmails = readJsonFile<EmailLog[]>(EMAILS_FILE, []);
    const allNotifications = readJsonFile<Notification[]>(NOTIFICATIONS_FILE, []);
    let modified = false;

    allBookings.forEach(b => {
      if (b.status !== "approved") return;
      
      // Determine if a reminder or an combined approval+reminder email already exists
      const reminderSent = allEmails.some(e => 
        e.bookingId === b.id && 
        (e.type === "reminder" || e.subject.includes("APPROVED & REMINDER") || e.subject.includes("Clearance Approved"))
      );
      
      if (!reminderSent) {
        // Calculate offset (1 hour early of reserved time)
        const bookingDateTime = new Date(`${b.date}T${b.startTime}:00`);
        const now = new Date();
        const diffMs = bookingDateTime.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        // Within 1 hour early (between 0 and 1.1 hours to ensure we catch it on a 25s interval)
        const isOneHourEarly = diffHours <= 1.1 && diffHours >= 0;

        if (isOneHourEarly) {
          const sentAt = new Date().toISOString();
          const reminderEmailId = crypto.randomUUID();
          
          // Log Simulated Email (from administrative address to user)
          allEmails.push({
            id: reminderEmailId,
            bookingId: b.id,
            toEmail: b.userEmail,
            fromEmail: "admin@mit.edu",
            isRead: false,
            subject: `[TEACHER REMINDER] 1-Hour Reminder: Upcoming Booking for ${b.resourceName}`,
            body: `Dear ${b.userName},\n\nThis is your automated 1-hour scheduled reminder for your upcoming reservation of ${b.resourceName}.\n\n` +
                  `• Reserved Resource: ${b.resourceName}\n` +
                  `• Date: ${b.date}\n` +
                  `• Scheduled Shift: ${b.startTime} - ${b.endTime}\n\n` +
                  `Please prepare your materials, verify your clearance criteria with lab coordinators, arrive punctually, and sanitise the workspace post-use.`,
            sentAt,
            type: "reminder"
          });

          // Log Notification for the scientist/teacher
          allNotifications.push({
            id: crypto.randomUUID(),
            userId: b.userId,
            title: "System 1-Hour Reminder Sent",
            message: `Booking reminder dispatched automatically via SMTP for ${b.resourceName} starting at ${b.startTime}.`,
            type: "info",
            isRead: false,
            createdAt: sentAt
          });

          // Add email notification alert for receiving user
          allNotifications.push({
            id: crypto.randomUUID(),
            userId: b.userId,
            title: "✉️ New Email Received",
            message: `New Mail: "[TEACHER REMINDER] 1-Hour Reminder"`,
            type: "info",
            isRead: false,
            createdAt: sentAt,
            emailId: reminderEmailId
          });

          modified = true;
        }
      }
    });

    if (modified) {
      writeJsonFile(EMAILS_FILE, allEmails);
      writeJsonFile(NOTIFICATIONS_FILE, allNotifications);
      console.log("[CRON] Dispatched automated 1-hour email reminders.");
    }
  } catch (err) {
    console.error("Cron script reminder distribution error:", err);
  }
};

// Start background scanning
setInterval(runAutomatedReminders, 25000);


// ==========================================
// VITE DEV INTEGRATION / DIST PRODUCTION
// ==========================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Lab Booking System active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
