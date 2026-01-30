import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, TimerDocument } from "@/lib/mongodb";
import { getClaimableFees } from "@/lib/pumpportal";

const TIMER_ID = "global_bomb_timer";
const TOKEN_MINT = process.env.TOKEN_MINT || "FohpGCNk3BkRu9hwEEKs7aVfSVe7yZvyrekVLQptpump";

/**
 * GET /api/status
 * Combined status endpoint for frontend polling
 * Returns timer state, claimable fees, and distribution status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const includeClaimable = searchParams.get("includeClaimable") === "true";

    const { db } = await connectToDatabase();
    const timersCollection = db.collection<TimerDocument>("timers");

    // Get timer
    const timer = await timersCollection.findOne({ _id: TIMER_ID });

    if (!timer) {
      return NextResponse.json({
        success: true,
        timerExists: false,
        message: "No timer initialized. POST to /api/timer with action: reset",
      });
    }

    // Calculate time remaining
    const now = new Date();
    const elapsed = Math.floor(
      (now.getTime() - timer.startTime.getTime()) / 1000
    );
    const timeRemaining = Math.max(0, timer.duration - elapsed);

    // Auto-explode check
    let isExploded = timer.isExploded;
    if (timeRemaining === 0 && !timer.isDefused && !timer.isExploded) {
      await timersCollection.updateOne(
        { _id: TIMER_ID },
        {
          $set: {
            isExploded: true,
            explodedAt: new Date(),
            updatedAt: new Date(),
          },
        }
      );
      isExploded = true;
    }

    // Build response
    const response: any = {
      success: true,
      timer: {
        timeRemaining,
        duration: timer.duration,
        startTime: timer.startTime,
        isDefused: timer.isDefused,
        isExploded,
        defusedAt: timer.defusedAt,
        explodedAt: timer.explodedAt || (isExploded ? new Date() : undefined),
        targetMarketCap: timer.targetMarketCap,
        finalMarketCap: timer.finalMarketCap,
        distributionTx: timer.distributionTx,
      },
      serverTime: now.toISOString(),
    };

    // Optionally include claimable fees (more expensive call)
    if (includeClaimable) {
      const claimableResult = await getClaimableFees(TOKEN_MINT);
      response.claimable = {
        mint: TOKEN_MINT,
        amount: claimableResult.claimable,
        error: claimableResult.error,
      };
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("Status API error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch status" },
      { status: 500 }
    );
  }
}