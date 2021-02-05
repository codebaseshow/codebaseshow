import {consume, attribute} from '@layr/component';

import type {Session as BackendSession} from '../../../backend/src/components/session';
import type {User} from './user';

export const getSession = (Base: typeof BackendSession) => {
  class Session extends Base {
    @consume() static User: typeof User;

    @attribute('User?') static user?: User;

    @attribute('string?', {
      getter() {
        return window.localStorage.getItem('token') || undefined;
      },
      setter(token) {
        if (token !== undefined) {
          window.localStorage.setItem('token', token);
        } else {
          window.localStorage.removeItem('token');
        }
      }
    })
    static token?: string;

    static async loadUser() {
      if (this.token !== undefined) {
        this.user = await this.getUser({username: true, avatarURL: true, isAdmin: true});
      }
    }
  }

  return Session;
};

export declare const Session: ReturnType<typeof getSession>;

export type Session = InstanceType<typeof Session>;
