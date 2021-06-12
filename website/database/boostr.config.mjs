export default () => ({
  type: 'database',

  stages: {
    development: {
      url: 'mongodb://localhost:15543/dev',
      platform: 'local'
    }
  }
});
