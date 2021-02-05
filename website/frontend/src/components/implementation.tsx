import {consume} from '@layr/component';
import {Routable, route} from '@layr/routable';
import {Fragment, useState, useMemo, useCallback} from 'react';
import {view, useAsyncCallback, useAsyncMemo, useAsyncCall} from '@layr/react-integration';
import {jsx, useTheme} from '@emotion/react';
import {Input, Select, Button} from '@emotion-starter/react';
import {Stack, Box, Badge, ComboBox, DropdownMenu, FlagIcon, LaunchIcon} from '@emotion-kit/react';
import compact from 'lodash/compact';
import {formatDistanceToNowStrict} from 'date-fns';
import numeral from 'numeral';

import type {
  Implementation as BackendImplementation,
  ImplementationCategory,
  FrontendEnvironment
} from '../../../backend/src/components/implementation';
import type {Home} from './home';
import type {Common} from './common';
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

export const getImplementation = (Base: typeof BackendImplementation) => {
  class Implementation extends Routable(Base) {
    ['constructor']!: typeof Implementation;

    @consume() static Home: typeof Home;
    @consume() static Common: typeof Common;

    @route('/implementations/submit') @view() static Submit() {
      const {Home, Common} = this;

      return Common.ensureUser(() => {
        const implementation = useMemo(
          () =>
            this.create(
              {
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
          this.SubmitCompleted.navigate();
        });

        return (
          <implementation.Form
            title="Submit an Implementation"
            onSubmit={handleSubmit}
            onCancel={async () => {
              Home.Main.navigate();
            }}
          />
        );
      });
    }

    @route('/implementations/submit/completed') @view() static SubmitCompleted() {
      const {Home, Common} = this;

      return Common.ensureUser(() => {
        return (
          <Common.Dialog title={'Thank You!'}>
            <p>Your submission has been recorded. We will review it shortly.</p>
            <Common.ButtonBar>
              <Button
                onClick={() => {
                  Home.Main.navigate();
                }}
                color="primary"
              >
                Okay
              </Button>
            </Common.ButtonBar>
          </Common.Dialog>
        );
      });
    }

    @route('/implementations/:id/edit\\?:callbackURL') @view() static Edit({
      id,
      callbackURL = this.Home.Main.generateURL()
    }: {
      id: string;
      callbackURL?: string;
    }) {
      const {Common} = this;

      return Common.ensureUser(() => {
        const [implementation, , loadingError] = useAsyncMemo(async () => {
          return await this.get(id, {
            repositoryURL: true,
            category: true,
            frontendEnvironment: true,
            language: true,
            libraries: true
          });
        }, [id]);

        if (loadingError !== undefined) {
          return (
            <Common.ErrorLayout>
              <Common.ErrorMessage error={loadingError} />
            </Common.ErrorLayout>
          );
        }

        if (implementation === undefined) {
          return <Common.LoadingSpinner />;
        }

        return (
          <implementation.Form
            title="Edit an Implementation"
            onSave={async () => {
              await implementation.save();
              this.getRouter().navigate(callbackURL);
            }}
            onDelete={async () => {
              await implementation.delete();
              this.getRouter().navigate(callbackURL);
            }}
            onCancel={async () => {
              this.getRouter().navigate(callbackURL);
            }}
          />
        );
      });
    }

    @route('/user/implementations') @view() static OwnedList() {
      const {Common} = this;

      return Common.ensureUser((owner) => {
        const [implementations] = useAsyncMemo(async () => {
          return await this.find(
            {owner},
            {
              repositoryURL: true,
              createdAt: true,
              status: true
            },
            {sort: {createdAt: 'desc'}}
          );
        });

        if (implementations === undefined) {
          return <Common.LoadingSpinner />;
        }

        return (
          <div css={{margin: '2rem 0 3rem 0'}}>
            <h3>Your Implementations</h3>

            {implementations.length > 0 && (
              <Common.Table
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
                  this.Edit.navigate({id, callbackURL: this.OwnedList.generatePath()});
                }}
                css={{marginTop: '2rem'}}
              />
            )}

            {implementations.length === 0 && (
              <Box css={{marginTop: '2rem', padding: '1rem'}}>You have no implementations.</Box>
            )}
          </div>
        );
      });
    }

    @route('/implementations') @view() static List() {
      const {Common} = this;

      return Common.ensureAdmin(() => {
        const [implementations] = useAsyncMemo(async () => {
          return await this.find(
            {},
            {
              repositoryURL: true,
              repositoryStatus: true,
              status: true,
              createdAt: true
            },
            {sort: {createdAt: 'desc'}}
          );
        });

        if (implementations === undefined) {
          return <Common.LoadingSpinner />;
        }

        return (
          <div css={{margin: '2rem 0 3rem 0'}}>
            <h3>Edit Implementations</h3>

            {implementations.length > 0 && (
              <Common.Table
                columns={[
                  {
                    header: 'Repository',
                    body: (implementation) => (
                      <>
                        {implementation.formatRepositoryURL()}
                        <implementation.RepositoryStatusBadge />
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
                  this.Edit.navigate({id, callbackURL: this.List.generatePath()});
                }}
                css={{marginTop: '2rem'}}
              />
            )}

            {implementations.length === 0 && (
              <Box css={{marginTop: '2rem', padding: '1rem'}}>There are no implementations.</Box>
            )}
          </div>
        );
      });
    }

    @route('/implementations/review') @view() static ReviewList() {
      const {Common} = this;

      return Common.ensureAdmin(() => {
        const [implementations] = useAsyncMemo(async () => {
          return await this.findSubmissionsToReview();
        });

        if (implementations === undefined) {
          return <Common.LoadingSpinner />;
        }

        return (
          <div css={{margin: '2rem 0 3rem 0'}}>
            <h3>Review Submissions</h3>

            {implementations.length > 0 && (
              <Common.Table
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
                  this.Review.navigate(implementation);
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
      });
    }

    @route('/implementations/:id/review') @view() static Review({id}: {id: string}) {
      const {Common} = this;

      return Common.ensureAdmin(() => {
        const [implementation, , loadingError] = useAsyncMemo(async () => {
          return await this.reviewSubmission(id);
        }, [id]);

        if (loadingError !== undefined) {
          return (
            <Common.ErrorLayout>
              <Common.ErrorMessage error={loadingError} />
            </Common.ErrorLayout>
          );
        }

        if (implementation === undefined) {
          return <Common.LoadingSpinner />;
        }

        return (
          <implementation.Form
            title="Review a Submission"
            onApprove={async () => {
              await implementation.approveSubmission();
              this.ReviewList.navigate();
            }}
            onReject={async () => {
              await implementation.rejectSubmission();
              this.ReviewList.navigate();
            }}
            onCancel={async () => {
              await implementation.cancelSubmissionReview();
              this.ReviewList.navigate();
            }}
          />
        );
      });
    }

    @view() Form({
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
        isSubmitting || isSaving || isDeleting || isApproving || isRejecting || isCanceling;
      const error =
        submitError || saveError || deleteError || approveError || rejectError || cancelError;

      if (isBusy) {
        return <Common.LoadingSpinner />;
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
        <Common.Dialog title={title}>
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
            {error && <Common.ErrorBox error={error} />}

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
                      items={popularLibraries}
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

            <Common.ButtonBar>
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
            </Common.ButtonBar>
          </form>
        </Common.Dialog>
      );
    }

    @view() RepositoryStatusBadge() {
      if (this.repositoryStatus === 'available') {
        return null;
      }

      return (
        <Badge color="secondary" variant="outline" css={{marginLeft: '.75rem'}}>
          {repositoryStatus[this.repositoryStatus].label}
        </Badge>
      );
    }

    @view() FlagMenu({className}: {className?: string}) {
      const theme = useTheme();

      return (
        <DropdownMenu
          items={[
            {
              label: 'Report as unmaintained',
              onClick: (event) => {
                event.preventDefault();
                this.constructor.ReportAsUnmaintained.navigate({
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
              <FlagIcon
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

    @route('/implementations/:id/report-as-unmaintained\\?:callbackURL')
    @view()
    static ReportAsUnmaintained({
      id,
      callbackURL = this.Home.Main.generateURL()
    }: {
      id: string;
      callbackURL?: string;
    }) {
      const {Common} = this;

      return Common.ensureUser(() => {
        const theme = useTheme();
        const styles = useStyles();

        const [implementation, , loadingError] = useAsyncMemo(async () => {
          const implementation = await this.get(id, {
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
          this.ReportAsUnmaintainedCompleted.navigate({id: implementation!.id, callbackURL});
        }, [implementation, issueNumber]);

        if (loadingError !== undefined) {
          return (
            <Common.ErrorLayout>
              <Common.ErrorMessage error={loadingError} />
            </Common.ErrorLayout>
          );
        }

        if (implementation === undefined || isSubmitting) {
          return <Common.LoadingSpinner />;
        }

        return (
          <Common.Dialog title="Report an Implementation as Unmaintained">
            <a href={implementation.repositoryURL} target="_blank" css={styles.hiddenLink}>
              <Box css={{padding: '.75rem 1rem', lineHeight: theme.lineHeights.small}}>
                <div
                  css={{
                    fontSize: theme.fontSizes.large,
                    fontWeight: theme.fontWeights.semibold
                  }}
                >
                  {implementation.formatLibraries()}
                </div>

                <div
                  css={{
                    marginTop: '.3rem',
                    color: theme.colors.text.muted
                  }}
                >
                  {implementation.formatRepositoryURL()}
                </div>
              </Box>
            </a>

            <p css={{marginTop: '1.5rem'}}>
              If you think that this implementation is no longer maintained, please post a new issue
              (or reference an existing issue) in the{' '}
              <a href={implementation.repositoryURL} target="_blank">
                implementation repository
              </a>{' '}
              with a title such as <strong>"Is this repository still maintained?"</strong> and enter
              the issue number below.
            </p>

            <p>
              If the issue remains <strong>open for a period of 30 days</strong>, the implementation
              will be automatically marked as unmaintained and it will be removed from the
              implementation list.
            </p>

            {submitError && <Common.ErrorBox error={submitError} css={{marginBottom: '1rem'}} />}

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

              <Common.ButtonBar>
                <Button type="submit" color="primary">
                  Report
                </Button>
                <Button
                  onClick={(event) => {
                    event.preventDefault();
                    this.getRouter().navigate(callbackURL);
                  }}
                  variant="outline"
                >
                  Cancel
                </Button>
              </Common.ButtonBar>
            </form>
          </Common.Dialog>
        );
      });
    }

    @route('/implementations/:id/report-as-unmaintained/completed\\?:callbackURL')
    @view()
    static ReportAsUnmaintainedCompleted({
      callbackURL = this.Home.Main.generateURL()
    }: {
      callbackURL?: string;
    }) {
      const {Common} = this;

      return Common.ensureUser(() => {
        return (
          <Common.Dialog title={'Thank You!'}>
            <p>Your report has been recorded.</p>
            <Common.ButtonBar>
              <Button
                onClick={() => {
                  this.getRouter().navigate(callbackURL);
                }}
                color="primary"
              >
                Okay
              </Button>
            </Common.ButtonBar>
          </Common.Dialog>
        );
      });
    }

    @route('/implementations/:id/approve-unmaintained-report\\?:token')
    @view()
    static ApproveUnmaintainedReport({token}: {token: string}) {
      const {Home, Common} = this;

      return Common.ensureAdmin(() => {
        const [isApproving, approvingError] = useAsyncCall(async () => {
          await this.approveUnmaintainedReport(token);
        }, [token]);

        if (approvingError !== undefined) {
          return (
            <Common.ErrorLayout>
              <Common.ErrorMessage error={approvingError} />
            </Common.ErrorLayout>
          );
        }

        if (isApproving) {
          return <Common.LoadingSpinner />;
        }

        return (
          <Common.Dialog title={'Unmaintained Implementation Report'} maxWidth={650}>
            <p>The report has been approved.</p>
            <Common.ButtonBar>
              <Button
                onClick={() => {
                  Home.Main.navigate();
                }}
                color="primary"
              >
                Okay
              </Button>
            </Common.ButtonBar>
          </Common.Dialog>
        );
      });
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
              window.open(url, 'realworld-repository-review');
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
