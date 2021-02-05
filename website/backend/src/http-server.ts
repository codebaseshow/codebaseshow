import {ComponentHTTPServer} from '@layr/component-http-server';
import env from 'env-var';

import {server} from './server';

const backendURL = env.get('BACKEND_URL').required().asUrlObject();

const port = Number(backendURL.port);

if (!port) {
  throw new Error(`'BACKEND_URL' environment variable should include a port`);
}

const httpServer = new ComponentHTTPServer(server, {port});
httpServer.start();
