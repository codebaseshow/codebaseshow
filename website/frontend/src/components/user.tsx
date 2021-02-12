import {consume} from '@layr/component';
import {Routable, route} from '@layr/routable';
import {Fragment} from 'react';
import {jsx} from '@emotion/react';
import {view, useAsyncCall} from '@layr/react-integration';
import {DropdownMenu} from '@emotion-kit/react';

import type {User as BackendUser} from '../../../backend/src/components/user';
import type {Application} from './application';
import type {Session} from './session';
import type {Implementation} from './implementation';
import type {Common} from './common';

const githubClientId = process.env.GITHUB_CLIENT_ID;

if (!githubClientId) {
  throw new Error(`'GITHUB_CLIENT_ID' environment variable is missing`);
}

export const getUser = (Base: typeof BackendUser) => {
  class User extends Routable(Base) {
    ['constructor']!: typeof User;

    @consume() static Application: typeof Application;
    @consume() static Session: typeof Session;
    @consume() static Implementation: typeof Implementation;
    @consume() static Common: typeof Common;

    @view() MenuView() {
      const User = this.constructor;

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
                User.ImplementationsPage.navigate();
              }
            },
            {type: 'divider'},
            {
              label: 'Sign out',
              onClick: () => {
                User.SignOutPage.navigate();
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

    @route('/sign-in\\?:redirectURL') @view() static SignInPage({
      redirectURL
    }: {
      redirectURL?: string;
    }) {
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

    @route('/oauth/callback\\?:code&:state&:error') @view() static OAuthCallbackPage({
      code,
      state,
      error
    }: {code?: string; state?: string; error?: string} = {}) {
      const {Application, Common} = this;

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
            Application.HomePage.reload();
          }
        });

        if (isSigningIn) {
          return null;
        }

        if (signingInError) {
          return (
            <Common.ErrorLayoutView>
              Sorry, an error occurred while signing in to GitHub.
            </Common.ErrorLayoutView>
          );
        }

        return null;
      });
    }

    @route('/sign-out') @view() static SignOutPage() {
      const {Application, Session} = this;

      Session.token = undefined;

      Application.HomePage.reload();

      return null;
    }

    @route('/user/implementations') @view() static ImplementationsPage() {
      const {Application, Implementation, Common} = this;

      return Common.ensureUser((user) => {
        return (
          <Application.LayoutView>
            <Implementation.UserListView user={user} />
          </Application.LayoutView>
        );
      });
    }
  }

  return User;
};

export declare const User: ReturnType<typeof getUser>;

export type User = InstanceType<typeof User>;
