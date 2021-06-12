import {consume, method, expose, validators} from '@layr/component';
import {secondaryIdentifier, attribute, index} from '@layr/storable';
import omit from 'lodash/omit';

import {Entity} from './entity';
import {WithOwner} from './with-owner';
import {IMPLEMENTATION_CATEGORIES, MAXIMUM_REVIEW_DURATION} from './implementation';
import type {Implementation, ImplementationCategory} from './implementation';
import {GitHub} from '../github';

const {rangeLength, anyOf, integer, positive} = validators;

const PROJECT_STATUSES = ['available', 'coming-soon'] as const;

export type ProjectStatus = typeof PROJECT_STATUSES[number];

const PUBLIC_DATA_REPOSITORY_OWNER = 'codebaseshow';
const PUBLIC_DATA_REPOSITORY_NAME = 'public-data';
const PUBLIC_DATA_REPOSITORY_PATH = 'public-data.json';

@expose({
  get: {call: true},
  find: {call: true},
  prototype: {
    load: {call: true}
  }
})
@index({numberOfImplementations: 'desc', status: 'asc'})
export class Project extends WithOwner(Entity) {
  ['constructor']!: typeof Project;

  @consume() static Implementation: typeof Implementation;

  @expose({get: true, set: true})
  @secondaryIdentifier('string', {validators: [rangeLength([1, 64])]})
  slug!: string;

  @expose({get: true})
  @attribute('string', {validators: [rangeLength([1, 64])]})
  name!: string;

  @expose({get: true})
  @attribute('string', {validators: [rangeLength([1, 64])]})
  description!: string;

  @expose({get: true})
  @attribute('string', {validators: [rangeLength([1, 64])]})
  headline!: string;

  @expose({get: true})
  @attribute('string', {validators: [rangeLength([1, 256])]})
  subheading!: string;

  @expose({get: true})
  @attribute('object')
  logo!: any;

  @expose({get: true})
  @attribute('object')
  screenshot!: any;

  @expose({get: true})
  @attribute('string', {validators: [rangeLength([1, 256])]})
  websiteURL!: string;

  @expose({get: true})
  @attribute('string', {validators: [rangeLength([1, 256])]})
  createURL!: string;

  @expose({get: true})
  @attribute('string', {validators: [rangeLength([1, 256])]})
  demoURL!: string;

  @expose({get: true})
  @attribute('string', {validators: [rangeLength([1, 256])]})
  repositoryURL!: string;

  @expose({get: true})
  @attribute('string[]', {
    items: {validators: [anyOf(IMPLEMENTATION_CATEGORIES)]}
  })
  categories!: ImplementationCategory[];

  @expose({get: true})
  @index()
  @attribute('string', {
    validators: [anyOf(PROJECT_STATUSES)]
  })
  status!: ProjectStatus;

  @expose({get: true})
  @index()
  @attribute('number', {validators: [integer(), positive()]})
  numberOfImplementations!: number;

  @expose({call: 'admin'}) @method() async findSubmissionsToReview<T extends Project>(this: T) {
    const {User, Implementation} = this.constructor;

    const authenticatedUser = (await User.getAuthenticatedUser())!;

    return (await Implementation.find(
      {
        $or: [
          {
            project: this,
            status: 'pending'
          },
          {
            project: this,
            status: 'reviewing',
            reviewer: authenticatedUser
          },
          {
            project: this,
            status: 'reviewing',
            reviewStartedOn: {$lessThan: new Date(Date.now() - MAXIMUM_REVIEW_DURATION)}
          }
        ]
      },
      {
        project: {},
        repositoryURL: true,
        category: true,
        frontendEnvironment: true,
        language: true,
        libraries: true,
        createdAt: true
      },
      {sort: {createdAt: 'asc'}}
    )) as InstanceType<T['constructor']['Implementation']>[];
  }

  static async refreshNumberOfImplementations() {
    const {Implementation} = this;

    const projects = await this.find({}, {name: true});

    for (const project of projects) {
      project.numberOfImplementations = await Implementation.count({
        project,
        isPubliclyListed: true
      });

      await project.save();

      console.log(
        `The project '${project.name}' has been successfully refreshed (number of implementations: '${project.numberOfImplementations}')`
      );
    }
  }

  static async backupPublicData() {
    const publicData = await this.getPublicData();

    await GitHub.writeRepositoryFile({
      owner: PUBLIC_DATA_REPOSITORY_OWNER,
      name: PUBLIC_DATA_REPOSITORY_NAME,
      path: PUBLIC_DATA_REPOSITORY_PATH,
      content: JSON.stringify(publicData, undefined, 2),
      message: 'Update CodebaseShow public data'
    });

    console.log('Public data successfully backed up');
  }

  static async getPublicData() {
    const {Implementation} = this;

    const publicData = {projects: new Array<any>()};

    const projects = await this.find(
      {status: 'available'},
      {
        createdAt: true,
        updatedAt: true,
        slug: true,
        name: true,
        description: true,
        headline: true,
        subheading: true,
        logo: true,
        screenshot: true,
        websiteURL: true,
        createURL: true,
        demoURL: true,
        repositoryURL: true,
        categories: true
      },
      {sort: {numberOfImplementations: 'desc'}}
    );

    for (const project of projects) {
      const implementations = await Implementation.find(
        {
          project,
          isPubliclyListed: true
        },
        {
          createdAt: true,
          updatedAt: true,
          repositoryURL: true,
          category: true,
          frontendEnvironment: true,
          language: true,
          libraries: true,
          markedAsUnmaintainedOn: true
        },
        {sort: {category: 'asc', librariesSortKey: 'asc', language: 'asc'}}
      );

      publicData.projects.push({
        ...omit(project.toObject(), 'id'),
        implementations: implementations.map((implementation) =>
          omit(implementation.toObject(), 'id')
        )
      });
    }

    return publicData;
  }
}
