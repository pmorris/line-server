module.exports = {
  app: {
    hostname: '127.0.0.1',
    port: 3000,
  },
  lineServer: {
    indexLineInterval: 5000,
    cache: {
      nodeCache: {
          ttl: 100,
          checkPeriod: 200,
      },
    },
  },
};