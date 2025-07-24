import { ethers } from "hardhat";

async function main() {
  const AIOracle = await ethers.getContractFactory("AIOracle");
  const aiOracle = await AIOracle.deploy();
  await aiOracle.deployed();
  console.log("AIOracle deployed to:", aiOracle.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});