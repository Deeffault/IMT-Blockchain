export const VotingABI = [
  // ABI generated from your Voting.sol contract
  "function owner() view returns (address)",
  "function workflowStatus() view returns (uint8)",
  "function registerVoter(address _voterAddress)",
  "function startProposalsRegistration()",
  "function endProposalsRegistration()",
  "function startVotingSession()",
  "function endVotingSession()",
  "function tallyVotes()",
  "function addProposal(string calldata _description)",
  "function vote(uint _proposalId)",
  "function getProposalsCount() view returns (uint)",
  "function getWinningProposal() view returns (uint proposalId, string memory description, uint voteCount)",
  "function proposals(uint) view returns (string memory description, uint voteCount)",
  "function voters(address) view returns (bool isRegistered, bool hasVoted, address delegate, uint votedProposalId, uint weight)",
];
