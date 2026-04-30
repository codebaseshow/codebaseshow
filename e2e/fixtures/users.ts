export const userA = {
  id: 1001,
  login: 'testusera',
  name: 'Test User A',
  avatar_url: 'https://avatars.githubusercontent.com/u/1001',
  email: 'testusera@example.com',
};

export const userB = {
  id: 1002,
  login: 'testuserb',
  name: 'Test User B',
  avatar_url: 'https://avatars.githubusercontent.com/u/1002',
  email: 'testuserb@example.com',
};

export const users: Record<string, typeof userA> = {
  userA,
  userB,
};
