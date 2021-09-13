import {consume, expose, sanitizers, validators, AttributeSelector} from '@layr/component';
import {attribute, method, index, finder} from '@layr/storable';
import {throwError} from '@layr/utilities';
import escape from 'lodash/escape';

import type {User} from './user';
import type {Project} from './project';
import {Entity} from './entity';
import {WithOwner} from './with-owner';
import {GitHub} from '../github';
import {sendMail} from '../mailer';
import {generateJWT, verifyJWT} from '../jwt';

const {trim, compact} = sanitizers;
const {optional, maxLength, rangeLength, match, anyOf, integer, positive} = validators;

export const IMPLEMENTATION_CATEGORIES = ['frontend', 'backend', 'fullstack'] as const;

export type ImplementationCategory = typeof IMPLEMENTATION_CATEGORIES[number];

const FRONTEND_ENVIRONMENTS = ['web', 'mobile', 'desktop'] as const;

export type FrontendEnvironment = typeof FRONTEND_ENVIRONMENTS[number];

const IMPLEMENTATION_STATUSES = ['pending', 'reviewing', 'approved', 'rejected'] as const;

export type ImplementationStatus = typeof IMPLEMENTATION_STATUSES[number];

const REPOSITORY_STATUSES = ['available', 'archived', 'issues-disabled', 'missing'] as const;

export type RepositoryStatus = typeof REPOSITORY_STATUSES[number];

export const MAXIMUM_REVIEW_DURATION = 5 * 60 * 1000; // 5 minutes

const MAXIMUM_UNMAINTAINED_ISSUE_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

const ADMIN_TOKEN_DURATION = 30 * 24 * 60 * 60 * 1000; // 30 days

@expose({
  get: {call: true},
  find: {call: true},
  prototype: {
    load: {call: true},
    save: {call: ['owner', 'admin']},
    delete: {call: ['owner', 'admin']}
  }
})
@index({
  project: 'asc',
  category: 'asc',
  status: 'asc',
  repositoryStatus: 'asc',
  librariesSortKey: 'asc',
  language: 'asc'
})
@index({
  project: 'asc',
  createdAt: 'desc'
})
@index({owner: 'asc', createdAt: 'desc'})
export class Implementation extends WithOwner(Entity) {
  ['constructor']!: typeof Implementation;

  @consume() static Project: typeof Project;

  @expose({get: true, set: ['owner', 'admin']})
  @attribute('Project')
  project!: Project;

  @expose({get: true, set: ['owner', 'admin']})
  @attribute('string', {
    sanitizers: [trim()],
    validators: [maxLength(500), match(/^https\:\/\/github\.com\//)]
  })
  repositoryURL!: string;

  @expose({get: ['owner', 'admin']})
  @index()
  @attribute('string', {
    validators: [anyOf(REPOSITORY_STATUSES)]
  })
  repositoryStatus: RepositoryStatus = 'available';

  @expose({get: true, set: ['owner', 'admin']})
  @index()
  @attribute('string', {
    validators: [anyOf(IMPLEMENTATION_CATEGORIES)]
  })
  category!: ImplementationCategory;

  @expose({get: true, set: ['owner', 'admin']})
  @index()
  @attribute('string?', {
    validators: [optional(anyOf(FRONTEND_ENVIRONMENTS))]
  })
  frontendEnvironment?: FrontendEnvironment;

  @expose({get: true, set: ['owner', 'admin']})
  @index()
  @attribute('string', {sanitizers: [trim()], validators: [rangeLength([1, 100])]})
  language!: string;

  @expose({get: true, set: ['owner', 'admin']})
  @index()
  @attribute('string[]', {
    sanitizers: [compact()],
    validators: [rangeLength([1, 5], 'You must specify at least one library or framework.')],
    items: {sanitizers: [trim()], validators: [rangeLength([1, 50])]}
  })
  libraries!: string[];

  @expose({get: true}) @attribute('string') librariesSortKey = '';

  @expose({get: ['owner', 'admin']})
  @index()
  @attribute('string', {
    validators: [anyOf(IMPLEMENTATION_STATUSES)]
  })
  status: ImplementationStatus = 'pending';

  @expose({get: 'admin'})
  @attribute('User?')
  reviewer?: User;

  @attribute('Date?') reviewStartedOn?: Date;

  @expose({get: true})
  @attribute('number?', {validators: [optional([integer(), positive()])]})
  numberOfPendingIssues?: number;

  @attribute() githubData!: any;

  @index() @attribute() githubDataFetchedOn?: Date;

  @expose({get: true})
  @attribute('number?', {validators: [optional([integer(), positive()])]})
  unmaintainedIssueNumber?: number;

  @expose({get: true}) @attribute('Date?') markedAsUnmaintainedOn?: Date;

  @expose({get: true})
  @finder(function (value) {
    if (value === false) {
      throw new Error('Unsupported query');
    }

    return {
      status: 'approved',
      repositoryStatus: 'available'
    };
  })
  @attribute('boolean')
  isPubliclyListed!: boolean;

  async beforeSave(attributeSelector: AttributeSelector) {
    await super.beforeSave(attributeSelector);

    if (this.getAttribute('libraries').isSet()) {
      this.librariesSortKey = this.libraries
        .map((library) => library.toLocaleLowerCase())
        .join(',');
    }
  }

  @expose({call: 'owner'}) @method() async submit() {
    const {User} = this.constructor;

    if (!this.isNew()) {
      throw new Error('Cannot submit a non-new implementation');
    }

    const {owner, name} = parseRepositoryURL(this.repositoryURL);

    const {ownerId, isArchived, hasIssues, githubData} = await GitHub.fetchRepository({
      owner,
      name
    });

    const authenticatedUser = (await User.getAuthenticatedUser())!;

    if (!authenticatedUser.isAdmin) {
      const userId = authenticatedUser.githubId;

      if (ownerId !== userId) {
        const contributor = await GitHub.findRepositoryContributor({owner, name, userId});

        if (contributor === undefined) {
          throwError(`Contributor not found`, {
            displayMessage: 'Sorry, you must be a contributor of the specified repository.'
          });
        }
      }
    }

    if (isArchived) {
      throwError(`Repository archived`, {displayMessage: 'The specified repository is archived.'});
    }

    if (!hasIssues) {
      throwError(`Repository issues disabled`, {
        displayMessage:
          'Sorry, you cannot submit an implementation with a repository that has the "Issues" feature disabled.'
      });
    }

    this.githubData = githubData;
    this.githubDataFetchedOn = new Date();

    await this.save();

    await this.project.load({slug: true, name: true});

    try {
      await sendMail({
        subject: `A new ${this.project.name} implementation has been submitted`,
        text: `A new ${this.project.name} implementation has been submitted:\n\n${process.env.FRONTEND_URL}projects/${this.project.slug}/implementations/${this.id}/review\n`
      });
    } catch (error) {
      console.error(error);
    }
  }

  @expose({call: 'admin'}) @method() async add() {
    if (!this.isNew()) {
      throw new Error('Cannot add a non-new implementation');
    }

    const {owner, name} = parseRepositoryURL(this.repositoryURL);

    const {githubData} = await GitHub.fetchRepository({
      owner,
      name
    });

    this.status = 'approved';
    this.githubData = githubData;
    this.githubDataFetchedOn = new Date();

    await this.save();
  }

  @expose({call: 'admin'}) @method() async reviewSubmission() {
    const {User} = this.constructor;

    const authenticatedUser = (await User.getAuthenticatedUser())!;

    await this.load({status: true, reviewer: {}, reviewStartedOn: true});

    if (this.status === 'reviewing') {
      const reviewDuration = Date.now() - this.reviewStartedOn!.valueOf();

      if (this.reviewer !== authenticatedUser && reviewDuration < MAXIMUM_REVIEW_DURATION) {
        throwError('Implementation currently reviewed', {
          displayMessage: 'This submission is currently being reviewed by another administrator.'
        });
      }
    } else if (this.status !== 'pending') {
      throwError('Implementation already reviewed', {
        displayMessage: 'This submission has already been reviewed.'
      });
    }

    this.status = 'reviewing';
    this.reviewer = authenticatedUser;
    this.reviewStartedOn = new Date();

    await this.save();
  }

  @expose({call: 'admin'}) @method() async approveSubmission() {
    const {User} = this.constructor;

    const authenticatedUser = (await User.getAuthenticatedUser())!;

    await this.load({
      project: {slug: true, name: true},
      repositoryURL: true,
      category: true,
      status: true,
      owner: {username: true, email: true},
      reviewer: {}
    });

    if (this.status !== 'reviewing' || this.reviewer !== authenticatedUser) {
      throw new Error('Approval error');
    }

    this.status = 'approved';
    this.reviewStartedOn = undefined;

    await this.save();

    try {
      await sendMail({
        to: this.owner.email,
        subject: `Your ${this.project.name} implementation has been approved`,
        html: `
<p>Hi, ${this.owner.username},</p>

<p>Your ${this.project.name} <a href="${this.repositoryURL}">implementation</a> has been approved and is now listed on the <a href="${process.env.FRONTEND_URL}projects/${this.project.slug}?category=${this.category}">project's home page</a>.</p>

<p>Thanks a lot for your contribution!</p>

<p>--<br>The CodebaseShow project</p>
`
      });
    } catch (error) {
      console.error(error);
    }
  }

  @expose({call: 'admin'}) @method() async rejectSubmission({rejectionReason = ''} = {}) {
    // Rejection reason examples:
    // - This implementation seems to be a work in progress

    const {User} = this.constructor;

    const authenticatedUser = (await User.getAuthenticatedUser())!;

    await this.load({
      project: {slug: true, name: true},
      repositoryURL: true,
      category: true,
      status: true,
      owner: {username: true, email: true},
      reviewer: {}
    });

    if (this.status !== 'reviewing' || this.reviewer !== authenticatedUser) {
      throw new Error('Rejection error');
    }

    this.status = 'rejected';
    this.reviewStartedOn = undefined;

    await this.save({status: true, reviewStartedOn: true});

    try {
      await sendMail({
        to: this.owner.email,
        subject: `Your ${this.project.name} implementation could not be approved`,
        html: `
<p>Hi, ${this.owner.username},</p>

<p>Unfortunately, your ${this.project.name} <a href="${
          this.repositoryURL
        }">implementation</a> could not be approved${
          rejectionReason !== '' ? ` for the following reason(s):` : '.'
        }</p>${rejectionReason !== '' ? `\n\n<ul><li>${escape(rejectionReason)}.</li></ul>` : ''}

        <p>Feel free to submit again in the future.</p>

<p>--<br>The CodebaseShow project</p>
`
      });
    } catch (error) {
      console.error(error);
    }
  }

  @expose({call: 'admin'}) @method() async cancelSubmissionReview() {
    const {User} = this.constructor;

    const authenticatedUser = (await User.getAuthenticatedUser())!;

    await this.load({status: true, reviewer: {}});

    if (this.status !== 'reviewing' || this.reviewer !== authenticatedUser) {
      throw new Error('Cancellation error');
    }

    this.status = 'pending';
    this.reviewer = undefined;
    this.reviewStartedOn = undefined;

    await this.save({status: true, reviewer: true, reviewStartedOn: true});
  }

  @expose({call: 'user'}) @method() async reportAsUnmaintained(issueNumber: number) {
    const {User} = this.constructor;

    const authenticatedUser = (await User.getAuthenticatedUser({username: true}))!;

    await this.load({project: {slug: true, name: true}, repositoryURL: true});

    const {owner, name} = parseRepositoryURL(this.repositoryURL);

    const issue = await GitHub.fetchIssue({owner, name, number: issueNumber});

    if (issue.isClosed) {
      throwError('Issue closed', {displayMessage: `The specified issue is closed.`});
    }

    const implementationURL = `${process.env.FRONTEND_URL}projects/${this.project.slug}/implementations/${this.id}/edit`;

    const userURL = `https://github.com/${authenticatedUser.username}`;

    const approvalToken = generateJWT({
      operation: 'approve-unmaintained-implementation-report',
      implementationId: this.id,
      issueNumber,
      exp: Math.round((Date.now() + ADMIN_TOKEN_DURATION) / 1000)
    });

    const approvalURL = `${process.env.FRONTEND_URL}projects/${this.project.slug}/implementations/${
      this.id
    }/approve-unmaintained-report?token=${encodeURIComponent(approvalToken)}`;

    const html = `
<p>
The following ${this.project.name} implementation has been reported as unmaintained:
</p>

<p>
<a href="${implementationURL}">${implementationURL}</a>
</p>

<p>
Reporter:
</p>

<p>
<a href="${userURL}">${userURL}</a>
</p>

<p>
Issue:
</p>

<p>
<a href="${issue.url}">${issue.url}</a>
</p>

<p>
Click the following link to approve the report:
</p>

<p>
<a href="${approvalURL}">${approvalURL}</a>
</p>
`;

    await sendMail({
      subject: `A ${this.project.name} implementation has been reported as unmaintained`,
      html
    });
  }

  @expose({call: 'admin'}) @method() static async approveUnmaintainedReport(token: string) {
    const payload = verifyJWT(token) as
      | {operation: string; implementationId: string; issueNumber: number}
      | undefined;

    if (payload === undefined) {
      throw new Error('Invalid token');
    }

    if (payload.operation !== 'approve-unmaintained-implementation-report') {
      throw new Error('Invalid operation');
    }

    const implementation = await this.get(payload.implementationId, {markedAsUnmaintainedOn: true});

    if (implementation.markedAsUnmaintainedOn !== undefined) {
      return;
    }

    implementation.unmaintainedIssueNumber = payload.issueNumber;
    await implementation.save();

    await implementation.checkMaintenanceStatus();
  }

  @expose({call: ['owner', 'admin']}) @method() async markAsUnmaintained() {
    const {User} = this.constructor;

    const authenticatedUser = (await User.getAuthenticatedUser({username: true}))!;

    await this.load({project: {slug: true, name: true}, repositoryURL: true});

    this.unmaintainedIssueNumber = undefined;
    this.markedAsUnmaintainedOn = new Date();
    await this.save();

    console.log(
      `The implementation '${this.repositoryURL}' has been marked as unmaintained by its owner (id: '${this.id}')`
    );

    const implementationURL = `${process.env.FRONTEND_URL}projects/${this.project.slug}/implementations/${this.id}/edit`;

    const userURL = `https://github.com/${authenticatedUser.username}`;

    const html = `
<p>
The following ${this.project.name} implementation has been marked as unmaintained by its owner:
</p>

<p>
<a href="${implementationURL}">${implementationURL}</a>
</p>

<p>
Owner:
</p>

<p>
<a href="${userURL}">${userURL}</a>
</p>
`;

    await sendMail({
      subject: `A ${this.project.name} implementation has been marked as unmaintained by its owner`,
      html
    });
  }

  @expose({call: 'user'}) @method() async claimOwnership() {
    const {User} = this.constructor;

    const authenticatedUser = (await User.getAuthenticatedUser({
      username: true,
      githubId: true
    }))!;

    await this.load({
      project: {slug: true, name: true},
      repositoryURL: true,
      owner: {username: true, isAdmin: true}
    });

    if (!this.owner.isAdmin) {
      throwError(`Implementation not owned by an admin`, {
        displayMessage:
          'Sorry but for now only implementations that have been added by a CodebaseShow administrator can be claimed.'
      });
    }

    const {owner, name} = parseRepositoryURL(this.repositoryURL);

    const {ownerId} = await GitHub.fetchRepository({owner, name});

    const userId = authenticatedUser.githubId;

    if (ownerId !== userId) {
      const contributor = await GitHub.findRepositoryContributor({owner, name, userId});

      if (contributor === undefined) {
        throwError(`User is not a maintainer`, {
          displayMessage:
            'Sorry but it was not possible to verify that you are the maintainer of this implementation.'
        });
      }
    }

    const previousOwner = this.owner;

    this.owner = authenticatedUser;
    await this.save();

    console.log(
      `The ownership of the implementation '${this.repositoryURL}' has been claimed (id: '${this.id}')`
    );

    const implementationURL = `${process.env.FRONTEND_URL}projects/${this.project.slug}/implementations/${this.id}/edit`;

    const previousOwnerURL = `https://github.com/${previousOwner.username}`;

    const newOwnerURL = `https://github.com/${authenticatedUser.username}`;

    const html = `
<p>
The ownership of the following ${this.project.name} implementation has been claimed:
</p>

<p>
<a href="${implementationURL}">${implementationURL}</a>
</p>

<p>
Previous owner:
</p>

<p>
<a href="${previousOwnerURL}">${previousOwnerURL}</a>
</p>

<p>
New owner:
</p>

<p>
<a href="${newOwnerURL}">${newOwnerURL}</a>
</p>
`;

    await sendMail({
      subject: `The ownership of a ${this.project.name} implementation has been claimed`,
      html
    });
  }

  static async checkMaintenanceStatus() {
    const implementations = await this.find(
      {unmaintainedIssueNumber: {$notEqual: undefined}},
      {
        repositoryURL: true,
        unmaintainedIssueNumber: true,
        markedAsUnmaintainedOn: true
      }
    );

    for (const implementation of implementations) {
      try {
        await implementation.checkMaintenanceStatus();
      } catch (error) {
        console.error(
          `An error occurred while checking the maintenance status of the implementation '${implementation.repositoryURL}' (${error.message})`
        );
      }
    }
  }

  async checkMaintenanceStatus() {
    await this.load({
      repositoryURL: true,
      unmaintainedIssueNumber: true,
      markedAsUnmaintainedOn: true
    });

    if (this.unmaintainedIssueNumber === undefined) {
      return;
    }

    if (this.markedAsUnmaintainedOn !== undefined) {
      return;
    }

    const {owner, name} = parseRepositoryURL(this.repositoryURL);

    const issue = await GitHub.fetchIssue({owner, name, number: this.unmaintainedIssueNumber});

    if (issue.isClosed) {
      this.unmaintainedIssueNumber = undefined;
      await this.save();

      console.log(`The unmaintained issue '${issue.url}' has been closed (id: '${this.id}')`);

      return;
    }

    if (Date.now() - issue.createdAt.valueOf() > MAXIMUM_UNMAINTAINED_ISSUE_DURATION) {
      this.unmaintainedIssueNumber = undefined;
      this.markedAsUnmaintainedOn = new Date();
      await this.save();

      console.log(
        `The implementation '${this.repositoryURL}' has been marked as unmaintained (id: '${this.id}')`
      );

      return;
    }

    console.log(
      `The unmaintained issue '${issue.url}' has been successfully checked (id: '${this.id}')`
    );
  }

  @expose({call: true}) @method() static async findUsedLibraries() {
    // TODO: Don't use store's internals
    const store = this.getStore();
    const collection = await (store as any)._getCollection('Implementation');
    const usedLibraries = (await collection.distinct('libraries')) as string[];

    // Strangely, `collection.distinct()` returns an `undefined` entry in case there
    // is an empty array of libraries and the libraries field is indexed
    const usedLibrariesWithoutUndefined = usedLibraries.filter((library) => library !== undefined);

    return usedLibrariesWithoutUndefined;
  }

  static async refreshGitHubData({limit}: {limit?: number} = {}) {
    const implementations = await this.find(
      {},
      {repositoryURL: true},
      {sort: {githubDataFetchedOn: 'asc'}, limit}
    );

    for (const implementation of implementations) {
      await implementation.refreshGitHubData();
    }
  }

  async refreshGitHubData() {
    await this.load({repositoryURL: true});

    try {
      const {owner, name} = parseRepositoryURL(this.repositoryURL);

      const {isArchived, hasIssues, githubData} = await GitHub.fetchRepository({
        owner,
        name
      });

      this.githubData = githubData;

      if (isArchived) {
        this.repositoryStatus = 'archived';
      } else if (!hasIssues) {
        this.repositoryStatus = 'issues-disabled';
      } else {
        this.repositoryStatus = 'available';
      }

      console.log(
        `The implementation '${this.repositoryURL}' has been successfully refreshed (id: '${this.id}')`
      );
    } catch (error) {
      if (error.code === 'REPOSITORY_NOT_FOUND') {
        this.repositoryStatus = 'missing';
      } else {
        console.error(
          `An error occurred while refreshing the implementation '${this.repositoryURL}' (${error.message})`
        );
      }
    }

    this.githubDataFetchedOn = new Date();

    await this.save();
  }
}

function parseRepositoryURL(url: string) {
  if (!url.startsWith('https://github.com')) {
    throwError('Not a GitHub URL', {
      displayMessage: 'Sorry, only GitHub repositories are supported.'
    });
  }

  if (url.endsWith('/')) {
    url = url.slice(0, -1);
  }

  const matches = url.match(/^https\:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)(.+)?$/);

  if (matches === null) {
    throwError('Invalid repository URL', {
      displayMessage: 'The specified repository URL is invalid.'
    });
  }

  const [, owner, name, rest] = matches;

  return {owner, name, isRoot: rest === undefined};
}
