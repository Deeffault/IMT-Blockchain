import type { NextApiRequest, NextApiResponse } from "next";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";
import { VotingABI } from "../../contracts/VotingABI";

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(),
});

const CONTRACT_ADDRESS =
  "0xb3901BCF58a3e17e3B108DC42Eec7BD59780dC56" as `0x${string}`;

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;

  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: "Invalid proposal ID" });
  }

  try {
    // Utiliser la fonction "proposals" au lieu de "getProposal"
    const proposal = await publicClient.readContract({
      address: CONTRACT_ADDRESS,
      abi: VotingABI,
      functionName: "proposals",
      args: [BigInt(id)],
    });

    // Vérifier que la réponse a la structure attendue
    if (proposal && Array.isArray(proposal) && proposal.length >= 2) {
      return res.status(200).json({
        description: proposal[0],
        voteCount: proposal[1].toString(),
      });
    } else {
      return res.status(500).json({ error: "Unexpected proposal format" });
    }
  } catch (error) {
    console.error("Error fetching proposal:", error);
    return res.status(500).json({ error: "Failed to fetch proposal" });
  }
}
