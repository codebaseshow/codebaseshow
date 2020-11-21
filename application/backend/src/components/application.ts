import {Component, provide, attribute, expose} from '@layr/component';

import {JWT} from './jwt';

export class Application extends Component {
  @provide() static JWT = JWT;

  @expose({get: true}) @attribute('string') static displayName = 'CodebaseShow';
}
