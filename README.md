# Link Analytics Shortener

A full-stack web application to convert long URLs into shortened links and track their usage analytics, built with a Node.js Express backend and a Vanilla JS frontend.

## Features
- **URL Shortening**: Generates a 6-character unique ID for long URLs.
- **Redirection**: Automatically redirects users from the short URL to the original destination.
- **Click Tracking**: Tracks how many times a shortened link is visited.
- **Analytics Dashboard**: Displays a real-time table of original URLs, short links, and click counts.
- **Data Persistence**: Uses a local `database.json` file on the backend to persist all data.

## Folder Structure
```
/link-shortener
├── /frontend
│   ├── index.html
│   ├── style.css
│   └── script.js
├── /backend
│   ├── server.js
│   └── database.json (auto-generated)
├── package.json
├── README.md
└── PRD.md
```

## Running the Project Locally

### Prerequisites
- Node.js (v14 or newer) installed.

### Setup Instructions
1. Navigate to the project root directory.
   ```bash
   cd link-shortener
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   node backend/server.js
   ```
4. Open your browser and go to: [http://localhost:3000](http://localhost:3000)

## Deployment Instructions

To deploy this project to a platform like Render, Heroku, or Railway:
1. Ensure your `package.json` has a start script. (e.g. `"start": "node backend/server.js"`).
2. The server reads `PORT` from the environment if available (`process.env.PORT`), making it compatible with cloud platforms.
3. Simply connect your GitHub repository or use the CLI for your chosen platform. Ensure file system writes are allowed (for `database.json`) if using persistent storage. If your platform has an ephemeral file system (like Heroku), you should upgrade the `database.json` logic to use a real database (like PostgreSQL or MongoDB).
