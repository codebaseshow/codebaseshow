const env = require('env-var');

module.exports = () => {
  return {
    type: 'function',
    provider: 'aws',
    domainName: env.get('BACKEND_URL').required().asUrlObject().hostname,
    files: ['./build'],
    main: './build/handler.js',
    includeDependencies: true,
    environment: {
      FRONTEND_URL: env.get('FRONTEND_URL').required().asUrlString(),
      BACKEND_URL: env.get('BACKEND_URL').required().asUrlString(),
      EMAIL_ADDRESS: env.get('EMAIL_ADDRESS').required().asString(),
      MONGODB_STORE_CONNECTION_STRING: env
        .get('MONGODB_STORE_CONNECTION_STRING')
        .required()
        .asUrlString(),
      GITHUB_CLIENT_ID: env.get('GITHUB_CLIENT_ID').required().asString(),
      GITHUB_CLIENT_SECRET: env.get('GITHUB_CLIENT_SECRET').required().asString(),
      GITHUB_PERSONAL_ACCESS_TOKEN: env.get('GITHUB_PERSONAL_ACCESS_TOKEN').required().asString(),
      JWT_SECRET: env.get('JWT_SECRET').required().asString()
    },
    aws: {
      region: 'us-west-2',
      lambda: {
        executionRole: 'codebaseshow-website-backend-prod',
        memorySize: 1024,
        timeout: 15 * 60 // 15 minutes
      }
    }
  };
};
