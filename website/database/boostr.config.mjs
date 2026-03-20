export default () => ({
  type: 'database',

  stages: {
    development: {
      url: process.env.DATABASE_URL || 'mongodb://localhost:15543/dev',
      ...(process.env.DATABASE_URL ? {} : {platform: 'local'})
    }
  }
});
