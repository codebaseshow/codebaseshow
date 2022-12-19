export default ({application, services}) => ({
  type: 'web-frontend',

  dependsOn: 'backend',

  environment: {
    FRONTEND_URL: services.frontend.url,
    BACKEND_URL: services.backend.url,
    GITHUB_CLIENT_ID: services.backend.environment.GITHUB_CLIENT_ID
  },

  rootComponent: './src/index.ts',

  html: {
    language: 'en',
    head: {
      title: application.name,
      metas: [
        {name: 'description', content: application.description},
        {charset: 'utf-8'},
        {name: 'viewport', content: 'width=device-width, initial-scale=1'},
        {'http-equiv': 'x-ua-compatible', 'content': 'ie=edge'}
      ],
      links: [
        {rel: 'icon', href: '/codebaseshow-favicon-4m2FvCHRAmJhS74DnqmsUk.immutable.png'},
        {
          rel: 'stylesheet',
          href: 'https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,400;0,600;0,700;1,400;1,600;1,700&display=swap'
        }
      ],
      style: `
        /* Set body colors ASAP to avoid a white page */
        body {
          color: #eceff1;
          background-color: #13191c;
        }
        /* Avoid an Emotion warning */
        h1:first-child,
        h2:first-child,
        h3:first-child,
        h4:first-child,
        h5:first-child,
        h6:first-child {
          margin-top: 0 !important;
        }
      `,
      scripts: [
        {
          'async': true,
          'defer': true,
          'data-domain': 'codebase.show',
          'src': 'https://plausible.io/js/plausible.js'
        }
      ]
    }
  },

  stages: {
    development: {
      url: 'http://localhost:15541/',
      platform: 'local'
    },
    production: {
      url: 'https://codebase.show/',
      platform: 'aws',
      aws: {
        region: 'us-west-2',
        cloudFront: {
          priceClass: 'PriceClass_100'
        }
      }
    }
  }
});
