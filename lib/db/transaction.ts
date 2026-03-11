import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db/mongoose";

function isTransactionUnsupportedError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes("Transaction numbers are only allowed on a replica set member") ||
    error.message.includes("Transaction support is not available")
  );
}

export async function withTransaction<T>(
  work: (session: mongoose.ClientSession | null) => Promise<T>
) {
  await connectToDatabase();

  const session = await mongoose.startSession();

  try {
    let result: T | undefined;

    try {
      await session.withTransaction(async () => {
        result = await work(session);
      });
    } catch (error) {
      if (!isTransactionUnsupportedError(error)) {
        throw error;
      }

      result = await work(null);
    }

    if (result === undefined) {
      throw new Error("Transaction completed without a result.");
    }

    return result;
  } finally {
    await session.endSession();
  }
}
