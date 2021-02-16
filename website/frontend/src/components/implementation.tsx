import {consume} from '@layr/component';
import {Routable, route} from '@layr/routable';
import {Fragment, useState, useCallback} from 'react';
import {view, useAsyncCallback, useAsyncMemo} from '@layr/react-integration';
import {jsx, useTheme} from '@emotion/react';
import {Input, Select, Button} from '@emotion-starter/react';
import {Stack, Box, Badge, ComboBox, DropdownMenu, StarIcon, LaunchIcon} from '@emotion-kit/react';
import compact from 'lodash/compact';
import {formatDistanceToNowStrict} from 'date-fns';
import numeral from 'numeral';
import sortBy from 'lodash/sortBy';
import partition from 'lodash/partition';

import type {
  Implementation as BackendImplementation,
  ImplementationCategory,
  FrontendEnvironment
} from '../../../backend/src/components/implementation';
import type {User} from './user';
import type {Project} from './project';
import type {Common} from './common';
import {MoreIcon} from '../icons';
import {useStyles} from '../styles';

export const implementationCategories = {
  frontend: {label: 'Frontend'},
  backend: {label: 'Backend'},
  fullstack: {label: 'Fullstack'}
};

export const frontendEnvironments = {
  web: {label: 'Web'},
  mobile: {label: 'Mobile'},
  desktop: {label: 'Desktop'}
};

export const implementationStatus = {
  pending: {label: 'Pending'},
  reviewing: {label: 'Reviewing'},
  approved: {label: 'Approved'},
  rejected: {label: 'Rejected'}
};

export const repositoryStatus = {
  'available': {label: 'Available'},
  'archived': {label: 'Archived'},
  'issues-disabled': {label: 'Issues disabled'},
  'missing': {label: 'Missing'}
};

const popularLanguages = [
  'C',
  'C#',
  'C++',
  'Clojure',
  'ClojureScript',
  'CoffeeScript',
  'Dart',
  'Elixir',
  'Go',
  'Groovy',
  'Java',
  'JavaScript',
  'Kotlin',
  'Objective-C',
  'Perl',
  'PHP',
  'Python',
  'Ruby',
  'Rust',
  'Scala',
  'Swift',
  'TypeScript'
];

const popularLibraries = [
  'Angular',
  'Apollo',
  'Aurelia',
  'Backbone',
  'Dojo',
  'Elm',
  'Ember.js',
  'Express',
  'Feathers',
  'Flux',
  'Gatsby',
  'GraphQL',
  'Hapi',
  'Immer',
  'Ionic',
  'jQuery',
  'Koa',
  'Laravel',
  'LoopBack',
  'Meteor',
  'Micro',
  'MobX',
  'NestJS',
  '.NET',
  'Next.js',
  'NgRx',
  'Nuxt.js',
  'Polymer',
  'Preact',
  'Prisma',
  'React',
  'React Native',
  'Redux',
  'Relay',
  'Restify',
  'Ruby on Rails',
  'RxJS',
  'Sails',
  'Svelte',
  'Vue.js',
  'Vuex'
];

const MAXIMUM_NEW_IMPLEMENTATION_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

export const getImplementation = (Base: typeof BackendImplementation) => {
  class Implementation extends Routable(Base) {
    ['constructor']!: typeof Implementation;

    @consume() static User: typeof User;
    @consume() static Project: typeof Project;
    @consume() static Common: typeof Common;

    @route('/implementations/:id/edit\\?:callbackURL') @view() static EditPage({
      id,
      callbackURL
    }: {
      id: string;
      callbackURL?: string;
    }) {
      const {Project, Common} = this;

      return Common.ensureUser(() => {
        const [implementation, , loadingError] = useAsyncMemo(async () => {
          return await this.get(id, {
            project: {slug: true},
            repositoryURL: true,
            category: true,
            frontendEnvironment: true,
            language: true,
            libraries: true
          });
        }, [id]);

        if (loadingError !== undefined) {
          return (
            <Common.ErrorLayoutView>
              <Common.ErrorMessageView error={loadingError} />
            </Common.ErrorLayoutView>
          );
        }

        if (implementation === undefined) {
          return <Common.LoadingSpinnerView />;
        }

        callbackURL ??= Project.HomePage.generateURL(implementation.project);

        return (
          <Project.LoaderView slug={implementation.project.slug}>
            {() => (
              <implementation.FormView
                title="Edit an Implementation"
                onSave={async () => {
                  await implementation.save();
                  this.getRouter().navigate(callbackURL!);
                }}
                onDelete={async () => {
                  await implementation.delete();
                  this.getRouter().navigate(callbackURL!);
                }}
                onCancel={async () => {
                  this.getRouter().navigate(callbackURL!);
                }}
              />
            )}
          </Project.LoaderView>
        );
      });
    }

    @route('/implementations/:id/review') @view() static ReviewPage({id}: {id: string}) {
      const {Project, Common} = this;

      return Common.ensureAdmin(() => {
        const [implementation, , loadingError] = useAsyncMemo(async () => {
          const implementation = await this.get(id, {
            project: {slug: true},
            repositoryURL: true,
            category: true,
            frontendEnvironment: true,
            language: true,
            libraries: true
          });

          await implementation.reviewSubmission();

          return implementation;
        }, [id]);

        if (loadingError !== undefined) {
          return (
            <Common.ErrorLayoutView>
              <Common.ErrorMessageView error={loadingError} />
            </Common.ErrorLayoutView>
          );
        }

        if (implementation === undefined) {
          return <Common.LoadingSpinnerView />;
        }

        return (
          <Project.LoaderView slug={implementation.project.slug}>
            {(project) => (
              <implementation.FormView
                title="Review a Submission"
                onApprove={async () => {
                  await implementation.approveSubmission();
                  Project.ReviewImplementationsPage.navigate(project);
                }}
                onReject={async () => {
                  await implementation.rejectSubmission();
                  Project.ReviewImplementationsPage.navigate(project);
                }}
                onCancel={async () => {
                  await implementation.cancelSubmissionReview();
                  Project.ReviewImplementationsPage.navigate(project);
                }}
              />
            )}
          </Project.LoaderView>
        );
      });
    }

    @route('/implementations/:id/report-as-unmaintained\\?:callbackURL')
    @view()
    static ReportAsUnmaintainedPage({id, callbackURL}: {id: string; callbackURL?: string}) {
      const {Project, Common} = this;

      return Common.ensureUser(() => {
        const styles = useStyles();

        const [implementation, , loadingError] = useAsyncMemo(async () => {
          const implementation = await this.get(id, {
            project: {slug: true},
            repositoryURL: true,
            libraries: true,
            unmaintainedIssueNumber: true,
            markedAsUnmaintainedOn: true
          });

          if (implementation.unmaintainedIssueNumber !== undefined) {
            throw Object.assign(new Error('Implementation already reported as unmaintained'), {
              displayMessage: 'This implementation has already been reported as unmaintained.'
            });
          }

          if (implementation.markedAsUnmaintainedOn !== undefined) {
            throw Object.assign(new Error('Implementation already marked as unmaintained'), {
              displayMessage: 'This implementation has already been marked as unmaintained.'
            });
          }

          return implementation;
        }, [id]);

        const [issueNumber, setIssueNumber] = useState('');

        const [handleSubmit, isSubmitting, submitError] = useAsyncCallback(async () => {
          await implementation!.reportAsUnmaintained(Number(issueNumber));
          this.ReportAsUnmaintainedCompletedPage.navigate({id: implementation!.id, callbackURL});
        }, [implementation, issueNumber, callbackURL]);

        if (loadingError !== undefined) {
          return (
            <Common.ErrorLayoutView>
              <Common.ErrorMessageView error={loadingError} />
            </Common.ErrorLayoutView>
          );
        }

        if (implementation === undefined || isSubmitting) {
          return <Common.LoadingSpinnerView />;
        }

        callbackURL ??= Project.HomePage.generateURL(implementation.project);

        return (
          <Project.LoaderView slug={implementation.project.slug}>
            {() => (
              <Common.DialogView title="Report an Implementation as Unmaintained">
                <implementation.Summary />

                <p css={{marginTop: '1.5rem'}}>
                  If you think that this implementation is no longer maintained, please post a new
                  issue (or reference an existing issue) in the{' '}
                  <a href={implementation.repositoryURL} target="_blank">
                    implementation repository
                  </a>{' '}
                  with a title such as <strong>"Is this repository still maintained?"</strong> and
                  enter the issue number below.
                </p>

                <p>
                  If the issue remains <strong>open for a period of 30 days</strong>, the
                  implementation will be automatically marked as unmaintained and it will be removed
                  from the implementation list.
                </p>

                {submitError && (
                  <Common.ErrorBoxView error={submitError} css={{marginBottom: '1rem'}} />
                )}

                <form
                  onSubmit={(event) => {
                    event.preventDefault();
                    handleSubmit();
                  }}
                  autoComplete="off"
                >
                  <div css={styles.control}>
                    <label htmlFor="issueNumber" css={styles.label}>
                      Issue number
                    </label>
                    <Input
                      id="issueNumber"
                      value={issueNumber}
                      onChange={(event) => {
                        setIssueNumber(event.target.value);
                      }}
                      placeholder="123"
                      required
                      pattern="[0-9]+"
                      autoFocus
                      css={{width: 150}}
                    />
                  </div>

                  <Common.ButtonBarView>
                    <Button type="submit" color="primary">
                      Report
                    </Button>
                    <Button
                      onClick={(event) => {
                        event.preventDefault();
                        this.getRouter().navigate(callbackURL!);
                      }}
                      variant="outline"
                    >
                      Cancel
                    </Button>
                  </Common.ButtonBarView>
                </form>
              </Common.DialogView>
            )}
          </Project.LoaderView>
        );
      });
    }

    @route('/implementations/:id/report-as-unmaintained/completed\\?:callbackURL')
    @view()
    static ReportAsUnmaintainedCompletedPage({id, callbackURL}: {id: string; callbackURL: string}) {
      const {Project, Common} = this;

      return Common.ensureUser(() => {
        const [implementation, , loadingError] = useAsyncMemo(async () => {
          return await this.get(id, {project: {slug: true}});
        }, [id]);

        if (loadingError !== undefined) {
          return (
            <Common.ErrorLayoutView>
              <Common.ErrorMessageView error={loadingError} />
            </Common.ErrorLayoutView>
          );
        }

        if (implementation === undefined) {
          return <Common.LoadingSpinnerView />;
        }

        return (
          <Project.LoaderView slug={implementation.project.slug}>
            {() => (
              <Common.DialogView title={'Thank You!'}>
                <p>Your report has been recorded.</p>
                <Common.ButtonBarView>
                  <Button
                    onClick={() => {
                      this.getRouter().navigate(callbackURL);
                    }}
                    color="primary"
                  >
                    Okay
                  </Button>
                </Common.ButtonBarView>
              </Common.DialogView>
            )}
          </Project.LoaderView>
        );
      });
    }

    @route('/implementations/:id/approve-unmaintained-report\\?:token')
    @view()
    static ApproveUnmaintainedReportPage({id, token}: {id: string; token: string}) {
      const {Project, Common} = this;

      return Common.ensureAdmin(() => {
        const [implementation, , loadingError] = useAsyncMemo(async () => {
          const implementation = await this.get(id, {project: {slug: true}});

          await this.approveUnmaintainedReport(token);

          return implementation;
        }, [id, token]);

        if (loadingError !== undefined) {
          return (
            <Common.ErrorLayoutView>
              <Common.ErrorMessageView error={loadingError} />
            </Common.ErrorLayoutView>
          );
        }

        if (implementation === undefined) {
          return <Common.LoadingSpinnerView />;
        }

        return (
          <Project.LoaderView slug={implementation.project.slug}>
            {() => (
              <Common.DialogView title={'Unmaintained Implementation Report'} maxWidth={650}>
                <p>The report has been approved.</p>
                <Common.ButtonBarView>
                  <Button
                    onClick={() => {
                      Project.HomePage.navigate(implementation.project);
                    }}
                    color="primary"
                  >
                    Okay
                  </Button>
                </Common.ButtonBarView>
              </Common.DialogView>
            )}
          </Project.LoaderView>
        );
      });
    }

    @route('/implementations/:id/mark-as-unmaintained\\?:callbackURL')
    @view()
    static MarkAsUnmaintainedPage({id, callbackURL}: {id: string; callbackURL?: string}) {
      const {Project, Common} = this;

      return Common.ensureUser(() => {
        const [implementation, , loadingError] = useAsyncMemo(async () => {
          return await this.get(id, {
            project: {slug: true},
            repositoryURL: true,
            libraries: true
          });
        }, [id]);

        const [handleMark, isMarking, markError] = useAsyncCallback(async () => {
          await implementation!.markAsUnmaintained();
          this.getRouter().navigate(callbackURL!);
        }, [implementation, callbackURL]);

        if (loadingError !== undefined) {
          return (
            <Common.ErrorLayoutView>
              <Common.ErrorMessageView error={loadingError} />
            </Common.ErrorLayoutView>
          );
        }

        if (implementation === undefined || isMarking) {
          return <Common.LoadingSpinnerView />;
        }

        callbackURL ??= Project.HomePage.generateURL(implementation.project);

        return (
          <Project.LoaderView slug={implementation.project.slug}>
            {() => (
              <Common.DialogView title="Mark an Implementation as Unmaintained">
                <implementation.Summary />

                <p>Do you really want to mark this implementation as unmaintained?</p>

                {markError && (
                  <Common.ErrorBoxView error={markError} css={{marginBottom: '1rem'}} />
                )}

                <Common.ButtonBarView>
                  <Button
                    onClick={(event) => {
                      event.preventDefault();
                      handleMark();
                    }}
                    color="primary"
                  >
                    Mark as unmaintained
                  </Button>
                  <Button
                    onClick={(event) => {
                      event.preventDefault();
                      this.getRouter().navigate(callbackURL!);
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </Common.ButtonBarView>
              </Common.DialogView>
            )}
          </Project.LoaderView>
        );
      });
    }

    @route('/implementations/:id/claim-ownership\\?:callbackURL')
    @view()
    static ClaimOwnershipPage({id, callbackURL}: {id: string; callbackURL?: string}) {
      const {Project, Common} = this;

      return Common.ensureUser(() => {
        const [implementation, , loadingError] = useAsyncMemo(async () => {
          return await this.get(id, {
            project: {slug: true},
            repositoryURL: true,
            libraries: true
          });
        }, [id]);

        const [handleClaim, isClaiming, claimError] = useAsyncCallback(async () => {
          await implementation!.claimOwnership();
          this.getRouter().navigate(callbackURL!);
        }, [implementation, callbackURL]);

        if (loadingError !== undefined) {
          return (
            <Common.ErrorLayoutView>
              <Common.ErrorMessageView error={loadingError} />
            </Common.ErrorLayoutView>
          );
        }

        if (implementation === undefined || isClaiming) {
          return <Common.LoadingSpinnerView />;
        }

        callbackURL ??= Project.HomePage.generateURL(implementation.project);

        return (
          <Project.LoaderView slug={implementation.project.slug}>
            {() => (
              <Common.DialogView title="Claim Ownership of an Implementation">
                <implementation.Summary />

                <p>
                  If you are the maintainer of this implementation, you can claim its ownership and
                  get the permission to edit it, delete it, etc.
                </p>

                {claimError && (
                  <Common.ErrorBoxView error={claimError} css={{marginBottom: '1rem'}} />
                )}

                <Common.ButtonBarView>
                  <Button
                    onClick={(event) => {
                      event.preventDefault();
                      handleClaim();
                    }}
                    color="primary"
                  >
                    Claim ownership
                  </Button>
                  <Button
                    onClick={(event) => {
                      event.preventDefault();
                      this.getRouter().navigate(callbackURL!);
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </Common.ButtonBarView>
              </Common.DialogView>
            )}
          </Project.LoaderView>
        );
      });
    }

    @view() Summary() {
      const theme = useTheme();
      const styles = useStyles();

      return (
        <a href={this.repositoryURL} target="_blank" css={styles.hiddenLink}>
          <Box css={{padding: '.75rem 1rem', lineHeight: theme.lineHeights.small}}>
            <div
              css={{
                fontSize: theme.fontSizes.large,
                fontWeight: theme.fontWeights.semibold
              }}
            >
              {this.formatLibraries()}
            </div>

            <div
              css={{
                marginTop: '.3rem',
                color: theme.colors.text.muted
              }}
            >
              {this.formatRepositoryURL()}
            </div>
          </Box>
        </a>
      );
    }

    @view() static ListView({
      project,
      category: currentCategory = 'frontend',
      language: currentLanguage = 'all',
      className
    }: {
      project: Project;
      category?: ImplementationCategory;
      language?: string;
      className?: string;
    }) {
      const {Common} = this;

      const theme = useTheme();
      const styles = useStyles();

      const [implementations, , loadingError] = useAsyncMemo(async () => {
        const all = await this.find(
          {project, category: currentCategory, isPubliclyListed: true},
          {
            repositoryURL: true,
            frontendEnvironment: true,
            language: true,
            libraries: true,
            numberOfStars: true,
            markedAsUnmaintainedOn: true,
            owner: {},
            createdAt: true
          },
          {sort: {numberOfStars: 'desc'}}
        );

        const [active, unmaintained] = partition(
          all,
          (implementation) => implementation.markedAsUnmaintainedOn === undefined
        );

        return {all, active, unmaintained};
      }, [currentCategory]);

      const filterImplementationsByLanguage = useCallback(
        (implementations: Implementation[]) =>
          implementations.filter(({language}) =>
            currentLanguage !== 'all' ? language.toLowerCase() === currentLanguage : true
          ),
        [currentLanguage]
      );

      if (loadingError) {
        return (
          <Common.ErrorLayoutView>
            <Common.ErrorMessageView error={loadingError} />
          </Common.ErrorLayoutView>
        );
      }

      return (
        <div className={className}>
          <this.CategoryFilterView project={project} currentCategory={currentCategory} />

          {implementations === undefined && (
            <div css={{marginBottom: 2000}}>
              <Common.LoadingSpinnerView />
            </div>
          )}

          {implementations !== undefined && implementations.all.length > 0 && (
            <div css={{marginTop: '2rem', display: 'flex'}}>
              <div css={theme.responsive({marginRight: '3rem', display: ['block', , 'none']})}>
                <this.LanguageFilterView
                  implementations={implementations.all}
                  currentLanguage={currentLanguage}
                />
              </div>

              <div css={{flex: 1}}>
                <Stack direction="column" spacing="2rem">
                  {(() => {
                    const filteredImplementations = filterImplementationsByLanguage(
                      implementations.active
                    );

                    if (filteredImplementations.length === 0) {
                      return null;
                    }

                    return (
                      <div>
                        {filteredImplementations.map((implementation, index) => (
                          <Fragment key={implementation.id}>
                            {index > 0 && (
                              <hr css={{marginTop: '.75rem', marginBottom: '.75rem'}} />
                            )}

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
                                      opacity: 1
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
                                        opacity: 0
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

                                <div
                                  css={{
                                    width: '90px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    lineHeight: 1
                                  }}
                                >
                                  <StarIcon
                                    size={20}
                                    color={theme.colors.text.muted}
                                    outline
                                    css={{marginRight: '.25rem'}}
                                  />
                                  {implementation.formatNumberOfStars()}
                                </div>
                              </div>
                            </a>
                          </Fragment>
                        ))}
                      </div>
                    );
                  })()}

                  {(() => {
                    const filteredImplementations = filterImplementationsByLanguage(
                      implementations.unmaintained
                    );

                    if (filteredImplementations.length === 0) {
                      return null;
                    }

                    return (
                      <Box css={{padding: '.75rem 1rem'}}>
                        <strong css={{fontWeight: theme.fontWeights.semibold}}>
                          Unmaintained implementations:
                        </strong>{' '}
                        {filteredImplementations.map((implementation, index) => (
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
                    );
                  })()}
                </Stack>
              </div>
            </div>
          )}

          {implementations !== undefined && implementations.all.length === 0 && (
            <Box css={{marginTop: '2rem', padding: '1rem'}}>
              There are no implementations in this category.
            </Box>
          )}
        </div>
      );
    }

    @view() static CategoryFilterView({
      project,
      currentCategory
    }: {
      project: Project;
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
            {project.categories.map((category, index) => (
              <this.CategoryTabView
                key={category}
                category={category}
                isCurrent={currentCategory === category}
                isFirst={index === 0}
                isLast={index === project.categories.length - 1}
              />
            ))}
          </div>
        </div>
      );
    }

    @view() static CategoryTabView({
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
      const {Project} = this;

      const theme = useTheme();
      const styles = useStyles();

      const params = this.getRouter().getCurrentParams();

      return (
        <Project.HomePage.Link
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
        </Project.HomePage.Link>
      );
    }

    @view() static LanguageFilterView({
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
            <this.LanguageOptionView
              key={language}
              language={language}
              isCurrent={language.toLowerCase() === currentLanguage}
            />
          ))}
        </div>
      );
    }

    @view() static LanguageOptionView({
      language,
      isCurrent
    }: {
      language: string;
      isCurrent: boolean;
    }) {
      const {Project} = this;

      const theme = useTheme();
      const styles = useStyles();

      const params = this.getRouter().getCurrentParams();

      return (
        <Project.HomePage.Link
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
        </Project.HomePage.Link>
      );
    }

    @view() static EditListView({project}: {project: Project}) {
      const {Common} = this;

      const [implementations] = useAsyncMemo(async () => {
        return await this.find(
          {project},
          {
            project: {slug: true},
            repositoryURL: true,
            repositoryStatus: true,
            status: true,
            createdAt: true
          },
          {sort: {createdAt: 'desc'}}
        );
      });

      if (implementations === undefined) {
        return <Common.LoadingSpinnerView />;
      }

      return (
        <div>
          <h3>Edit Implementations</h3>

          {implementations.length > 0 && (
            <Common.TableView
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
                  body: (implementation) =>
                    formatDistanceToNowStrict(implementation.createdAt, {addSuffix: true})
                }
              ]}
              items={implementations}
              onItemClick={({id}) => {
                this.EditPage.navigate({id, callbackURL: this.getRouter().getCurrentURL()});
              }}
              css={{marginTop: '2rem'}}
            />
          )}

          {implementations.length === 0 && (
            <Box css={{marginTop: '2rem', padding: '1rem'}}>There are no implementations.</Box>
          )}
        </div>
      );
    }

    @view() static ReviewListView({project}: {project: Project}) {
      const {Common} = this;

      const [implementations] = useAsyncMemo(async () => {
        return await this.findSubmissionsToReview({project});
      });

      if (implementations === undefined) {
        return <Common.LoadingSpinnerView />;
      }

      return (
        <div>
          <h3>Review Submissions</h3>

          {implementations.length > 0 && (
            <Common.TableView
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
                  body: (implementation) =>
                    formatDistanceToNowStrict(implementation.createdAt, {addSuffix: true})
                }
              ]}
              items={implementations}
              onItemClick={(implementation) => {
                this.ReviewPage.navigate(implementation);
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
      );
    }

    @view() static UserListView({user}: {user: User}) {
      const {Common} = this;

      const [implementations] = useAsyncMemo(async () => {
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
      });

      if (implementations === undefined) {
        return <Common.LoadingSpinnerView />;
      }

      return (
        <div>
          <h3>Your Implementations</h3>

          {implementations.length > 0 && (
            <Common.TableView
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
                  body: (implementation) =>
                    formatDistanceToNowStrict(implementation.createdAt, {addSuffix: true})
                }
              ]}
              items={implementations}
              onItemClick={({id}) => {
                Implementation.EditPage.navigate({
                  id,
                  callbackURL: this.getRouter().getCurrentURL()
                });
              }}
              css={{marginTop: '2rem'}}
            />
          )}

          {implementations.length === 0 && (
            <Box css={{marginTop: '2rem', padding: '1rem'}}>You have no implementations.</Box>
          )}
        </div>
      );
    }

    @view() FormView({
      title,
      onSubmit,
      onSave,
      onDelete,
      onApprove,
      onReject,
      onCancel
    }: {
      title: string;
      onSubmit?: () => Promise<any>;
      onSave?: () => Promise<void>;
      onDelete?: () => Promise<void>;
      onApprove?: () => Promise<void>;
      onReject?: () => Promise<void>;
      onCancel: () => Promise<void>;
    }) {
      const {Common} = this.constructor;

      const styles = useStyles();

      const [allLibraries, isFindingAllLibraries, findAllLibrariesError] = useAsyncMemo(
        async () => {
          let allLibraries = [...popularLibraries];

          const usedLibraries = await this.constructor.findUsedLibraries();

          for (const usedLibrary of usedLibraries) {
            const usedLibraryLowercase = usedLibrary.toLocaleLowerCase();

            if (
              !allLibraries.some((library) => library.toLocaleLowerCase() === usedLibraryLowercase)
            ) {
              allLibraries.push(usedLibrary);
            }
          }

          allLibraries = sortBy(allLibraries, (library) => library.toLocaleLowerCase());

          return allLibraries;
        }
      );

      const cleanAttributes = useCallback(() => {
        this.repositoryURL = this.repositoryURL.trim();
        this.language = this.language.trim();
        this.libraries = compact(this.libraries.map((library) => library.trim()));
      }, []);

      const [handleSubmit, isSubmitting, submitError] = useAsyncCallback(async () => {
        cleanAttributes();
        await onSubmit!();
      });

      const [handleSave, isSaving, saveError] = useAsyncCallback(async () => {
        cleanAttributes();
        await onSave!();
      });

      const [handleDelete, isDeleting, deleteError] = useAsyncCallback(async () => {
        if (confirm('Are you sure you want to delete this implementation?')) {
          await onDelete!();
        }
      });

      const [handleApprove, isApproving, approveError] = useAsyncCallback(async () => {
        cleanAttributes();
        await onApprove!();
      });

      const [handleReject, isRejecting, rejectError] = useAsyncCallback(async () => {
        await onReject!();
      });

      const [handleCancel, isCanceling, cancelError] = useAsyncCallback(async () => {
        await onCancel();
      });

      const isBusy =
        isFindingAllLibraries ||
        isSubmitting ||
        isSaving ||
        isDeleting ||
        isApproving ||
        isRejecting ||
        isCanceling;

      const error =
        findAllLibrariesError ||
        submitError ||
        saveError ||
        deleteError ||
        approveError ||
        rejectError ||
        cancelError;

      if (isBusy) {
        return <Common.LoadingSpinnerView />;
      }

      if (this.libraries[this.libraries.length - 1] !== '') {
        this.libraries = [...this.libraries, ''];
      }

      const category = this.getAttribute('category').isSet() ? this.category : '';

      const libraryPlaceholder =
        category === 'frontend'
          ? 'React'
          : category === 'backend'
          ? 'Express'
          : category === 'fullstack'
          ? 'Meteor'
          : '';

      return (
        <Common.DialogView title={title}>
          <form
            onSubmit={
              onSubmit || onSave
                ? (event) => {
                    event.preventDefault();

                    if (onSubmit) {
                      handleSubmit();
                    } else if (onSave) {
                      handleSave();
                    }
                  }
                : undefined
            }
            autoComplete="off"
          >
            {error && <Common.ErrorBoxView error={error} />}

            <Stack direction="column">
              <div css={styles.control}>
                <label htmlFor="repositoryURL" css={styles.label}>
                  Repository URL
                </label>
                <div css={{display: 'flex', alignItems: 'center'}}>
                  <Input
                    id="repositoryURL"
                    value={this.repositoryURL}
                    onChange={(event) => {
                      this.repositoryURL = event.target.value;
                    }}
                    placeholder="https://github.com/owner/repository"
                    readOnly={!this.isNew()}
                    required
                    autoFocus={this.isNew()}
                    css={{width: '100%'}}
                  />
                  <OpenURLButton url={this.repositoryURL} css={{marginLeft: '.5rem'}} />
                </div>
              </div>

              <Stack>
                <div css={styles.control}>
                  <label htmlFor="category" css={styles.label}>
                    Category
                  </label>
                  <Select
                    id="category"
                    value={category}
                    onChange={(event) => {
                      if (event.target.value !== '') {
                        this.category = event.target.value as ImplementationCategory;
                      } else {
                        this.getAttribute('category').unsetValue();
                      }

                      this.frontendEnvironment = undefined;
                    }}
                    required
                    css={{width: 150}}
                  >
                    {this.isNew() && <option value="" />}
                    {Object.entries(implementationCategories).map(([value, {label}]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </Select>
                </div>

                {(category === 'frontend' || category === 'fullstack') && (
                  <div css={styles.control}>
                    <label htmlFor="frontendEnvironment" css={styles.label}>
                      Environment
                    </label>
                    <Select
                      id="frontendEnvironment"
                      value={this.frontendEnvironment !== undefined ? this.frontendEnvironment : ''}
                      onChange={(event) => {
                        this.frontendEnvironment =
                          event.target.value !== ''
                            ? (event.target.value as FrontendEnvironment)
                            : undefined;
                      }}
                      required
                      css={{width: 150}}
                    >
                      <option value="" />
                      {Object.entries(frontendEnvironments).map(([value, {label}]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </div>
                )}

                <div css={styles.control}>
                  <label htmlFor="language" css={styles.label}>
                    Language
                  </label>
                  <ComboBox
                    id="language"
                    items={popularLanguages}
                    initialValue={this.language}
                    onValueChange={(value) => {
                      this.language = value;
                    }}
                    required
                    placeholder="JavaScript"
                    css={{width: 200}}
                  />
                </div>
              </Stack>

              <div css={styles.control}>
                <label css={styles.label}>Libraries/Frameworks</label>
                <Stack direction="column" spacing=".5rem">
                  {this.libraries.map((_, index) => (
                    <ComboBox
                      key={index}
                      items={allLibraries}
                      initialValue={this.libraries[index]}
                      onValueChange={(value) => {
                        this.libraries[index] = value;
                      }}
                      placeholder={index === 0 ? libraryPlaceholder : 'One more?'}
                      css={{width: 200}}
                    />
                  ))}
                </Stack>
              </div>
            </Stack>

            <Common.ButtonBarView>
              {onSubmit && (
                <Button type="submit" color="primary">
                  Submit
                </Button>
              )}

              {onSave && (
                <Button type="submit" color="primary">
                  Save
                </Button>
              )}

              {onDelete && (
                <Button
                  onClick={(event) => {
                    event.preventDefault();
                    handleDelete();
                  }}
                >
                  Delete
                </Button>
              )}

              {onApprove && (
                <Button
                  onClick={(event) => {
                    event.preventDefault();
                    handleApprove();
                  }}
                  color="positive"
                >
                  Approve
                </Button>
              )}

              {onReject && (
                <Button
                  onClick={(event) => {
                    event.preventDefault();
                    handleReject();
                  }}
                  color="negative"
                >
                  Reject
                </Button>
              )}

              <Button
                onClick={(event) => {
                  event.preventDefault();
                  handleCancel();
                }}
                variant="outline"
              >
                Cancel
              </Button>
            </Common.ButtonBarView>
          </form>
        </Common.DialogView>
      );
    }

    @view() RepositoryStatusBadgeView() {
      if (this.repositoryStatus === 'available') {
        return null;
      }

      return (
        <Badge color="secondary" variant="outline" css={{marginLeft: '.75rem'}}>
          {repositoryStatus[this.repositoryStatus].label}
        </Badge>
      );
    }

    @view() MenuView({className}: {className?: string}) {
      const {Session} = this.constructor;

      const theme = useTheme();

      const isOwnedBySessionUser = this.owner === Session.user;
      const isAdmin = Session.user?.isAdmin;

      return (
        <DropdownMenu
          items={[
            (isOwnedBySessionUser || isAdmin) && {
              label: 'Edit',
              onClick: (event) => {
                event.preventDefault();
                this.constructor.EditPage.navigate({
                  id: this.id,
                  callbackURL: this.getRouter().getCurrentURL()
                });
              }
            },
            !(isOwnedBySessionUser || isAdmin)
              ? {
                  label: 'Report as unmaintained',
                  onClick: (event) => {
                    event.preventDefault();
                    this.constructor.ReportAsUnmaintainedPage.navigate({
                      id: this.id,
                      callbackURL: this.getRouter().getCurrentURL()
                    });
                  }
                }
              : {
                  label: 'Mark as unmaintained',
                  onClick: (event) => {
                    event.preventDefault();
                    this.constructor.MarkAsUnmaintainedPage.navigate({
                      id: this.id,
                      callbackURL: this.getRouter().getCurrentURL()
                    });
                  }
                },
            !isOwnedBySessionUser && {
              label: 'Claim ownership',
              onClick: (event) => {
                event.preventDefault();
                this.constructor.ClaimOwnershipPage.navigate({
                  id: this.id,
                  callbackURL: this.getRouter().getCurrentURL()
                });
              }
            }
          ]}
        >
          {({open}) => (
            <div
              onClick={(event) => {
                event.preventDefault();
                open(event);
              }}
              className={className}
            >
              <MoreIcon
                size={20}
                css={{
                  'color': theme.colors.text.moreMuted,
                  ':hover': {color: theme.colors.text.normal}
                }}
              />
            </div>
          )}
        </DropdownMenu>
      );
    }

    formatRepositoryURL() {
      return this.repositoryURL.slice('https://github.com/'.length);
    }

    formatFrontendEnvironment() {
      return this.frontendEnvironment !== undefined
        ? frontendEnvironments[this.frontendEnvironment].label
        : '';
    }

    formatLibraries() {
      return this.libraries.join(' + ');
    }

    formatNumberOfStars() {
      return numeral(this.numberOfStars).format('0.[0]a');
    }

    formatStatus() {
      return implementationStatus[this.status].label;
    }
  }

  return Implementation;
};

export declare const Implementation: ReturnType<typeof getImplementation>;

export type Implementation = InstanceType<typeof Implementation>;

function OpenURLButton({url, className}: {url?: string; className?: string}) {
  const theme = useTheme();

  return (
    <LaunchIcon
      onClick={
        url
          ? () => {
              window.open(url, 'codebaseshow-repository-review');
            }
          : undefined
      }
      size={24}
      css={{
        'color': url ? theme.colors.text.muted : theme.colors.border.normal,
        'cursor': url ? 'pointer' : undefined,
        ':hover': url ? {color: theme.colors.text.normal} : undefined
      }}
      className={className}
    />
  );
}
