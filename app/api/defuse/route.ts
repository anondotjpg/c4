import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, TimerDocument } from "@/lib/mongodb";
import { getTopHolders, calculateDistribution } from "@/lib/helius";
import { claimCreatorFees, distributeSol, getClaimableFees } from "@/lib/pumpportal";

const TIMER_ID = "global_bomb_timer";
const TOKEN_MINT = process.env.TOKEN_MINT || "FohpGCNk3BkRu9hwEEKs7aVfSVe7yZvyrekVLQptpump";
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || "";

/**
 * POST /api/defuse
 * Webhook endpoint called when market cap goal is reached
 * Triggers: defuse timer → claim fees → distribute to holders
 * 
 * Body:
 * - marketCap: current market cap (USD)
 * - secret: webhook secret for authentication
 * - autoDistribute: if true, automatically claim and distribute (default: true)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { marketCap, secret, autoDistribute = true } = body;

    // Verify webhook secret if configured
    if (WEBHOOK_SECRET && secret !== WEBHOOK_SECRET) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { db } = await connectToDatabase();
    const timersCollection = db.collection<TimerDocument>("timers");
    const distributionsCollection = db.collection("distributions");

    // Get current timer
    const timer = await timersCollection.findOne({ _id: TIMER_ID });

    if (!timer) {
      return NextResponse.json(
        { success: false, error: "No active timer" },
        { status: 400 }
      );
    }

    if (timer.isDefused) {
      return NextResponse.json({
        success: true,
        message: "Timer already defused",
        defusedAt: timer.defusedAt,
      });
    }

    if (timer.isExploded) {
      return NextResponse.json(
        { success: false, error: "Timer already exploded" },
        { status: 400 }
      );
    }

    // Check if market cap meets target
    if (marketCap < timer.targetMarketCap) {
      return NextResponse.json({
        success: false,
        error: "Market cap below target",
        current: marketCap,
        target: timer.targetMarketCap,
      });
    }

    // DEFUSE THE BOMB!
    console.log(`🎉 DEFUSING! Market cap: $${marketCap}`);

    await timersCollection.updateOne(
      { _id: TIMER_ID },
      {
        $set: {
          isDefused: true,
          defusedAt: new Date(),
          finalMarketCap: marketCap,
          updatedAt: new Date(),
        },
      }
    );

    // If auto-distribute is disabled, just return success
    if (!autoDistribute) {
      return NextResponse.json({
        success: true,
        message: "Bomb defused! Auto-distribute disabled.",
        defusedAt: new Date(),
        finalMarketCap: marketCap,
      });
    }

    // AUTO-DISTRIBUTE FLOW
    console.log("Starting auto-distribution...");

    // Step 1: Check claimable fees
    const claimableResult = await getClaimableFees(TOKEN_MINT);

    if (claimableResult.claimable <= 0) {
      // Update timer without distribution
      return NextResponse.json({
        success: true,
        message: "Bomb defused! No fees to distribute.",
        defusedAt: new Date(),
        finalMarketCap: marketCap,
        claimable: 0,
      });
    }

    // Step 2: Claim fees
    console.log(`Claiming ${claimableResult.claimable} SOL in fees...`);
    const claimResult = await claimCreatorFees(TOKEN_MINT);

    if (!claimResult.success) {
      // Timer is defused, but distribution failed
      return NextResponse.json({
        success: true,
        message: "Bomb defused! Fee claim failed.",
        defusedAt: new Date(),
        finalMarketCap: marketCap,
        claimError: claimResult.error,
      });
    }

    const amountClaimed = claimResult.amount || claimableResult.claimable;

    // Step 3: Fetch top 500 holders
    console.log("Fetching top 500 holders...");
    const holders = await getTopHolders(TOKEN_MINT, 500);

    if (!holders || holders.length === 0) {
      return NextResponse.json({
        success: true,
        message: "Bomb defused! No holders found for distribution.",
        defusedAt: new Date(),
        finalMarketCap: marketCap,
        amountClaimed,
        claimTx: claimResult.txSignature,
      });
    }

    // Step 4: Calculate weighted distribution
    const distribution = calculateDistribution(holders, amountClaimed);
    const validDistributions = distribution.filter(
      (d) => d.distributionAmount >= 0.000001
    );

    // Step 5: Distribute SOL
    console.log(`Distributing to ${validDistributions.length} holders...`);
    const distributeResult = await distributeSol(
      validDistributions.map((d) => ({
        wallet: d.wallet,
        amount: d.distributionAmount,
      }))
    );

    // Save distribution record
    const distributionRecord = {
      timerId: TIMER_ID,
      totalFeesClaimed: amountClaimed,
      totalDistributed: validDistributions.reduce(
        (sum, d) => sum + d.distributionAmount,
        0
      ),
      holdersCount: validDistributions.length,
      claimTx: claimResult.txSignature,
      distributions: validDistributions.map((d, i) => ({
        wallet: d.wallet,
        amount: d.distributionAmount,
        percentage: d.percentage,
        txSignature: distributeResult.signatures[Math.floor(i / 20)],
      })),
      status: distributeResult.success ? "completed" : "partial",
      createdAt: new Date(),
      completedAt: new Date(),
      errors: distributeResult.errors,
    };

    await distributionsCollection.insertOne(distributionRecord);

    // Update timer with distribution tx
    await timersCollection.updateOne(
      { _id: TIMER_ID },
      {
        $set: {
          distributionTx: claimResult.txSignature,
          updatedAt: new Date(),
        },
      }
    );

    return NextResponse.json({
      success: true,
      message: "🎉 Bomb defused and rewards distributed!",
      defusedAt: new Date(),
      finalMarketCap: marketCap,
      distribution: {
        amountClaimed,
        claimTx: claimResult.txSignature,
        holdersCount: validDistributions.length,
        totalDistributed: distributionRecord.totalDistributed,
        distributionTxs: distributeResult.signatures,
        errors: distributeResult.errors,
      },
    });
  } catch (error) {
    console.error("Defuse webhook error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Defuse failed" 
      },
      { status: 500 }
    );
  }
}