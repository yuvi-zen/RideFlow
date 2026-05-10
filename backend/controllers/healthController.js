exports.healthCheck = (req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'RideFlow API is healthy',
    timestamp: new Date().toISOString()
  });
};
