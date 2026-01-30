import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  VersionedTransaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  createAssociatedTokenAccountInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import bs58 from "bs58";

const HELIUS_API_KEY = process.env.HELIUS_API_KEY!;
const PUMPPORTAL_API_KEY = process.env.PUMPPORTAL_API_KEY || "";
const CREATOR_WALLET_SECRET = process.env.CREATOR_WALLET_SECRET!;

// Use devnet for testing
const RPC_URL =
  process.env.SOLANA_RPC_URL ||
  `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

export const connection = new Connection(RPC_URL, "confirmed");

export function getCreatorWallet(): Keypair {
  if (!CREATOR_WALLET_SECRET) {
    throw new Error("CREATOR_WALLET_SECRET not configured");
  }
  return Keypair.fromSecretKey(bs58.decode(CREATOR_WALLET_SECRET));
}

/**
 * Claim creator fees from PumpPortal
 * Based on: https://pumpportal.fun/creator-fee
 */
export async function claimCreatorFees(mintAddress: string): Promise<{
  success: boolean;
  amount?: number;
  txSignature?: string;
  error?: string;
}> {
  try {
    const wallet = getCreatorWallet();

    // Request claim transaction from PumpPortal
    const response = await fetch(
      "https://pumpportal.fun/api/claim-creator-fees",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(PUMPPORTAL_API_KEY && {
            Authorization: `Bearer ${PUMPPORTAL_API_KEY}`,
          }),
        },
        body: JSON.stringify({
          mint: mintAddress,
          wallet: wallet.publicKey.toBase58(),
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PumpPortal API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    // If PumpPortal returns a transaction to sign
    if (data.transaction) {
      const txBuffer = Buffer.from(data.transaction, "base64");

      let tx: Transaction | VersionedTransaction;

      // Try to deserialize as VersionedTransaction first
      try {
        tx = VersionedTransaction.deserialize(txBuffer);
        (tx as VersionedTransaction).sign([wallet]);
      } catch {
        // Fall back to legacy Transaction
        tx = Transaction.from(txBuffer);
        tx.partialSign(wallet);
      }

      const signature = await connection.sendRawTransaction(tx.serialize(), {
        skipPreflight: false,
        preflightCommitment: "confirmed",
      });

      await connection.confirmTransaction(signature, "confirmed");

      return {
        success: true,
        amount: data.amount || 0,
        txSignature: signature,
      };
    }

    // If fees were claimed directly
    return {
      success: true,
      amount: data.amount || 0,
      txSignature: data.signature,
    };
  } catch (error) {
    console.error("Error claiming creator fees:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Get claimable creator fees balance
 */
export async function getClaimableFees(mintAddress: string): Promise<{
  claimable: number;
  error?: string;
}> {
  try {
    const wallet = getCreatorWallet();

    const response = await fetch(
      `https://pumpportal.fun/api/creator-fees/${mintAddress}?wallet=${wallet.publicKey.toBase58()}`,
      {
        headers: {
          ...(PUMPPORTAL_API_KEY && {
            Authorization: `Bearer ${PUMPPORTAL_API_KEY}`,
          }),
        },
      }
    );

    if (!response.ok) {
      throw new Error(`PumpPortal API error: ${response.status}`);
    }

    const data = await response.json();
    return { claimable: data.claimable || 0 };
  } catch (error) {
    console.error("Error fetching claimable fees:", error);
    return {
      claimable: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Distribute SOL to multiple wallets (weighted)
 */
export async function distributeSol(
  distributions: { wallet: string; amount: number }[]
): Promise<{
  success: boolean;
  signatures: string[];
  errors: string[];
}> {
  const wallet = getCreatorWallet();
  const signatures: string[] = [];
  const errors: string[] = [];

  // Batch distributions into transactions (max ~20 per tx due to size limits)
  const BATCH_SIZE = 20;
  const batches: { wallet: string; amount: number }[][] = [];

  for (let i = 0; i < distributions.length; i += BATCH_SIZE) {
    batches.push(distributions.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    try {
      const tx = new Transaction();
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash();

      tx.recentBlockhash = blockhash;
      tx.feePayer = wallet.publicKey;

      for (const dist of batch) {
        if (dist.amount < 0.000001) continue; // Skip dust amounts

        const lamports = Math.floor(dist.amount * 1e9);

        tx.add(
          require("@solana/web3.js").SystemProgram.transfer({
            fromPubkey: wallet.publicKey,
            toPubkey: new PublicKey(dist.wallet),
            lamports,
          })
        );
      }

      if (tx.instructions.length === 0) continue;

      const signature = await sendAndConfirmTransaction(connection, tx, [
        wallet,
      ]);
      signatures.push(signature);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Batch failed";
      errors.push(errMsg);
      console.error("Batch distribution error:", error);
    }
  }

  return {
    success: errors.length === 0,
    signatures,
    errors,
  };
}

/**
 * Distribute SPL tokens to multiple wallets (weighted)
 */
export async function distributeTokens(
  mintAddress: string,
  distributions: { wallet: string; amount: number }[],
  decimals: number = 6
): Promise<{
  success: boolean;
  signatures: string[];
  errors: string[];
}> {
  const wallet = getCreatorWallet();
  const mint = new PublicKey(mintAddress);
  const signatures: string[] = [];
  const errors: string[] = [];

  const sourceAta = await getAssociatedTokenAddress(mint, wallet.publicKey);

  // Batch distributions
  const BATCH_SIZE = 10; // Smaller batches for token transfers
  const batches: { wallet: string; amount: number }[][] = [];

  for (let i = 0; i < distributions.length; i += BATCH_SIZE) {
    batches.push(distributions.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    try {
      const tx = new Transaction();
      const { blockhash } = await connection.getLatestBlockhash();

      tx.recentBlockhash = blockhash;
      tx.feePayer = wallet.publicKey;

      for (const dist of batch) {
        if (dist.amount < 0.000001) continue;

        const destWallet = new PublicKey(dist.wallet);
        const destAta = await getAssociatedTokenAddress(mint, destWallet);

        // Check if ATA exists
        try {
          await getAccount(connection, destAta);
        } catch {
          // Create ATA if it doesn't exist
          tx.add(
            createAssociatedTokenAccountInstruction(
              wallet.publicKey,
              destAta,
              destWallet,
              mint
            )
          );
        }

        const rawAmount = BigInt(Math.floor(dist.amount * Math.pow(10, decimals)));

        tx.add(
          createTransferInstruction(
            sourceAta,
            destAta,
            wallet.publicKey,
            rawAmount
          )
        );
      }

      if (tx.instructions.length === 0) continue;

      const signature = await sendAndConfirmTransaction(connection, tx, [
        wallet,
      ]);
      signatures.push(signature);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : "Batch failed";
      errors.push(errMsg);
      console.error("Token distribution error:", error);
    }
  }

  return {
    success: errors.length === 0,
    signatures,
    errors,
  };
}