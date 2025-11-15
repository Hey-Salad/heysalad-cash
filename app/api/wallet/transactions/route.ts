import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { polygon, base } from "viem/chains";
import axios from "axios";

// Schema for validating request parameters
const WalletIdSchema = z.object({
  walletId: z.string().regex(/^0x[a-fA-F0-9]{40}$/, {
    message: "Invalid Ethereum wallet address format",
  }),
  networkId: z.number().optional().default(polygon.id),
  pageSize: z.number().optional().default(50), // Maximum size for Circle API
  pageAfter: z.string().optional(),
  pageBefore: z.string().optional(),
  from: z.string().optional(), // ISO date format
  to: z.string().optional(), // ISO date format
});

// USDC token addresses on each network
const USDC_ADDRESSES: { [key: number]: string } = {
  [polygon.id]: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
  [base.id]: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
};

// Network names for display
const NETWORK_NAMES: { [key: number]: string } = {
  [polygon.id]: "Polygon",
  [base.id]: "Base",
};

// Explorer API endpoints
const EXPLORER_APIS: { [key: number]: string } = {
  [polygon.id]: "https://api.polygonscan.com/api",
  [base.id]: "https://api.basescan.org/api",
};

// Explorer API keys (optional but recommended for higher rate limits)
const EXPLORER_API_KEYS: { [key: number]: string | undefined } = {
  [polygon.id]: process.env.POLYGONSCAN_API_KEY,
  [base.id]: process.env.BASESCAN_API_KEY,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parseResult = WalletIdSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request parameters",
          details: parseResult.error.format(),
        },
        { status: 400 }
      );
    }

    const { walletId, networkId, pageSize } = parseResult.data;

    // Make sure we support the requested network
    if (!USDC_ADDRESSES[networkId]) {
      return NextResponse.json(
        { error: `Unsupported network ID: ${networkId}` },
        { status: 400 }
      );
    }

    const usdcAddress = USDC_ADDRESSES[networkId];
    const explorerApi = EXPLORER_APIS[networkId];
    const apiKey = EXPLORER_API_KEYS[networkId];

    // Query blockchain explorer for ERC-20 token transfers
    const params: any = {
      module: "account",
      action: "tokentx",
      contractaddress: usdcAddress,
      address: walletId,
      page: 1,
      offset: pageSize,
      sort: "desc",
    };

    if (apiKey) {
      params.apikey = apiKey;
    }

    const response = await axios.get(explorerApi, { params });

    if (response.data.status !== "1") {
      console.error("Explorer API error:", response.data);
      // Return empty array instead of error for better UX
      return NextResponse.json({
        transactions: [],
        pagination: {
          hasMore: false,
        },
      });
    }

    // Define our transformed transaction type
    interface Transaction {
      hash: string;
      from?: string;
      to?: string;
      amount: string;
      timestamp: string;
      networkId: number;
      networkName: string;
      state: string;
      transactionType: "sent" | "received";
      id: string;
    }

    // Transform explorer API response
    const transactions: Transaction[] = response.data.result.map((tx: any) => {
      const isSent = tx.from.toLowerCase() === walletId.toLowerCase();
      const transactionType = isSent ? "sent" : "received";

      // Convert amount from token units (USDC has 6 decimals)
      const amount = (Number(tx.value) / 1e6).toString();

      return {
        hash: tx.hash,
        from: tx.from,
        to: tx.to,
        amount: amount,
        timestamp: new Date(Number(tx.timeStamp) * 1000).toISOString(),
        networkId: networkId,
        networkName: NETWORK_NAMES[networkId],
        state: "CONFIRMED",
        transactionType: transactionType,
        id: tx.hash,
      };
    });

    return NextResponse.json({
      transactions,
      pagination: {
        hasMore: response.data.result.length >= pageSize,
      },
    });
  } catch (error) {
    console.error("Error processing request:", error);

    return NextResponse.json(
      {
        error:
          "Internal server error: " +
          (error instanceof Error ? error.message : String(error)),
      },
      { status: 500 }
    );
  }
}
