import React from 'react';
import ReactDOM from 'react-dom';

import {getApplication} from './components/application';

const backendURL = process.env.BACKEND_URL;

if (!backendURL) {
  throw new Error(`'BACKEND_URL' environment variable is missing`);
}

(async () => {
  let content;

  try {
    const Application = await getApplication({backendURL});

    if (process.env.NODE_ENV !== 'production') {
      (window as any).Application = Application; // For debugging
    }

    content = <Application.Root />;
  } catch (err) {
    console.error(err);

    content = <pre>{err.stack}</pre>;
  }

  ReactDOM.render(content, document.getElementById('root'));
})();
