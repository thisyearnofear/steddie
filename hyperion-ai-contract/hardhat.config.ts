import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: "0.8.20",
  networks: {
    hyperion: {
      url: process.env.HYPERION_RPC_URL || "",
      accounts: process.env.HYPERION_PRIVATE_KEY ? [process.env.HYPERION_PRIVATE_KEY] : [],
      chainId: 133717
    }
  }
};

export default config;