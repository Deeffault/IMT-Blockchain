import React from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import AdminPanel from "../components/AdminPanel";
import VoterPanel from "../components/VoterPanel";
import ProposalList from "../components/ProposalList";
import ResultDisplay from "../components/ResultDisplay";
import VotingStatus from "../components/VotingStatus";
import { useAccount } from "wagmi";

const Home: React.FC = () => {
  const { isConnected } = useAccount();

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Système de Vote Décentralisé</h1>
            <ConnectButton />
          </div>
        </header>

        {isConnected ? (
          <div className="space-y-6">
            <VotingStatus />
            <ResultDisplay />
            <AdminPanel />
            <VoterPanel />
            <ProposalList />
          </div>
        ) : (
          <div className="bg-white p-8 rounded-lg shadow-lg text-center">
            <h2 className="text-2xl font-bold mb-4">
              Bienvenue sur la plateforme de vote
            </h2>
            <p className="mb-6">
              Connectez votre wallet pour participer au vote.
            </p>
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
