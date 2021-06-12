import {expose, AttributeSelector} from '@layr/component';
import {secondaryIdentifier, attribute, method} from '@layr/storable';
import {role} from '@layr/with-roles';
import isEqual from 'lodash/isEqual';

import {Entity} from './entity';
import {GitHub} from '../github';
import {generateJWT, verifyJWT} from '../jwt';

const TOKEN_DURATION = 31536000000; // 1 year

@expose({get: {call: true}, prototype: {load: {call: true}, save: {call: 'self'}}})
export class User extends Entity {
  ['constructor']!: typeof User;

  @secondaryIdentifier('number') githubId!: number;

  @expose({get: 'self'}) @attribute('string') username!: string;

  @attribute('string') email!: string;

  @attribute('string') name!: string;

  @expose({get: 'self'}) @attribute('string') avatarURL!: string;

  @attribute() githubData!: any;

  @expose({get: ['self', 'admin'], set: 'admin'})
  @attribute('boolean')
  isAdmin = false;

  @expose({get: true, set: true})
  @attribute('string?')
  static token?: string;

  @role('self') async selfRoleResolver() {
    return this === (await this.constructor.getAuthenticatedUser());
  }

  @expose({call: true}) @method() static async getAuthenticatedUser(
    attributeSelector: AttributeSelector = {githubId: true, isAdmin: true}
  ) {
    if (this.token === undefined) {
      return;
    }

    const userId = this.verifyToken(this.token);

    if (userId === undefined) {
      // The token is invalid or expired
      this.token = undefined;
      return;
    }

    const user = await this.get(userId, attributeSelector, {
      throwIfMissing: false
    });

    if (user === undefined) {
      // The user doesn't exist anymore
      this.token = undefined;
      return;
    }

    return user;
  }

  static verifyToken(token: string) {
    const payload = verifyJWT(token) as {sub: string} | undefined;
    const userId = payload?.sub;

    return userId;
  }

  static generateToken(userId: string, {expiresIn = TOKEN_DURATION} = {}) {
    const token = generateJWT({
      sub: userId,
      exp: Math.round((Date.now() + expiresIn) / 1000)
    });

    return token;
  }

  @expose({call: true}) @method() static async signIn({
    code,
    state
  }: {
    code: string;
    state: string;
  }) {
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

    this.token = this.generateToken(user.id);
  }
}
