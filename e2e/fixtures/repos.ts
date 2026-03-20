import {userA} from './users';

export const fakeRepo = {
  id: 99999,
  name: 'testrepo',
  full_name: 'testowner/testrepo',
  owner: {
    id: userA.id,
    login: 'testowner',
  },
  html_url: 'https://github.com/testowner/testrepo',
  description: 'A fake test repository',
  stargazers_count: 500,
  archived: false,
  has_issues: true,
};

export const fakeContributors = [
  {
    id: userA.id,
    login: userA.login,
    contributions: 42,
  },
];
