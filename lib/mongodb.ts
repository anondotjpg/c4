import { MongoClient, Db } from "mongodb";

const MONGODB_URI = process.env.MONGODB_URI!;
const MONGODB_DB = process.env.MONGODB_DB || "c4t";

if (!MONGODB_URI) {
  throw new Error("Please define the MONGODB_URI environment variable");
}

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db }> {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = await MongoClient.connect(MONGODB_URI);
  const db = client.db(MONGODB_DB);

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

// Timer document interface
export interface TimerDocument {
  _id: string;
  startTime: Date;
  duration: number; // in seconds
  isDefused: boolean;
  isExploded: boolean;
  defusedAt?: Date;
  explodedAt?: Date;
  targetMarketCap: number;
  finalMarketCap?: number;
  distributionTx?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Distribution record interface
export interface DistributionRecord {
  _id?: string;
  timerId: string;
  totalFeesClaimed: number;
  totalDistributed: number;
  holdersCount: number;
  distributions: {
    wallet: string;
    amount: number;
    percentage: number;
    txSignature?: string;
  }[];
  status: "pending" | "processing" | "completed" | "failed";
  createdAt: Date;
  completedAt?: Date;
  error?: string;
}