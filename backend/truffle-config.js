require('dotenv').config();
const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",   // Localhost (Ganache, Hardhat, etc.)
      port: 8545,          // Default Ganache port
      network_id: "*",     // Match any network
    },

    sepolia: {
      provider: () =>
        new HDWalletProvider({
          mnemonic: {
            phrase: process.env.PHRASE   // 12/24-word seed phrase
          },
          providerOrUrl: process.env.RPC_URL,
           addressIndex: 2,        // <-- start at the 3rd derived address
        numberOfAddresses: 1,   // Infura/Alchemy RPC
        }),
      network_id: 11155111,  // Sepolia chain ID
      gas: 5500000,          // Adjust if you hit "out of gas"
      confirmations: 2,      // # of confs to wait
      timeoutBlocks: 200,
      skipDryRun: true
    }
  },

  mocha: {
    // timeout: 100000
  },

  compilers: {
    solc: {
      version: "0.8.20"  // Match pragma in your contracts
    }
  }
};
