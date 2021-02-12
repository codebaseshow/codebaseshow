import {Application} from '../components/application';
import {createStore} from '../store';

async function main() {
  const store = createStore(Application);

  try {
    await addRealWorldProject();
    await addTodoMVCProject();
  } finally {
    await store.disconnect();
  }
}

export async function addRealWorldProject() {
  const {User, Project, Implementation} = Application;

  const owner = (await User.find({username: 'mvila'}, {}))[0];

  const project = new Project({
    owner,
    slug: 'realworld',
    name: 'RealWorld Example Apps',
    description: 'A Medium.com clone.',
    headline: 'The mother of all demo apps',
    subheading:
      'See how the exact same application is built using different libraries and frameworks.',
    logo: {
      normalURL: '/realworld-logo-dark-mode-20201201.immutable.png',
      narrowURL: '/realworld-logo-narrow-dark-mode-20201209.immutable.png',
      height: 42,
      offsetY: -5
    },
    screenshot: {
      normalURL: '/conduit-screenshot-20210210.immutable.png',
      height: 175
    },
    websiteURL: 'https://realworld.io/',
    createURL: 'https://github.com/gothinkster/realworld/tree/master/spec',
    demoURL: 'https://demo.realworld.io/',
    repositoryURL: 'https://github.com/gothinkster/realworld',
    categories: ['frontend', 'backend', 'fullstack'],
    status: 'available',
    numberOfImplementations: 123
  });

  await project.save();

  const implementations = await Implementation.find({}, {});

  for (const implementation of implementations) {
    implementation.project = project;
    await implementation.save();
  }
}

export async function addTodoMVCProject() {
  const {User, Project} = Application;

  const owner = (await User.find({username: 'mvila'}, {}))[0];

  const project = new Project({
    owner,
    slug: 'todomvc',
    name: 'TodoMVC',
    description: 'A to-do application implemented using MV* concepts.',
    headline: 'Headline',
    subheading: 'Subheading.',
    logo: {
      normalURL: '/todomvc-logo-dark-mode-20200207.immutable.svg',
      narrowURL: '/todomvc-logo-dark-mode-20200207.immutable.svg',
      height: 25
    },
    screenshot: {
      normalURL: '/todomvc-screenshot-00000000.immutable.png',
      height: 175
    },
    websiteURL: 'https://todomvc.com/',
    createURL: 'https://github.com/tastejs/todomvc/blob/master/contributing.md',
    demoURL: 'https://todomvc.com/examples/emberjs/',
    repositoryURL: 'https://github.com/tastejs/todomvc',
    categories: ['frontend'],
    status: 'coming-soon',
    numberOfImplementations: 0
  });

  await project.save();
}

export async function checkAllImplementationMaintenanceStatus() {
  const {Implementation} = Application;

  await Implementation.checkMaintenanceStatus();
}

export async function countPendingIssues() {
  const {GitHub} = Application;

  const count = await GitHub.countPendingIssues({
    owner: 'gothinkster',
    name: 'react-mobx-realworld-example-app'
  });

  console.log(`Pending issues: ${count}`);
}

export async function refreshGitHubData() {
  const {Implementation} = Application;

  const implementation = await Implementation.get('ckie80ctf00013f5vv9r6qosf', {});

  await implementation.refreshGitHubData();
}

export async function refreshAllGitHubData() {
  const {Implementation} = Application;

  await Implementation.refreshGitHubData();
}

main().catch((error) => {
  console.error(error);
});
