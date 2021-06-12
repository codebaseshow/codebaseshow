export default () => ({
  stages: {
    development: {
      environment: {
        GITHUB_CLIENT_ID: '********',
        GITHUB_CLIENT_SECRET: '********',
        GITHUB_PERSONAL_ACCESS_TOKEN: '********',
        JWT_SECRET: '********'
      }
    },
    production: {
      environment: {
        GITHUB_CLIENT_ID: '********',
        GITHUB_CLIENT_SECRET: '********',
        GITHUB_PERSONAL_ACCESS_TOKEN: '********',
        JWT_SECRET: '********'
      }
    }
  }
});
