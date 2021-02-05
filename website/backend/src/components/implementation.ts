import {consume, expose, validators} from '@layr/component';
import {attribute, method, index} from '@layr/storable';
import env from 'env-var';

import type {User} from './user';
import {Entity} from './entity';
import {WithOwner} from './with-owner';
import type {GitHub} from './github';
import type {Mailer} from './mailer';
import type {JWT} from './jwt';

const {optional, maxLength, rangeLength, match, anyOf, integer, positive} = validators;

const frontendURL = env.get('FRONTEND_URL').required().asUrlString();

const IMPLEMENTATION_CATEGORIES = ['frontend', 'backend', 'fullstack'] as const;

export type ImplementationCategory = typeof IMPLEMENTATION_CATEGORIES[number];

const FRONTEND_ENVIRONMENTS = ['web', 'mobile', 'desktop'] as const;

export type FrontendEnvironment = typeof FRONTEND_ENVIRONMENTS[number];

const IMPLEMENTATION_STATUSES = ['pending', 'reviewing', 'approved', 'rejected'] as const;

export type ImplementationStatus = typeof IMPLEMENTATION_STATUSES[number];

const REPOSITORY_STATUSES = ['available', 'archived', 'issues-disabled', 'missing'] as const;

export type RepositoryStatus = typeof REPOSITORY_STATUSES[number];

const MAXIMUM_REVIEW_DURATION = 5 * 60 * 1000; // 5 minutes

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
@index({category: 'asc', status: 'asc', repositoryStatus: 'asc', numberOfStars: 'desc'})
@index({owner: 'asc', createdAt: 'desc'})
export class Implementation extends WithOwner(Entity) {
  ['constructor']!: typeof Implementation;

  @consume() static GitHub: typeof GitHub;
  @consume() static Mailer: typeof Mailer;
  @consume() static JWT: typeof JWT;

  @expose({get: true, set: ['owner', 'admin']})
  @attribute('string', {
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
  @attribute('string', {validators: [rangeLength([1, 100])]})
  language!: string;

  @expose({get: true, set: ['owner', 'admin']})
  @attribute('string[]', {
    validators: [rangeLength([1, 5])],
    items: {validators: [rangeLength([1, 50])]}
  })
  libraries!: string[];

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
  @index()
  @attribute('number', {validators: [integer(), positive()]})
  numberOfStars = 0;

  @expose({get: true})
  @attribute('number?', {validators: [optional([integer(), positive()])]})
  numberOfPendingIssues?: number;

  @attribute() githubData!: any;

  @index() @attribute() githubDataFetchedOn?: Date;

  @expose({get: true})
  @attribute('number?', {validators: [optional([integer(), positive()])]})
  unmaintainedIssueNumber?: number;

  @expose({get: true}) @attribute('Date?') markedAsUnmaintainedOn?: Date;

  @expose({call: 'owner'}) @method() async submit() {
    const {Session, GitHub, Mailer} = this.constructor;

    if (!this.isNew()) {
      throw new Error('Cannot submit a non-new implementation');
    }

    if (this.libraries.length === 0) {
      throw Object.assign(new Error(`'libraries' cannot be empty`), {
        displayMessage: 'You must specify at least one library or framework.'
      });
    }

    const {owner, name} = parseRepositoryURL(this.repositoryURL);

    const {
      ownerId,
      numberOfStars,
      isArchived,
      hasIssues,
      githubData
    } = await GitHub.fetchRepository({owner, name});

    if (!Session.user!.isAdmin) {
      const userId = Session.user!.githubId;

      if (ownerId !== userId) {
        const contributor = await GitHub.findRepositoryContributor({owner, name, userId});

        if (contributor === undefined) {
          throw Object.assign(new Error(`Contributor not found`), {
            displayMessage: 'Sorry, you must be a contributor of the specified repository.'
          });
        }
      }
    }

    if (isArchived) {
      throw Object.assign(new Error(`Repository archived`), {
        displayMessage: 'The specified repository is archived.'
      });
    }

    if (!hasIssues) {
      throw Object.assign(new Error(`Repository issues disabled`), {
        displayMessage:
          'Sorry, you cannot submit an implementation with a repository that has the "Issues" feature disabled.'
      });
    }

    this.numberOfStars = numberOfStars;
    this.githubData = githubData;
    this.githubDataFetchedOn = new Date();

    await this.save();

    try {
      await Mailer.sendMail({
        subject: 'A new RealWorld implementation has been submitted',
        text: `A new RealWorld implementation has been submitted:\n\n${frontendURL}implementations/${this.id}/review\n`
      });
    } catch (error) {
      console.error(error);
    }
  }

  @expose({call: 'admin'}) @method() static async findSubmissionsToReview<
    T extends typeof Implementation
  >(this: T) {
    const {Session} = this;

    return (await this.find(
      {
        $or: [
          {status: 'pending'},
          {
            status: 'reviewing',
            reviewer: Session.user
          },
          {
            status: 'reviewing',
            reviewStartedOn: {$lessThan: new Date(Date.now() - MAXIMUM_REVIEW_DURATION)}
          }
        ]
      },
      {
        repositoryURL: true,
        category: true,
        frontendEnvironment: true,
        language: true,
        libraries: true,
        createdAt: true
      },
      {sort: {createdAt: 'asc'}}
    )) as InstanceType<T>[];
  }

  @expose({call: 'admin'}) @method() static async reviewSubmission<T extends typeof Implementation>(
    this: T,
    id: string
  ) {
    const {Session} = this;

    const implementation = (await this.get(id, {
      repositoryURL: true,
      category: true,
      frontendEnvironment: true,
      language: true,
      libraries: true,
      status: true,
      reviewer: {},
      reviewStartedOn: true
    })) as InstanceType<T>;

    if (implementation.status === 'reviewing') {
      const reviewDuration = Date.now() - implementation.reviewStartedOn!.valueOf();

      if (implementation.reviewer !== Session.user && reviewDuration < MAXIMUM_REVIEW_DURATION) {
        throw Object.assign(new Error('Implementation currently reviewed'), {
          displayMessage: 'This submission is currently being reviewed by another administrator.'
        });
      }
    } else if (implementation.status !== 'pending') {
      throw Object.assign(new Error('Implementation already reviewed'), {
        displayMessage: 'This submission has already been reviewed.'
      });
    }

    implementation.status = 'reviewing';
    implementation.reviewer = Session.user;
    implementation.reviewStartedOn = new Date();

    await implementation.save();

    return implementation;
  }

  @expose({call: 'admin'}) @method() async approveSubmission() {
    const {Session, Mailer} = this.constructor;

    await this.load({
      repositoryURL: true,
      category: true,
      status: true,
      owner: {username: true, email: true},
      reviewer: {}
    });

    if (this.status !== 'reviewing' || this.reviewer !== Session.user) {
      throw new Error('Approval error');
    }

    this.status = 'approved';
    this.reviewStartedOn = undefined;

    await this.save();

    try {
      await Mailer.sendMail({
        to: this.owner.email,
        subject: 'Your RealWorld implementation has been approved',
        html: `
<p>Hi, ${this.owner.username},</p>

<p>Your <a href="${this.repositoryURL}">RealWorld implementation</a> has been approved and is now listed on the <a href="${frontendURL}?category=${this.category}">home page</a> of our website.</p>

<p>Thanks a lot for your contribution!</p>

<p>--<br>The RealWorld example apps project</p>
`
      });
    } catch (error) {
      console.error(error);
    }
  }

  @expose({call: 'admin'}) @method() async rejectSubmission() {
    const {Session} = this.constructor;

    await this.load({status: true, reviewer: {}});

    if (this.status !== 'reviewing' || this.reviewer !== Session.user) {
      throw new Error('Rejection error');
    }

    this.status = 'rejected';
    this.reviewStartedOn = undefined;

    await this.save({status: true, reviewStartedOn: true});
  }

  @expose({call: 'admin'}) @method() async cancelSubmissionReview() {
    const {Session} = this.constructor;

    await this.load({status: true, reviewer: {}});

    if (this.status !== 'reviewing' || this.reviewer !== Session.user) {
      throw new Error('Cancellation error');
    }

    this.status = 'pending';
    this.reviewer = undefined;
    this.reviewStartedOn = undefined;

    await this.save({status: true, reviewer: true, reviewStartedOn: true});
  }

  @expose({call: 'user'}) @method() async reportAsUnmaintained(issueNumber: number) {
    const {Session, GitHub, Mailer, JWT} = this.constructor;

    await Session.user!.load({username: true});

    await this.load({repositoryURL: true});

    const {owner, name} = parseRepositoryURL(this.repositoryURL);

    const issue = await GitHub.fetchIssue({owner, name, number: issueNumber});

    if (issue.isClosed) {
      throw Object.assign(new Error('Issue closed'), {
        displayMessage: `The specified issue is closed.`
      });
    }

    const implementationURL = `${frontendURL}implementations/${this.id}/edit`;

    const userURL = `https://github.com/${Session.user!.username}`;

    const approvalToken = JWT.generate({
      operation: 'approve-unmaintained-implementation-report',
      implementationId: this.id,
      issueNumber,
      exp: Math.round((Date.now() + ADMIN_TOKEN_DURATION) / 1000)
    });

    const approvalURL = `${frontendURL}implementations/${
      this.id
    }/approve-unmaintained-report?token=${encodeURIComponent(approvalToken)}`;

    const html = `
<p>
The following RealWorld implementation has been reported as unmaintained:
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

    await Mailer.sendMail({
      subject: 'A RealWorld implementation has been reported as unmaintained',
      html
    });
  }

  @expose({call: 'admin'}) @method() static async approveUnmaintainedReport(token: string) {
    const {JWT} = this;

    const payload = JWT.verify(token) as
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
    const {GitHub} = this.constructor;

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
    const {GitHub} = this.constructor;

    await this.load({repositoryURL: true});

    try {
      const {owner, name} = parseRepositoryURL(this.repositoryURL);

      const {numberOfStars, isArchived, hasIssues, githubData} = await GitHub.fetchRepository({
        owner,
        name
      });

      this.numberOfStars = numberOfStars;
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
      }

      console.error(
        `An error occurred while refreshing the implementation '${this.repositoryURL}' (${error.message})`
      );
    }

    this.githubDataFetchedOn = new Date();

    await this.save();
  }
}

function parseRepositoryURL(url: string) {
  if (!url.startsWith('https://github.com')) {
    throw Object.assign(new Error('Not a GitHub URL'), {
      displayMessage: 'Sorry, only GitHub repositories are supported.'
    });
  }

  const matches = url.match(/^https\:\/\/github\.com\/([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/);

  if (matches === null) {
    throw Object.assign(new Error('Invalid repository URL'), {
      displayMessage: 'The specified repository URL is invalid.'
    });
  }

  const [, owner, name] = matches;

  return {owner, name};
}
