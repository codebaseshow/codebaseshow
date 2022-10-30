export default ({services}) => ({
  type: 'backend',

  dependsOn: 'database',

  environment: {
    FRONTEND_URL: services.frontend.url,
    BACKEND_URL: services.backend.url,
    DATABASE_URL: services.database.url
  },

  stages: {
    development: {
      url: 'http://localhost:15542/',
      platform: 'local'
    },
    production: {
      url: 'https://backend.codebase.show/',
      platform: 'aws',
      aws: {
        region: 'us-west-2',
        lambda: {
          executionRole: 'codebaseshow-website-backend-prod',
          memorySize: 1024
        }
      }
    }
  }
});
