const app = require('./app');
const { port, nodeEnv } = require('./config/env');

app.listen(port, () => {
  console.log(`RideFlow backend is running in ${nodeEnv} mode on port ${port}`);
});
