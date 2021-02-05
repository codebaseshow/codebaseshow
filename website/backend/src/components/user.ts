import {consume, expose} from '@layr/component';
import {secondaryIdentifier, attribute, method} from '@layr/storable';
import {role} from '@layr/with-roles';
import isEqual from 'lodash/isEqual';

import {Entity} from './entity';
import type {GitHub} from './github';

@expose({get: {call: true}, prototype: {load: {call: true}, save: {call: 'self'}}})
export class User extends Entity {
  ['constructor']!: typeof User;

  @consume() static GitHub: typeof GitHub;

  @secondaryIdentifier('number') githubId!: number;

  @expose({get: 'self'}) @attribute('string') username!: string;

  @attribute('string') email!: string;

  @attribute('string') name!: string;

  @expose({get: 'self'}) @attribute('string') avatarURL!: string;

  @attribute() githubData!: any;

  @expose({get: ['self', 'admin'], set: 'admin'})
  @attribute('boolean')
  isAdmin = false;

  @role('self') selfRoleResolver() {
    return this === this.constructor.Session.user;
  }

  @expose({call: true}) @method() static async signIn({
    code,
    state
  }: {
    code: string;
    state: string;
  }) {
    const {GitHub} = this;
    const {Session} = this;

    const accessToken = await GitHub.fetchAccessToken({code, state});

    const {githubId, username, email, name, avatarURL, githubData} = await GitHub.fetchUser({
      accessToken
    });

    let user = await this.get({githubId}, {githubData: true}, {throwIfMissing: false});

    if (user !== undefined) {
      if (!isEqual(githubData, user.githubData)) {
        Object.assign(user, {username, email, name, avatarURL, githubData});
        await user.save();
      }
    } else {
      user = new this({githubId, username, email, name, avatarURL, githubData});
      await user.save();
    }

    Session.token = Session.generateToken(user.id);
  }
}
