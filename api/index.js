const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Vercel serverless functions have a read-only filesystem except for /tmp
const isVercel = process.env.VERCEL === '1';
const DB_FILE = isVercel ? '/tmp/database.json' : path.join(__dirname, 'database.json');

app.use(cors());
app.use(express.json());

// Serve static files when running locally
if (!isVercel) {
    app.use(express.static(path.join(__dirname, '../public')));
}

// Initialize database if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
    // If in Vercel and /tmp/database.json is missing, check if a default one exists in /api
    const defaultDb = path.join(__dirname, 'database.json');
    if (isVercel && fs.existsSync(defaultDb)) {
        fs.copyFileSync(defaultDb, DB_FILE);
    } else {
        fs.writeFileSync(DB_FILE, JSON.stringify({ links: [] }, null, 2));
    }
}

const readDB = () => JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
const writeDB = (data) => fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));

const generateId = () => Math.random().toString(36).substring(2, 8);

app.post('/api/shorten', (req, res) => {
    const { originalUrl } = req.body;
    if (!originalUrl || typeof originalUrl !== 'string' || !originalUrl.startsWith('http')) {
        return res.status(400).json({ error: 'Invalid URL. Must start with http or https.' });
    }

    const id = generateId();
    const db = readDB();

    const newLink = { id, originalUrl, clicks: 0 };
    db.links.push(newLink);
    writeDB(db);

    const host = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;

    res.json({
        shortUrl: `${protocol}://${host}/${id}`,
        ...newLink
    });
});

app.get('/api/links', (req, res) => {
    res.json(readDB().links);
});

app.get('/:id', (req, res, next) => {
    const id = req.params.id;
    // Skip if it looks like an API call or static file
    if (id === 'api' || id.includes('.')) {
        return next();
    }

    const db = readDB();
    const linkIndex = db.links.findIndex(l => l.id === id);

    if (linkIndex === -1) {
        return res.status(404).send('<h1>404 Not Found</h1><p>The short link does not exist.</p>');
    }

    db.links[linkIndex].clicks += 1;
    writeDB(db);

    res.redirect(db.links[linkIndex].originalUrl);
});

// Setup local listener
if (!isVercel) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

// Export the Express API for Vercel
module.exports = app;
