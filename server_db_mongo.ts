import { MongoClient } from "mongodb";
import fs from "fs";

export interface MongoSyncConfig {
  mongodbUri?: string;
  files: {
    users: string;
    bookings: string;
    notifications: string;
    emails: string;
    resources: string;
    loginLogs: string;
  };
  defaults: {
    users: any[];
    bookings: any[];
    notifications: any[];
    emails: any[];
    resources: any[];
    loginLogs: any[];
  };
}

let mongoClient: MongoClient | null = null;
let activeConfig: MongoSyncConfig | null = null;

export async function startAndSyncMongoDB(config: MongoSyncConfig) {
  const uri = config.mongodbUri || process.env.MONGODB_URI;
  if (!uri) {
    console.log("[MongoDB] MONGODB_URI environment variable not configured. Operating in Local Filesystem mode.");
    return;
  }

  activeConfig = config;

  try {
    console.log("[MongoDB] Connecting to database using MONGODB_URI...");
    mongoClient = new MongoClient(uri);
    await mongoClient.connect();
    
    const db = mongoClient.db();
    console.log("[MongoDB] Connection successful! Syncing MongoDB collections with local JSON files...");

    const collections = [
      { name: "users", file: config.files.users, defaultVal: config.defaults.users },
      { name: "bookings", file: config.files.bookings, defaultVal: config.defaults.bookings },
      { name: "notifications", file: config.files.notifications, defaultVal: config.defaults.notifications },
      { name: "emails", file: config.files.emails, defaultVal: config.defaults.emails },
      { name: "resources", file: config.files.resources, defaultVal: config.defaults.resources },
      { name: "loginLogs", file: config.files.loginLogs, defaultVal: config.defaults.loginLogs }
    ];

    for (const col of collections) {
      const dbCollection = db.collection(col.name);
      const docs = await dbCollection.find({}).toArray();
      
      if (docs.length > 0) {
        const cleaned = docs.map((doc: any) => {
          const { _id, ...rest } = doc;
          return rest;
        });
        fs.writeFileSync(col.file, JSON.stringify(cleaned, null, 2));
        console.log(`[MongoDB] Pulled ${docs.length} records of '${col.name}' from MongoDB collection.`);
      } else {
        let localData: any[] = [];
        try {
          if (fs.existsSync(col.file)) {
            localData = JSON.parse(fs.readFileSync(col.file, "utf-8"));
          } else {
            localData = col.defaultVal;
          }
        } catch (e) {
          localData = col.defaultVal;
        }

        const records = Array.isArray(localData) ? localData : [];
        if (records.length > 0) {
          const cleaned = records.map((r: any) => {
            const { _id, ...rest } = r;
            return rest;
          });
          await dbCollection.insertMany(cleaned);
          console.log(`[MongoDB] Seeded remote MongoDB collection '${col.name}' with ${records.length} local records.`);
        }
      }
    }
  } catch (err) {
    console.error("[MongoDB] Initialization sync error:", err);
    mongoClient = null;
  }
}

export function syncWriteToMongoDB(filePath: string, data: any) {
  if (!mongoClient || !activeConfig) return;

  const config = activeConfig;
  let collectionName: string | null = null;
  if (filePath === config.files.users) collectionName = "users";
  else if (filePath === config.files.bookings) collectionName = "bookings";
  else if (filePath === config.files.notifications) collectionName = "notifications";
  else if (filePath === config.files.emails) collectionName = "emails";
  else if (filePath === config.files.resources) collectionName = "resources";
  else if (filePath === config.files.loginLogs) collectionName = "loginLogs";

  if (!collectionName) return;

  const db = mongoClient.db();
  const collection = db.collection(collectionName);

  (async () => {
    try {
      await collection.deleteMany({});
      const records = Array.isArray(data) ? data : [];
      if (records.length > 0) {
        const cleaned = records.map((r: any) => {
          const { _id, ...rest } = r;
          return rest;
        });
        await collection.insertMany(cleaned);
        console.log(`[MongoDB-Update] Updated remote '${collectionName}' collection with ${records.length} records.`);
      }
    } catch (err) {
      console.error(`[MongoDB-Update] Failed to write in background to collection '${collectionName}':`, err);
    }
  })();
}
