import { NextRequest, NextResponse } from "next/server";
import { claimCreatorFees, getClaimableFees } from "@/lib/pumpportal";

const TOKEN_MINT = process.env.TOKEN_MINT || "FohpGCNk3BkRu9hwEEKs7aVfSVe7yZvyrekVLQptpump";

/**
 * GET /api/claim
 * Check claimable creator fees
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const mint = searchParams.get("mint") || TOKEN_MINT;

    const result = await getClaimableFees(mint);

    return NextResponse.json({
      success: true,
      mint,
      claimable: result.claimable,
      error: result.error,
    });
  } catch (error) {
    console.error("Claim GET error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to check claimable fees" 
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/claim
 * Claim creator fees from PumpPortal
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mint = body.mint || TOKEN_MINT;

    // First check if there are fees to claim
    const claimableResult = await getClaimableFees(mint);
    
    if (claimableResult.claimable <= 0) {
      return NextResponse.json({
        success: false,
        error: "No fees available to claim",
        claimable: 0,
      });
    }

    // Claim the fees
    const result = await claimCreatorFees(mint);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      mint,
      amountClaimed: result.amount,
      txSignature: result.txSignature,
    });
  } catch (error) {
    console.error("Claim POST error:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Failed to claim fees" 
      },
      { status: 500 }
    );
  }
}