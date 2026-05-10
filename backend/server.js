const app = require('./app');
const { port, nodeEnv } = require('./config/env');

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => {
    console.log(`RideFlow backend is running in ${nodeEnv} mode on port ${port}`);
  });
}

module.exports = app;
