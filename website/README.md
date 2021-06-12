# CodebaseShow Website

This directory contains the source code of the [CodebaseShow](https://codebase.show) website.

## About

The CodebaseShow website is a single-page application created with [Layr](https://github.com/layrjs/layr). The frontend is statically hosted in AWS S3 + CloudFront and the backend is serverlessly hosted in AWS Lambda + API Gateway. Regarding the database, it is a free-tier MongoDB Atlas cluster with a daily backup that is handled by a Lambda function.

## Prerequisites

- Make sure your have a [Node.js](https://nodejs.org/) (v14 or newer) installed.
- Make sure you have [Boostr](https://boostr.dev/) installed as it is used to manage the development environment.

## Installation

Install all the npm dependencies with the following command:

```sh
boostr install
```

## Development

### Configuration

- Create a [GitHub OAuth App](https://github.com/settings/developers) with the following settings:
  - Homepage URL: `http://localhost:15541`
  - Authorization callback URL: `http://localhost:15541/oauth/callback`
- Create a [GitHub personal access token](https://github.com/settings/tokens) with no scopes selected.
- Generate a JWT secret by running the following command in your terminal:
  - `openssl rand -hex 64`
- In the `backend` directory, duplicate the `boostr.config.private-template.mjs` file, name it `boostr.config.private.mjs`, and modify it to set all the required private development environment variables.

### Migrating the database

Migrate the database with the following command:

```sh
boostr database migrate
```

### Starting the development environment

Start the development environment with the following command:

```
boostr start
```

The website should be available at http://localhost:15541.

## Production

### Configuration

- Create a [GitHub OAuth App](https://github.com/settings/developers) with the following settings:
  - Homepage URL: `https://codebase.show`
  - Authorization callback URL: `https://codebase.show/oauth/callback`
- Create a [GitHub personal access token](https://github.com/settings/tokens) with no scopes selected.
- Generate a JWT secret by running the following command in your terminal:
  - `openssl rand -hex 64`
- In the `backend` directory, duplicate the `boostr.config.private-template.mjs` file, name it `boostr.config.private.mjs`, and modify it to set all the required private production environment variables.
- In the `database` directory, duplicate the `boostr.config.private-template.mjs` file, name it `boostr.config.private.mjs`, and modify it to set the `stages.production.url` attribute to the URL of your production MongoDB database.
- Create an AWS IAM role with the following settings:
  - Trusted entity: `AWS service`
  - Use case: `Lambda`
  - Name: `codebaseshow-website-backend-prod`
  - Permission policies:
    - CloudWatchLogsFullAccess
    - AmazonSESFullAccess

### Migrating the database

Migrate the database with the following command:

```sh
boostr database migrate --production
```

### Deployment

Deploy the website to production with the following command:

```
boostr deploy --production
```

The website should be available at https://codebase.show.

### Setting up automatic tasks

- Add an AWS EventBridge rule to automatically run an hourly task:
  - Name: `codebaseshow-website-hourly-task`
  - Schedule:
    - Fixed rate every: `1 hour`
  - Target:
    - Lambda function: `backend-codebase-show`
    - Constant input: `{"query": {"<=": {"__component": "typeof Application"}, "runHourlyTask=>": {"()": []}}}`
- Add another AWS EventBridge rule to automatically run a daily task:
  - Name: `codebaseshow-website-daily-task`
  - Schedule:
    - Fixed rate every: `1 day`
  - Target:
    - Lambda function: `backend-codebase-show`
    - Constant input: `{"query": {"<=": {"__component": "typeof Application"}, "runDailyTask=>": {"()": []}}}`

### Backup

Once a day, all CodebaseShow public data are automatically backed up to the following repository:

https://github.com/codebaseshow/public-data
