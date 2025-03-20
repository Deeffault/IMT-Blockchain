// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

/// @title Voting DApp Smart Contract with Payment for Extra Weight
/// @notice Ce contrat permet d'organiser un vote avec inscription, propositions, délégation, vote,
///         et achat de poids de vote.
contract Voting {
    // Enumération des différentes phases du vote.
    enum WorkflowStatus {
        RegisteringVoters,             
        ProposalsRegistrationStarted,  
        ProposalsRegistrationEnded,    
        VotingSessionStarted,          
        VotingSessionEnded,            
        VotesTallied                   
    }

    // Structure représentant un votant.
    struct Voter {
        bool isRegistered;   
        bool hasVoted;       
        address delegate;    
        uint votedProposalId;
        uint weight;         
    }

    // Structure représentant une proposition.
    struct Proposal {
        string description;  
        uint voteCount;      
    }

    address public owner;                
    WorkflowStatus public workflowStatus; 
    mapping(address => Voter) public voters; 
    Proposal[] public proposals;         
    uint public winningProposalId;       

    // Coût pour obtenir +1 de poids de vote.
    // La demande était de payer exactement 0.00000000000000000001 ETH, 
    // mais ce montant est inférieur au minimum supporté.
    // 1 wei correspond à 0.000000000000000001 ETH.
    uint public constant WEIGHT_COST = 1 wei;

    // Événements
    event VoterRegistered(address voterAddress);
    event ProposalRegistered(uint proposalId);
    event Voted(address voter, uint proposalId);
    event VoterDelegated(address voter, address delegate);
    event WorkflowStatusChange(WorkflowStatus previousStatus, WorkflowStatus newStatus);

    /// @dev Le constructeur initialise le propriétaire et positionne la phase initiale.
    constructor() {
        owner = msg.sender;
        workflowStatus = WorkflowStatus.RegisteringVoters;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function.");
        _;
    }

    modifier onlyRegisteredVoter() {
        require(voters[msg.sender].isRegistered, "Only registered voters can call this.");
        _;
    }

    /// @notice Enregistre un nouvel électeur.
    /// @param _voterAddress Adresse du votant à enregistrer.
    function registerVoter(address _voterAddress) external onlyOwner {
        require(workflowStatus == WorkflowStatus.RegisteringVoters, "Voters registration phase is not open.");
        require(!voters[_voterAddress].isRegistered, "Voter already registered.");
        require(_voterAddress != address(0), "Invalid address.");
        voters[_voterAddress] = Voter({
            isRegistered: true,
            hasVoted: false,
            delegate: address(0),
            votedProposalId: 0,
            weight: 1
        });
        emit VoterRegistered(_voterAddress);
    }

    /// @notice Démarre la phase d'enregistrement des propositions.
    function startProposalsRegistration() external onlyOwner {
        require(workflowStatus == WorkflowStatus.RegisteringVoters, "Registering voters phase is not active.");
        workflowStatus = WorkflowStatus.ProposalsRegistrationStarted;
        emit WorkflowStatusChange(WorkflowStatus.RegisteringVoters, WorkflowStatus.ProposalsRegistrationStarted);
    }

    /// @notice Termine la phase d'enregistrement des propositions.
    function endProposalsRegistration() external onlyOwner {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationStarted, "Proposals registration phase is not active.");
        workflowStatus = WorkflowStatus.ProposalsRegistrationEnded;
        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationStarted, WorkflowStatus.ProposalsRegistrationEnded);
    }

    /// @notice Démarre la session de vote.
    function startVotingSession() external onlyOwner {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationEnded, "Proposals registration phase is not finished.");
        workflowStatus = WorkflowStatus.VotingSessionStarted;
        emit WorkflowStatusChange(WorkflowStatus.ProposalsRegistrationEnded, WorkflowStatus.VotingSessionStarted);
    }

    /// @notice Termine la session de vote.
    function endVotingSession() external onlyOwner {
        require(workflowStatus == WorkflowStatus.VotingSessionStarted, "Voting session is not active.");
        workflowStatus = WorkflowStatus.VotingSessionEnded;
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionStarted, WorkflowStatus.VotingSessionEnded);
    }

    /// @notice Comptabilise les votes et détermine la proposition gagnante.
    function tallyVotes() external onlyOwner {
        require(workflowStatus == WorkflowStatus.VotingSessionEnded, "Voting session is not ended yet.");
        uint winningVoteCount = 0;
        for (uint i = 0; i < proposals.length; i++) {
            if (proposals[i].voteCount > winningVoteCount) {
                winningVoteCount = proposals[i].voteCount;
                winningProposalId = i;
            }
        }
        workflowStatus = WorkflowStatus.VotesTallied;
        emit WorkflowStatusChange(WorkflowStatus.VotingSessionEnded, WorkflowStatus.VotesTallied);
    }

    /// @notice Ajoute une nouvelle proposition.
    /// @param _description Description de la proposition.
    function addProposal(string calldata _description) external onlyRegisteredVoter {
        require(workflowStatus == WorkflowStatus.ProposalsRegistrationStarted, "Proposals registration phase is not open.");
        require(bytes(_description).length > 0, "Proposal description cannot be empty.");
        for (uint i = 0; i < proposals.length; i++) {
            require(keccak256(bytes(proposals[i].description)) != keccak256(bytes(_description)), "This proposal already exists.");
        }
        proposals.push(Proposal({description: _description, voteCount: 0}));
        emit ProposalRegistered(proposals.length - 1);
    }

    /// @notice Vote pour une proposition.
    /// @param _proposalId Index de la proposition votée.
    function vote(uint _proposalId) external onlyRegisteredVoter {
        require(workflowStatus == WorkflowStatus.VotingSessionStarted, "Voting session is not open.");
        Voter storage sender = voters[msg.sender];
        require(!sender.hasVoted, "You have already voted.");
        require(_proposalId < proposals.length, "Invalid proposal ID.");
        sender.hasVoted = true;
        sender.votedProposalId = _proposalId;
        proposals[_proposalId].voteCount += sender.weight;
        emit Voted(msg.sender, _proposalId);
    }

    /// @notice Délègue son vote à un autre votant.
    /// @param _to Adresse du votant à qui déléguer.
    function delegate(address _to) external onlyRegisteredVoter {
        require(workflowStatus == WorkflowStatus.VotingSessionStarted, "Voting session is not open.");
        Voter storage sender = voters[msg.sender];
        require(!sender.hasVoted, "You have already voted.");
        require(_to != msg.sender, "Self-delegation is not allowed.");
        require(voters[_to].isRegistered, "Delegate must be a registered voter.");

        address finalDelegate = _to;
        while (voters[finalDelegate].delegate != address(0)) {
            finalDelegate = voters[finalDelegate].delegate;
            require(finalDelegate != msg.sender, "Found delegation loop.");
        }
        sender.hasVoted = true;
        sender.delegate = finalDelegate;
        if (voters[finalDelegate].hasVoted) {
            proposals[voters[finalDelegate].votedProposalId].voteCount += sender.weight;
            sender.votedProposalId = voters[finalDelegate].votedProposalId;
        } else {
            voters[finalDelegate].weight += sender.weight;
        }
        emit VoterDelegated(msg.sender, finalDelegate);
    }

    /// @notice Permet à un votant enregistré d'acheter +1 de poids de vote en payant.
    /// @dev Le coût demandé est de 1 wei (0.000000000000000001 ETH).
    function buyWeight() external payable onlyRegisteredVoter {
    Voter storage sender = voters[msg.sender];
    require(!sender.hasVoted, "You have already voted, cannot buy extra weight.");
    require(msg.value > 0 && msg.value % WEIGHT_COST == 0, "Incorrect Ether value sent. Must be a multiple of 1 wei.");
    sender.weight += msg.value / WEIGHT_COST;
}


    /// @notice Permet à l'administrateur de retirer les fonds accumulés.
    function withdrawFunds() external onlyOwner {
        uint balance = address(this).balance;
        require(balance > 0, "No funds to withdraw.");
        (bool sent, ) = owner.call{value: balance}("");
        require(sent, "Failed to send Ether.");
    }

    /// @notice Retourne le nombre total de propositions.
    function getProposalsCount() external view returns (uint) {
        return proposals.length;
    }
    
    /// @notice Retourne la liste complète des propositions.
    function getProposals() external view returns (Proposal[] memory) {
        return proposals;
    }

    /// @notice Retourne les informations de la proposition gagnante une fois les votes comptabilisés.
    function getWinningProposal() external view returns (uint proposalId, string memory description, uint voteCount) {
        require(workflowStatus == WorkflowStatus.VotesTallied, "Votes have not been tallied yet.");
        proposalId = winningProposalId;
        description = proposals[proposalId].description;
        voteCount = proposals[proposalId].voteCount;
    }
}