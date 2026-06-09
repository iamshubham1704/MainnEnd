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
    return cachedConnection;
  }

  const client = new MongoClient(uri as string);

  try {
    await client.connect();
    const dbUri = uri as string;
    // Extract database name from connection string if present, or fallback to 'coldmail_sender'
    const dbName = dbUri.includes(".net/") 
      ? dbUri.split(".net/")[1].split("?")[0] || "coldmail_sender" 
      : "coldmail_sender";
    const db = client.db(dbName);
    
    cachedConnection = { client, db };
    return cachedConnection;
  } catch (error) {
    console.error("Failed to connect to MongoDB:", error);
    throw error;
  }
}
