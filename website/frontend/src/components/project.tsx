import {consume} from '@layr/component';
import {Routable} from '@layr/routable';
import {Fragment, useMemo} from 'react';
import {jsx, useTheme} from '@emotion/react';
import {layout, page, view, useData, useAction, useNavigator} from '@layr/react-integration';
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
import sortBy from 'lodash/sortBy';
import partition from 'lodash/partition';

import type {Project as BackendProject} from '../../../backend/src/components/project';
import type {ImplementationCategory} from '../../../backend/src/components/implementation';
import type {Application} from './application';
import type {User} from './user';
import type {Implementation} from './implementation';
import {implementationCategories, frontendEnvironments} from './implementation';
import codebaseShowIcon from '../assets/codebaseshow-icon.svg';
import {useStyles} from '../styles';
import {Title, FullHeight, Dialog, ButtonBar, Table, LoadingSpinner} from '../ui';

const MAXIMUM_NEW_IMPLEMENTATION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

export const extendProject = (Base: typeof BackendProject) => {
  class Project extends Routable(Base) {
    declare ['constructor']: typeof Project;

    @consume() static Application: typeof Application;
    @consume() static User: typeof User;
    @consume() static Implementation: typeof Implementation;

    @layout('[]/projects/:slug') ItemLayout({children}: {children: () => any}) {
      const theme = useTheme();

      return useData(
        async () => {
          await this.load({
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
          });
        },

        () => {
          return (
            <FullHeight css={{display: 'flex', flexDirection: 'column'}}>
              <Title>{this.name}</Title>

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
      );
    }

    @view() HeaderView() {
      const {Application, User} = this.constructor;

      const {authenticatedUser} = User;

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

          <this.ItemPage.Link css={{display: 'flex', flexDirection: 'column'}}>
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
          </this.ItemPage.Link>

          <Stack spacing="1.5rem" css={{marginLeft: 'auto', alignItems: 'center'}}>
            <a
              href={this.createURL}
              target="_blank"
              css={theme.responsive({...styles.menuItemLink, display: [, , 'none']})}
            >
              Create
            </a>

            <this.SubmitImplementationPage.Link
              css={theme.responsive({...styles.menuItemLink, display: [, , 'none']})}
            >
              Submit
            </this.SubmitImplementationPage.Link>

            {authenticatedUser?.isAdmin && (
              <div css={theme.responsive({display: [, , 'none']})}>
                <DropdownMenu
                  items={[
                    {
                      label: 'Review submissions',
                      onClick: () => {
                        this.ReviewImplementationsPage.navigate();
                      }
                    },
                    {
                      label: 'Edit implementations',
                      onClick: () => {
                        this.EditImplementationsPage.navigate();
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

            {authenticatedUser !== undefined ? (
              <authenticatedUser.MenuView />
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

                <this.SubmitImplementationPage.Link css={styles.menuItemLink}>
                  Submit an implementation
                </this.SubmitImplementationPage.Link>

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

    @page('[/projects/:slug]', {params: {category: 'string?', language: 'string?'}}) ItemPage({
      category: currentCategory = 'frontend',
      language: currentLanguage = 'all'
    }: {
      category?: ImplementationCategory;
      language?: string;
    }) {
      const theme = useTheme();

      return (
        <div css={{margin: '.5rem 0 1rem 0'}}>
          <div css={{textAlign: 'center', marginBottom: '3.3rem'}}>
            <a href={this.demoURL} target="_blank">
              <img
                src={this.screenshot.normalURL}
                alt="Screenshot"
                css={{height: this.screenshot.height}}
              />
            </a>
            <h2 css={theme.responsive({fontSize: ['250%', , , '200%']})}>{this.headline}</h2>
            <p
              css={{
                fontSize: theme.fontSizes.large,
                color: theme.colors.text.muted,
                lineHeight: theme.lineHeights.small
              }}
            >
              {this.subheading}
            </p>
          </div>

          <div>
            {this.categories.length > 1 ? (
              <this.ImplementationCategoryFilterView currentCategory={currentCategory} />
            ) : (
              <div css={{borderBottom: `1px solid ${theme.colors.border.normal}`}} />
            )}

            <this.ImplementationListView
              currentCategory={currentCategory}
              currentLanguage={currentLanguage}
            />
          </div>
        </div>
      );
    }

    @view() ImplementationListView({
      currentCategory,
      currentLanguage
    }: {
      currentCategory: ImplementationCategory;
      currentLanguage: string;
    }) {
      const {Implementation} = this.constructor;

      const theme = useTheme();
      const styles = useStyles();

      return useData(
        async () => {
          const all = await Implementation.find(
            {project: this, category: currentCategory, isPubliclyListed: true},
            {
              project: {slug: true},
              repositoryURL: true,
              frontendEnvironment: true,
              language: true,
              libraries: true,
              markedAsUnmaintainedOn: true,
              owner: {},
              createdAt: true
            },
            {sort: {librariesSortKey: 'asc', language: 'asc'}}
          );

          const [active, unmaintained] = partition(
            all,
            (implementation) => implementation.markedAsUnmaintainedOn === undefined
          );

          return {all, active, unmaintained};
        },

        (implementations) => {
          if (implementations.all.length === 0) {
            return (
              <Box css={{marginTop: '2rem', padding: '1rem'}}>
                There are no implementations in this category.
              </Box>
            );
          }

          const filterImplementationsByLanguage = (implementations: Implementation[]) =>
            implementations.filter(({language}) =>
              currentLanguage !== 'all' ? language.toLowerCase() === currentLanguage : true
            );

          const activeImplementations = filterImplementationsByLanguage(implementations.active);
          const unmaintainedImplementations = filterImplementationsByLanguage(
            implementations.unmaintained
          );

          return (
            <div css={{marginTop: '2rem', display: 'flex'}}>
              <div css={theme.responsive({marginRight: '3rem', display: ['block', , 'none']})}>
                <this.ImplementationLanguageFilterView
                  implementations={implementations.all}
                  currentLanguage={currentLanguage}
                />
              </div>

              <div css={{flex: 1}}>
                <Stack direction="column" spacing="2rem">
                  {activeImplementations.length > 0 && (
                    <div>
                      {activeImplementations.map((implementation, index) => (
                        <Fragment key={implementation.id}>
                          {index > 0 && <hr css={{marginTop: '.75rem', marginBottom: '.75rem'}} />}

                          <a
                            href={implementation.repositoryURL}
                            target="_blank"
                            css={styles.hiddenLink}
                          >
                            <div
                              css={{
                                'display': 'flex',
                                'flexWrap': 'wrap',
                                'alignItems': 'center',
                                ':hover': {
                                  '.implementation-menu': {
                                    visibility: 'visible'
                                  }
                                }
                              }}
                            >
                              <div
                                css={theme.responsive({
                                  flex: ['1', , , '1 0 100%'],
                                  marginBottom: [, , , '.5rem'],
                                  paddingRight: ['1rem', , , '0'],
                                  lineHeight: theme.lineHeights.small
                                })}
                              >
                                <div css={{display: 'flex', alignItems: 'center'}}>
                                  <div
                                    css={{
                                      fontSize: theme.fontSizes.large,
                                      fontWeight: theme.fontWeights.semibold
                                    }}
                                  >
                                    {implementation.formatLibraries()}
                                  </div>

                                  {implementation.frontendEnvironment !== undefined &&
                                    implementation.frontendEnvironment !== 'web' && (
                                      <Badge
                                        color="primary"
                                        variant="outline"
                                        css={{marginLeft: '.75rem'}}
                                      >
                                        {implementation.formatFrontendEnvironment()}
                                      </Badge>
                                    )}

                                  {Date.now() - implementation.createdAt.valueOf() <
                                    MAXIMUM_NEW_IMPLEMENTATION_DURATION && (
                                    <Badge
                                      color="secondary"
                                      variant="outline"
                                      title="This project was added less than a month ago"
                                      css={{marginLeft: '.75rem'}}
                                    >
                                      New
                                    </Badge>
                                  )}

                                  <implementation.MenuView
                                    className="implementation-menu"
                                    css={theme.responsive({
                                      display: ['block', , , 'none'],
                                      marginLeft: '.5rem',
                                      visibility: 'hidden'
                                    })}
                                  />
                                </div>
                                <div
                                  css={{
                                    marginTop: '.3rem',
                                    color: theme.colors.text.muted,
                                    wordBreak: 'break-word'
                                  }}
                                >
                                  {implementation.formatRepositoryURL()}
                                </div>
                              </div>

                              <div css={{width: '150px', lineHeight: 1}}>
                                {implementation.language}
                              </div>
                            </div>
                          </a>
                        </Fragment>
                      ))}
                    </div>
                  )}

                  {unmaintainedImplementations.length > 0 && (
                    <Box css={{padding: '.75rem 1rem'}}>
                      <strong css={{fontWeight: theme.fontWeights.semibold}}>
                        Unmaintained implementations:
                      </strong>{' '}
                      {unmaintainedImplementations.map((implementation, index) => (
                        <Fragment key={index}>
                          {index > 0 && (
                            <span
                              css={{
                                color: theme.colors.text.moreMuted
                              }}
                            >
                              &nbsp;|{' '}
                            </span>
                          )}
                          <a
                            href={implementation.repositoryURL}
                            target="_blank"
                            css={{'color': 'inherit', ':hover': {color: 'inherit'}}}
                          >
                            {implementation.formatLibraries()}
                          </a>
                        </Fragment>
                      ))}
                    </Box>
                  )}
                </Stack>
              </div>
            </div>
          );
        },

        [currentCategory],

        {dataPlaceholder: () => <LoadingSpinner delay={0} />}
      );
    }

    @view() ImplementationCategoryFilterView({
      currentCategory
    }: {
      currentCategory: ImplementationCategory;
    }) {
      const theme = useTheme();

      return (
        <div
          css={{
            display: 'flex',
            justifyContent: 'center',
            borderBottom: `1px solid ${theme.colors.border.normal}`
          }}
        >
          <div
            css={{
              display: 'flex',
              borderTop: `1px solid ${theme.colors.border.normal}`,
              borderLeft: `1px solid ${theme.colors.border.normal}`,
              borderRight: `1px solid ${theme.colors.border.normal}`,
              borderTopLeftRadius: theme.radii.large,
              borderTopRightRadius: theme.radii.large
            }}
          >
            {this.categories.map((category, index) => (
              <this.ImplementationCategoryTabView
                key={category}
                category={category}
                isCurrent={currentCategory === category}
                isFirst={index === 0}
                isLast={index === this.categories.length - 1}
              />
            ))}
          </div>
        </div>
      );
    }

    @view() ImplementationCategoryTabView({
      category,
      isCurrent,
      isFirst = false,
      isLast = false
    }: {
      category: ImplementationCategory;
      isCurrent: boolean;
      isFirst?: boolean;
      isLast?: boolean;
    }) {
      const theme = useTheme();
      const styles = useStyles();
      const navigator = useNavigator();

      const params = navigator.getCurrentQuery();

      return (
        <this.ItemPage.Link
          params={{...params, category, language: undefined}}
          css={styles.hiddenLink}
        >
          <div
            css={theme.responsive({
              'padding': ['.75rem 1.25rem', , , '.5rem .75rem'],
              'fontSize': [theme.fontSizes.large, , , theme.fontSizes.normal],
              'lineHeight': theme.lineHeights.small,
              'color': isCurrent ? theme.colors.primary.textOnNormal : undefined,
              'backgroundColor': isCurrent ? theme.colors.primary.normal : undefined,
              'borderLeft': !isFirst ? `1px solid ${theme.colors.border.normal}` : undefined,
              'borderTopLeftRadius': isFirst ? theme.radii.normal : undefined,
              'borderTopRightRadius': isLast ? theme.radii.normal : undefined,
              ':hover': {
                backgroundColor: !isCurrent ? theme.colors.background.highlighted : undefined
              }
            })}
          >
            {implementationCategories[category].label}
          </div>
        </this.ItemPage.Link>
      );
    }

    @view() ImplementationLanguageFilterView({
      implementations,
      currentLanguage
    }: {
      implementations: Implementation[];
      currentLanguage: string;
    }) {
      const theme = useTheme();

      const languages: {[language: string]: number} = Object.create(null);

      for (const {language} of implementations) {
        if (language in languages) {
          languages[language]++;
        } else {
          languages[language] = 1;
        }
      }

      const sortedLanguages = sortBy(Object.entries(languages), ([, count]) => -count).map(
        ([language]) => language
      );

      sortedLanguages.unshift('All');

      return (
        <div>
          <div
            css={{
              fontSize: theme.fontSizes.small,
              color: theme.colors.text.muted,
              fontWeight: theme.fontWeights.bold,
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
          >
            Languages
          </div>

          {sortedLanguages.map((language) => (
            <this.ImplementationLanguageOptionView
              key={language}
              language={language}
              isCurrent={language.toLowerCase() === currentLanguage}
            />
          ))}
        </div>
      );
    }

    @view() ImplementationLanguageOptionView({
      language,
      isCurrent
    }: {
      language: string;
      isCurrent: boolean;
    }) {
      const theme = useTheme();
      const styles = useStyles();
      const navigator = useNavigator();

      const params = navigator.getCurrentQuery();

      return (
        <this.ItemPage.Link
          params={{...params, language: language.toLowerCase()}}
          css={styles.hiddenLink}
        >
          <div
            css={{
              'marginTop': '.5rem',
              'fontSize': theme.fontSizes.normal,
              'lineHeight': theme.lineHeights.small,
              'color': isCurrent ? theme.colors.text.normal : theme.colors.text.muted,
              ':hover': {
                textDecoration: 'underline'
              }
            }}
          >
            {language}
          </div>
        </this.ItemPage.Link>
      );
    }

    @page('[/projects/:slug]/implementations/submit') SubmitImplementationPage() {
      const {User, Implementation} = this.constructor;

      return User.ensureAuthenticatedUser((user) => {
        const implementation = useMemo(
          () =>
            new Implementation({
              project: this,
              owner: user,
              repositoryURL: '',
              category: '',
              language: '',
              libraries: ['']
            }),
          []
        );

        const submit = useAction(async () => {
          await implementation.submit();
          this.SubmitCompletedPage.navigate();
        });

        return (
          <implementation.FormView
            title="Submit an Implementation"
            onSubmit={submit}
            onCancel={async () => {
              this.ItemPage.navigate();
            }}
          />
        );
      });
    }

    @page('[/projects/:slug]/implementations/submit/completed') SubmitCompletedPage() {
      const {User} = this.constructor;

      return User.ensureAuthenticatedUser(() => {
        return (
          <Dialog title={'Thank You!'}>
            <p>Your submission has been recorded. We will review it shortly.</p>
            <ButtonBar>
              <Button
                onClick={() => {
                  this.ItemPage.navigate();
                }}
                color="primary"
              >
                Okay
              </Button>
            </ButtonBar>
          </Dialog>
        );
      });
    }

    @page('[/projects/:slug]/implementations/review') ReviewImplementationsPage() {
      const {User} = this.constructor;

      return User.ensureAuthenticatedAdmin(() => {
        return useData(
          async () => {
            return await this.findSubmissionsToReview();
          },
          (implementations) => (
            <div>
              <h3>Review Submissions</h3>

              {implementations.length > 0 && (
                <Table
                  columns={[
                    {
                      width: 275,
                      header: 'Repository',
                      body: (implementation) => implementation.formatRepositoryURL()
                    },
                    {
                      width: 100,
                      header: 'Category',
                      body: (implementation) =>
                        (implementationCategories as any)[implementation.category].label
                    },
                    {
                      width: 125,
                      header: 'Environment',
                      body: (implementation) =>
                        implementation.frontendEnvironment !== undefined
                          ? (frontendEnvironments as any)[implementation.frontendEnvironment].label
                          : ''
                    },
                    {
                      width: 125,
                      header: 'Language',
                      body: (implementation) => implementation.language
                    },
                    {
                      header: 'Libraries/Frameworks',
                      body: (implementation) => implementation.formatLibraries()
                    },
                    {
                      width: 125,
                      header: 'Submitted',
                      body: (implementation) => implementation.formatCreatedAt()
                    }
                  ]}
                  items={implementations}
                  onItemClick={(implementation) => {
                    implementation.ReviewPage.navigate();
                  }}
                  css={{marginTop: '2rem'}}
                />
              )}

              {implementations.length === 0 && (
                <Box css={{marginTop: '2rem', padding: '1rem'}}>
                  There are no submissions to review.
                </Box>
              )}
            </div>
          )
        );
      });
    }

    @page('[/projects/:slug]/implementations/add') AddImplementationPage() {
      const {User, Implementation} = this.constructor;

      return User.ensureAuthenticatedAdmin((user) => {
        const implementation = useMemo(
          () =>
            new Implementation({
              project: this,
              owner: user,
              repositoryURL: '',
              category: '',
              language: '',
              libraries: ['']
            }),
          []
        );

        const add = useAction(async () => {
          await implementation.add();
          this.EditImplementationsPage.navigate();
        });

        return (
          <implementation.FormView
            title="Add an Implementation"
            onAdd={add}
            onCancel={async () => {
              this.EditImplementationsPage.navigate();
            }}
          />
        );
      });
    }

    @page('[/projects/:slug]/implementations') EditImplementationsPage() {
      const {User, Implementation} = this.constructor;

      return User.ensureAuthenticatedAdmin(() => {
        const navigator = useNavigator();

        return useData(
          async () => {
            return await Implementation.find(
              {project: this},
              {
                project: {slug: true},
                repositoryURL: true,
                repositoryStatus: true,
                status: true,
                createdAt: true
              },
              {sort: {createdAt: 'desc'}}
            );
          },

          (implementations) => (
            <div>
              <h3>Edit Implementations</h3>

              {implementations.length > 0 && (
                <Table
                  columns={[
                    {
                      header: 'Repository',
                      body: (implementation) => (
                        <>
                          {implementation.formatRepositoryURL()}
                          <implementation.RepositoryStatusBadgeView />
                        </>
                      )
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
                <Box css={{marginTop: '2rem', padding: '1rem'}}>There are no implementations.</Box>
              )}

              <ButtonBar>
                <Button
                  onClick={(event) => {
                    event.preventDefault();
                    this.AddImplementationPage.navigate();
                  }}
                  color="primary"
                >
                  Add
                </Button>
              </ButtonBar>
            </div>
          )
        );
      });
    }
  }

  return Project;
};

export declare const Project: ReturnType<typeof extendProject>;

export type Project = InstanceType<typeof Project>;
