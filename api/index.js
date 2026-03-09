const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

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

function createShortenHandler(req, res) {
    const { originalUrl, maxClicks } = req.body;
    if (!originalUrl || typeof originalUrl !== 'string' || !originalUrl.startsWith('http')) {
        return res.status(400).json({ error: 'Invalid URL. Must start with http or https.' });
    }

    const id = generateId();
    const db = readDB();

    const newLink = {
        id,
        originalUrl,
        clicks: 0,
        maxClicks: (typeof maxClicks === 'number' && !Number.isNaN(maxClicks)) ? Math.max(0, Math.floor(maxClicks)) : null,
        enabled: true,
        createdAt: new Date().toISOString(),
        lastAccessed: null
    };

    db.links.push(newLink);
    writeDB(db);

    const host = req.headers.host;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;

    res.json({
        shortUrl: `${protocol}://${host}/${id}`,
        ...newLink
    });
}

// Both /api/shorten and /shorten as compatibility
app.post('/api/shorten', createShortenHandler);
app.post('/shorten', createShortenHandler);

app.get('/api/links', (req, res) => {
    res.json(readDB().links);
});
app.get('/links', (req, res) => res.json(readDB().links));

// Update link (edit destination, toggle enabled, update maxClicks)
app.patch('/api/links/:id', (req, res) => {
    const id = req.params.id;
    const db = readDB();
    const link = db.links.find(l => l.id === id);
    if (!link) return res.status(404).json({ error: 'Link not found' });

    const { originalUrl, enabled, maxClicks } = req.body;
    if (typeof originalUrl === 'string' && originalUrl.startsWith('http')) link.originalUrl = originalUrl;
    if (typeof enabled === 'boolean') link.enabled = enabled;
    if (typeof maxClicks === 'number') link.maxClicks = Number.isFinite(maxClicks) ? Math.max(0, Math.floor(maxClicks)) : null;

    writeDB(db);
    res.json(link);
});
app.patch('/links/:id', (req, res) => {
    // alias for non-api path
    return app._router.handle(req, res, () => {}, 'PATCH', `/api/links/${req.params.id}`);
});

app.get('/:id', (req, res, next) => {
    const id = req.params.id;
    if (id === 'api' || id.includes('.')) {
        return next();
    }

    const db = readDB();
    const linkIndex = db.links.findIndex(l => l.id === id);

    if (linkIndex === -1) {
        return res.status(404).send('<h1>404 Not Found</h1><p>The short link does not exist.</p>');
    }

    const link = db.links[linkIndex];

    if (!link.enabled) {
        return res.send(`<h1>Link Inactive</h1><p>This link has been disabled by its owner.</p>`);
    }

    if (link.maxClicks !== null && link.clicks >= link.maxClicks) {
        return res.send(`<h1>Link Expired</h1><p>This link has reached its maximum number of clicks.</p>`);
    }

    // Increment clicks and update lastAccessed
    db.links[linkIndex].clicks += 1;
    db.links[linkIndex].lastAccessed = new Date().toISOString();
    writeDB(db);

    res.redirect(link.originalUrl);
});

// Setup local listener
if (!isVercel) {
    app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
    });
}

module.exports = app;
