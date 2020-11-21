import {createAWSLambdaHandlerForComponentServer} from '@layr/aws-integration';

import {server} from './server';

export const handler = createAWSLambdaHandlerForComponentServer(server);
