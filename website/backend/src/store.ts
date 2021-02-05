import type {Component} from '@layr/component';
import {MongoDBStore} from '@layr/mongodb-store';
import env from 'env-var';

export function createStore(rootComponent: typeof Component) {
  const connectionString = env.get('MONGODB_STORE_CONNECTION_STRING').required().asUrlString();

  const store = new MongoDBStore(connectionString);

  store.registerRootComponent(rootComponent);

  return store;
}
