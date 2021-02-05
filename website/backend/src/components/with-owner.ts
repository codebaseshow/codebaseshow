import {consume, expose} from '@layr/component';
import {attribute} from '@layr/storable';
import {role} from '@layr/with-roles';

import type {User} from './user';
import type {Entity} from './entity';

export const WithOwner = (Base: typeof Entity) => {
  class WithOwner extends Base {
    ['constructor']!: typeof WithOwner;

    @consume() static User: typeof User;

    @expose({get: true}) @attribute('User') owner = this.constructor.Session.user!;

    @role('owner') async ownerRoleResolver() {
      const user = this.constructor.Session.user;

      if (user === undefined) {
        return undefined;
      }

      if (this.isNew()) {
        return true;
      }

      const ghost = this.getGhost();

      await ghost.load({owner: {}});

      return ghost.owner === user.getGhost();
    }
  }

  return WithOwner;
};
