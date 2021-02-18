import {consume} from '@layr/component';
import {Routable, route} from '@layr/routable';
import {Fragment, useMemo} from 'react';
import {jsx, useTheme} from '@emotion/react';
import {view, useAsyncMemo, useAsyncCallback} from '@layr/react-integration';
import {Button} from '@emotion-starter/react';
import {
  Container,
  Stack,
  Box,
  Badge,
  DropdownMenu,
  ChevronRightIcon,
  ChevronDownIcon
} from '@emotion-kit/react';

import type {Project as BackendProject} from '../../../backend/src/components/project';
import type {ImplementationCategory} from '../../../backend/src/components/implementation';
import type {Application} from './application';
import type {Session} from './session';
import type {User} from './user';
import type {Implementation} from './implementation';
import {implementationCategories} from './implementation';
import type {Common} from './common';
// @ts-ignore
import codebaseShowLogo from '../assets/codebaseshow-logo-dark-mode-20210210.immutable.svg';
// @ts-ignore
import codebaseShowIcon from '../assets/codebaseshow-icon-20210210.immutable.svg';
import {RepositoryIcon} from '../icons';
import {useStyles} from '../styles';

export const getProject = (Base: typeof BackendProject) => {
  class Project extends Routable(Base) {
    ['constructor']!: typeof Project;

    @consume() static Application: typeof Application;
    @consume() static Session: typeof Session;
    @consume() static User: typeof User;
    @consume() static Implementation: typeof Implementation;
    @consume() static Common: typeof Common;

    @route('/projects/:slug\\?:category&:language') @view() static HomePage({
      slug,
      category,
      language
    }: {
      slug: string;
      category?: ImplementationCategory;
      language?: string;
    }) {
      const {Implementation} = this;

      const theme = useTheme();

      return (
        <this.LoaderView slug={slug}>
          {(project) => (
            <div css={{margin: '.5rem 0 1rem 0'}}>
              <div css={{textAlign: 'center', marginBottom: '3.3rem'}}>
                <a href={project.demoURL} target="_blank">
                  <img
                    src={project.screenshot.normalURL}
                    alt="Screenshot"
                    css={{height: project.screenshot.height}}
                  />
                </a>
                <h2 css={theme.responsive({fontSize: ['250%', , , '200%']})}>{project.headline}</h2>
                <p
                  css={{
                    fontSize: theme.fontSizes.large,
                    color: theme.colors.text.muted,
                    lineHeight: theme.lineHeights.small
                  }}
                >
                  {project.subheading}
                </p>
              </div>

              <Implementation.ListView
                project={project}
                key={category}
                category={category}
                language={language}
              />
            </div>
          )}
        </this.LoaderView>
      );
    }

    @route('/projects/:slug/implementations/submit') @view() static SubmitImplementationPage({
      slug
    }: {
      slug: string;
    }) {
      const {Common} = this;

      return Common.ensureUser(() => {
        return (
          <this.LoaderView slug={slug}>
            {(project) => <project.SubmitImplementationView />}
          </this.LoaderView>
        );
      });
    }

    @view() SubmitImplementationView() {
      const {Implementation} = this.constructor;

      const implementation = useMemo(
        () =>
          Implementation.create(
            {
              project: this,
              repositoryURL: '',
              frontendEnvironment: undefined,
              language: '',
              libraries: ['']
            },
            {attributeSelector: {id: true}}
          ),
        []
      );

      const [handleSubmit] = useAsyncCallback(async () => {
        await implementation.submit();
        this.constructor.SubmitCompletedPage.navigate(this);
      });

      return (
        <implementation.FormView
          title="Submit an Implementation"
          onSubmit={handleSubmit}
          onCancel={async () => {
            this.constructor.HomePage.navigate(this);
          }}
        />
      );
    }

    @route('/projects/:slug/implementations/submit/completed')
    @view()
    static SubmitCompletedPage({slug}: {slug: string}) {
      const {Common} = this;

      return Common.ensureUser(() => {
        return (
          <this.LoaderView slug={slug}>
            {(project) => (
              <Common.DialogView title={'Thank You!'}>
                <p>Your submission has been recorded. We will review it shortly.</p>
                <Common.ButtonBarView>
                  <Button
                    onClick={() => {
                      this.HomePage.navigate(project);
                    }}
                    color="primary"
                  >
                    Okay
                  </Button>
                </Common.ButtonBarView>
              </Common.DialogView>
            )}
          </this.LoaderView>
        );
      });
    }

    @route('/projects/:slug/implementations/review') @view() static ReviewImplementationsPage({
      slug
    }: {
      slug: string;
    }) {
      const {Implementation, Common} = this;

      return Common.ensureAdmin(() => {
        return (
          <this.LoaderView slug={slug}>
            {(project) => <Implementation.ReviewListView project={project} />}
          </this.LoaderView>
        );
      });
    }

    @route('/projects/:slug/implementations/add') @view() static AddImplementationPage({
      slug
    }: {
      slug: string;
    }) {
      const {Common} = this;

      return Common.ensureAdmin(() => {
        return (
          <this.LoaderView slug={slug}>
            {(project) => <project.AddImplementationView />}
          </this.LoaderView>
        );
      });
    }

    @view() AddImplementationView() {
      const {Implementation} = this.constructor;

      const implementation = useMemo(
        () =>
          Implementation.create(
            {
              project: this,
              repositoryURL: '',
              frontendEnvironment: undefined,
              language: '',
              libraries: ['']
            },
            {attributeSelector: {id: true}}
          ),
        []
      );

      const [handleAdd] = useAsyncCallback(async () => {
        await implementation.add();
        this.constructor.EditImplementationsPage.navigate(this);
      });

      return (
        <implementation.FormView
          title="Add an Implementation"
          onAdd={handleAdd}
          onCancel={async () => {
            this.constructor.EditImplementationsPage.navigate(this);
          }}
        />
      );
    }

    @route('/projects/:slug/implementations') @view() static EditImplementationsPage({
      slug
    }: {
      slug: string;
    }) {
      const {Implementation, Common} = this;

      return Common.ensureAdmin(() => {
        return (
          <this.LoaderView slug={slug}>
            {(project) => <Implementation.EditListView project={project} />}
          </this.LoaderView>
        );
      });
    }

    @view() static LoaderView({
      slug,
      children
    }: {
      slug: string;
      children: (project: Project) => JSX.Element;
    }) {
      const {Common} = this;

      const [project, , loadingError] = useAsyncMemo(async () => {
        return await this.get(
          {slug},
          {
            name: true,
            headline: true,
            subheading: true,
            logo: true,
            screenshot: true,
            websiteURL: true,
            createURL: true,
            demoURL: true,
            repositoryURL: true,
            categories: true
          }
        );
      }, [slug]);

      if (loadingError !== undefined) {
        return (
          <Common.ErrorLayoutView>
            <Common.ErrorMessageView error={loadingError} />
          </Common.ErrorLayoutView>
        );
      }

      if (project === undefined) {
        return <Common.LoadingSpinnerView />;
      }

      return <project.LayoutView>{children(project)}</project.LayoutView>;
    }

    @view() static ListView() {
      const {Common} = this;

      const theme = useTheme();
      const styles = useStyles();

      const [projects, , loadingError] = useAsyncMemo(async () => {
        return await this.find(
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
      }, []);

      if (loadingError) {
        return (
          <Common.ErrorLayoutView>
            <Common.ErrorMessageView error={loadingError} />
          </Common.ErrorLayoutView>
        );
      }

      if (projects === undefined) {
        return (
          <div
            css={{height: 300, display: 'flex', flexDirection: 'column', justifyContent: 'center'}}
          >
            <Common.LoadingSpinnerView delay={300} />
          </div>
        );
      }

      return (
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
                <this.HomePage.Link params={project} css={styles.hiddenLink}>
                  {content}
                </this.HomePage.Link>
              );
            }

            return <Fragment key={project.id}>{content}</Fragment>;
          })}
        </Stack>
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
            <a href="mailto:hello@codebase.show" target="_blank">
              Contact us
            </a>{' '}
            to discuss about it!
          </div>
        </div>
      );
    }

    @view() LayoutView({children}: {children?: React.ReactNode}) {
      const {Common} = this.constructor;

      const theme = useTheme();

      Common.useTitle(this.name);

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

    @view() HeaderView() {
      const {Application, User, Session} = this.constructor;

      const {user} = Session;

      const theme = useTheme();
      const styles = useStyles();

      return (
        <header css={{minHeight: 60, padding: '.5rem 0', display: 'flex', alignItems: 'center'}}>
          <Application.HomePage.Link
            title="CodebaseShow"
            css={{display: 'flex', flexDirection: 'column'}}
          >
            <img src={codebaseShowIcon} alt="CodebaseShow" css={{height: 35}} />
          </Application.HomePage.Link>

          <ChevronRightIcon
            size={25}
            color={theme.colors.text.moreMuted}
            css={{margin: '0 .25rem'}}
          />

          <this.constructor.HomePage.Link
            params={this}
            css={{display: 'flex', flexDirection: 'column'}}
          >
            <img
              src={this.logo.normalURL}
              alt={this.name}
              css={theme.responsive({
                height: this.logo.height,
                marginTop: this.logo.offsetY,
                display: [, , , 'none']
              })}
            />
            <img
              src={this.logo.narrowURL}
              alt={this.name}
              css={theme.responsive({
                height: this.logo.height,
                marginTop: this.logo.offsetY,
                display: ['none', , , 'block']
              })}
            />
          </this.constructor.HomePage.Link>

          <Stack spacing="1.5rem" css={{marginLeft: 'auto', alignItems: 'center'}}>
            <a
              href={this.createURL}
              target="_blank"
              css={theme.responsive({...styles.menuItemLink, display: [, , 'none']})}
            >
              Create
            </a>

            <this.constructor.SubmitImplementationPage.Link
              params={this}
              css={theme.responsive({...styles.menuItemLink, display: [, , 'none']})}
            >
              Submit
            </this.constructor.SubmitImplementationPage.Link>

            {user?.isAdmin && (
              <div css={theme.responsive({display: [, , 'none']})}>
                <DropdownMenu
                  items={[
                    {
                      label: 'Review submissions',
                      onClick: () => {
                        this.constructor.ReviewImplementationsPage.navigate(this);
                      }
                    },
                    {
                      label: 'Edit implementations',
                      onClick: () => {
                        this.constructor.EditImplementationsPage.navigate(this);
                      }
                    }
                  ]}
                >
                  {({open}) => (
                    <div
                      onClick={open}
                      css={{
                        ...styles.menuItemLink,
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      Administration
                      <ChevronDownIcon size={25} css={{marginLeft: '.15rem'}} />
                    </div>
                  )}
                </DropdownMenu>
              </div>
            )}

            {user !== undefined ? (
              <user.MenuView />
            ) : (
              <User.SignInPage.Link css={{...styles.menuItemLink, whiteSpace: 'nowrap'}}>
                Sign in
              </User.SignInPage.Link>
            )}
          </Stack>
        </header>
      );
    }

    @view() FooterView() {
      const {Application} = this.constructor;

      const theme = useTheme();
      const styles = useStyles();

      const headerStyle = {
        color: theme.colors.text.muted,
        fontWeight: theme.fontWeights.semibold
      } as const;

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
              <h6 css={headerStyle}>{this.name}</h6>

              <Stack direction="column">
                <a href={this.websiteURL} target="_blank" css={styles.menuItemLink}>
                  Website
                </a>

                <a href={this.createURL} target="_blank" css={styles.menuItemLink}>
                  Create an implementation
                </a>

                <this.constructor.SubmitImplementationPage.Link
                  params={this}
                  css={styles.menuItemLink}
                >
                  Submit an implementation
                </this.constructor.SubmitImplementationPage.Link>

                <a href={this.repositoryURL} target="_blank" css={styles.menuItemLink}>
                  GitHub
                </a>
              </Stack>
            </div>

            <div css={theme.responsive({marginTop: [, , , '2rem']})}>
              <h6 css={headerStyle}>CodebaseShow</h6>

              <Stack direction="column">
                <Application.HomePage.Link css={styles.menuItemLink}>
                  Home
                </Application.HomePage.Link>

                <Application.ProjectsPage.Link css={styles.menuItemLink}>
                  Projects
                </Application.ProjectsPage.Link>

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

  return Project;
};

export declare const Project: ReturnType<typeof getProject>;

export type Project = InstanceType<typeof Project>;
