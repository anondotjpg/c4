import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, TimerDocument } from "@/lib/mongodb";

const TIMER_ID = "global_bomb_timer";
const DEFAULT_DURATION = 10 * 60; // 10 minutes
const TARGET_MARKET_CAP = 1_000_000; // $1M USD

/**
 * GET /api/timer
 * Returns current timer state with calculated time remaining
 */
export async function GET() {
  try {
    const { db } = await connectToDatabase();
    const timersCollection = db.collection<TimerDocument>("timers");

    let timer = await timersCollection.findOne({ _id: TIMER_ID });

    // If no timer exists, create one
    if (!timer) {
      const newTimer: TimerDocument = {
        _id: TIMER_ID,
        startTime: new Date(),
        duration: DEFAULT_DURATION,
        isDefused: false,
        isExploded: false,
        targetMarketCap: TARGET_MARKET_CAP,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await timersCollection.insertOne(newTimer);
      timer = newTimer;
    }

    // Calculate time remaining
    const now = new Date();
    const elapsed = Math.floor(
      (now.getTime() - timer.startTime.getTime()) / 1000
    );
    const timeRemaining = Math.max(0, timer.duration - elapsed);

    // Check if timer should explode (only if not already defused or exploded)
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
      timer.isExploded = true;
      timer.explodedAt = new Date();
    }

    return NextResponse.json({
      success: true,
      timer: {
        startTime: timer.startTime,
        duration: timer.duration,
        timeRemaining,
        isDefused: timer.isDefused,
        isExploded: timer.isExploded,
        defusedAt: timer.defusedAt,
        explodedAt: timer.explodedAt,
        targetMarketCap: timer.targetMarketCap,
        finalMarketCap: timer.finalMarketCap,
        distributionTx: timer.distributionTx,
      },
    });
  } catch (error) {
    console.error("Timer GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch timer" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/timer
 * Actions: reset, defuse, explode, update
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, duration, targetMarketCap, finalMarketCap, distributionTx } =
      body;

    const { db } = await connectToDatabase();
    const timersCollection = db.collection<TimerDocument>("timers");

    switch (action) {
      case "reset": {
        // Reset timer to start fresh
        const newDuration = duration || DEFAULT_DURATION;
        const newTarget = targetMarketCap || TARGET_MARKET_CAP;

        await timersCollection.updateOne(
          { _id: TIMER_ID },
          {
            $set: {
              startTime: new Date(),
              duration: newDuration,
              isDefused: false,
              isExploded: false,
              defusedAt: undefined,
              explodedAt: undefined,
              targetMarketCap: newTarget,
              finalMarketCap: undefined,
              distributionTx: undefined,
              updatedAt: new Date(),
            },
          },
          { upsert: true }
        );

        return NextResponse.json({
          success: true,
          message: "Timer reset",
          timer: {
            startTime: new Date(),
            duration: newDuration,
            timeRemaining: newDuration,
            isDefused: false,
            isExploded: false,
            targetMarketCap: newTarget,
          },
        });
      }

      case "defuse": {
        // Mark timer as defused (market cap reached)
        await timersCollection.updateOne(
          { _id: TIMER_ID },
          {
            $set: {
              isDefused: true,
              defusedAt: new Date(),
              finalMarketCap: finalMarketCap,
              distributionTx: distributionTx,
              updatedAt: new Date(),
            },
          }
        );

        return NextResponse.json({
          success: true,
          message: "Bomb defused!",
        });
      }

      case "explode": {
        // Force explosion (admin/testing)
        await timersCollection.updateOne(
          { _id: TIMER_ID },
          {
            $set: {
              isExploded: true,
              explodedAt: new Date(),
              finalMarketCap: finalMarketCap,
              updatedAt: new Date(),
            },
          },
        );

        return NextResponse.json({
          success: true,
          message: "Bomb exploded",
        });
      }

      case "update": {
        // Update specific fields
        const updates: Partial<TimerDocument> = { updatedAt: new Date() };
        if (duration !== undefined) updates.duration = duration;
        if (targetMarketCap !== undefined)
          updates.targetMarketCap = targetMarketCap;

        await timersCollection.updateOne({ _id: TIMER_ID }, { $set: updates });

        return NextResponse.json({
          success: true,
          message: "Timer updated",
        });
      }

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Timer POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update timer" },
      { status: 500 }
    );
  }
}