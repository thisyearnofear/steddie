import { ethers } from "hardhat";

async function main() {
  const AIOracle = await ethers.getContractFactory("AIOracle");
  const aiOracle = await AIOracle.deploy();
  await aiOracle.deployed();
  console.log("AIOracle deployed to:", aiOracle.address);

  const AddressMapper = await ethers.getContractFactory("AddressMapper");
  const addressMapper = await AddressMapper.deploy();
  await addressMapper.deployed();
  console.log("AddressMapper deployed to:", addressMapper.address);

  // SmartAccountBlueprint is not deployed yet (scaffold only)
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});