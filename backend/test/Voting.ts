import { expect } from "chai";
import { ethers } from "hardhat";
import { Voting } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Voting Contract", function () {
  // Déclaration des variables
  let votingContract: Voting;
  let owner: HardhatEthersSigner;
  let voter1: HardhatEthersSigner;
  let voter2: HardhatEthersSigner;
  let voter3: HardhatEthersSigner;
  let nonVoter: HardhatEthersSigner;

  // Énumération des statuts de workflow pour faciliter les tests
  enum WorkflowStatus {
    RegisteringVoters,
    ProposalsRegistrationStarted,
    ProposalsRegistrationEnded,
    VotingSessionStarted,
    VotingSessionEnded,
    VotesTallied,
  }

  // Hook before - s'exécute avant chaque test
  beforeEach(async function () {
    // Récupération des signers (comptes) pour les tests
    [owner, voter1, voter2, voter3, nonVoter] = await ethers.getSigners();

    // Déploiement d'une nouvelle instance du contrat avant chaque test
    const VotingFactory = await ethers.getContractFactory("Voting");
    votingContract = await VotingFactory.deploy();

    // Vérification que le contrat est bien déployé
    await votingContract.waitForDeployment();
  });

  describe("Déploiement", function () {
    it("devrait définir le bon owner", async function () {
      expect(await votingContract.owner()).to.equal(owner.address);
    });

    it("devrait commencer avec le statut RegisteringVoters", async function () {
      const status = await votingContract.workflowStatus();
      expect(status).to.equal(WorkflowStatus.RegisteringVoters);
    });
  });

  describe("Enregistrement des votants", function () {
    it("devrait permettre à l'owner d'enregistrer un votant", async function () {
      await expect(votingContract.registerVoter(voter1.address))
        .to.emit(votingContract, "VoterRegistered")
        .withArgs(voter1.address);

      const voterInfo = await votingContract.voters(voter1.address);
      expect(voterInfo.isRegistered).to.be.true;
      expect(voterInfo.hasVoted).to.be.false;
      expect(voterInfo.weight).to.equal(1);
    });

    it("ne devrait pas permettre d'enregistrer un votant déjà enregistré", async function () {
      await votingContract.registerVoter(voter1.address);
      await expect(
        votingContract.registerVoter(voter1.address)
      ).to.be.revertedWith("Voter already registered.");
    });

    it("ne devrait pas permettre d'enregistrer l'adresse nulle", async function () {
      await expect(
        votingContract.registerVoter(
          "0x0000000000000000000000000000000000000000"
        )
      ).to.be.revertedWith("Invalid address.");
    });

    it("ne devrait pas permettre à un non-owner d'enregistrer un votant", async function () {
      await expect(
        votingContract.connect(voter1).registerVoter(voter2.address)
      ).to.be.revertedWith("Only owner can call this function.");
    });

    it("ne devrait pas permettre d'enregistrer un votant hors de la phase d'enregistrement", async function () {
      await votingContract.startProposalsRegistration();
      await expect(
        votingContract.registerVoter(voter1.address)
      ).to.be.revertedWith("Voters registration phase is not open.");
    });
  });

  describe("Changement de statut du workflow", function () {
    it("devrait permettre à l'owner de passer à la phase d'enregistrement des propositions", async function () {
      await expect(votingContract.startProposalsRegistration())
        .to.emit(votingContract, "WorkflowStatusChange")
        .withArgs(
          WorkflowStatus.RegisteringVoters,
          WorkflowStatus.ProposalsRegistrationStarted
        );

      const status = await votingContract.workflowStatus();
      expect(status).to.equal(WorkflowStatus.ProposalsRegistrationStarted);
    });

    it("devrait permettre à l'owner de terminer la phase d'enregistrement des propositions", async function () {
      await votingContract.startProposalsRegistration();
      await expect(votingContract.endProposalsRegistration())
        .to.emit(votingContract, "WorkflowStatusChange")
        .withArgs(
          WorkflowStatus.ProposalsRegistrationStarted,
          WorkflowStatus.ProposalsRegistrationEnded
        );

      const status = await votingContract.workflowStatus();
      expect(status).to.equal(WorkflowStatus.ProposalsRegistrationEnded);
    });

    it("devrait permettre à l'owner de démarrer la session de vote", async function () {
      await votingContract.startProposalsRegistration();
      await votingContract.endProposalsRegistration();
      await expect(votingContract.startVotingSession())
        .to.emit(votingContract, "WorkflowStatusChange")
        .withArgs(
          WorkflowStatus.ProposalsRegistrationEnded,
          WorkflowStatus.VotingSessionStarted
        );

      const status = await votingContract.workflowStatus();
      expect(status).to.equal(WorkflowStatus.VotingSessionStarted);
    });

    it("devrait permettre à l'owner de terminer la session de vote", async function () {
      await votingContract.startProposalsRegistration();
      await votingContract.endProposalsRegistration();
      await votingContract.startVotingSession();
      await expect(votingContract.endVotingSession())
        .to.emit(votingContract, "WorkflowStatusChange")
        .withArgs(
          WorkflowStatus.VotingSessionStarted,
          WorkflowStatus.VotingSessionEnded
        );

      const status = await votingContract.workflowStatus();
      expect(status).to.equal(WorkflowStatus.VotingSessionEnded);
    });

    it("devrait permettre à l'owner de comptabiliser les votes", async function () {
      await votingContract.startProposalsRegistration();
      await votingContract.endProposalsRegistration();
      await votingContract.startVotingSession();
      await votingContract.endVotingSession();
      await expect(votingContract.tallyVotes())
        .to.emit(votingContract, "WorkflowStatusChange")
        .withArgs(
          WorkflowStatus.VotingSessionEnded,
          WorkflowStatus.VotesTallied
        );

      const status = await votingContract.workflowStatus();
      expect(status).to.equal(WorkflowStatus.VotesTallied);
    });

    it("ne devrait pas permettre de sauter une étape dans le workflow", async function () {
      await expect(
        votingContract.endProposalsRegistration()
      ).to.be.revertedWith("Proposals registration phase is not active.");

      await votingContract.startProposalsRegistration();
      await expect(votingContract.startVotingSession()).to.be.revertedWith(
        "Proposals registration phase is not finished."
      );

      await votingContract.endProposalsRegistration();
      await expect(votingContract.endVotingSession()).to.be.revertedWith(
        "Voting session is not active."
      );

      await votingContract.startVotingSession();
      await expect(votingContract.tallyVotes()).to.be.revertedWith(
        "Voting session is not ended yet."
      );
    });
  });

  describe("Gestion des propositions", function () {
    beforeEach(async function () {
      // Enregistrement des votants
      await votingContract.registerVoter(voter1.address);
      await votingContract.registerVoter(voter2.address);

      // Début de la phase d'enregistrement des propositions
      await votingContract.startProposalsRegistration();
    });

    it("devrait permettre à un votant enregistré d'ajouter une proposition", async function () {
      await expect(votingContract.connect(voter1).addProposal("Proposition 1"))
        .to.emit(votingContract, "ProposalRegistered")
        .withArgs(0); // Premier index = 0

      const proposal = await votingContract.proposals(0);
      expect(proposal.description).to.equal("Proposition 1");
      expect(proposal.voteCount).to.equal(0);
    });

    it("ne devrait pas permettre d'ajouter une proposition vide", async function () {
      await expect(
        votingContract.connect(voter1).addProposal("")
      ).to.be.revertedWith("Proposal description cannot be empty.");
    });

    it("ne devrait pas permettre à un non-votant d'ajouter une proposition", async function () {
      await expect(
        votingContract.connect(nonVoter).addProposal("Proposition non-votant")
      ).to.be.revertedWith("Only registered voters can call this.");
    });

    it("devrait correctement compter le nombre de propositions", async function () {
      await votingContract.connect(voter1).addProposal("Proposition 1");
      await votingContract.connect(voter2).addProposal("Proposition 2");

      expect(await votingContract.getProposalsCount()).to.equal(2);
    });

    it("ne devrait pas permettre d'ajouter une proposition hors de la phase d'enregistrement", async function () {
      await votingContract.endProposalsRegistration();
      await expect(
        votingContract.connect(voter1).addProposal("Proposition tardive")
      ).to.be.revertedWith("Proposals registration phase is not open.");
    });
  });

  describe("Processus de vote", function () {
    beforeEach(async function () {
      // Enregistrement des votants
      await votingContract.registerVoter(voter1.address);
      await votingContract.registerVoter(voter2.address);
      await votingContract.registerVoter(voter3.address);

      // Passage à la phase d'enregistrement des propositions
      await votingContract.startProposalsRegistration();

      // Ajout de propositions
      await votingContract.connect(voter1).addProposal("Proposition 1");
      await votingContract.connect(voter2).addProposal("Proposition 2");

      // Passage à la phase de vote
      await votingContract.endProposalsRegistration();
      await votingContract.startVotingSession();
    });

    it("devrait permettre à un votant enregistré de voter pour une proposition", async function () {
      await expect(votingContract.connect(voter1).vote(0))
        .to.emit(votingContract, "Voted")
        .withArgs(voter1.address, 0);

      const voterInfo = await votingContract.voters(voter1.address);
      expect(voterInfo.hasVoted).to.be.true;
      expect(voterInfo.votedProposalId).to.equal(0);

      const proposal = await votingContract.proposals(0);
      expect(proposal.voteCount).to.equal(1);
    });

    it("ne devrait pas permettre de voter deux fois", async function () {
      await votingContract.connect(voter1).vote(0);
      await expect(votingContract.connect(voter1).vote(1)).to.be.revertedWith(
        "You have already voted."
      );
    });

    it("ne devrait pas permettre de voter pour une proposition inexistante", async function () {
      await expect(votingContract.connect(voter1).vote(99)).to.be.revertedWith(
        "Invalid proposal ID."
      );
    });

    it("ne devrait pas permettre de voter hors de la phase de vote", async function () {
      await votingContract.endVotingSession();
      await expect(votingContract.connect(voter1).vote(0)).to.be.revertedWith(
        "Voting session is not open."
      );
    });
  });

  describe("Processus de délégation", function () {
    beforeEach(async function () {
      // Enregistrement des votants
      await votingContract.registerVoter(voter1.address);
      await votingContract.registerVoter(voter2.address);
      await votingContract.registerVoter(voter3.address);

      // Passage à la phase de vote
      await votingContract.startProposalsRegistration();
      await votingContract.connect(voter1).addProposal("Proposition 1");
      await votingContract.endProposalsRegistration();
      await votingContract.startVotingSession();
    });

    it("devrait permettre à un votant de déléguer son vote", async function () {
      await expect(votingContract.connect(voter1).delegate(voter2.address))
        .to.emit(votingContract, "VoterDelegated")
        .withArgs(voter1.address, voter2.address);

      const delegator = await votingContract.voters(voter1.address);
      expect(delegator.hasVoted).to.be.true;
      expect(delegator.delegate).to.equal(voter2.address);

      const delegate = await votingContract.voters(voter2.address);
      expect(delegate.weight).to.equal(2); // Poids initial + délégation
    });

    it("devrait transférer le poids au délégué même en cas de délégation en chaîne", async function () {
      // voter1 délègue à voter2
      await votingContract.connect(voter1).delegate(voter2.address);

      // voter2 délègue à voter3
      await votingContract.connect(voter2).delegate(voter3.address);

      // voter3 doit avoir un poids de 3
      const delegate = await votingContract.voters(voter3.address);
      expect(delegate.weight).to.equal(3);
    });

    it("ne devrait pas permettre de déléguer à soi-même", async function () {
      await expect(
        votingContract.connect(voter1).delegate(voter1.address)
      ).to.be.revertedWith("Self-delegation is not allowed.");
    });

    it("ne devrait pas permettre de déléguer à un non-votant", async function () {
      await expect(
        votingContract.connect(voter1).delegate(nonVoter.address)
      ).to.be.revertedWith("Delegate must be a registered voter.");
    });

    it("ne devrait pas permettre de déléguer après avoir voté", async function () {
      await votingContract.connect(voter1).vote(0);
      await expect(
        votingContract.connect(voter1).delegate(voter2.address)
      ).to.be.revertedWith("You have already voted.");
    });

    it("devrait ajouter le poids du délégateur à la proposition si le délégué a déjà voté", async function () {
      // voter2 vote pour la proposition 0
      await votingContract.connect(voter2).vote(0);

      // voter1 délègue à voter2
      await votingContract.connect(voter1).delegate(voter2.address);

      // La proposition 0 doit avoir un poids de 2
      const proposal = await votingContract.proposals(0);
      expect(proposal.voteCount).to.equal(2);
    });

    it("ne devrait pas permettre de créer une boucle de délégation", async function () {
      // voter1 délègue à voter2
      await votingContract.connect(voter1).delegate(voter2.address);

      // voter2 délègue à voter3
      await votingContract.connect(voter2).delegate(voter3.address);

      // voter3 ne peut pas déléguer à voter1
      await expect(
        votingContract.connect(voter3).delegate(voter1.address)
      ).to.be.revertedWith("Found delegation loop.");
    });
  });

  describe("Comptabilisation des votes et résultats", function () {
    beforeEach(async function () {
      // Enregistrement des votants
      await votingContract.registerVoter(voter1.address);
      await votingContract.registerVoter(voter2.address);
      await votingContract.registerVoter(voter3.address);

      // Passage à la phase d'enregistrement des propositions
      await votingContract.startProposalsRegistration();

      // Ajout de propositions
      await votingContract.connect(voter1).addProposal("Proposition 1");
      await votingContract.connect(voter2).addProposal("Proposition 2");

      // Passage à la phase de vote
      await votingContract.endProposalsRegistration();
      await votingContract.startVotingSession();

      // Votes
      await votingContract.connect(voter1).vote(0);
      await votingContract.connect(voter2).vote(1);
      await votingContract.connect(voter3).vote(1);

      // Fin de la session de vote
      await votingContract.endVotingSession();
    });

    it("devrait correctement déterminer la proposition gagnante", async function () {
      await votingContract.tallyVotes();

      expect(await votingContract.winningProposalId()).to.equal(1);

      const [id, description, voteCount] =
        await votingContract.getWinningProposal();
      expect(id).to.equal(1);
      expect(description).to.equal("Proposition 2");
      expect(voteCount).to.equal(2);
    });

    it("ne devrait pas permettre d'accéder aux résultats avant la comptabilisation", async function () {
      await expect(votingContract.getWinningProposal()).to.be.revertedWith(
        "Votes have not been tallied yet."
      );
    });

    it("devrait gérer correctement les égalités en gardant le premier index avec le plus de votes", async function () {
      // Redémarrer avec de nouveaux votes pour créer une égalité
      const VotingFactory = await ethers.getContractFactory("Voting");
      votingContract = await VotingFactory.deploy();
      await votingContract.waitForDeployment();

      // Enregistrement des votants
      await votingContract.registerVoter(voter1.address);
      await votingContract.registerVoter(voter2.address);

      // Passage à la phase d'enregistrement des propositions
      await votingContract.startProposalsRegistration();

      // Ajout de propositions
      await votingContract.connect(voter1).addProposal("Proposition 1");
      await votingContract.connect(voter2).addProposal("Proposition 2");

      // Passage à la phase de vote
      await votingContract.endProposalsRegistration();
      await votingContract.startVotingSession();

      // Votes avec égalité
      await votingContract.connect(voter1).vote(0);
      await votingContract.connect(voter2).vote(1);

      // Fin de la session de vote et comptabilisation
      await votingContract.endVotingSession();
      await votingContract.tallyVotes();

      // La proposition 0 devrait être gagnante car c'est le premier index avec le même nombre de votes
      expect(await votingContract.winningProposalId()).to.equal(0);
    });
  });

  describe("Tests de fonctionnement complet", function () {
    it("devrait gérer correctement un cycle complet de vote", async function () {
      // 1. Enregistrement des votants
      await votingContract.registerVoter(voter1.address);
      await votingContract.registerVoter(voter2.address);
      await votingContract.registerVoter(voter3.address);

      // 2. Passage à la phase d'enregistrement des propositions
      await votingContract.startProposalsRegistration();

      // 3. Ajout de propositions
      await votingContract.connect(voter1).addProposal("Proposition 1");
      await votingContract.connect(voter2).addProposal("Proposition 2");
      await votingContract.connect(voter3).addProposal("Proposition 3");

      // 4. Fin de l'enregistrement des propositions
      await votingContract.endProposalsRegistration();

      // 5. Début de la session de vote
      await votingContract.startVotingSession();

      // 6. Votes et délégations
      await votingContract.connect(voter1).vote(0);
      await votingContract.connect(voter2).vote(1);
      await votingContract.connect(voter3).vote(1);

      // 7. Fin de la session de vote
      await votingContract.endVotingSession();

      // 8. Comptabilisation des votes
      await votingContract.tallyVotes();

      // 9. Vérification des résultats
      const [id, description, voteCount] =
        await votingContract.getWinningProposal();
      expect(id).to.equal(1);
      expect(description).to.equal("Proposition 2");
      expect(voteCount).to.equal(2);
    });
  });
});
