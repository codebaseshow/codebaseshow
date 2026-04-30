import {MongoClient, Db} from 'mongodb';
import {MongoMemoryServer} from 'mongodb-memory-server';
import express from 'express';

import {createProjectDocument} from './fixtures/projects';
import {HELPER_PORT} from './ports';

let mongod: MongoMemoryServer | undefined;
let mongoClient: MongoClient | undefined;
let db: Db | undefined;
let helperServer: import('http').Server | undefined;

// A seed "owner" user ID for the project document.
// This is a placeholder; the real users are created via OAuth sign-in.
const SEED_OWNER_ID = 'seed-owner-id-001';

export async function startMongo() {
  mongod = await MongoMemoryServer.create();
  const uri = mongod.getUri();
  // MongoMemoryServer gives URI like mongodb://127.0.0.1:PORT/
  // We append the DB name
  const dbName = 'test';
  const fullUri = `${uri}${dbName}`;

  mongoClient = new MongoClient(fullUri);
  await mongoClient.connect();
  db = mongoClient.db(dbName);

  console.log(`MongoDB Memory Server started at ${fullUri}`);
  return {uri: fullUri, dbName};
}

export async function seedDatabase() {
  if (!db) throw new Error('MongoDB not started');

  // Insert seed project
  const projectDoc = createProjectDocument(SEED_OWNER_ID);
  await db.collection('Project').insertOne(projectDoc as any);

  console.log('Database seeded with project: realworld');
}

export async function stopMongo() {
  if (mongoClient) {
    await mongoClient.close();
    mongoClient = undefined;
  }
  if (mongod) {
    await mongod.stop();
    mongod = undefined;
  }
  db = undefined;
}

export function getDb() {
  if (!db) throw new Error('MongoDB not started');
  return db;
}

// Helper HTTP server for test operations (like setting admin)
const helperApp = express();
helperApp.use(express.json());

helperApp.post('/set-admin', async (req, res) => {
  const {githubId} = req.body;
  if (!githubId) {
    return res.status(400).json({error: 'githubId required'});
  }

  const database = getDb();
  const result = await database.collection('User').updateOne(
    {githubId},
    {$set: {isAdmin: true}}
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({error: 'User not found'});
  }

  res.json({ok: true, modifiedCount: result.modifiedCount});
});

export function startHelperServer(): Promise<ReturnType<typeof helperApp.listen>> {
  return new Promise((resolve) => {
    helperServer = helperApp.listen(HELPER_PORT, () => {
      console.log(`Test helper server on port ${HELPER_PORT}`);
      resolve(helperServer!);
    });
  });
}

export function stopHelperServer() {
  if (helperServer) {
    (helperServer as any).close();
    helperServer = undefined;
  }
}
