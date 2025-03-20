import { expect } from "chai";
import { ethers } from "hardhat";
import { Voting } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("Voting Contract", function () {
  let votingContract: Voting;
  let owner: HardhatEthersSigner;
  let voter1: HardhatEthersSigner;
  let voter2: HardhatEthersSigner;
  let voter3: HardhatEthersSigner;
  let nonVoter: HardhatEthersSigner;

  enum WorkflowStatus {
    RegisteringVoters,
    ProposalsRegistrationStarted,
    ProposalsRegistrationEnded,
    VotingSessionStarted,
    VotingSessionEnded,
    VotesTallied,
  }

  // Hook global pour déployer le contrat et récupérer les signers
  beforeEach(async function () {
    [owner, voter1, voter2, voter3, nonVoter] = await ethers.getSigners();
    const VotingFactory = await ethers.getContractFactory("Voting");
    votingContract = await VotingFactory.deploy();
    await votingContract.waitForDeployment();
  });

  // Fonctions d'aide pour simplifier la configuration dans les tests

  async function registerVoters(...addresses: string[]) {
    for (const addr of addresses) {
      await votingContract.registerVoter(addr);
    }
  }

  async function startProposalsRegistration() {
    await votingContract.startProposalsRegistration();
  }

  async function endProposalsRegistration() {
    await votingContract.endProposalsRegistration();
  }

  async function startVotingSession() {
    await votingContract.startVotingSession();
  }

  async function endVotingSession() {
    await votingContract.endVotingSession();
  }

  async function addProposal(proposal: string, signer: HardhatEthersSigner) {
    await votingContract.connect(signer).addProposal(proposal);
  }

  // Configurations spécifiques aux différents blocs de tests

  async function setupProposalsRegistrationForVoters() {
    await registerVoters(voter1.address, voter2.address);
    await startProposalsRegistration();
  }

  async function setupVotingProcess() {
    await registerVoters(voter1.address, voter2.address, voter3.address);
    await startProposalsRegistration();
    await addProposal("Proposition 1", voter1);
    await addProposal("Proposition 2", voter2);
    await endProposalsRegistration();
    await startVotingSession();
  }

  async function setupDelegation() {
    await registerVoters(voter1.address, voter2.address, voter3.address);
    await startProposalsRegistration();
    await addProposal("Proposition 1", voter1);
    await endProposalsRegistration();
    await startVotingSession();
  }

  async function setupVoteTally() {
    await registerVoters(voter1.address, voter2.address, voter3.address);
    await startProposalsRegistration();
    await addProposal("Proposition 1", voter1);
    await addProposal("Proposition 2", voter2);
    await endProposalsRegistration();
    await startVotingSession();
    await votingContract.connect(voter1).vote(0);
    await votingContract.connect(voter2).vote(1);
    await votingContract.connect(voter3).vote(1);
    await endVotingSession();
  }

  async function setupAdvancedDelegation() {
    await registerVoters(voter1.address, voter2.address, voter3.address);
    await startProposalsRegistration();
    await addProposal("Proposition A", voter1);
    await endProposalsRegistration();
    await startVotingSession();
  }

  async function setupBuyWeight() {
    await registerVoters(voter1.address, voter2.address);
    await startProposalsRegistration();
    await addProposal("Proposition A", voter1);
    await endProposalsRegistration();
    await startVotingSession();
  }

  // ======================= TESTS =======================

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
      await startProposalsRegistration();
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
      await startProposalsRegistration();
      await endProposalsRegistration();
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
      await startProposalsRegistration();
      await endProposalsRegistration();
      await startVotingSession();
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
      await startProposalsRegistration();
      await endProposalsRegistration();
      await startVotingSession();
      await endVotingSession();
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

      await startProposalsRegistration();
      await expect(votingContract.startVotingSession()).to.be.revertedWith(
        "Proposals registration phase is not finished."
      );

      await endProposalsRegistration();
      await expect(votingContract.endVotingSession()).to.be.revertedWith(
        "Voting session is not active."
      );

      await startVotingSession();
      await expect(votingContract.tallyVotes()).to.be.revertedWith(
        "Voting session is not ended yet."
      );
    });
  });

  describe("Gestion des propositions", function () {
    it("devrait permettre à un votant enregistré d'ajouter une proposition", async function () {
      await setupProposalsRegistrationForVoters();
      await expect(votingContract.connect(voter1).addProposal("Proposition 1"))
        .to.emit(votingContract, "ProposalRegistered")
        .withArgs(0);

      const proposal = await votingContract.proposals(0);
      expect(proposal.description).to.equal("Proposition 1");
      expect(proposal.voteCount).to.equal(0);
    });

    it("ne devrait pas permettre d'ajouter une proposition vide", async function () {
      await setupProposalsRegistrationForVoters();
      await expect(
        votingContract.connect(voter1).addProposal("")
      ).to.be.revertedWith("Proposal description cannot be empty.");
    });

    it("ne devrait pas permettre à un non-votant d'ajouter une proposition", async function () {
      await setupProposalsRegistrationForVoters();
      await expect(
        votingContract.connect(nonVoter).addProposal("Proposition non-votant")
      ).to.be.revertedWith("Only registered voters can call this.");
    });

    it("devrait correctement compter le nombre de propositions", async function () {
      await setupProposalsRegistrationForVoters();
      await votingContract.connect(voter1).addProposal("Proposition 1");
      await votingContract.connect(voter2).addProposal("Proposition 2");
      expect(await votingContract.getProposalsCount()).to.equal(2);
    });

    it("ne devrait pas permettre d'ajouter une proposition hors de la phase d'enregistrement", async function () {
      await setupProposalsRegistrationForVoters();
      await endProposalsRegistration();
      await expect(
        votingContract.connect(voter1).addProposal("Proposition tardive")
      ).to.be.revertedWith("Proposals registration phase is not open.");
    });
  });

  describe("Processus de vote", function () {
    it("devrait permettre à un votant enregistré de voter pour une proposition", async function () {
      await setupVotingProcess();
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
      await setupVotingProcess();
      await votingContract.connect(voter1).vote(0);
      await expect(votingContract.connect(voter1).vote(1)).to.be.revertedWith(
        "You have already voted."
      );
    });

    it("ne devrait pas permettre de voter pour une proposition inexistante", async function () {
      await setupVotingProcess();
      await expect(votingContract.connect(voter1).vote(99)).to.be.revertedWith(
        "Invalid proposal ID."
      );
    });

    it("ne devrait pas permettre de voter hors de la phase de vote", async function () {
      await setupVotingProcess();
      await endVotingSession();
      await expect(votingContract.connect(voter1).vote(0)).to.be.revertedWith(
        "Voting session is not open."
      );
    });
  });

  describe("Processus de délégation", function () {
    it("devrait permettre à un votant de déléguer son vote", async function () {
      await setupDelegation();
      await expect(votingContract.connect(voter1).delegate(voter2.address))
        .to.emit(votingContract, "VoterDelegated")
        .withArgs(voter1.address, voter2.address);

      const delegator = await votingContract.voters(voter1.address);
      expect(delegator.hasVoted).to.be.true;
      expect(delegator.delegate).to.equal(voter2.address);

      const delegate = await votingContract.voters(voter2.address);
      expect(delegate.weight).to.equal(2);
    });

    it("devrait transférer le poids au délégué même en cas de délégation en chaîne", async function () {
      await setupDelegation();
      await votingContract.connect(voter1).delegate(voter2.address);
      await votingContract.connect(voter2).delegate(voter3.address);

      const delegate = await votingContract.voters(voter3.address);
      expect(delegate.weight).to.equal(3);
    });

    it("ne devrait pas permettre de déléguer à soi-même", async function () {
      await setupDelegation();
      await expect(
        votingContract.connect(voter1).delegate(voter1.address)
      ).to.be.revertedWith("Self-delegation is not allowed.");
    });

    it("ne devrait pas permettre de déléguer à un non-votant", async function () {
      await setupDelegation();
      await expect(
        votingContract.connect(voter1).delegate(nonVoter.address)
      ).to.be.revertedWith("Delegate must be a registered voter.");
    });

    it("ne devrait pas permettre de déléguer après avoir voté", async function () {
      await setupDelegation();
      await votingContract.connect(voter1).vote(0);
      await expect(
        votingContract.connect(voter1).delegate(voter2.address)
      ).to.be.revertedWith("You have already voted.");
    });

    it("devrait ajouter le poids du délégateur à la proposition si le délégué a déjà voté", async function () {
      await setupDelegation();
      await votingContract.connect(voter2).vote(0);
      await votingContract.connect(voter1).delegate(voter2.address);
      const proposal = await votingContract.proposals(0);
      expect(proposal.voteCount).to.equal(2);
    });

    it("ne devrait pas permettre de créer une boucle de délégation", async function () {
      await setupDelegation();
      await votingContract.connect(voter1).delegate(voter2.address);
      await votingContract.connect(voter2).delegate(voter3.address);
      await expect(
        votingContract.connect(voter3).delegate(voter1.address)
      ).to.be.revertedWith("Found delegation loop.");
    });
  });

  describe("Comptabilisation des votes et résultats", function () {
    it("devrait correctement déterminer la proposition gagnante", async function () {
      await setupVoteTally();
      await votingContract.tallyVotes();
      expect(await votingContract.winningProposalId()).to.equal(1);

      const [id, description, voteCount] =
        await votingContract.getWinningProposal();
      expect(id).to.equal(1);
      expect(description).to.equal("Proposition 2");
      expect(voteCount).to.equal(2);
    });

    it("ne devrait pas permettre d'accéder aux résultats avant la comptabilisation", async function () {
      await setupVoteTally();
      await expect(votingContract.getWinningProposal()).to.be.revertedWith(
        "Votes have not been tallied yet."
      );
    });

    it("devrait gérer correctement les égalités en gardant le premier index avec le plus de votes", async function () {
      // Nouveau cycle pour tester l'égalité
      const VotingFactory = await ethers.getContractFactory("Voting");
      votingContract = await VotingFactory.deploy();
      await votingContract.waitForDeployment();
      await registerVoters(voter1.address, voter2.address);
      await startProposalsRegistration();
      await addProposal("Proposition 1", voter1);
      await addProposal("Proposition 2", voter2);
      await endProposalsRegistration();
      await startVotingSession();
      await votingContract.connect(voter1).vote(0);
      await votingContract.connect(voter2).vote(1);
      await endVotingSession();
      await votingContract.tallyVotes();
      expect(await votingContract.winningProposalId()).to.equal(0);
    });
  });

  describe("Tests de fonctionnement complet", function () {
    it("devrait gérer correctement un cycle complet de vote", async function () {
      await votingContract.registerVoter(voter1.address);
      await votingContract.registerVoter(voter2.address);
      await votingContract.registerVoter(voter3.address);

      await startProposalsRegistration();
      await addProposal("Proposition 1", voter1);
      await addProposal("Proposition 2", voter2);
      await addProposal("Proposition 3", voter3);
      await endProposalsRegistration();

      await startVotingSession();
      await votingContract.connect(voter1).vote(0);
      await votingContract.connect(voter2).vote(1);
      await votingContract.connect(voter3).vote(1);
      await endVotingSession();

      await votingContract.tallyVotes();
      const [id, description, voteCount] =
        await votingContract.getWinningProposal();
      expect(id).to.equal(1);
      expect(description).to.equal("Proposition 2");
      expect(voteCount).to.equal(2);
    });
  });

  describe("Tests d'achat de poids de vote", function () {
    it("devrait permettre à un votant d'augmenter son poids de vote en payant", async function () {
      await setupBuyWeight();
      const weightBefore = (await votingContract.voters(voter1.address)).weight;

      await expect(
        votingContract.connect(voter1).buyWeight({ value: 1 })
      ).to.changeEtherBalances([voter1, votingContract], [-1, 1]);

      const weightAfter = (await votingContract.voters(voter1.address)).weight;
      expect(weightAfter).to.equal(weightBefore + BigInt(1));
    });

    it("devrait refléter le poids accru lors du vote", async function () {
      await setupBuyWeight();
      await votingContract.connect(voter1).buyWeight({ value: 2 });
      await votingContract.connect(voter1).vote(0);
      const proposal = await votingContract.proposals(0);
      expect(proposal.voteCount).to.equal(3);
    });

    it("ne devrait pas permettre d'acheter du poids après avoir voté", async function () {
      await setupBuyWeight();
      await votingContract.connect(voter1).vote(0);
      await expect(
        votingContract.connect(voter1).buyWeight({ value: 1 })
      ).to.be.revertedWith("You have already voted, cannot buy extra weight.");
    });

    it("ne devrait pas permettre d'envoyer un montant incorrect", async function () {
      await setupBuyWeight();
      await expect(
        votingContract.connect(voter1).buyWeight({ value: 0 })
      ).to.be.revertedWith(
        "Incorrect Ether value sent. Must be a multiple of 1 wei."
      );
    });

    it("ne devrait pas permettre à un non-votant d'acheter du poids", async function () {
      await setupBuyWeight();
      await expect(
        votingContract.connect(nonVoter).buyWeight({ value: 1 })
      ).to.be.revertedWith("Only registered voters can call this.");
    });

    it("devrait permettre à l'administrateur de retirer les fonds accumulés", async function () {
      await setupBuyWeight();
      await votingContract.connect(voter1).buyWeight({ value: 1 });
      await votingContract.connect(voter2).buyWeight({ value: 1 });
      await votingContract.connect(voter1).vote(0);
      await votingContract.connect(voter2).vote(0);
      await endVotingSession();
      await votingContract.tallyVotes();

      await expect(votingContract.withdrawFunds()).to.changeEtherBalance(
        owner,
        2
      );

      const contractAddress = await votingContract.getAddress();
      expect(await ethers.provider.getBalance(contractAddress)).to.equal(0n);
    });

    it("ne devrait pas permettre de retirer les fonds s'il n'y en a pas", async function () {
      await setupBuyWeight();
      await expect(votingContract.withdrawFunds()).to.be.revertedWith(
        "No funds to withdraw."
      );
    });
  });
});
