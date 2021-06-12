import {consume} from '@layr/component';
import {attribute} from '@layr/storable';
import {Routable} from '@layr/routable';
import {Fragment} from 'react';
import {jsx} from '@emotion/react';
import {page, view, useData, useNavigator, useAsyncCall} from '@layr/react-integration';
import {Box, DropdownMenu} from '@emotion-kit/react';

import type {User as BackendUser} from '../../../backend/src/components/user';
import type {Application} from './application';
import type {Implementation} from './implementation';
import {ErrorLayout, Table} from '../ui';

const githubClientId = process.env.GITHUB_CLIENT_ID;

if (!githubClientId) {
  throw new Error(`'GITHUB_CLIENT_ID' environment variable is missing`);
}

export const extendUser = (Base: typeof BackendUser) => {
  class User extends Routable(Base) {
    ['constructor']!: typeof User;

    @consume() static Application: typeof Application;
    @consume() static Implementation: typeof Implementation;

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

    @attribute('User?') static authenticatedUser?: User;

    static async initializer() {
      this.authenticatedUser = (await this.getAuthenticatedUser({
        username: true,
        avatarURL: true,
        isAdmin: true
      })) as User;
    }

    static ensureGuest(content: () => JSX.Element | null) {
      const {Application} = this;

      if (this.authenticatedUser !== undefined) {
        Application.HomePage.redirect();
        return null;
      }

      return content();
    }

    static ensureAuthenticatedUser(content: (user: User) => JSX.Element | null) {
      const navigator = useNavigator();

      if (this.authenticatedUser === undefined) {
        this.SignInPage.redirect({redirectURL: navigator.getCurrentPath()});
        return null;
      }

      return content(this.authenticatedUser);
    }

    static ensureAuthenticatedAdmin(content: (user: User) => JSX.Element | null) {
      const navigator = useNavigator();

      if (this.authenticatedUser === undefined) {
        this.SignInPage.redirect({redirectURL: navigator.getCurrentPath()});
        return null;
      }

      if (!this.authenticatedUser.isAdmin) {
        return <ErrorLayout>Sorry, this page is restricted to administrators only.</ErrorLayout>;
      }

      return content(this.authenticatedUser);
    }

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
                User.ImplementationListPage.navigate();
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

    @page('/sign-in', {params: {redirectURL: 'string?'}}) static SignInPage({
      redirectURL
    }: {
      redirectURL?: string;
    }) {
      return this.ensureGuest(() => {
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

    @page('/oauth/callback', {params: {code: 'string?', state: 'string?', error: 'string?'}})
    static OAuthCallbackPage({
      code,
      state,
      error
    }: {code?: string; state?: string; error?: string} = {}) {
      const {Application} = this;

      return this.ensureGuest(() => {
        const navigator = useNavigator();

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
            navigator.reload(decodedState.redirectURL);
          } else {
            Application.HomePage.reload();
          }
        });

        if (isSigningIn) {
          return null;
        }

        if (signingInError) {
          return <ErrorLayout>Sorry, an error occurred while signing in to GitHub.</ErrorLayout>;
        }

        return null;
      });
    }

    @page('/sign-out') static SignOutPage() {
      const {Application, User} = this;

      User.token = undefined;

      Application.HomePage.reload();

      return null;
    }

    @page('[/]user/implementations') static ImplementationListPage() {
      const {Implementation} = this;

      return this.ensureAuthenticatedUser((user) => {
        const navigator = useNavigator();

        return useData(
          async () => {
            return await Implementation.find(
              {owner: user},
              {
                project: {slug: true},
                repositoryURL: true,
                createdAt: true,
                status: true
              },
              {sort: {createdAt: 'desc'}}
            );
          },

          (implementations) => (
            <div>
              <h3>Your Implementations</h3>

              {implementations.length > 0 && (
                <Table
                  columns={[
                    {
                      header: 'Repository',
                      body: (implementation) => implementation.formatRepositoryURL()
                    },
                    {
                      width: 125,
                      header: 'Status',
                      body: (implementation) => implementation.formatStatus()
                    },
                    {
                      width: 125,
                      header: 'Submitted',
                      body: (implementation) => implementation.formatCreatedAt()
                    }
                  ]}
                  items={implementations}
                  onItemClick={(implementation) => {
                    implementation.EditPage.navigate({
                      callbackURL: navigator.getCurrentURL()
                    });
                  }}
                  css={{marginTop: '2rem'}}
                />
              )}

              {implementations.length === 0 && (
                <Box css={{marginTop: '2rem', padding: '1rem'}}>You have no implementations.</Box>
              )}
            </div>
          )
        );
      });
    }
  }

  return User;
};

export declare const User: ReturnType<typeof extendUser>;

export type User = InstanceType<typeof User>;
