import { NextApiRequest, NextApiResponse } from "next";
import { createPublicClient, http } from "viem";
import { VotingABI } from "../contracts/VotingABI";

// Contract address - same as in your voting page
const CONTRACT_ADDRESS = "0x...";

// Configure your RPC URL based on the network your contract is deployed to
const RPC_URL = "https://sepolia.infura.io/v3/YOUR_INFURA_KEY"; // Example for Sepolia testnet

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const { id } = req.query;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Proposal ID is required" });
    }

    const publicClient = createPublicClient({
      transport: http(RPC_URL),
    });

    const proposalData = await publicClient.readContract({
      address: CONTRACT_ADDRESS as `0x${string}`,
      abi: VotingABI,
      functionName: "proposals",
      args: [parseInt(id)],
    });

    return res.status(200).json({
      description: proposalData[0],
      voteCount: proposalData[1],
    });
  } catch (error) {
    console.error("Error fetching proposal:", error);
    return res.status(500).json({ error: "Failed to fetch proposal" });
  }
}
