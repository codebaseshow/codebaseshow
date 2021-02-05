import {provide} from '@layr/component';
import {Storable} from '@layr/storable';
import {ComponentHTTPClient} from '@layr/component-http-client';
import {jsx, useTheme} from '@emotion/react';
import {view, useBrowserRouter} from '@layr/react-integration';
import {Container, DropdownMenu, ChevronDownIcon} from '@emotion-kit/react';

import type {Application as BackendApplication} from '../../../backend/src/components/application';
import {getSession} from './session';
import {getUser} from './user';
import {getImplementation} from './implementation';
import {Home} from './home';
import {Common} from './common';
// @ts-ignore
import realWorldLogo from '../assets/realworld-logo-dark-mode-20201201.immutable.png';
// @ts-ignore
import realWorldLogoNarrow from '../assets/realworld-logo-narrow-dark-mode-20201209.immutable.png';

export const getApplication = async ({backendURL}: {backendURL: string}) => {
  const client = new ComponentHTTPClient(backendURL, {mixins: [Storable]});

  const BackendApplicationProxy = (await client.getComponent()) as typeof BackendApplication;

  class Application extends BackendApplicationProxy {
    @provide() static Session = getSession(BackendApplicationProxy.Session);
    @provide() static User = getUser(BackendApplicationProxy.User);
    @provide() static Implementation = getImplementation(BackendApplicationProxy.Implementation);
    @provide() static Home = Home;
    @provide() static Common = Common;

    @view() static Root() {
      const {Common} = this;

      const [router, isReady] = useBrowserRouter(this);

      if (!isReady) {
        return null;
      }

      const content = router.callCurrentRoute({
        fallback: () => <Common.RouteNotFound />
      });

      return <this.Layout>{content}</this.Layout>;
    }

    @view() static Layout({children}: {children?: React.ReactNode}) {
      const theme = useTheme();

      return (
        <Common.FullHeight css={{display: 'flex', flexDirection: 'column'}}>
          <div css={{backgroundColor: theme.colors.background.highlighted}}>
            <Container>
              <this.Header />
            </Container>
          </div>

          <Container
            css={{
              flex: 1,
              width: '100%',
              maxWidth: '960px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {children}
          </Container>

          <div css={{backgroundColor: theme.colors.background.highlighted}}>
            <Container>
              <this.Footer />
            </Container>
          </div>
        </Common.FullHeight>
      );
    }

    @view() static Header() {
      const {Home, User, Session, Implementation} = this;

      const {user} = Session;

      const theme = useTheme();

      const menuStyle = {
        paddingLeft: 0,
        listStyle: 'none',
        margin: 0,
        display: 'flex',
        alignItems: 'center'
      };

      const menuItemStyle = {
        margin: '0 0 0 1.5rem',
        display: 'flex'
      };

      const menuItemLinkStyle = {
        'color': theme.colors.primary.normal,
        'cursor': 'pointer',
        ':hover': {
          color: theme.colors.text.normal,
          textDecoration: 'none'
        }
      };

      return (
        <header css={{padding: '.5rem 0 .4rem 0', display: 'flex', alignItems: 'center'}}>
          <Home.Main.Link css={{position: 'relative', top: '-5px'}}>
            <img
              src={realWorldLogo}
              alt="RealWorld Example Apps"
              css={theme.responsive({width: 300, display: [, , 'none']})}
            />
            <img
              src={realWorldLogoNarrow}
              alt="RealWorld Example Apps"
              css={theme.responsive({width: 160, display: ['none', , 'inline-block']})}
            />
          </Home.Main.Link>

          <nav css={{marginLeft: 'auto'}}>
            <ul css={menuStyle}>
              <li css={theme.responsive({...menuItemStyle, display: [, , 'none']})}>
                <a
                  href="https://github.com/gothinkster/realworld/tree/master/spec"
                  target="_blank"
                  css={menuItemLinkStyle}
                >
                  Create
                </a>
              </li>

              <li css={theme.responsive({...menuItemStyle, display: [, , 'none']})}>
                <Implementation.Submit.Link css={menuItemLinkStyle}>
                  Submit
                </Implementation.Submit.Link>
              </li>

              {user?.isAdmin && (
                <li css={theme.responsive({...menuItemStyle, display: [, , 'none']})}>
                  <DropdownMenu
                    items={[
                      {
                        label: 'Review submissions',
                        onClick: () => {
                          Implementation.ReviewList.navigate();
                        }
                      },
                      {
                        label: 'Edit implementations',
                        onClick: () => {
                          Implementation.List.navigate();
                        }
                      }
                    ]}
                  >
                    {({open}) => (
                      <div
                        onClick={open}
                        css={{
                          ...menuItemLinkStyle,
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        Administration
                        <ChevronDownIcon size={25} css={{marginLeft: '.15rem'}} />
                      </div>
                    )}
                  </DropdownMenu>
                </li>
              )}

              {user !== undefined ? (
                <li css={menuItemStyle}>
                  <user.Menu />
                </li>
              ) : (
                <li css={menuItemStyle}>
                  <User.SignIn.Link css={menuItemLinkStyle}>Sign in</User.SignIn.Link>
                </li>
              )}
            </ul>
          </nav>
        </header>
      );
    }

    @view() static Footer() {
      const {Implementation} = this;

      const theme = useTheme();

      const headerStyle = {
        marginBottom: '1.2rem',
        fontSize: theme.fontSizes.small,
        color: theme.colors.text.normal,
        fontWeight: theme.fontWeights.bold,
        textTransform: 'uppercase',
        letterSpacing: '1px'
      } as const;

      const menuStyle = {
        paddingLeft: 0,
        listStyle: 'none',
        margin: 0
      };

      const menuItemStyle = {
        margin: '1rem 0 0 0'
      };

      const menuItemLinkStyle = {
        'color': theme.colors.text.muted,
        ':hover': {
          color: theme.colors.text.normal,
          textDecoration: 'none'
        }
      };

      return (
        <footer
          css={theme.responsive({
            display: 'flex',
            justifyContent: ['center', , , 'start'],
            padding: '3rem 0'
          })}
        >
          <nav
            css={theme.responsive({
              width: '100%',
              maxWidth: 450,
              display: 'flex',
              flexDirection: ['row', , , 'column'],
              justifyContent: 'space-between',
              lineHeight: theme.lineHeights.small
            })}
          >
            <div>
              <h6 css={headerStyle}>Contribute</h6>
              <ul css={menuStyle}>
                <li css={menuItemStyle}>
                  <a
                    href="https://github.com/gothinkster/realworld/tree/master/spec"
                    target="_blank"
                    css={menuItemLinkStyle}
                  >
                    Create an implementation
                  </a>
                </li>
                <li css={menuItemStyle}>
                  <Implementation.Submit.Link css={menuItemLinkStyle}>
                    Submit an implementation
                  </Implementation.Submit.Link>
                </li>
              </ul>
            </div>

            <div css={theme.responsive({marginTop: [0, , , '2rem']})}>
              <h6 css={headerStyle}>GitHub</h6>
              <ul css={menuStyle}>
                <li css={menuItemStyle}>
                  <a
                    href="https://github.com/gothinkster/realworld"
                    target="_blank"
                    css={menuItemLinkStyle}
                  >
                    RealWorld repository
                  </a>
                </li>
                <li css={menuItemStyle}>
                  <a
                    href="https://github.com/mvila/realworld-website"
                    target="_blank"
                    css={menuItemLinkStyle}
                  >
                    Website repository
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </footer>
      );
    }
  }

  return Application;
};
