# CodebaseShow Application

## Install

Install the npm dependencies with:

```sh
npm install
```

Make sure you have [Docker](https://www.docker.com/) installed as it is used to run the database (MongoDB) when running the app in development mode.

## Usage

### Running the app in development mode

Execute the following command:

```sh
FRONTEND_URL=http://localhost:15551 \
  BACKEND_URL=http://localhost:15552 \
  MONGODB_STORE_CONNECTION_STRING=mongodb://test:test@localhost:15553/test \
  JWT_SECRET=bb82e677d7608f2a1c63a0ac05787b9ad933ae98f55cd0ac423a140e8336b6ad248f538deb8ca740c1d5e61a13744e3e729a584a66288de6674f70785ba169d7 \
  npm run start
```

The app should then be available at http://localhost:15551.

### Debugging

#### Client

Add the following entry in the local storage of your browser:

```
| Key   | Value     |
| ----- | --------- |
| debug | layr:* |
```

#### Server

Add the following environment variables when starting the app:

```sh
DEBUG=layr:* DEBUG_DEPTH=10
```
