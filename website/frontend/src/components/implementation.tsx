import {consume} from '@layr/component';
import {Routable} from '@layr/routable';
import {useState} from 'react';
import {page, view, useData, useAction, useNavigator} from '@layr/react-integration';
import {throwError} from '@layr/utilities';
import {jsx, useTheme} from '@emotion/react';
import {Input, Select, Button} from '@emotion-starter/react';
import {Stack, Box, Badge, ComboBox, DropdownMenu, LaunchIcon} from '@emotion-kit/react';
import {formatDistanceToNowStrict} from 'date-fns';
import sortBy from 'lodash/sortBy';

import type {
  Implementation as BackendImplementation,
  ImplementationCategory,
  FrontendEnvironment
} from '../../../backend/src/components/implementation';
import type {User} from './user';
import type {Project} from './project';
import {MoreIcon} from '../icons';
import {useStyles} from '../styles';
import {Dialog, ButtonBar} from '../ui';

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

export const extendImplementation = (Base: typeof BackendImplementation) => {
  class Implementation extends Routable(Base) {
    ['constructor']!: typeof Implementation;

    @consume() static User: typeof User;
    @consume() static Project: typeof Project;

    project!: Project;

    @page('[/projects/:project.slug]/implementations/:id/edit', {params: {callbackURL: 'string?'}})
    EditPage({callbackURL = this.project.ItemPage.generateURL()}: {callbackURL?: string}) {
      const {User} = this.constructor;

      return User.ensureAuthenticatedUser(() => {
        const navigator = useNavigator();

        const save = useAction(async () => {
          await this.save();
          navigator.navigate(callbackURL);
        });

        const delete_ = useAction(async () => {
          await this.delete();
          navigator.navigate(callbackURL);
        });

        const cancel = useAction(async () => {
          navigator.navigate(callbackURL);
        });

        return useData(
          async () => {
            await this.load({
              project: {slug: true},
              repositoryURL: true,
              category: true,
              frontendEnvironment: true,
              language: true,
              libraries: true
            });
          },

          () => (
            <this.FormView
              title="Edit an Implementation"
              onSave={save}
              onDelete={delete_}
              onCancel={cancel}
            />
          )
        );
      });
    }

    @page('[/projects/:project.slug]/implementations/:id/review') ReviewPage() {
      const {User} = this.constructor;

      return User.ensureAuthenticatedAdmin(() => {
        const approve = useAction(async () => {
          await this.approveSubmission();
          this.project.ReviewImplementationsPage.navigate();
        });

        const reject = useAction(async () => {
          this.ReviewRejectPage.navigate();
        });

        const cancel = useAction(async () => {
          await this.cancelSubmissionReview();
          this.project.ReviewImplementationsPage.navigate();
        });

        return useData(
          async () => {
            await this.load({
              project: {slug: true},
              repositoryURL: true,
              category: true,
              frontendEnvironment: true,
              language: true,
              libraries: true
            });

            await this.reviewSubmission();
          },

          () => (
            <this.FormView
              title="Review a Submission"
              onApprove={approve}
              onReject={reject}
              onCancel={cancel}
            />
          )
        );
      });
    }

    @page('[/projects/:project.slug]/implementations/:id/review/reject') ReviewRejectPage() {
      const {User} = this.constructor;

      return User.ensureAuthenticatedAdmin(() => {
        const styles = useStyles();

        const [rejectionReason, setRejectionReason] = useState('');

        const submit = useAction(async () => {
          await this.rejectSubmission({rejectionReason});
          this.project.ReviewImplementationsPage.navigate();
        }, [rejectionReason]);

        return useData(
          async () => {
            await this.load({project: {slug: true}, repositoryURL: true, libraries: true});

            await this.reviewSubmission();
          },
          () => (
            <Dialog title="Reject a Submission">
              <this.Summary />

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  submit();
                }}
                autoComplete="off"
                css={{marginTop: '1.5rem'}}
              >
                <div css={styles.control}>
                  <label htmlFor="rejectionReason" css={styles.label}>
                    Rejection reason
                  </label>
                  <Input
                    id="rejectionReason"
                    value={rejectionReason}
                    onChange={(event) => {
                      setRejectionReason(event.target.value);
                    }}
                    autoFocus
                  />
                </div>

                <ButtonBar>
                  <Button type="submit" color="primary">
                    Reject
                  </Button>
                  <Button
                    onClick={(event) => {
                      event.preventDefault();
                      this.ReviewPage.navigate();
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </ButtonBar>
              </form>
            </Dialog>
          )
        );
      });
    }

    @page('[/projects/:project.slug]/implementations/:id/report-as-unmaintained', {
      params: {callbackURL: 'string?'}
    })
    ReportAsUnmaintainedPage({
      callbackURL = this.project.ItemPage.generateURL()
    }: {
      callbackURL?: string;
    }) {
      const {User} = this.constructor;

      return User.ensureAuthenticatedUser(() => {
        const styles = useStyles();
        const navigator = useNavigator();

        const [issueNumber, setIssueNumber] = useState('');

        const submit = useAction(async () => {
          await this.reportAsUnmaintained(Number(issueNumber));
          this.ReportAsUnmaintainedCompletedPage.navigate({callbackURL});
        }, [issueNumber, callbackURL]);

        return useData(
          async () => {
            await this.load({
              project: {slug: true},
              repositoryURL: true,
              libraries: true,
              unmaintainedIssueNumber: true,
              markedAsUnmaintainedOn: true
            });

            if (this.unmaintainedIssueNumber !== undefined) {
              throwError('Implementation already reported as unmaintained', {
                displayMessage: 'This implementation has already been reported as unmaintained.'
              });
            }

            if (this.markedAsUnmaintainedOn !== undefined) {
              throwError('Implementation already marked as unmaintained', {
                displayMessage: 'This implementation has already been marked as unmaintained.'
              });
            }
          },

          () => (
            <Dialog title="Report an Implementation as Unmaintained">
              <this.Summary />

              <p css={{marginTop: '1.5rem'}}>
                If you think that this implementation is no longer maintained, please post a new
                issue (or reference an existing issue) in the{' '}
                <a href={this.repositoryURL} target="_blank">
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

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  submit();
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

                <ButtonBar>
                  <Button type="submit" color="primary">
                    Report
                  </Button>
                  <Button
                    onClick={(event) => {
                      event.preventDefault();
                      navigator.navigate(callbackURL);
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </ButtonBar>
              </form>
            </Dialog>
          )
        );
      });
    }

    @page('[/projects/:project.slug]/implementations/:id/report-as-unmaintained/completed', {
      params: {callbackURL: 'string'}
    })
    ReportAsUnmaintainedCompletedPage({callbackURL}: {callbackURL: string}) {
      const {User} = this.constructor;

      return User.ensureAuthenticatedUser(() => {
        const navigator = useNavigator();

        return useData(
          async () => {
            await this.load({project: {slug: true}});
          },

          () => (
            <Dialog title={'Thank You!'}>
              <p>Your report has been recorded.</p>
              <ButtonBar>
                <Button
                  onClick={() => {
                    navigator.navigate(callbackURL);
                  }}
                  color="primary"
                >
                  Okay
                </Button>
              </ButtonBar>
            </Dialog>
          )
        );
      });
    }

    @page('[/projects/:project.slug]/implementations/:id/approve-unmaintained-report', {
      params: {token: 'string'}
    })
    ApproveUnmaintainedReportPage({token}: {token: string}) {
      const {User} = this.constructor;

      return User.ensureAuthenticatedAdmin(() => {
        return useData(
          async () => {
            await this.load({project: {slug: true}});
            await this.constructor.approveUnmaintainedReport(token);
          },

          () => (
            <Dialog title={'Unmaintained Implementation Report'} maxWidth={650}>
              <p>The report has been approved.</p>
              <ButtonBar>
                <Button
                  onClick={() => {
                    this.project.ItemPage.navigate();
                  }}
                  color="primary"
                >
                  Okay
                </Button>
              </ButtonBar>
            </Dialog>
          )
        );
      });
    }

    @page('[/projects/:project.slug]/implementations/:id/mark-as-unmaintained', {
      params: {callbackURL: 'string?'}
    })
    MarkAsUnmaintainedPage({
      callbackURL = this.project.ItemPage.generateURL()
    }: {
      callbackURL?: string;
    }) {
      const {User} = this.constructor;

      return User.ensureAuthenticatedUser(() => {
        const navigator = useNavigator();

        const mark = useAction(async () => {
          await this.markAsUnmaintained();
          navigator.navigate(callbackURL);
        }, [callbackURL]);

        return useData(
          async () => {
            await this.load({project: {slug: true}, repositoryURL: true, libraries: true});
          },

          () => (
            <Dialog title="Mark an Implementation as Unmaintained">
              <this.Summary />

              <p>Do you really want to mark this implementation as unmaintained?</p>

              <ButtonBar>
                <Button
                  onClick={(event) => {
                    event.preventDefault();
                    mark();
                  }}
                  color="primary"
                >
                  Mark as unmaintained
                </Button>
                <Button
                  onClick={(event) => {
                    event.preventDefault();
                    navigator.navigate(callbackURL);
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
              </ButtonBar>
            </Dialog>
          )
        );
      });
    }

    @page('[/projects/:project.slug]/implementations/:id/claim-ownership', {
      params: {callbackURL: 'string?'}
    })
    ClaimOwnershipPage({
      callbackURL = this.project.ItemPage.generateURL()
    }: {
      callbackURL?: string;
    }) {
      const {User} = this.constructor;

      return User.ensureAuthenticatedUser(() => {
        const navigator = useNavigator();

        const claim = useAction(async () => {
          await this.claimOwnership();
          navigator.navigate(callbackURL);
        }, [callbackURL]);

        return useData(
          async () => {
            await this.load({project: {slug: true}, repositoryURL: true, libraries: true});
          },

          () => (
            <Dialog title="Claim Ownership of an Implementation">
              <this.Summary />

              <p>
                If you are the maintainer of this implementation, you can claim its ownership and
                get the permission to edit it, delete it, etc.
              </p>

              <ButtonBar>
                <Button
                  onClick={(event) => {
                    event.preventDefault();
                    claim();
                  }}
                  color="primary"
                >
                  Claim ownership
                </Button>
                <Button
                  onClick={(event) => {
                    event.preventDefault();
                    navigator.navigate(callbackURL);
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
              </ButtonBar>
            </Dialog>
          )
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

    @view() FormView({
      title,
      onSubmit,
      onAdd,
      onSave,
      onDelete,
      onApprove,
      onReject,
      onCancel
    }: {
      title: string;
      onSubmit?: () => Promise<any>;
      onAdd?: () => Promise<any>;
      onSave?: () => Promise<void>;
      onDelete?: () => Promise<void>;
      onApprove?: () => Promise<void>;
      onReject?: () => Promise<void>;
      onCancel: () => Promise<void>;
    }) {
      const styles = useStyles();

      const ensureEmptyLibraryItem = () => {
        if (this.libraries[this.libraries.length - 1] !== '' && this.libraries.length < 5) {
          this.libraries = [...this.libraries, ''];
        }
      };

      return useData(
        async () => {
          ensureEmptyLibraryItem();

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
        },

        (allLibraries) => {
          const libraryPlaceholder =
            this.category === 'frontend'
              ? 'React'
              : this.category === 'backend'
              ? 'Express'
              : this.category === 'fullstack'
              ? 'Meteor'
              : '';

          return (
            <Dialog title={title}>
              <form
                onSubmit={
                  onSubmit || onAdd || onSave
                    ? (event) => {
                        event.preventDefault();

                        if (onSubmit) {
                          onSubmit();
                        } else if (onAdd) {
                          onAdd();
                        } else if (onSave) {
                          onSave();
                        }
                      }
                    : undefined
                }
                autoComplete="off"
              >
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
                        value={this.category}
                        onChange={(event) => {
                          this.category = event.target.value as ImplementationCategory;
                          this.frontendEnvironment = undefined;
                        }}
                        required
                        css={{width: 150}}
                      >
                        {this.isNew() && <option value="" />}
                        {this.project.categories.map((category) => (
                          <option key={category} value={category}>
                            {implementationCategories[category].label}
                          </option>
                        ))}
                      </Select>
                    </div>

                    {(this.category === 'frontend' || this.category === 'fullstack') && (
                      <div css={styles.control}>
                        <label htmlFor="frontendEnvironment" css={styles.label}>
                          Environment
                        </label>
                        <Select
                          id="frontendEnvironment"
                          value={
                            this.frontendEnvironment !== undefined ? this.frontendEnvironment : ''
                          }
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
                            ensureEmptyLibraryItem();
                          }}
                          placeholder={index === 0 ? libraryPlaceholder : 'One more?'}
                          css={{width: 200}}
                        />
                      ))}
                    </Stack>
                  </div>
                </Stack>

                <ButtonBar>
                  {onSubmit && (
                    <Button type="submit" color="primary">
                      Submit
                    </Button>
                  )}

                  {onAdd && (
                    <Button type="submit" color="primary">
                      Add
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

                        if (confirm('Are you sure you want to delete this implementation?')) {
                          onDelete();
                        }
                      }}
                    >
                      Delete
                    </Button>
                  )}

                  {onApprove && (
                    <Button
                      onClick={(event) => {
                        event.preventDefault();
                        onApprove();
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
                        onReject();
                      }}
                      color="negative"
                    >
                      Reject
                    </Button>
                  )}

                  <Button
                    onClick={(event) => {
                      event.preventDefault();
                      onCancel();
                    }}
                    variant="outline"
                  >
                    Cancel
                  </Button>
                </ButtonBar>
              </form>
            </Dialog>
          );
        }
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
      const {User} = this.constructor;

      const theme = useTheme();
      const navigator = useNavigator();

      const isOwnedByAuthenticatedUser = this.owner === User.authenticatedUser;
      const isAdmin = User.authenticatedUser?.isAdmin;

      return (
        <DropdownMenu
          items={[
            (isOwnedByAuthenticatedUser || isAdmin) && {
              label: 'Edit',
              onClick: (event) => {
                event.preventDefault();
                this.EditPage.navigate({callbackURL: navigator.getCurrentURL()});
              }
            },
            !(isOwnedByAuthenticatedUser || isAdmin)
              ? {
                  label: 'Report as unmaintained',
                  onClick: (event) => {
                    event.preventDefault();
                    this.ReportAsUnmaintainedPage.navigate({
                      callbackURL: navigator.getCurrentURL()
                    });
                  }
                }
              : {
                  label: 'Mark as unmaintained',
                  onClick: (event) => {
                    event.preventDefault();
                    this.MarkAsUnmaintainedPage.navigate({
                      callbackURL: navigator.getCurrentURL()
                    });
                  }
                },
            !isOwnedByAuthenticatedUser && {
              label: 'Claim ownership',
              onClick: (event) => {
                event.preventDefault();
                this.ClaimOwnershipPage.navigate({
                  callbackURL: navigator.getCurrentURL()
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

    formatStatus() {
      return implementationStatus[this.status].label;
    }

    formatCreatedAt() {
      return formatDistanceToNowStrict(this.createdAt, {addSuffix: true});
    }
  }

  return Implementation;
};

export declare const Implementation: ReturnType<typeof extendImplementation>;

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
