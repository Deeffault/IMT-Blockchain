// SPDX-License-Identifier: MIT
pragma solidity ^0.8.29;

/// @title Voting DApp Smart Contract
/// @author Votre Nom
/// @notice Ce contrat permet d'organiser un vote avec enregistrement des votants, proposition de sujets, délégation de vote et comptabilisation des résultats.
contract Voting {
    // Énumération des différentes phases du processus de vote.
    enum WorkflowStatus {
        RegisteringVoters, // 0: Enregistrement des votants en cours
        ProposalsRegistrationStarted, // 1: Début de l'enregistrement des propositions
        ProposalsRegistrationEnded, // 2: Fin de l'enregistrement des propositions
        VotingSessionStarted, // 3: Ouverture de la session de vote
        VotingSessionEnded, // 4: Clôture de la session de vote
        VotesTallied // 5: Résultats comptabilisés
    }

    // Structure représentant un votant.
    struct Voter {
        bool isRegistered; // true si le votant est enregistré (autorisé à voter)
        bool hasVoted; // true si le votant a déjà voté ou délégué
        address delegate; // adresse vers laquelle ce votant a délégué son vote (0x0 si aucune délégation)
        uint votedProposalId; // l'ID de la proposition pour laquelle il a voté (si hasVoted est true et qu'il a voté directement)
        uint weight; // poids du vote (utile pour la délégation, vaut 1 par défaut pour un votant normal)
    }

    // Structure représentant une proposition.
    struct Proposal {
        string description; // Description (texte) de la proposition
        uint voteCount; // Nombre de votes reçus
    }

    address public owner; // Adresse de l'administrateur du vote (celui qui déploie le contrat)
    WorkflowStatus public workflowStatus; // Statut actuel du déroulement du vote
    mapping(address => Voter) public voters; // Mapping pour stocker les informations des votants par adresse
    Proposal[] public proposals; // Tableau dynamique des propositions enregistrées
    uint public winningProposalId; // ID de la proposition gagnante (défini une fois les votes comptés)

    // Événements émis par le contrat pour suivre les changements et actions.
    event VoterRegistered(address voterAddress); // Emis lorsqu'un nouveau votant est enregistré
    event ProposalRegistered(uint proposalId); // Emis lorsqu'une nouvelle proposition est enregistrée
    event Voted(address voter, uint proposalId); // Emis lorsqu'un votant a voté pour une proposition
    event VoterDelegated(address voter, address delegate); // Emis lorsqu'un votant délègue son vote à un autre
    event WorkflowStatusChange(
        WorkflowStatus previousStatus,
        WorkflowStatus newStatus
    ); // Emis lors d'un changement de phase

    /// @dev Le constructeur du contrat, appelé une fois lors du déploiement.
    /// Il initialise le propriétaire (administrateur) et positionne la phase initiale à "RegisteringVoters".
    constructor() {
        owner = msg.sender;
        workflowStatus = WorkflowStatus.RegisteringVoters;
    }

    // Modificateur pour restreindre l'accès de certaines fonctions à l'administrateur uniquement.
    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function.");
        _;
    }

    // Modificateur pour restreindre l'accès aux votants enregistrés uniquement.
    modifier onlyRegisteredVoter() {
        require(
            voters[msg.sender].isRegistered,
            "Only registered voters can call this."
        );
        _;
    }

    /// @notice Enregistre un nouvel électeur sur la liste des votants autorisés.
    /// @param _voterAddress Adresse Ethereum du votant à enregistrer.
    /// Seul l'administrateur peut appeler cette fonction et uniquement pendant la phase d'enregistrement des votants.
    function registerVoter(address _voterAddress) external onlyOwner {
        // Vérification que la phase courante est bien l'enregistrement des votants.
        require(
            workflowStatus == WorkflowStatus.RegisteringVoters,
            "Voters registration phase is not open."
        );
        // On s'assure que l'adresse n'a pas déjà été enregistrée auparavant.
        require(
            !voters[_voterAddress].isRegistered,
            "Voter already registered."
        );
        // On vérifie que l'adresse fournie est valide (non nulle).
        require(_voterAddress != address(0), "Invalid address.");

        // Enregistrement du votant avec les valeurs initiales.
        voters[_voterAddress] = Voter({
            isRegistered: true,
            hasVoted: false,
            delegate: address(0),
            votedProposalId: 0,
            weight: 1 // poids de vote initial = 1
        });
        emit VoterRegistered(_voterAddress); // Émission de l'événement d'enregistrement
    }

    /// @notice Démarre la phase d'enregistrement des propositions.
    /// Seul l'administrateur peut lancer cette phase, après la phase d'enregistrement des votants.
    function startProposalsRegistration() external onlyOwner {
        // Vérifie que la phase courante est bien "RegisteringVoters" (fin de l'enregistrement des votants).
        require(
            workflowStatus == WorkflowStatus.RegisteringVoters,
            "Registering voters phase is not active."
        );
        // Passage à la phase "ProposalsRegistrationStarted".
        workflowStatus = WorkflowStatus.ProposalsRegistrationStarted;
        emit WorkflowStatusChange(
            WorkflowStatus.RegisteringVoters,
            WorkflowStatus.ProposalsRegistrationStarted
        );
    }

    /// @notice Termine la phase d'enregistrement des propositions.
    /// Seul l'administrateur peut terminer cette phase, après que les propositions aient été enregistrées.
    function endProposalsRegistration() external onlyOwner {
        // Vérifie que la phase courante est bien "ProposalsRegistrationStarted".
        require(
            workflowStatus == WorkflowStatus.ProposalsRegistrationStarted,
            "Proposals registration phase is not active."
        );
        // Passage à la phase "ProposalsRegistrationEnded".
        workflowStatus = WorkflowStatus.ProposalsRegistrationEnded;
        emit WorkflowStatusChange(
            WorkflowStatus.ProposalsRegistrationStarted,
            WorkflowStatus.ProposalsRegistrationEnded
        );
    }

    /// @notice Démarre la phase de session de vote.
    /// Seul l'administrateur peut appeler cette fonction, une fois les propositions enregistrées (phase terminée).
    function startVotingSession() external onlyOwner {
        // Vérifie que la phase courante est bien "ProposalsRegistrationEnded".
        require(
            workflowStatus == WorkflowStatus.ProposalsRegistrationEnded,
            "Proposals registration phase is not finished."
        );
        // Passage à la phase "VotingSessionStarted".
        workflowStatus = WorkflowStatus.VotingSessionStarted;
        emit WorkflowStatusChange(
            WorkflowStatus.ProposalsRegistrationEnded,
            WorkflowStatus.VotingSessionStarted
        );
    }

    /// @notice Termine la session de vote.
    /// Seul l'administrateur peut appeler cette fonction, une fois que la session de vote est ouverte.
    function endVotingSession() external onlyOwner {
        // Vérifie que la phase courante est bien "VotingSessionStarted".
        require(
            workflowStatus == WorkflowStatus.VotingSessionStarted,
            "Voting session is not active."
        );
        // Passage à la phase "VotingSessionEnded".
        workflowStatus = WorkflowStatus.VotingSessionEnded;
        emit WorkflowStatusChange(
            WorkflowStatus.VotingSessionStarted,
            WorkflowStatus.VotingSessionEnded
        );
    }

    /// @notice Comptabilise les votes et détermine la proposition gagnante.
    /// Seul l'administrateur peut appeler cette fonction, une fois la session de vote terminée.
    function tallyVotes() external onlyOwner {
        // Vérifie que la phase courante est bien "VotingSessionEnded" (fin de session de vote).
        require(
            workflowStatus == WorkflowStatus.VotingSessionEnded,
            "Voting session is not ended yet."
        );
        // Recherche de la proposition ayant obtenu le plus de votes.
        uint winningVoteCount = 0;
        for (uint i = 0; i < proposals.length; i++) {
            if (proposals[i].voteCount > winningVoteCount) {
                winningVoteCount = proposals[i].voteCount;
                winningProposalId = i;
            }
        }
        // Passage à la phase "VotesTallied" (résultats disponibles).
        workflowStatus = WorkflowStatus.VotesTallied;
        emit WorkflowStatusChange(
            WorkflowStatus.VotingSessionEnded,
            WorkflowStatus.VotesTallied
        );
        // (Optionnel) On pourrait émettre un événement spécifique pour la proposition gagnante ici.
    }

    /// @notice Ajoute une nouvelle proposition à la liste des propositions.
    /// @param _description Description textuelle de la proposition.
    /// Cette fonction ne peut être appelée que par un votant enregistré pendant la phase d'enregistrement des propositions.
    function addProposal(
        string calldata _description
    ) external onlyRegisteredVoter {
        // Vérifie que la phase courante est bien "ProposalsRegistrationStarted".
        require(
            workflowStatus == WorkflowStatus.ProposalsRegistrationStarted,
            "Proposals registration phase is not open."
        );
        // On s'assure que la description n'est pas vide.
        require(
            bytes(_description).length > 0,
            "Proposal description cannot be empty."
        );
        // Création de la nouvelle proposition avec un compteur de votes à 0.
        proposals.push(Proposal({description: _description, voteCount: 0}));
        // Emission de l'événement avec l'ID de la nouvelle proposition (index dans le tableau).
        emit ProposalRegistered(proposals.length - 1);
    }

    /// @notice Vote pour une proposition donnée par son identifiant.
    /// @param _proposalId Index de la proposition dans la liste pour laquelle le votant veut voter.
    /// Cette fonction ne peut être appelée que par un votant enregistré pendant la session de vote.
    function vote(uint _proposalId) external onlyRegisteredVoter {
        // Vérifie que la phase courante est bien "VotingSessionStarted".
        require(
            workflowStatus == WorkflowStatus.VotingSessionStarted,
            "Voting session is not open."
        );
        Voter storage sender = voters[msg.sender];
        // S'assure que le votant n'a pas déjà voté (ni délégué son vote).
        require(!sender.hasVoted, "You have already voted.");
        // Vérifie que l'ID de proposition est valide (existe dans le tableau).
        require(_proposalId < proposals.length, "Invalid proposal ID.");

        // Marque le votant comme ayant voté et enregistre son choix.
        sender.hasVoted = true;
        sender.votedProposalId = _proposalId;
        // Incrémente le compteur de votes de la proposition choisie du poids du votant.
        proposals[_proposalId].voteCount += sender.weight;
        emit Voted(msg.sender, _proposalId);
    }

    /// @notice Délègue son vote à un autre votant.
    /// @param _to Adresse du votant à qui déléguer le droit de vote.
    /// Un votant enregistré qui n'a pas encore voté peut déléguer son vote à un autre votant enregistré.
    function delegate(address _to) external onlyRegisteredVoter {
        // Vérifie que la phase courante est bien "VotingSessionStarted" (on ne peut déléguer qu'en période de vote ouverte).
        require(
            workflowStatus == WorkflowStatus.VotingSessionStarted,
            "Voting session is not open."
        );
        Voter storage sender = voters[msg.sender];
        // Un votant ne doit pas avoir déjà voté (ni délégué précédemment).
        require(!sender.hasVoted, "You have already voted.");
        // Empêche la délégation à soi-même.
        require(_to != msg.sender, "Self-delegation is not allowed.");
        // Le destinataire de la délégation doit être un votant enregistré.
        require(
            voters[_to].isRegistered,
            "Delegate must be a registered voter."
        );

        // Recherche de la fin de la chaîne de délégation (pour gérer le cas où _to a lui-même délégué son vote).
        address finalDelegate = _to;
        // Parcourt les délégations successives jusqu'à trouver une adresse qui ne délègue pas plus loin.
        while (voters[finalDelegate].delegate != address(0)) {
            finalDelegate = voters[finalDelegate].delegate;
            // Vérifie l'absence de boucle de délégation (cycle).
            require(finalDelegate != msg.sender, "Found delegation loop.");
        }

        // Marque le votant initial comme ayant voté (il ne pourra plus ni voter ni redéléguer après).
        sender.hasVoted = true;
        sender.delegate = finalDelegate;
        // Vérifie si le destinataire final de la délégation a déjà voté.
        if (voters[finalDelegate].hasVoted) {
            // Si le déléguataire final a déjà voté, on ajoute le poids du votant actuel à la proposition choisie par le déléguataire.
            proposals[voters[finalDelegate].votedProposalId].voteCount += sender
                .weight;
            // Enregistre l'ID de la proposition sur laquelle le vote a finalement été comptabilisé pour information.
            sender.votedProposalId = voters[finalDelegate].votedProposalId;
        } else {
            // Si le déléguataire final n'a pas encore voté, on transfère le poids du votant au déléguataire.
            voters[finalDelegate].weight += sender.weight;
        }
        emit VoterDelegated(msg.sender, finalDelegate);
    }

    /// @notice Récupère le nombre total de propositions enregistrées.
    /// @return Le nombre de propositions dans le tableau des propositions.
    function getProposalsCount() external view returns (uint) {
        return proposals.length;
    }

    /// @notice Récupère les informations de la proposition gagnante une fois les votes comptés.
    /// @dev Doit être appelée après la phase de comptabilisation (VotesTallied), sinon elle va échouer.
    /// @return proposalId L'identifiant (index) de la proposition gagnante.
    /// @return description La description de la proposition gagnante.
    /// @return voteCount Le nombre de votes de la proposition gagnante.
    function getWinningProposal()
        external
        view
        returns (uint proposalId, string memory description, uint voteCount)
    {
        require(
            workflowStatus == WorkflowStatus.VotesTallied,
            "Votes have not been tallied yet."
        );
        proposalId = winningProposalId;
        description = proposals[proposalId].description;
        voteCount = proposals[proposalId].voteCount;
    }
}
