import {Storable} from '@layr/storable';
import {Routable, route} from '@layr/routable';
import {ComponentHTTPClient} from '@layr/component-http-client';
import React from 'react';
import {view, useBrowserRouter} from '@layr/react-integration';

import type {Application as BackendApplication} from '../../../backend/src/components/application';

export const getApplication = async ({backendURL}: {backendURL: string}) => {
  const client = new ComponentHTTPClient(backendURL, {mixins: [Storable]});

  const BackendApplicationProxy = (await client.getComponent()) as typeof BackendApplication;

  class Application extends Routable(BackendApplicationProxy) {
    @view() static Root() {
      const [router, isReady] = useBrowserRouter(this);

      if (!isReady) {
        return null;
      }

      const content = router.callCurrentRoute({
        fallback: () => <div>Page not found</div>
      });

      return (
        <div>
          <h1>{this.displayName}</h1>
          {content}
        </div>
      );
    }

    @route('/') @view() static Home() {
      return <h2>Home</h2>;
    }
  }

  return Application;
};
