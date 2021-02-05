import {Component, provide, method, expose} from '@layr/component';

import {User} from './user';
import {Session} from './session';
import {Implementation} from './implementation';
import {GitHub} from './github';
import {Mailer} from './mailer';
import {JWT} from './jwt';

export class Application extends Component {
  @provide() static User = User;
  @provide() static Session = Session;
  @provide() static Implementation = Implementation;
  @provide() static GitHub = GitHub;
  @provide() static Mailer = Mailer;
  @provide() static JWT = JWT;

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

    const {Implementation} = this;

    await Implementation.checkMaintenanceStatus();
  }
}
