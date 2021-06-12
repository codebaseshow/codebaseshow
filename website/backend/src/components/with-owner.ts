import {consume, expose} from '@layr/component';
import {attribute} from '@layr/storable';
import {role} from '@layr/with-roles';

import type {User} from './user';
import type {Entity} from './entity';

export const WithOwner = (Base: typeof Entity) => {
  class WithOwner extends Base {
    ['constructor']!: typeof WithOwner;

    @consume() static User: typeof User;

    @expose({get: true, set: 'owner'}) @attribute('User') owner!: User;

    @role('owner') async ownerRoleResolver() {
      const user = await this.constructor.User.getAuthenticatedUser();

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
