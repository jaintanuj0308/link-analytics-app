const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

const isVercel = process.env.VERCEL === '1';
const DB_FILE = isVercel ? '/tmp/database.json' : path.join(__dirname, 'database.json');

// ============ PERFORMANCE OPTIMIZATIONS ============

// 1. Enable gzip compression for responses
app.use(cors());
app.use(express.json());

// 2. In-memory cache for database
let dbCache = null;
let dbCacheLoaded = false;
let writePending = false;
let writeTimeout = null;

// Batch writes - coalesce multiple writes into single operation
const BATCH_WRITE_DELAY = 100; // ms to wait for coalescing writes

const loadDB = () => {
    if (dbCache && dbCacheLoaded) return dbCache;
    
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            dbCache = JSON.parse(data);
        } else {
            dbCache = { users: [], links: [], sessions: [] };
        }
    } catch (error) {
        console.error('Error loading DB:', error);
        dbCache = { users: [], links: [], sessions: [] };
    }
    
    // Build indexes for fast lookups
    dbCache.userIndex = new Map();
    dbCache.linkIndex = new Map();
    dbCache.sessionIndex = new Map();
    
    if (dbCache.users) {
        dbCache.users.forEach(u => dbCache.userIndex.set(u.username, u));
    }
    if (dbCache.links) {
        dbCache.links.forEach(l => dbCache.linkIndex.set(l.id, l));
    }
    if (dbCache.sessions) {
        dbCache.sessions.forEach(s => dbCache.sessionIndex.set(s.token, s));
    }
    
    dbCacheLoaded = true;
    return dbCache;
};

const rebuildIndexes = (data) => {
    data.userIndex = new Map();
    data.linkIndex = new Map();
    data.sessionIndex = new Map();
    
    if (data.users) {
        data.users.forEach(u => data.userIndex.set(u.username, u));
    }
    if (data.links) {
        data.links.forEach(l => data.linkIndex.set(l.id, l));
    }
    if (data.sessions) {
        data.sessions.forEach(s => data.sessionIndex.set(s.token, s));
    }
    return data;
};

const scheduleWriteDB = (data) => {
    // Merge data into cache and rebuild indexes
    dbCache = rebuildIndexes(data);
    
    // Cancel pending write if exists
    if (writeTimeout) {
        clearTimeout(writeTimeout);
    }
    
    // Schedule batched write
    writeTimeout = setTimeout(() => {
        try {
            // Remove indexes from serialized data
            const { userIndex, linkIndex, sessionIndex, ...cleanData } = dbCache;
            fs.writeFileSync(DB_FILE, JSON.stringify(cleanData, null, 2));
            writePending = false;
        } catch (error) {
            console.error('Error writing DB:', error);
        }
    }, BATCH_WRITE_DELAY);
    
    writePending = true;
};

// Initialize and load database
if (!fs.existsSync(DB_FILE)) {
    const defaultDb = path.join(__dirname, 'database.json');
    if (isVercel && fs.existsSync(defaultDb)) {
        fs.copyFileSync(defaultDb, DB_FILE);
    } else {
        fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], links: [], sessions: [] }, null, 2));
    }
}

// Pre-load database into memory
loadDB();

// Serve static files with caching headers when running locally
if (!isVercel) {
    app.use(express.static(path.join(__dirname, '../public'), {
        maxAge: '1d',
        etag: true,
        lastModified: true
    }));
}

// Fast read/write using cache
const readDB = () => dbCache || loadDB();
const writeDB = (data) => scheduleWriteDB(data);

// ============ END PERFORMANCE OPTIMIZATIONS ============

const generateId = () => Math.random().toString(36).substring(2, 8);
const generateSessionToken = () => crypto.randomBytes(32).toString('hex');
const hashPassword = (password) => crypto.createHash('sha256').update(password).digest('hex');

// Simple session middleware - uses index for O(1) lookup
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.replace('Bearer ', '') || req.query.token;
    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }
    
    const db = readDB();
    // Use index for O(1) lookup instead of O(n) find
    const session = db.sessionIndex.get(token);
    if (!session || session.expiresAt <= Date.now()) {
        return res.status(401).json({ error: 'Invalid or expired session' });
    }
    
    req.userId = session.userId;
    next();
};

// ============ AUTHENTICATION ENDPOINTS ============

// Register new user
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || typeof username !== 'string' || username.length < 3) {
        return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }
    if (!password || typeof password !== 'string' || password.length < 3) {
        return res.status(400).json({ error: 'Password must be at least 3 characters' });
    }

    const db = readDB();
    
    // Check if username exists
    if (db.users.find(u => u.username === username)) {
        return res.status(400).json({ error: 'Username already exists' });
    }

    const userId = generateId();
    const newUser = {
        id: userId,
        username,
        password: hashPassword(password),
        createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    writeDB(db);

    res.json({ message: 'Registration successful', userId, username });
});

// Login
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    const db = readDB();
    const user = db.users.find(u => u.username === username && u.password === hashPassword(password));
    
    if (!user) {
        return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Create session
    const token = generateSessionToken();
    const session = {
        token,
        userId: user.id,
        username: user.username,
        createdAt: new Date().toISOString(),
        expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    };

    db.sessions.push(session);
    writeDB(db);

    res.json({ token, userId: user.id, username: user.username });
});

// Logout
app.post('/api/logout', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(400).json({ error: 'No token provided' });
    }

    const db = readDB();
    db.sessions = db.sessions.filter(s => s.token !== token);
    writeDB(db);

    res.json({ message: 'Logged out successfully' });
});

// Get current user
app.get('/api/me', (req, res) => {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    const db = readDB();
    const session = db.sessions.find(s => s.token === token && s.expiresAt > Date.now());
    
    if (!session) {
        return res.status(401).json({ error: 'Invalid or expired session' });
    }

    res.json({ userId: session.userId, username: session.username });
});

// ============ LINK ENDPOINTS ============

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
