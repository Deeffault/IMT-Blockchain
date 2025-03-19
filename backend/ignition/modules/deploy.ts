import { ethers } from "hardhat";

async function main() {
  console.log("Déploiement du contrat Voting...");

  const voting = await ethers.deployContract("Voting");
  await voting.waitForDeployment();

  const address = await voting.getAddress();
  console.log(`Contrat Voting déployé à l'adresse: ${address}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
