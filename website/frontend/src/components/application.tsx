import {provide} from '@layr/component';
import {Routable} from '@layr/routable';
import {Fragment} from 'react';
import {jsx, useTheme} from '@emotion/react';
import {EmotionStarter} from '@emotion-starter/react';
import {EmotionKit, Container, Stack, Box, Badge} from '@emotion-kit/react';
import {layout, page, view, useData, Customizer} from '@layr/react-integration';

import type {Application as BackendApplication} from '../../../backend/src/components/application';
import {extendUser} from './user';
import {extendProject} from './project';
import {extendImplementation, implementationCategories} from './implementation';
import codebaseShowLogo from '../assets/codebaseshow-logo-dark-mode.svg';
import programmerDude from '../assets/programmer-dude.svg';
import {useStyles} from '../styles';
import {Title, FullHeight, ErrorMessage, LoadingSpinner} from '../ui';
import {RepositoryIcon} from '../icons';

export const extendApplication = (Base: typeof BackendApplication) => {
  class Application extends Routable(Base) {
    @provide() static User = extendUser(Base.User);
    @provide() static Project = extendProject(Base.Project);
    @provide() static Implementation = extendImplementation(Base.Implementation);

    @layout('') static RootLayout({children}: {children: () => any}) {
      return (
        <EmotionStarter
          mode={'dark'}
          theme={{
            fontFamilies: {body: "'Open Sans', sans-serif", heading: "'Open Sans', sans-serif"}
          }}
        >
          <EmotionKit>
            <Customizer
              dataPlaceholder={() => <LoadingSpinner />}
              errorRenderer={(error) => <ErrorMessage>{error}</ErrorMessage>}
            >
              <Title />
              {children()}
            </Customizer>
          </EmotionKit>
        </EmotionStarter>
      );
    }

    @layout('[]/') static MainLayout({children}: {children: () => any}) {
      const theme = useTheme();

      return (
        <FullHeight css={{display: 'flex', flexDirection: 'column'}}>
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
            {children()}
          </Container>

          <div css={{backgroundColor: theme.colors.background.highlighted}}>
            <Container>
              <this.FooterView />
            </Container>
          </div>
        </FullHeight>
      );
    }

    @view() static HeaderView() {
      const {User} = this;

      const {authenticatedUser} = User;

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

            {authenticatedUser !== undefined ? (
              <authenticatedUser.MenuView />
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
                <a
                  href={`mailto:${process.env.APPLICATION_EMAIL_ADDRESS}`}
                  target="_blank"
                  css={styles.menuItemLink}
                >
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

    @page('[]/') static HomePage() {
      const theme = useTheme();

      return (
        <>
          <FullHeight css={{display: 'flex', flexDirection: 'column', backgroundColor: '#242a5a'}}>
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
          </FullHeight>

          <FullHeight id="projects" css={{display: 'flex', flexDirection: 'column'}}>
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
              <this.ProjectListView />
              <this.WantToAddMessageView css={{marginTop: '2.4rem'}} />
            </Container>

            <div css={{backgroundColor: theme.colors.background.highlighted}}>
              <Container>
                <this.FooterView />
              </Container>
            </div>
          </FullHeight>
        </>
      );
    }

    @page('[/]projects') static ProjectsPage() {
      return (
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
          <this.ProjectListView />
          <this.WantToAddMessageView css={{marginTop: '2.4rem'}} />
        </div>
      );
    }

    @view() static ProjectListView() {
      const {Project} = this;

      const theme = useTheme();
      const styles = useStyles();

      return useData(
        async () => {
          return await Project.find(
            {status: {$in: ['available', 'coming-soon']}},
            {
              slug: true,
              name: true,
              description: true,
              logo: true,
              categories: true,
              status: true,
              numberOfImplementations: true
            },
            {sort: {numberOfImplementations: 'desc'}}
          );
        },

        (projects) => (
          <Stack direction="column" spacing="2rem" css={{width: '100%', maxWidth: 600}}>
            {projects.map((project) => {
              let content = (
                <Box
                  css={{
                    padding: '1rem',
                    display: 'flex',
                    flexDirection: 'column',
                    userSelect: 'none'
                  }}
                >
                  <div css={{display: 'flex', alignItems: 'center'}}>
                    <img
                      src={project.logo.normalURL}
                      alt={project.name}
                      css={theme.responsive({
                        height: project.logo.height,
                        marginTop: project.logo.offsetY,
                        marginRight: '1rem',
                        display: [, , , 'none']
                      })}
                    />
                    <img
                      src={project.logo.narrowURL}
                      alt={project.name}
                      css={theme.responsive({
                        height: project.logo.height,
                        marginTop: project.logo.offsetY,
                        marginRight: '1rem',
                        display: ['none', , , 'block']
                      })}
                    />

                    {project.status === 'coming-soon' && (
                      <Badge
                        color="primary"
                        css={{marginLeft: 'auto', overflow: 'hidden', textOverflow: 'ellipsis'}}
                      >
                        Coming soon
                      </Badge>
                    )}
                  </div>

                  <div
                    css={{
                      marginTop: '1rem',
                      padding: '.5rem .75rem',
                      backgroundColor: theme.colors.background.highlighted,
                      borderRadius: theme.radii.normal
                    }}
                  >
                    {project.description}
                  </div>

                  <div css={{marginTop: '1rem', display: 'flex', alignItems: 'center'}}>
                    <Stack wrap spacing=".5rem" css={{marginRight: '1rem'}}>
                      {project.categories.map((category) => (
                        <Badge key={category} variant="outline">
                          {implementationCategories[category].label}
                        </Badge>
                      ))}
                    </Stack>

                    {project.status === 'available' && (
                      <div
                        title="Number of implementations"
                        css={{
                          marginLeft: 'auto',
                          marginRight: '2px',
                          display: 'flex',
                          alignItems: 'center',
                          color: theme.colors.text.muted
                        }}
                      >
                        <RepositoryIcon size={18} css={{marginTop: 1}} />
                        <div css={{marginLeft: '.2rem'}}>{project.numberOfImplementations}</div>
                      </div>
                    )}
                  </div>
                </Box>
              );

              if (project.status === 'available') {
                content = (
                  <project.ItemPage.Link css={styles.hiddenLink}>{content}</project.ItemPage.Link>
                );
              }

              return <Fragment key={project.id}>{content}</Fragment>;
            })}
          </Stack>
        ),

        [],

        {dataPlaceholder: () => <LoadingSpinner delay={0} />}
      );
    }

    @view() static WantToAddMessageView({className}: {className?: string}) {
      const theme = useTheme();

      return (
        <div
          className={className}
          css={{fontSize: theme.fontSizes.small, color: theme.colors.text.muted}}
        >
          <div css={{textAlign: 'center'}}>
            <strong>Want to add your own project?</strong>
          </div>
          <div css={{textAlign: 'center'}}>
            <a href={`mailto:${process.env.APPLICATION_EMAIL_ADDRESS}`} target="_blank">
              Contact us
            </a>{' '}
            to discuss about it!
          </div>
        </div>
      );
    }

    @page('[/]*') static NotFoundPage() {
      return <ErrorMessage>Sorry, there is nothing there.</ErrorMessage>;
    }
  }

  return Application;
};

export declare const Application: ReturnType<typeof extendApplication>;

export type Application = InstanceType<typeof Application>;
