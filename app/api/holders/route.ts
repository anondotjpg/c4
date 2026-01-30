import { NextRequest, NextResponse } from "next/server";
import { getTopHolders, getTopHoldersREST, calculateDistribution } from "@/lib/helius";

const TOKEN_MINT = process.env.TOKEN_MINT || "FohpGCNk3BkRu9hwEEKs7aVfSVe7yZvyrekVLQptpump";

/**
 * GET /api/holders
 * Fetch top token holders with optional distribution calculation
 * 
 * Query params:
 * - limit: number of holders (default 500)
 * - mint: token mint address (defaults to env TOKEN_MINT)
 * - distributeAmount: if provided, calculates weighted distribution
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get("limit") || "500");
    const mint = searchParams.get("mint") || TOKEN_MINT;
    const distributeAmount = searchParams.get("distributeAmount");

    // Validate limit
    if (limit < 1 || limit > 1000) {
      return NextResponse.json(
        { success: false, error: "Limit must be between 1 and 1000" },
        { status: 400 }
      );
    }

    // Fetch holders
    let holders;
    try {
      // Try the token accounts method first
      holders = await getTopHolders(mint, limit);
    } catch (error) {
      console.warn("Primary holder fetch failed, trying REST API:", error);
      // Fallback to REST API method
      holders = await getTopHoldersREST(mint, limit);
    }

    if (!holders || holders.length === 0) {
      return NextResponse.json({
        success: true,
        holders: [],
        count: 0,
        message: "No holders found for this token",
      });
    }

    // If distribution amount provided, calculate weighted amounts
    let distribution = null;
    if (distributeAmount) {
      const amount = parseFloat(distributeAmount);
      if (!isNaN(amount) && amount > 0) {
        distribution = calculateDistribution(holders, amount);
      }
    }

    return NextResponse.json({
      success: true,
      mint,
      holders: distribution || holders,
      count: holders.length,
      totalHeld: holders.reduce((sum, h) => sum + h.balance, 0),
      ...(distribution && { distributionAmount: parseFloat(distributeAmount!) }),
    });
  } catch (error) {
    console.error("Holders API error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to fetch holders" 
      },
      { status: 500 }
    );
  }
}