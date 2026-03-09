document.addEventListener('DOMContentLoaded', () => {
    const shortenForm = document.getElementById('shortenForm');
    const originalUrlInput = document.getElementById('originalUrl');
    const maxClicksInput = document.getElementById('maxClicks');
    const errorMsg = document.getElementById('errorMsg');
    const resultBox = document.getElementById('resultBox');
    const shortUrlDisplay = document.getElementById('shortUrlDisplay');
    const copyBtn = document.getElementById('copyBtn');
    const linksBody = document.getElementById('linksBody');
    const totalLinksCount = document.getElementById('totalLinksCount');
    const shortenBtn = document.getElementById('shortenBtn');

    // Auth elements
    const authModal = document.getElementById('authModal');
    const closeAuthModal = document.getElementById('closeAuthModal');
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const loggedOutView = document.getElementById('loggedOutView');
    const loggedInView = document.getElementById('loggedInView');
    const userNameDisplay = document.getElementById('userNameDisplay');
    const loginFormEl = document.getElementById('loginFormEl');
    const registerFormEl = document.getElementById('registerFormEl');
    const showRegister = document.getElementById('showRegister');
    const showLogin = document.getElementById('showLogin');
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    // API_BASE points to server API routes
    const API_BASE = window.location.origin + '/api';

    // Auth token storage
    let authToken = localStorage.getItem('authToken');
    let currentUser = localStorage.getItem('currentUser');

    // Check auth state on load
    checkAuthState();

    // Load dashboard on startup
    loadDashboard();

    // ============ AUTH HANDLERS ============

    // Open auth modal for login
    loginBtn?.addEventListener('click', () => {
        authModal.style.display = 'flex';
        loginForm.style.display = 'block';
        registerForm.style.display = 'none';
    });

    // Open auth modal for register
    registerBtn?.addEventListener('click', () => {
        authModal.style.display = 'flex';
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    });

    // Close modal
    closeAuthModal?.addEventListener('click', () => {
        authModal.style.display = 'none';
    });

    // Close modal on outside click
    authModal?.addEventListener('click', (e) => {
        if (e.target === authModal) {
            authModal.style.display = 'none';
        }
    });

    // Switch to register
    showRegister?.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        registerForm.style.display = 'block';
    });

    // Switch to login
    showLogin?.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.style.display = 'none';
        loginForm.style.display = 'block';
    });

    // Login form submission
    loginFormEl?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                authToken = data.token;
                currentUser = data.username;
                localStorage.setItem('authToken', authToken);
                localStorage.setItem('currentUser', currentUser);
                authModal.style.display = 'none';
                checkAuthState();
                loadDashboard();
            } else {
                alert(data.error || 'Login failed');
            }
        } catch (error) {
            alert('Network error. Make sure the server is running.');
        }
    });

    // Register form submission
    registerFormEl?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('regUsername').value.trim();
        const password = document.getElementById('regPassword').value;

        try {
            const response = await fetch(`${API_BASE}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                alert('Registration successful! Please login.');
                registerForm.style.display = 'none';
                loginForm.style.display = 'block';
            } else {
                alert(data.error || 'Registration failed');
            }
        } catch (error) {
            alert('Network error. Make sure the server is running.');
        }
    });

    // Logout
    logoutBtn?.addEventListener('click', async () => {
        try {
            await fetch(`${API_BASE}/logout`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                }
            });
        } catch (error) {
            console.error('Logout error:', error);
        }

        authToken = null;
        currentUser = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        checkAuthState();
        loadDashboard();
        // Redirect to home page
        window.location.href = window.location.origin;
    });

    // Check auth state and update UI
    function checkAuthState() {
        if (authToken && currentUser) {
            loggedOutView.style.display = 'none';
            loggedInView.style.display = 'flex';
            userNameDisplay.textContent = `Hello, ${currentUser}`;
        } else {
            loggedOutView.style.display = 'flex';
            loggedInView.style.display = 'none';
        }
    }

    // Get auth headers
    function getAuthHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (authToken) {
            headers['Authorization'] = `Bearer ${authToken}`;
        }
        return headers;
    }

    // ============ LINK HANDLERS ============

    // Form submission
    shortenForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = originalUrlInput.value.trim();
        const maxClicksRaw = maxClicksInput ? maxClicksInput.value.trim() : '';
        const maxClicks = maxClicksRaw ? parseInt(maxClicksRaw, 10) : undefined;

        // Basic validation
        if (!url) {
            showError("URL cannot be empty.");
            return;
        }

        try {
            // Check if valid URL object
            new URL(url);
        } catch (_) {
            showError("Please enter a valid URL (e.g., https://example.com)");
            return;
        }

        showError(""); // Clear errors

        const originalBtnText = shortenBtn.innerHTML;
        shortenBtn.innerHTML = 'Shortening...';
        shortenBtn.disabled = true;

        try {
            const payload = { originalUrl: url };
            if (typeof maxClicks === 'number' && !Number.isNaN(maxClicks)) payload.maxClicks = maxClicks;

            const response = await fetch(`${API_BASE}/shorten`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();

            if (response.ok) {
                // Show result with animation
                resultBox.classList.remove('hidden');

                // Display root-level short URL (redirects handled at root)
                const shortRoot = `${window.location.origin}/${data.id}`;
                shortUrlDisplay.href = shortRoot;
                shortUrlDisplay.textContent = shortRoot;

                // Refresh dashboard to show new link
                loadDashboard();

                // Clear input
                originalUrlInput.value = '';

                // Reset copy button state in case it was used before
                copyBtn.textContent = 'Copy Link';
                copyBtn.style.backgroundColor = '';
                copyBtn.style.color = '';
            } else {
                showError(data.error || "Failed to shorten URL. Server error.");
            }
        } catch (error) {
            showError("Network error. Make sure the server is running.");
        } finally {
            shortenBtn.innerHTML = originalBtnText;
            shortenBtn.disabled = false;
        }
    });

    // Copy to clipboard from Result Box
    copyBtn.addEventListener('click', () => {
        copyToClipboard(shortUrlDisplay.textContent, copyBtn, 'Copied!', 'Copy Link');
    });

    // Event delegation for table copy buttons
    linksBody.addEventListener('click', (e) => {
        // Copy
        const copyBtnEl = e.target.closest('.copy-icon-btn');
        if (copyBtnEl) {
            const urlToCopy = copyBtnEl.getAttribute('data-url');
            if (urlToCopy) {
                const originalHTML = copyBtnEl.innerHTML;
                copyBtnEl.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
                navigator.clipboard.writeText(urlToCopy).then(() => {
                    setTimeout(() => {
                        copyBtnEl.innerHTML = originalHTML;
                    }, 1500);
                }).catch(err => console.error('Copy failed', err));
            }
            return;
        }

        // Toggle enable/disable
        const toggleBtn = e.target.closest('.toggle-btn');
        if (toggleBtn) {
            const id = toggleBtn.getAttribute('data-id');
            const current = toggleBtn.getAttribute('data-enabled') === 'true';
            toggleBtn.disabled = true;
            fetch(`${API_BASE}/links/${id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ enabled: !current })
            }).then(r => r.json()).then(() => {
                loadDashboard();
            }).catch(err => console.error(err)).finally(() => toggleBtn.disabled = false);
            return;
        }

        // Edit destination
        const editBtn = e.target.closest('.edit-btn');
        if (editBtn) {
            const id = editBtn.getAttribute('data-id');
            const currentUrl = editBtn.getAttribute('data-url');
            const newUrl = prompt('Update destination URL (must start with http/https):', currentUrl);
            if (newUrl && newUrl.startsWith('http')) {
                editBtn.disabled = true;
                fetch(`${API_BASE}/links/${id}`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ originalUrl: newUrl })
                }).then(r => r.json()).then(() => loadDashboard()).catch(err => console.error(err)).finally(() => editBtn.disabled = false);
            } else if (newUrl !== null) {
                alert('Invalid URL. Must start with http or https.');
            }
            return;
        }
    });

    async function loadDashboard() {
        try {
            const response = await fetch(`${API_BASE}/links`);
            if (!response.ok) throw new Error("Failed to fetch links");
            const links = await response.json();

            // Reverse so newest are at the top, or sort by clicks
            links.reverse();

            totalLinksCount.textContent = links.length;

            // Calculate max clicks for the popularity bar
            const maxClicks = links.length > 0 ? Math.max(...links.map(l => l.clicks)) : 0;

            // Clear current body
            linksBody.innerHTML = '';

            // Render rows
            links.forEach((link, index) => {
                const tr = document.createElement('tr');
                tr.className = 'link-row';
                tr.style.animationDelay = `${index * 0.05}s`;

                const shortUrl = `${window.location.origin}/${link.id}`;

                // Calculate percentage (avoid division by 0)
                const popularPct = maxClicks > 0 ? (link.clicks / maxClicks) * 100 : 0;

                tr.innerHTML = `
                    <td class="original-url-cell">
                        <a href="${link.originalUrl}" class="url-text" target="_blank" rel="noopener noreferrer" title="${link.originalUrl}">
                            ${link.originalUrl}
                        </a>
                    </td>
                    <td>
                        <div class="short-url-cell">
                            <a href="${shortUrl}" class="short-url-link" target="_blank">${shortUrl}</a>
                            <button class="copy-icon-btn" data-url="${shortUrl}" title="Copy to clipboard">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            </button>
                        </div>
                    </td>
                    <td>
                        <span class="badge-clicks">${link.clicks}</span>
                    </td>
                    <td>
                        ${link.maxClicks !== null ? link.maxClicks : '—'}
                    </td>
                    <td>
                        ${link.enabled ? '<span class="status-enabled">Enabled</span>' : '<span class="status-disabled">Disabled</span>'}
                    </td>
                    <td>
                        ${formatDate(link.createdAt)}
                    </td>
                    <td>
                        ${link.lastAccessed ? formatDate(link.lastAccessed) : '—'}
                    </td>
                    <td class="popularity-cell">
                        <div class="progress-bar-bg" title="${popularPct.toFixed(1)}% compared to max">
                            <div class="progress-bar-fill" style="width: 0%" data-target-width="${popularPct}%"></div>
                        </div>
                    </td>
                    <td>
                        <button class="toggle-btn" data-id="${link.id}" data-enabled="${link.enabled}">${link.enabled ? 'Disable' : 'Enable'}</button>
                        <button class="edit-btn" data-id="${link.id}" data-url="${link.originalUrl}">Edit</button>
                    </td>
                `;
                linksBody.appendChild(tr);
            });

            // Trigger popularity bar animation after a tiny delay
            setTimeout(() => {
                const bars = document.querySelectorAll('.progress-bar-fill');
                bars.forEach(bar => {
                    bar.style.width = bar.getAttribute('data-target-width');
                });
            }, 100);

        } catch (error) {
            console.error("Error loading dashboard", error);
        }
    }

    function copyToClipboard(text, btnElement, successText, originalText) {
        navigator.clipboard.writeText(text).then(() => {
            btnElement.textContent = successText;
            btnElement.style.backgroundColor = '#DCFCE7';
            btnElement.style.color = '#166534';
            btnElement.style.borderColor = '#BBF7D0';
            setTimeout(() => {
                btnElement.textContent = originalText;
                btnElement.style.backgroundColor = '';
                btnElement.style.color = '';
                btnElement.style.borderColor = '';
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy', err);
        });
    }

    function formatDate(iso) {
        if (!iso) return '—';
        try {
            const d = new Date(iso);
            return d.toLocaleString();
        } catch (e) {
            return iso;
        }
    }

    function showError(msg) {
        errorMsg.textContent = msg;
    }
});
