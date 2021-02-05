import {consume} from '@layr/component';
import {Routable, route} from '@layr/routable';
import {Fragment} from 'react';
import {jsx} from '@emotion/react';
import {view, useAsyncCall} from '@layr/react-integration';
import {DropdownMenu} from '@emotion-kit/react';

import type {User as BackendUser} from '../../../backend/src/components/user';
import type {Session} from './session';
import type {Implementation} from './implementation';
import type {Home} from './home';
import type {Common} from './common';

const githubClientId = process.env.GITHUB_CLIENT_ID;

if (!githubClientId) {
  throw new Error(`'GITHUB_CLIENT_ID' environment variable is missing`);
}

export const getUser = (Base: typeof BackendUser) => {
  class User extends Routable(Base) {
    ['constructor']!: typeof User;

    @consume() static Session: typeof Session;
    @consume() static Implementation: typeof Implementation;
    @consume() static Home: typeof Home;
    @consume() static Common: typeof Common;

    @view() Menu() {
      const User = this.constructor;
      const {Implementation} = User;

      return (
        <DropdownMenu
          items={[
            {
              label: () => (
                <>
                  Signed in as <strong>{this.username}</strong>
                </>
              ),
              onClick: () => {
                window.open(`https://github.com/${this.username}`, '_blank');
              }
            },
            {type: 'divider'},
            {
              label: 'Your implementations',
              onClick: () => {
                Implementation.OwnedList.navigate();
              }
            },
            {type: 'divider'},
            {
              label: 'Sign out',
              onClick: () => {
                User.SignOut.navigate();
              }
            }
          ]}
          alignment="right"
        >
          {({open}) => (
            <img
              src={this.avatarURL}
              alt="User menu"
              onClick={open}
              css={{
                position: 'relative',
                top: '-3px',
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: 'white',
                cursor: 'pointer'
              }}
            />
          )}
        </DropdownMenu>
      );
    }

    @route('/sign-in\\?:redirectURL') @view() static SignIn({redirectURL}: {redirectURL?: string}) {
      const {Common} = this;

      return Common.ensureGuest(() => {
        const key = ((Math.random() * Math.pow(36, 6)) | 0).toString(36);
        const encodedState = window.btoa(JSON.stringify({key, redirectURL}));

        window.sessionStorage.setItem('oAuthState', encodedState);

        window.location.replace(
          `https://github.com/login/oauth/authorize?client_id=${githubClientId}&scope=user:email&state=${encodeURIComponent(
            encodedState
          )}`
        );

        return null;
      });
    }

    @route('/oauth/callback\\?:code&:state&:error') @view() static OAuthCallback({
      code,
      state,
      error
    }: {code?: string; state?: string; error?: string} = {}) {
      const {Home, Common} = this;

      return Common.ensureGuest(() => {
        const [isSigningIn, signingInError] = useAsyncCall(async () => {
          const savedState = window.sessionStorage.getItem('oAuthState');
          window.sessionStorage.removeItem('oAuthState');

          if (!code || state !== savedState || error) {
            throw new Error('Authentication failed');
          }

          let decodedState;

          try {
            decodedState = JSON.parse(window.atob(state));
          } catch (error) {
            throw new Error('An error occurred while decoding the oAuth state');
          }

          await this.signIn({code, state});

          if (decodedState.redirectURL !== undefined) {
            this.getRouter().reload(decodedState.redirectURL);
          } else {
            Home.Main.reload();
          }
        });

        if (isSigningIn) {
          return null;
        }

        if (signingInError) {
          return (
            <Common.ErrorLayout>
              Sorry, an error occurred while signing in to GitHub.
            </Common.ErrorLayout>
          );
        }

        return null;
      });
    }

    @route('/sign-out') @view() static SignOut() {
      const {Session, Home} = this;

      Session.token = undefined;

      Home.Main.reload();

      return null;
    }
  }

  return User;
};

export declare const User: ReturnType<typeof getUser>;

export type User = InstanceType<typeof User>;
