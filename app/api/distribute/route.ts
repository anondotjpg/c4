import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase, DistributionRecord } from "@/lib/mongodb";
import { getTopHolders, calculateDistribution } from "@/lib/helius";
import { distributeSol, distributeTokens, claimCreatorFees, getClaimableFees } from "@/lib/pumpportal";

const TOKEN_MINT = process.env.TOKEN_MINT || "FohpGCNk3BkRu9hwEEKs7aVfSVe7yZvyrekVLQptpump";

/**
 * GET /api/distribute
 * Get distribution history/status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const timerId = searchParams.get("timerId");

    const { db } = await connectToDatabase();
    const distributionsCollection = db.collection<DistributionRecord>("distributions");

    if (timerId) {
      // Get specific distribution
      const distribution = await distributionsCollection.findOne({ timerId });
      return NextResponse.json({ success: true, distribution });
    }

    // Get recent distributions
    const distributions = await distributionsCollection
      .find({})
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    return NextResponse.json({ success: true, distributions });
  } catch (error) {
    console.error("Distribute GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch distributions" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/distribute
 * Trigger fee claim + weighted distribution to top holders
 * 
 * Body:
 * - mint: token mint address
 * - timerId: associated timer ID
 * - type: "sol" or "token" (what to distribute)
 * - holdersLimit: number of top holders (default 500)
 * - dryRun: if true, calculate but don't execute
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      mint = TOKEN_MINT,
      timerId = "manual",
      type = "sol",
      holdersLimit = 500,
      dryRun = false,
    } = body;

    const { db } = await connectToDatabase();
    const distributionsCollection = db.collection<DistributionRecord>("distributions");

    // Step 1: Check claimable fees
    console.log("Checking claimable fees...");
    const claimableResult = await getClaimableFees(mint);

    if (claimableResult.error) {
      return NextResponse.json(
        { success: false, error: `Failed to check fees: ${claimableResult.error}` },
        { status: 500 }
      );
    }

    if (claimableResult.claimable <= 0) {
      return NextResponse.json({
        success: false,
        error: "No fees available to claim and distribute",
        claimable: 0,
      });
    }

    // Step 2: Fetch top holders
    console.log(`Fetching top ${holdersLimit} holders...`);
    const holders = await getTopHolders(mint, holdersLimit);

    if (!holders || holders.length === 0) {
      return NextResponse.json(
        { success: false, error: "No holders found for distribution" },
        { status: 400 }
      );
    }

    // Step 3: Calculate weighted distribution
    const totalToDistribute = claimableResult.claimable;
    const distribution = calculateDistribution(holders, totalToDistribute);

    // Filter out dust amounts
    const validDistributions = distribution.filter(
      (d) => d.distributionAmount >= 0.000001
    );

    // Dry run - return calculated distribution without executing
    if (dryRun) {
      return NextResponse.json({
        success: true,
        dryRun: true,
        claimable: totalToDistribute,
        holdersCount: validDistributions.length,
        distribution: validDistributions.slice(0, 50), // Preview first 50
        totalDistribution: validDistributions.reduce(
          (sum, d) => sum + d.distributionAmount,
          0
        ),
      });
    }

    // Create distribution record
    const distributionRecord: DistributionRecord = {
      timerId,
      totalFeesClaimed: 0,
      totalDistributed: 0,
      holdersCount: validDistributions.length,
      distributions: validDistributions.map((d) => ({
        wallet: d.wallet,
        amount: d.distributionAmount,
        percentage: d.percentage,
      })),
      status: "processing",
      createdAt: new Date(),
    };

    const insertResult = await distributionsCollection.insertOne(distributionRecord);
    const recordId = insertResult.insertedId;

    try {
      // Step 4: Claim the fees
      console.log("Claiming fees from PumpPortal...");
      const claimResult = await claimCreatorFees(mint);

      if (!claimResult.success) {
        await distributionsCollection.updateOne(
          { _id: recordId },
          {
            $set: {
              status: "failed",
              error: `Claim failed: ${claimResult.error}`,
            },
          }
        );

        return NextResponse.json(
          { success: false, error: `Failed to claim fees: ${claimResult.error}` },
          { status: 500 }
        );
      }

      const amountClaimed = claimResult.amount || totalToDistribute;

      // Update record with claimed amount
      await distributionsCollection.updateOne(
        { _id: recordId },
        { $set: { totalFeesClaimed: amountClaimed } }
      );

      // Step 5: Distribute to holders
      console.log(`Distributing ${amountClaimed} ${type} to ${validDistributions.length} holders...`);

      // Recalculate with actual claimed amount
      const finalDistribution = calculateDistribution(holders, amountClaimed);
      const finalValid = finalDistribution.filter(
        (d) => d.distributionAmount >= 0.000001
      );

      let distributeResult;
      if (type === "token") {
        distributeResult = await distributeTokens(
          mint,
          finalValid.map((d) => ({
            wallet: d.wallet,
            amount: d.distributionAmount,
          }))
        );
      } else {
        distributeResult = await distributeSol(
          finalValid.map((d) => ({
            wallet: d.wallet,
            amount: d.distributionAmount,
          }))
        );
      }

      // Update distribution record with results
      const totalDistributed = finalValid.reduce(
        (sum, d) => sum + d.distributionAmount,
        0
      );

      await distributionsCollection.updateOne(
        { _id: recordId },
        {
          $set: {
            totalDistributed,
            distributions: finalValid.map((d, i) => ({
              wallet: d.wallet,
              amount: d.distributionAmount,
              percentage: d.percentage,
              txSignature: distributeResult.signatures[Math.floor(i / 20)], // Batch reference
            })),
            status: distributeResult.success ? "completed" : "failed",
            completedAt: new Date(),
            error: distributeResult.errors.length > 0
              ? distributeResult.errors.join("; ")
              : undefined,
          },
        }
      );

      return NextResponse.json({
        success: distributeResult.success,
        claimTx: claimResult.txSignature,
        amountClaimed,
        holdersCount: finalValid.length,
        totalDistributed,
        distributionSignatures: distributeResult.signatures,
        errors: distributeResult.errors,
        recordId: recordId.toString(),
      });
    } catch (error) {
      // Update record on error
      await distributionsCollection.updateOne(
        { _id: recordId },
        {
          $set: {
            status: "failed",
            error: error instanceof Error ? error.message : "Distribution failed",
          },
        }
      );

      throw error;
    }
  } catch (error) {
    console.error("Distribute POST error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to distribute" 
      },
      { status: 500 }
    );
  }
}