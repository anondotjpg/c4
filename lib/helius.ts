const HELIUS_API_KEY = process.env.HELIUS_API_KEY!;
const HELIUS_RPC_URL = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

export interface TokenHolder {
  owner: string;
  balance: number;
  percentage: number;
}

export interface HolderDistribution {
  wallet: string;
  balance: number;
  percentage: number;
  distributionAmount: number;
}

/**
 * Fetch top token holders using Helius DAS API
 */
export async function getTopHolders(
  mintAddress: string,
  limit: number = 500
): Promise<TokenHolder[]> {
  try {
    // Use Helius getTokenAccounts API
    const response = await fetch(HELIUS_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "helius-holders",
        method: "getTokenAccounts",
        params: {
          mint: mintAddress,
          limit: 1000, // Fetch more than needed to filter
          showZeroBalance: false,
        },
      }),
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(data.error.message || "Helius API error");
    }

    const accounts = data.result?.token_accounts || [];

    // Sort by balance descending and take top N
    const sortedAccounts = accounts
      .map((acc: any) => ({
        owner: acc.owner,
        balance: Number(acc.amount) / Math.pow(10, acc.decimals || 6),
      }))
      .sort((a: any, b: any) => b.balance - a.balance)
      .slice(0, limit);

    // Calculate total supply held by these accounts
    const totalHeld = sortedAccounts.reduce(
      (sum: number, acc: any) => sum + acc.balance,
      0
    );

    // Add percentage
    const holders: TokenHolder[] = sortedAccounts.map((acc: any) => ({
      owner: acc.owner,
      balance: acc.balance,
      percentage: totalHeld > 0 ? (acc.balance / totalHeld) * 100 : 0,
    }));

    return holders;
  } catch (error) {
    console.error("Error fetching holders from Helius:", error);
    throw error;
  }
}

/**
 * Alternative: Use Helius REST API for token holders
 */
export async function getTopHoldersREST(
  mintAddress: string,
  limit: number = 500
): Promise<TokenHolder[]> {
  try {
    const response = await fetch(
      `https://api.helius.xyz/v0/token-metadata?api-key=${HELIUS_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mintAccounts: [mintAddress],
          includeOffChain: true,
          disableCache: false,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Helius API error: ${response.status}`);
    }

    // For detailed holder data, use getTokenLargestAccounts RPC
    const rpcResponse = await fetch(HELIUS_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "getTokenLargestAccounts",
        params: [mintAddress],
      }),
    });

    const rpcData = await rpcResponse.json();
    const accounts = rpcData.result?.value || [];

    // Get owner addresses for each token account
    const holdersWithOwners = await Promise.all(
      accounts.slice(0, limit).map(async (acc: any) => {
        try {
          const ownerResponse = await fetch(HELIUS_RPC_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: 1,
              method: "getAccountInfo",
              params: [acc.address, { encoding: "jsonParsed" }],
            }),
          });
          const ownerData = await ownerResponse.json();
          const owner =
            ownerData.result?.value?.data?.parsed?.info?.owner || acc.address;

          return {
            owner,
            balance: Number(acc.uiAmount || 0),
            tokenAccount: acc.address,
          };
        } catch {
          return {
            owner: acc.address,
            balance: Number(acc.uiAmount || 0),
            tokenAccount: acc.address,
          };
        }
      })
    );

    const totalHeld = holdersWithOwners.reduce(
      (sum, acc) => sum + acc.balance,
      0
    );

    return holdersWithOwners.map((acc) => ({
      owner: acc.owner,
      balance: acc.balance,
      percentage: totalHeld > 0 ? (acc.balance / totalHeld) * 100 : 0,
    }));
  } catch (error) {
    console.error("Error fetching holders:", error);
    throw error;
  }
}

/**
 * Calculate weighted distribution amounts
 */
export function calculateDistribution(
  holders: TokenHolder[],
  totalAmount: number
): HolderDistribution[] {
  const totalPercentage = holders.reduce((sum, h) => sum + h.percentage, 0);

  return holders.map((holder) => ({
    wallet: holder.owner,
    balance: holder.balance,
    percentage: holder.percentage,
    distributionAmount:
      totalPercentage > 0
        ? (holder.percentage / totalPercentage) * totalAmount
        : 0,
  }));
}