import {consume, expose, validators} from '@layr/component';
import {secondaryIdentifier, attribute, index} from '@layr/storable';

import {Entity} from './entity';
import {WithOwner} from './with-owner';
import {IMPLEMENTATION_CATEGORIES} from './implementation';
import type {Implementation, ImplementationCategory} from './implementation';

const {rangeLength, anyOf, integer, positive} = validators;

const PROJECT_STATUSES = ['available', 'coming-soon'] as const;

export type ProjectStatus = typeof PROJECT_STATUSES[number];

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

  @expose({get: true})
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
}
