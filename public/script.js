document.addEventListener('DOMContentLoaded', () => {
    const shortenForm = document.getElementById('shortenForm');
    const originalUrlInput = document.getElementById('originalUrl');
    const errorMsg = document.getElementById('errorMsg');
    const resultBox = document.getElementById('resultBox');
    const shortUrlDisplay = document.getElementById('shortUrlDisplay');
    const copyBtn = document.getElementById('copyBtn');
    const linksBody = document.getElementById('linksBody');
    const totalLinksCount = document.getElementById('totalLinksCount');

    const API_BASE = window.location.origin;

    // Load dashboard on startup
    loadDashboard();

    // Form submission
    shortenForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const url = originalUrlInput.value.trim();

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
            const response = await fetch(`${API_BASE}/shorten`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ originalUrl: url })
            });

            const data = await response.json();

            if (response.ok) {
                // Show result with animation
                resultBox.classList.remove('hidden');

                shortUrlDisplay.href = data.shortUrl;
                shortUrlDisplay.textContent = data.shortUrl;

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
        const btn = e.target.closest('.copy-icon-btn');
        if (!btn) return;

        const urlToCopy = btn.getAttribute('data-url');
        if (urlToCopy) {
            const originalHTML = btn.innerHTML;
            // Change SVG to checkmark temporarily
            btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;

            navigator.clipboard.writeText(urlToCopy).then(() => {
                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                }, 2000);
            }).catch(err => console.error('Copy failed', err));
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

                const shortUrl = `${API_BASE}/${link.id}`;

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
                    <td class="popularity-cell">
                        <div class="progress-bar-bg" title="${popularPct.toFixed(1)}% compared to max">
                            <div class="progress-bar-fill" style="width: 0%" data-target-width="${popularPct}%"></div>
                        </div>
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

    function showError(msg) {
        errorMsg.textContent = msg;
    }
});
