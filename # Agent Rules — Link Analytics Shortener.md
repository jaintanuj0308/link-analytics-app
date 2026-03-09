# Agent Rules — Link Analytics Shortener

This document defines the rules, constraints, and implementation guidelines for AI agents working on the **Link Analytics Shortener** project.

The goal is to ensure consistent implementation aligned with the Product Requirements Document (PRD).

---

# 1. Project Objective

The system must allow users to:

1. Submit long URLs
2. Generate shortened links
3. Redirect users when short links are accessed
4. Track click counts for each shortened URL
5. Display link analytics in a dashboard
6. Persist data after refresh or server restart

---

# 2. Architecture Constraints

The project must follow this architecture:

Frontend
- HTML5
- CSS3
- Vanilla JavaScript (ES6+)

Backend
- Node.js
- Express.js framework

Storage
- File-based JSON storage using `database.json`

No external databases should be introduced unless explicitly requested.

---

# 3. API Design Rules

The backend must expose the following endpoints.

## 3.1 Create Short URL

Endpoint

POST /shorten

Request Body

{
"url": "https://example.com"
}

Behavior

- Validate the URL
- Generate a unique 6-character alphanumeric ID
- Store mapping in `database.json`

Response

{
"id": "abc123",
"shortUrl": "http://localhost:3000/abc123"
}

---

## 3.2 Redirect Short URL

Endpoint

GET /:id

Behavior

1. Look up the ID in the database
2. Increment the click counter
3. Redirect to the original URL using HTTP 302

If ID does not exist:

Return HTTP 404 with message

"Short URL not found"

---

## 3.3 Fetch Links

Endpoint

GET /links

Response

Returns all stored links including:

- originalUrl
- shortUrl
- clickCount

Example

[
{
"id": "abc123",
"originalUrl": "https://example.com",
"shortUrl": "http://localhost:3000/abc123",
"clicks": 3
}
]

---

# 4. Data Storage Rules

All data must be stored inside:

database.json

Structure example:

{
"links": [
{
"id": "abc123",
"originalUrl": "https://example.com",
"clicks": 5
}
]
}

Rules:

- Always read the file before modifying it
- Write changes back immediately after updates
- Do not cache data permanently in memory

---

# 5. URL ID Generation

The short URL ID must:

- Be exactly 6 characters
- Use alphanumeric characters only
- Be randomly generated
- Be checked for uniqueness before saving

Example IDs

abc123  
k9d8fa  
x1b7qz

---

# 6. Validation Rules

Frontend Validation

The UI must validate:

- URL is not empty
- URL follows valid format using JavaScript `URL()` constructor

Backend Validation

The server must verify:

- URL exists
- URL begins with `http://` or `https://`

Invalid requests must return:

HTTP 400

Example

{
"error": "Invalid URL"
}

---

# 7. Dashboard Requirements

The frontend dashboard must display a table containing:

| Original URL | Short URL | Click Count |

Behavior:

- Data must be fetched from `/links`
- Table updates after creating a new link
- Table should remain visible after refresh

---

# 8. Persistence Rules

The system must persist data in `database.json`.

Requirements:

- Links must remain available after page refresh
- Links must remain available after server restart

---

# 9. Error Handling

The system must handle the following cases.

Invalid URL submission

Return error message

Empty input

Return validation error

Unknown short link

Return HTTP 404

Example

{
"error": "Short URL not found"
}

---

# 10. Security Rules

The application must:

- Reject malformed URLs
- Avoid executing arbitrary input
- Prevent overwriting the database file
- Restrict redirects only to valid HTTP/HTTPS URLs

---

# 11. CORS Policy

CORS must be enabled to allow frontend and backend interaction during development.

Example configuration:

app.use(cors())

---

# 12. Performance Rules

- File reads must be minimal
- Avoid blocking synchronous operations where possible
- Click count increment must occur before redirect

---

# 13. Deployment Constraints

The application must be deployable on:

- Vercel
- Render
- Node hosting platforms

Environment assumptions:

PORT=3000

---

# 14. Expected Project Structure

project-root/

server.js  
database.json  

public/

index.html  
style.css  
script.js  

package.json

---

# 15. Coding Standards

Agents must follow:

- Clear variable naming
- Modular functions
- Minimal dependencies
- Readable error messages
- Comment important logic sections

---

# 16. Prohibited Changes

Agents must NOT:

- Replace file storage with external databases
- Introduce complex frameworks
- Modify the core API endpoints
- Change the URL ID format