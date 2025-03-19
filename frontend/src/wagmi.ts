import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import {
  arbitrum,
  base,
  mainnet,
  optimism,
  polygon,
  sepolia,
  hardhat,
} from "wagmi/chains";

// Vous devez obtenir un ProjectID sur https://cloud.walletconnect.com/
export const config = getDefaultConfig({
  appName: "Voting DApp",
  projectId: "12e67a96c7cfc0d6800ab80ea7ad8a61", // Remplacez par votre vrai ProjectID
  chains: [
    sepolia, // Mettez Sepolia en premier puisque c'est le réseau où votre contrat est déployé
    hardhat,
    mainnet,
    polygon,
    optimism,
    arbitrum,
    base,
  ],
  ssr: true,
});