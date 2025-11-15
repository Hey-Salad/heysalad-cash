import { type NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { z } from "zod";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";
import { createPublicClient, http } from "viem";
import { polygon, base } from "viem/chains";

// Schema validation
const WalletIdSchema = z.object({
  walletId: z.string(),
  blockchain: z.enum(["polygon", "base", "arc"]),
});

const ResponseSchema = z.object({
  balance: z.string().optional(),
  error: z.string().optional(),
});

type WalletBalanceResponse = z.infer<typeof ResponseSchema>;

// USDC token addresses on each network
const USDC_ADDRESSES = {
  polygon: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  arc: "0x0000000000000000000000000000000000000000", // Update when available
};

// USDC has 6 decimals
const USDC_DECIMALS = 6;

export async function POST(
  req: NextRequest,
): Promise<NextResponse<WalletBalanceResponse>> {
  try {
    const body = await req.json();
    const parseResult = WalletIdSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid walletId format" },
        { status: 400 },
      );
    }

    const { walletId, blockchain } = parseResult.data;
    const walletAddress = walletId.toLowerCase() as `0x${string}`;
    const normalizedNetwork = blockchain.toUpperCase();

    // Get the Supabase client
    const supabase = await createSupabaseServerClient();

    try {
      // Query blockchain directly using viem
      let usdcBalance = "0";

      if (blockchain === "polygon") {
        const rpcUrl = process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon-rpc.com";
        const publicClient = createPublicClient({
          chain: polygon,
          transport: http(rpcUrl),
        });

        const tokenAddress = USDC_ADDRESSES.polygon as `0x${string}`;
        const result = await publicClient.readContract({
          address: tokenAddress,
          abi: [
            {
              name: "balanceOf",
              type: "function",
              stateMutability: "view",
              inputs: [{ name: "account", type: "address" }],
              outputs: [{ name: "", type: "uint256" }],
            },
          ],
          functionName: "balanceOf",
          args: [walletAddress],
        });

        // Convert from token units to human readable (USDC has 6 decimals)
        usdcBalance = (Number(result) / 10 ** USDC_DECIMALS).toString();
      } else if (blockchain === "base") {
        const rpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL || "https://mainnet.base.org";
        const publicClient = createPublicClient({
          chain: base,
          transport: http(rpcUrl),
        });

        const tokenAddress = USDC_ADDRESSES.base as `0x${string}`;
        const result = await publicClient.readContract({
          address: tokenAddress,
          abi: [
            {
              name: "balanceOf",
              type: "function",
              stateMutability: "view",
              inputs: [{ name: "account", type: "address" }],
              outputs: [{ name: "", type: "uint256" }],
            },
          ],
          functionName: "balanceOf",
          args: [walletAddress],
        });

        // Convert from token units to human readable (USDC has 6 decimals)
        usdcBalance = (Number(result) / 10 ** USDC_DECIMALS).toString();
      }

      console.log(`USDC balance for ${walletAddress} on ${blockchain}: ${usdcBalance}`);

      // Update wallet balance in database
      await supabase
        .from("wallets")
        .update({ balance: usdcBalance })
        .eq("wallet_address", walletAddress)
        .eq("blockchain", normalizedNetwork);

      return NextResponse.json({ balance: usdcBalance });
    } catch (error) {
      console.error("Error fetching balance from blockchain:", error);
      // Return 0 balance instead of error for better UX
      return NextResponse.json({ balance: "0" });
    }
  } catch (error) {
    console.error("Error in wallet balance endpoint:", error);

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 },
      );
    }

    // For any other errors, return 0 balance for better UX
    return NextResponse.json({ balance: "0" });
  }
}


