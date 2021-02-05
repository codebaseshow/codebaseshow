import {Component, consume, expose, AttributeSelector} from '@layr/component';
import {Storable, primaryIdentifier, attribute, index} from '@layr/storable';
import {WithRoles, role} from '@layr/with-roles';

import type {Session} from './session';

export class Entity extends WithRoles(Storable(Component)) {
  @consume() static Session: typeof Session;

  @expose({get: true, set: true}) @primaryIdentifier() id!: string;

  @expose({get: true}) @index() @attribute('Date') createdAt = new Date();

  @attribute('Date?') updatedAt?: Date;

  @role('guest') static guestRoleResolver() {
    return this.Session.user === undefined;
  }

  @role('user') static userRoleResolver() {
    return this.Session.user !== undefined;
  }

  @role('admin') static adminRoleResolver() {
    return this.Session.user?.isAdmin === true;
  }

  async beforeSave(attributeSelector: AttributeSelector) {
    await super.beforeSave(attributeSelector);

    this.updatedAt = new Date();
  }
}
