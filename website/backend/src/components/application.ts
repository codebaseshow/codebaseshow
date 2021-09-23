import {Component, provide, method, expose} from '@layr/component';
import {HOUR, DAY} from '@layr/utilities';

import {User} from './user';
import {Project} from './project';
import {Implementation} from './implementation';

export class Application extends Component {
  @provide() static User = User;
  @provide() static Project = Project;
  @provide() static Implementation = Implementation;

  @expose({call: true}) @method({schedule: {rate: 1 * HOUR}}) static async runHourlyTask() {
    const {Implementation} = this;

    const numberOfImplementations = await Implementation.count();
    const limit = Math.ceil(numberOfImplementations / 24);
    await Implementation.refreshGitHubData({limit});
  }

  @expose({call: true}) @method({schedule: {rate: 1 * DAY}}) static async runDailyTask() {
    const {Project, Implementation} = this;

    await Implementation.checkMaintenanceStatus();
    await Project.refreshNumberOfImplementations();
    await Project.backupPublicData();
  }
}
