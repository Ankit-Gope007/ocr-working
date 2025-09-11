module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",     // Localhost
      port: 8545,            // Ganache GUI default port
      network_id: "*",       // Match any network id
    },
  },

  mocha: {
    // timeout: 100000
  },

  compilers: {
    solc: {
      version: "0.8.20",     // Match pragma in Certificate.sol
    },
  },
};
