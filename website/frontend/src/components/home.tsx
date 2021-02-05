import {Component, consume} from '@layr/component';
import {Routable, route} from '@layr/routable';
import {Fragment, useCallback} from 'react';
import {jsx, useTheme, Theme} from '@emotion/react';
import {view, useAsyncMemo} from '@layr/react-integration';
import {Stack, Box, Badge, StarIcon} from '@emotion-kit/react';
import sortBy from 'lodash/sortBy';
import partition from 'lodash/partition';

import {User} from './user';
import {Implementation, implementationCategories} from './implementation';
import type {Common} from './common';
import type {ImplementationCategory} from '../../../backend/src/components/implementation';
// @ts-ignore
import conduitScreenshot from '../assets/conduit-screenshot-20201213.immutable.png';
import {useStyles} from '../styles';

const filterHeaderStyle = (theme: Theme) =>
  ({
    fontSize: theme.fontSizes.small,
    color: theme.colors.text.muted,
    fontWeight: theme.fontWeights.bold,
    textTransform: 'uppercase',
    letterSpacing: '1px'
  } as const);

export class Home extends Routable(Component) {
  @consume() static User: typeof User;
  @consume() static Implementation: typeof Implementation;
  @consume() static Common: typeof Common;

  @route('/\\?:category&:language') @view() static Main({
    category,
    language
  }: {
    category?: ImplementationCategory;
    language?: string;
  }) {
    const theme = useTheme();

    return (
      <div css={{margin: '3.5rem 0 4rem 0'}}>
        {category === undefined && language === undefined && (
          <div css={{textAlign: 'center', marginBottom: '3.3rem'}}>
            <a href="https://demo.realworld.io/" target="_blank">
              <img
                src={conduitScreenshot}
                alt="Application screenshot"
                css={{width: 250, marginTop: '-.5rem', marginBottom: '-1.5rem'}}
              />
            </a>
            <h2
              css={theme.responsive({
                fontSize: ['250%', , , '200%'],
                fontWeight: theme.fontWeights.bold
              })}
            >
              The mother of all demo apps
            </h2>
            <p
              css={{
                fontSize: theme.fontSizes.large,
                color: theme.colors.text.muted,
                lineHeight: theme.lineHeights.small
              }}
            >
              See how the exact same application is built using different libraries and frameworks.
            </p>
          </div>
        )}

        <this.Implementations key={category} category={category} language={language} />
      </div>
    );
  }

  @view() static Implementations({
    category: currentCategory = 'frontend',
    language: currentLanguage = 'all',
    className
  }: {
    category?: ImplementationCategory;
    language?: string;
    className?: string;
  }) {
    const {Implementation, Common} = this;

    const theme = useTheme();
    const styles = useStyles();

    const [implementations, , loadingError] = useAsyncMemo(async () => {
      const all = await Implementation.find(
        {category: currentCategory, status: 'approved', repositoryStatus: 'available'},
        {
          repositoryURL: true,
          frontendEnvironment: true,
          language: true,
          libraries: true,
          numberOfStars: true,
          markedAsUnmaintainedOn: true
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
        <Common.ErrorLayout>
          <Common.ErrorMessage error={loadingError} />
        </Common.ErrorLayout>
      );
    }

    return (
      <div className={className}>
        <this.CategoryFilter currentCategory={currentCategory} />

        {implementations === undefined && (
          <div css={{marginBottom: 2000}}>
            <Common.LoadingSpinner />
          </div>
        )}

        {implementations !== undefined && implementations.all.length > 0 && (
          <div css={{marginTop: '2rem', display: 'flex'}}>
            <div css={theme.responsive({marginRight: '3rem', display: ['block', , 'none']})}>
              <this.LanguageFilter
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
                                  '.implementation-flag-menu': {
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
                                  <implementation.FlagMenu
                                    className="implementation-flag-menu"
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
                          <a
                            href={implementation.repositoryURL}
                            target="_blank"
                            css={{'color': 'inherit', ':hover': {color: 'inherit'}}}
                          >
                            {implementation.formatLibraries()}
                          </a>
                          {index < implementations.unmaintained.length - 1 ? ', ' : '.'}
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

  @view() static CategoryFilter({currentCategory}: {currentCategory: ImplementationCategory}) {
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
          <this.CategoryTab
            category="frontend"
            isCurrent={currentCategory === 'frontend'}
            isFirst
          />
          <this.CategoryTab category="backend" isCurrent={currentCategory === 'backend'} />
          <this.CategoryTab
            category="fullstack"
            isCurrent={currentCategory === 'fullstack'}
            isLast
          />
        </div>
      </div>
    );
  }

  @view() static CategoryTab({
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

    return (
      <this.Main.Link params={{category}} css={styles.hiddenLink}>
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
      </this.Main.Link>
    );
  }

  @view() static LanguageFilter({
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
        <div css={filterHeaderStyle(theme)}>Languages</div>

        {sortedLanguages.map((language) => (
          <this.LanguageOption
            key={language}
            language={language}
            isCurrent={language.toLowerCase() === currentLanguage}
          />
        ))}
      </div>
    );
  }

  @view() static LanguageOption({language, isCurrent}: {language: string; isCurrent: boolean}) {
    const theme = useTheme();
    const styles = useStyles();

    const params = this.getRouter().getCurrentParams();

    return (
      <this.Main.Link
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
      </this.Main.Link>
    );
  }
}
