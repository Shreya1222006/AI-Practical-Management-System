const config = {
  port: process.env.PORT_API_GATEWAY || process.env.PORT || '4000',
  nodeEnv: process.env.NODE_ENV || 'development'
};

export default config;
