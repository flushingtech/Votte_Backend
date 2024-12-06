
# Votte (Backend)

## Overview
This is the backend for Votte, which will allow Flushing Tech members to vote on and submit ideas for hackathons. Note that this ReadMe also touches on the frontend features. 

## Tech Stack

### Authentication
- **Google Authentication**: Users can sign in using their Google accounts via Google OAuth. This ensures secure login and a familiar user experience.

### Backend
- **Powered by Express and Node**: The backend API is built with Express and Node.js, providing robust and scalable server-side functionality.

### Database

#### PostgreSQL

All data is stored in a PostgreSQL database, ensuring reliable data management and integrity.

Spin it up today with `docker-compose up -d`

#### ORM

[Drizzle](https://orm.drizzle.team/docs/overview) is used to provide database abstraction in the app.

It's also used to apply changes to the database, also known as "migrations".

- Update `src/db/schemas/` to make changes to the db, then,
- `npm run db` to apply changes to the database.
- `npm run db-studio` to launch a UI for managing the database.


### Frontend
- **React**: The frontend is built with React, delivering a smooth and user-friendly interface.

### Hosting
- **Vercel**: Both the frontend and backend are hosted on Vercel for continuous deployment and scalability.

## Core Functionality

### Idea Submission
- **Limited Submissions**: Users can submit up to 5 ideas, but this limit is customizable.
- **Limited Voting**: Users can vote on up to 3 different ideas, and this limit can also be adjusted.

### Edit Functionality
- **Full Edit Access**: Ideas can be fully edited by the user who originally submitted them.

### Voting Mechanism
- **Dynamic Listing**: Ideas are displayed based on their number of votes. The most popular idea is visually highlighted, ensuring top-voted ideas get attention. 

## Planned Updates

### Event-Specific Pages
- Events will be displayed on the homepage, and users can click to view more details and submit or vote for related ideas.

### Admin Panel
- Admins will have the power to delete inappropriate ideas.

### Sign Out Feature
- A sign-out option will be integrated, allowing users to safely log out.

## Current Authentication Flow
1. **User Login**: The user logs in using their Google account using Google Login in React (this process starts on the votte-frontend repo).
2. **Token Handling**: On a successful login, the frontend receives a token, which is sent to the backend.
3. **Token Verification**: The backend makes a request to the Google OAuth API to check if the token's aud (audience) field matches our application's client id. In essence, the backend verifies the token by requesting Google OAuth to ensure the token is meant for this application.
4. **Fetch User Info**: If valid, the backend fetches user information (e.g., name, email) from Google’s User Info API.
5. **JWT Creation**: A JWT is generated with the user information and sent back to the frontend.
6. **Redirection**: The user is redirected to the `/home` route.
7. **Logout (Planned)**: The logout feature will clear the authentication token (likely from local storage) and redirect to the homepage.

## Contributing
PRs should be made to this repo, but note that the Vercel account is linked to the maintainer's GitHub, and changes will not be reflected until the maintainer syncs up to this repo. 

