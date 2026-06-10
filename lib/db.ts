import { MongoClient, Db } from "mongodb";

const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error("Please add your Mongo URI to .env");
}

interface MongoConnection {
  client: MongoClient;
  db: Db;
}

let cachedConnection: MongoConnection | null = null;

export async function connectToDatabase(): Promise<MongoConnection> {
  if (cachedConnection) {
    try {
      // Test if the cached connection is still alive
      await cachedConnection.db.admin().ping();
      return cachedConnection;
    } catch {
      // Connection is stale, clear it and reconnect
      cachedConnection = null;
    }
  }

  const client = new MongoClient(uri as string, {
    // SSL/TLS configuration
    ssl: true,
    retryWrites: true,
    w: "majority",
    tlsInsecure: false,
    // Connection pool settings
    maxPoolSize: 10,
    minPoolSize: 2,
    // Socket timeout settings (30 seconds)
    socketTimeoutMS: 30000,
    connectTimeoutMS: 30000,
    serverSelectionTimeoutMS: 5000,
  });

  try {
    await client.connect();
    const dbUri = uri as string;
    // Extract database name from connection string if present, or fallback to 'coldmail_sender'
    const dbName = dbUri.includes(".net/") 
      ? dbUri.split(".net/")[1].split("?")[0] || "coldmail_sender" 
      : "coldmail_sender";
    const db = client.db(dbName);
    
    // Test the connection
    await db.admin().ping();
    
    cachedConnection = { client, db };
    return cachedConnection;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}
