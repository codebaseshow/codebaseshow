import {Component, provide, method, expose} from '@layr/component';

import {User} from './user';
import {Project} from './project';
import {Implementation} from './implementation';

export class Application extends Component {
  @provide() static User = User;
  @provide() static Project = Project;
  @provide() static Implementation = Implementation;

  @expose({call: true}) @method() static async runHourlyTask() {
    // This method is executed 24 times a day

    // Trigger the execution in development mode with:
    // time curl -v -X POST -H "Content-Type: application/json" -d '{"query": {"<=": {"__component": "typeof Application"}, "runHourlyTask=>": {"()": []}}}' http://localhost:15542

    const {Implementation} = this;

    const numberOfImplementations = await Implementation.count();
    const limit = Math.ceil(numberOfImplementations / 24);
    await Implementation.refreshGitHubData({limit});
  }

  @expose({call: true}) @method() static async runDailyTask() {
    // This method is executed once a day

    // Trigger the execution in development mode with:
    // time curl -v -X POST -H "Content-Type: application/json" -d '{"query": {"<=": {"__component": "typeof Application"}, "runDailyTask=>": {"()": []}}}' http://localhost:15542

    const {Project, Implementation} = this;

    await Implementation.checkMaintenanceStatus();
    await Project.refreshNumberOfImplementations();
    await Project.backupPublicData();
  }
}
