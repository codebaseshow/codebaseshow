import ReactDOM from 'react-dom';
import {jsx} from '@emotion/react';
import {EmotionStarter} from '@emotion-starter/react';
import {EmotionKit} from '@emotion-kit/react';

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

    await Application.Session.loadUser();

    content = (
      <EmotionStarter
        mode={'dark'}
        theme={{
          colors: {
            primary: {
              normal: '#ea80fc',
              highlighted: '#f3a8f0',
              muted: '#994499',
              textOnNormal: '#000000'
            }
          },
          fontFamilies: {body: "'Open Sans', sans-serif", heading: "'Open Sans', sans-serif"}
        }}
      >
        <EmotionKit>
          <Application.Root />
        </EmotionKit>
      </EmotionStarter>
    );
  } catch (err) {
    console.error(err);

    content = <pre>{err.stack}</pre>;
  }

  ReactDOM.render(content, document.getElementById('root'));
})();
