# CodebaseShow Website

This directory contains the source code of the [CodebaseShow](https://codebase.show) website.

## About

The website is a single-page application created with [Layr](https://github.com/layrjs/layr). The frontend is statically hosted in AWS S3 + CloudFront and the backend is serverlessly hosted in AWS Lambda + API Gateway. Regarding the database, it is a free-tier MongoDB Atlas cluster with a daily backup that is handled by a Lambda function.

## Install

Install the npm dependencies with:

```sh
npm install
```

## Develop

### Prerequisites

- Make sure you have [Docker](https://www.docker.com/) installed as it is used to execute the MongoDB development database.
- Create a [GitHub OAuth App](https://github.com/settings/developers) with the following settings:
  - Homepage URL: `http://localhost:15541`
  - Authorization callback URL: `http://localhost:15541/oauth/callback`
- Create a [GitHub personal access token](https://github.com/settings/tokens) with no scopes selected.
- Generate a JWT secret by running the following command in your terminal:
  - `openssl rand -hex 64`

### Running the website in development mode

Execute the following command while replacing the `"********"` with the information obtained above:

```sh
FRONTEND_URL=http://localhost:15541 \
  BACKEND_URL=http://localhost:15542 \
  EMAIL_ADDRESS="********" \
  MONGODB_STORE_CONNECTION_STRING=mongodb://test:test@localhost:15543/test \
  GITHUB_CLIENT_ID="********" \
  GITHUB_CLIENT_SECRET="********" \
  GITHUB_PERSONAL_ACCESS_TOKEN="********" \
  JWT_SECRET="********" \
  npm run start
```

The website should then be available at http://localhost:15541.

### Migrating the database

Navigate to the `./backend` directory and execute the following command:

```sh
FRONTEND_URL=http://localhost:15541 \
  BACKEND_URL=http://localhost:15542 \
  EMAIL_ADDRESS="********" \
  MONGODB_STORE_CONNECTION_STRING=mongodb://test:test@localhost:15543/test \
  GITHUB_CLIENT_ID="********" \
  GITHUB_CLIENT_SECRET="********" \
  GITHUB_PERSONAL_ACCESS_TOKEN="********" \
  JWT_SECRET="********" \
  npm run migrate
```

## Debug

### Client

Add the following entry in the local storage of your browser:

```
| Key   | Value     |
| ----- | --------- |
| debug | layr:* |
```

### Server

Add the following environment variables when starting the website:

```sh
DEBUG=layr:* DEBUG_DEPTH=10
```

## Deploy

## Deploying to AWS

Create an AWS IAM role:

- Trusted entity: `AWS service`
- Use case: `Lambda`
- Name: `codebaseshow-website-backend-prod`
- Permission policies:
  - CloudWatchLogsFullAccess
  - AmazonSESFullAccess

Execute the following command:

```sh
FRONTEND_URL=https://codebase.show \
  BACKEND_URL=https://backend.codebase.show \
  EMAIL_ADDRESS="********" \
  MONGODB_STORE_CONNECTION_STRING="********" \
  GITHUB_CLIENT_ID="********" \
  GITHUB_CLIENT_SECRET="********" \
  GITHUB_PERSONAL_ACCESS_TOKEN="********" \
  JWT_SECRET="********" \
  npm run deploy
```

Add an AWS EventBridge rule to automatically run an hourly task:

- Name: `codebaseshow-website-hourly-task`
- Schedule:
  - Fixed rate every: `1 hour`
- Target:
  - Lambda function: `backend-codebase-show`
  - Constant input: `{"query": {"<=": {"__component": "typeof Application"}, "runHourlyTask=>": {"()": []}}}`

Add another AWS EventBridge rule to automatically run a daily task:

- Name: `codebaseshow-website-daily-task`
- Schedule:
  - Fixed rate every: `1 day`
- Target:
  - Lambda function: `backend-codebase-show`
  - Constant input: `{"query": {"<=": {"__component": "typeof Application"}, "runDailyTask=>": {"()": []}}}`

## Backup

Once a day, all CodebaseShow public data are automatically backed up to the following repository:

https://github.com/codebaseshow/public-data

## License

MIT
