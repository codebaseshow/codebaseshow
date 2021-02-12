import {provide} from '@layr/component';
import {Storable} from '@layr/storable';
import {Routable, route} from '@layr/routable';
import {ComponentHTTPClient} from '@layr/component-http-client';
import {Fragment} from 'react';
import {jsx, useTheme} from '@emotion/react';
import {Container, Stack} from '@emotion-kit/react';
import {view, useBrowserRouter} from '@layr/react-integration';
import {PromiseValue} from 'type-fest';

import type {Application as BackendApplication} from '../../../backend/src/components/application';
import {getSession} from './session';
import {getUser} from './user';
import {getProject} from './project';
import {getImplementation} from './implementation';
import {Common} from './common';
// @ts-ignore
import codebaseShowLogo from '../assets/codebaseshow-logo-dark-mode-20210210.immutable.svg';
// @ts-ignore
import programmerDude from '../assets/programmer-dude-20210205.immutable.svg';
import {useStyles} from '../styles';

export const getApplication = async ({backendURL}: {backendURL: string}) => {
  const client = new ComponentHTTPClient(backendURL, {mixins: [Storable]});

  const BackendApplicationProxy = (await client.getComponent()) as typeof BackendApplication;

  class Application extends Routable(BackendApplicationProxy) {
    @provide() static Session = getSession(BackendApplicationProxy.Session);
    @provide() static User = getUser(BackendApplicationProxy.User);
    @provide() static Project = getProject(BackendApplicationProxy.Project);
    @provide() static Implementation = getImplementation(BackendApplicationProxy.Implementation);
    @provide() static Common = Common;

    @view() static RootView() {
      const {Common} = this;

      const [router, isReady] = useBrowserRouter(this);

      if (!isReady) {
        return null;
      }

      const content = router.callCurrentRoute({
        fallback: () => <Common.RouteNotFoundView />
      });

      return content;
    }

    @route('/') @view() static HomePage() {
      const {Project, Common} = this;

      const theme = useTheme();

      return (
        <>
          <Common.FullHeightView
            css={{display: 'flex', flexDirection: 'column', backgroundColor: '#242a5a'}}
          >
            <div css={{backgroundColor: '#2c3669'}}>
              <Container>
                <this.HeaderView />
              </Container>
            </div>

            <Container
              css={{
                flex: 1,
                width: '100%',
                maxWidth: '960px',
                padding: '2rem 15px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <div css={{display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
                <img src={programmerDude} alt="CodebaseShow" css={{width: '100%', maxWidth: 600}} />
                <div
                  css={theme.responsive({
                    marginTop: '3rem',
                    marginBottom: '.5rem',
                    fontSize: [theme.fontSizes.h2, , , theme.fontSizes.h4],
                    fontWeight: theme.fontWeights.semibold,
                    lineHeight: theme.lineHeights.small,
                    textAlign: 'center'
                  })}
                >
                  Learn, Compare, Build
                </div>
                <div
                  css={theme.responsive({
                    fontSize: [theme.fontSizes.h4, , , theme.fontSizes.h5],
                    fontWeight: theme.fontWeights.normal,
                    color: theme.colors.text.muted,
                    lineHeight: theme.lineHeights.normal,
                    textAlign: 'center'
                  })}
                >
                  {
                    'A collection of codebase examples using various languages, libraries, and frameworks to help you create your next project.'
                  }
                </div>
              </div>
            </Container>

            <div css={{paddingBottom: '2rem', alignSelf: 'center', display: 'flex'}}>
              <this.HomePage.Link
                hash="projects"
                css={{
                  'lineHeight': 1,
                  'color': theme.colors.text.muted,
                  ':hover': {color: theme.colors.text.normal, textDecoration: 'none'}
                }}
              >
                ▼
              </this.HomePage.Link>
            </div>
          </Common.FullHeightView>

          <Common.FullHeightView id="projects" css={{display: 'flex', flexDirection: 'column'}}>
            <Container
              css={{
                flex: 1,
                width: '100%',
                maxWidth: '960px',
                padding: '3rem 15px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <h2 css={{marginBottom: '2.5rem'}}>Projects</h2>
              <Project.ListView />
              <Project.WantToAddMessageView css={{marginTop: '2.4rem'}} />
            </Container>

            <div css={{backgroundColor: theme.colors.background.highlighted}}>
              <Container>
                <this.FooterView />
              </Container>
            </div>
          </Common.FullHeightView>
        </>
      );
    }

    @route('/projects') @view() static ProjectsPage() {
      const {Project} = this;

      return (
        <this.LayoutView>
          <div
            css={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <h2 css={{marginBottom: '2.5rem'}}>Projects</h2>
            <Project.ListView />
            <Project.WantToAddMessageView css={{marginTop: '2.4rem'}} />
          </div>
        </this.LayoutView>
      );
    }

    @view() static LayoutView({children}: {children?: React.ReactNode}) {
      const {Common} = this;

      const theme = useTheme();

      return (
        <Common.FullHeightView css={{display: 'flex', flexDirection: 'column'}}>
          <div css={{backgroundColor: theme.colors.background.highlighted}}>
            <Container>
              <this.HeaderView />
            </Container>
          </div>

          <Container
            css={{
              flex: 1,
              width: '100%',
              maxWidth: '960px',
              padding: '3rem 15px',
              display: 'flex',
              flexDirection: 'column'
            }}
          >
            {children}
          </Container>

          <div css={{backgroundColor: theme.colors.background.highlighted}}>
            <Container>
              <this.FooterView />
            </Container>
          </div>
        </Common.FullHeightView>
      );
    }

    @view() static HeaderView() {
      const {User, Session} = this;

      const {user} = Session;

      const theme = useTheme();
      const styles = useStyles();

      return (
        <header css={{minHeight: 60, padding: '.5rem 0', display: 'flex', alignItems: 'center'}}>
          <this.HomePage.Link css={{display: 'flex', flexDirection: 'column'}}>
            <img src={codebaseShowLogo} alt="CodebaseShow" css={{height: 35}} />
          </this.HomePage.Link>

          <Stack spacing="1.5rem" css={{marginLeft: 'auto', alignItems: 'center'}}>
            <this.ProjectsPage.Link
              css={theme.responsive({...styles.menuItemLink, display: [, , , 'none']})}
            >
              Projects
            </this.ProjectsPage.Link>

            {user !== undefined ? (
              <user.MenuView />
            ) : (
              <User.SignInPage.Link css={styles.menuItemLink}>Sign in</User.SignInPage.Link>
            )}
          </Stack>
        </header>
      );
    }

    @view() static FooterView() {
      const theme = useTheme();
      const styles = useStyles();

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
              maxWidth: 200,
              display: 'flex',
              flexDirection: ['row', , , 'column'],
              justifyContent: 'space-between',
              lineHeight: theme.lineHeights.small
            })}
          >
            <div>
              <Stack direction="column">
                <this.HomePage.Link css={styles.menuItemLink}>Home</this.HomePage.Link>

                <this.ProjectsPage.Link css={styles.menuItemLink}>Projects</this.ProjectsPage.Link>
              </Stack>
            </div>

            <div css={theme.responsive({marginTop: [, , , '1rem']})}>
              <Stack direction="column">
                <a href="mailto:hello@codebase.show" target="_blank" css={styles.menuItemLink}>
                  Contact
                </a>

                <a
                  href="https://github.com/codebaseshow/codebaseshow"
                  target="_blank"
                  css={styles.menuItemLink}
                >
                  GitHub
                </a>
              </Stack>
            </div>
          </nav>
        </footer>
      );
    }
  }

  return Application;
};

export declare const Application: PromiseValue<ReturnType<typeof getApplication>>;

export type Application = InstanceType<typeof Application>;
