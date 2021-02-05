import {Application} from '../components/application';
import {createStore} from '../store';

async function main() {
  const store = createStore(Application);

  try {
    await refreshAllGitHubData();
  } finally {
    await store.disconnect();
  }
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
