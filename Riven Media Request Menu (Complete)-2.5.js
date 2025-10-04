// ==UserScript==
// @name         Riven Media Request Menu (Complete)
// @namespace    http://tampermonkey.net/
// @version      2.5
// @description  Smart menu for requesting media via Riven with multiple ID lookup fallbacks
// @author       You
// @match        https://www.imdb.com/title/*
// @match        https://www.themoviedb.org/movie/*
// @match        https://www.themoviedb.org/tv/*
// @match        https://www.thetvdb.com/*
// @match        https://thetvdb.com/*
// @match        https://letterboxd.com/film/*
// @match        https://trakt.tv/movies/*
// @match        https://trakt.tv/shows/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @connect      api.themoviedb.org
// @connect      api.trakt.tv
// @connect      api.tvmaze.com
// @connect      www.omdbapi.com
// @connect      *
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    console.log('🎬 Riven Enhanced Menu v2.5 loaded!');

    const processedMovies = new Set();
    let refreshInterval = null;

    let config = {
        baseUrl: GM_getValue('riven_base_url', ''),
        apiKey: GM_getValue('riven_api_key', '')
    };

    GM_registerMenuCommand('⚙️ Riven Settings', showSettingsDialog);

    if (!config.baseUrl || !config.apiKey) {
        console.log('No config found, showing settings...');
        setTimeout(showSettingsDialog, 1000);
    }

    setTimeout(init, 2000);

    function init() {
        console.log('Initializing Riven Enhanced Menu...');
        const site = detectSite();
        console.log('Detected site:', site);

        if (site) {
            extractMediaInfo(site);
        }
    }

    function detectSite() {
        const url = window.location.href;
        if (url.includes('imdb.com/title')) return 'imdb';
        if (url.includes('themoviedb.org')) return 'tmdb';
        if (url.includes('thetvdb.com')) return 'tvdb';
        if (url.includes('letterboxd.com')) return 'letterboxd';
        if (url.includes('trakt.tv')) return 'trakt';
        return null;
    }

    function extractMediaInfo(site) {
        let mediaInfo = {};

        try {
            switch(site) {
                case 'imdb':
                    mediaInfo = extractIMDb();
                    break;
                case 'tmdb':
                    mediaInfo = extractTMDb();
                    break;
                case 'tvdb':
                    mediaInfo = extractTVDb();
                    break;
                case 'letterboxd':
                    mediaInfo = extractLetterboxd();
                    break;
                case 'trakt':
                    mediaInfo = extractTrakt();
                    break;
            }

            console.log('Extracted media info:', mediaInfo);

            if (mediaInfo.title) {
                const movieKey = `${mediaInfo.imdbId || mediaInfo.tmdbId || mediaInfo.title}`;
                if (processedMovies.has(movieKey)) {
                    console.log('Movie already processed:', movieKey);
                    return;
                }
                processedMovies.add(movieKey);

                // If we only have IMDb ID, convert it to TMDb/TVDB ID
                if (mediaInfo.imdbId && !mediaInfo.tmdbId && !mediaInfo.tvdbId) {
                    console.log('🔄 Need to lookup TMDb/TVDB ID from IMDb...');
                    lookupIdsFromImdb(mediaInfo, (enrichedInfo) => {
                        console.log('✅ Lookup complete:', enrichedInfo);
                        addMenuToLargestTitle(enrichedInfo);
                    });
                } else {
                    addMenuToLargestTitle(mediaInfo);
                }
            } else {
                console.log('No title found, retrying...');
                setTimeout(() => extractMediaInfo(site), 2000);
            }
        } catch (error) {
            console.error('Error extracting media info:', error);
        }
    }

    function lookupIdsFromImdb(mediaInfo, callback) {
        console.log('🔄 Starting multi-source ID lookup for:', mediaInfo.imdbId);

        // Try TMDb first (most reliable)
        tryTMDbLookup(mediaInfo, (result) => {
            if (result.tmdbId) {
                console.log('✅ TMDb lookup successful');
                callback(result);
                return;
            }

            // Fallback to Trakt
            console.log('⚠️ TMDb failed, trying Trakt...');
            tryTraktLookup(mediaInfo, (result) => {
                if (result.tmdbId || result.tvdbId) {
                    console.log('✅ Trakt lookup successful');
                    callback(result);
                    return;
                }

                // Fallback to TVmaze
                console.log('⚠️ Trakt failed, trying TVmaze...');
                tryTVmazeLookup(mediaInfo, (result) => {
                    if (result.tvdbId) {
                        console.log('✅ TVmaze lookup successful');
                        callback(result);
                        return;
                    }

                    // All lookups failed
                    console.error('❌ All ID lookups failed');
                    callback(mediaInfo);
                });
            });
        });
    }

    function tryTMDbLookup(mediaInfo, callback) {
        const url = `https://api.themoviedb.org/3/find/${mediaInfo.imdbId}?api_key=3c601a7e895e0641fd8f0c2da7b39dc7&external_source=imdb_id`;

        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            timeout: 5000,
            onload: function(response) {
                try {
                    const data = JSON.parse(response.responseText);
                    console.log('TMDb find response:', data);

                    if (data.movie_results && data.movie_results.length > 0) {
                        mediaInfo.tmdbId = data.movie_results[0].id.toString();
                        mediaInfo.type = 'movie';
                        console.log('✅ Found TMDb movie ID:', mediaInfo.tmdbId);
                    } else if (data.tv_results && data.tv_results.length > 0) {
                        mediaInfo.tmdbId = data.tv_results[0].id.toString();
                        mediaInfo.type = 'show';
                        console.log('✅ Found TMDb TV ID:', mediaInfo.tmdbId);
                    }

                    callback(mediaInfo);
                } catch (error) {
                    console.error('❌ TMDb parse error:', error);
                    callback(mediaInfo);
                }
            },
            onerror: function(error) {
                console.error('❌ TMDb request error:', error);
                callback(mediaInfo);
            },
            ontimeout: function() {
                console.error('❌ TMDb timeout');
                callback(mediaInfo);
            }
        });
    }

    function tryTraktLookup(mediaInfo, callback) {
        // Trakt API requires client ID but search endpoint is less restrictive
        const url = `https://api.trakt.tv/search/imdb/${mediaInfo.imdbId}?extended=full`;

        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json',
                'trakt-api-version': '2',
                'trakt-api-key': '64cf24d0dfa7d0e95b0b7d5c7b8276e1e3264a180c1e7c5354e4ba5ac8190b50' // Public client ID
            },
            onload: function(response) {
                try {
                    const data = JSON.parse(response.responseText);
                    console.log('Trakt search response:', data);

                    if (data && data.length > 0) {
                        const result = data[0];

                        if (result.type === 'movie' && result.movie) {
                            mediaInfo.tmdbId = result.movie.ids?.tmdb?.toString();
                            mediaInfo.type = 'movie';
                            console.log('✅ Found from Trakt - TMDb movie ID:', mediaInfo.tmdbId);
                        } else if (result.type === 'show' && result.show) {
                            mediaInfo.tmdbId = result.show.ids?.tmdb?.toString();
                            mediaInfo.tvdbId = result.show.ids?.tvdb?.toString();
                            mediaInfo.type = 'show';
                            console.log('✅ Found from Trakt - TMDb:', mediaInfo.tmdbId, 'TVDB:', mediaInfo.tvdbId);
                        }
                    }

                    callback(mediaInfo);
                } catch (error) {
                    console.error('❌ Trakt parse error:', error);
                    callback(mediaInfo);
                }
            },
            onerror: function(error) {
                console.error('❌ Trakt request error:', error);
                callback(mediaInfo);
            },
            ontimeout: function() {
                console.error('❌ Trakt timeout');
                callback(mediaInfo);
            }
        });
    }

    function tryTVmazeLookup(mediaInfo, callback) {
        const url = `https://api.tvmaze.com/lookup/shows?imdb=${mediaInfo.imdbId}`;

        GM_xmlhttpRequest({
            method: 'GET',
            url: url,
            timeout: 5000,
            onload: function(response) {
                try {
                    const data = JSON.parse(response.responseText);
                    console.log('TVmaze lookup response:', data);

                    if (data && data.externals) {
                        mediaInfo.tvdbId = data.externals.thetvdb?.toString();
                        mediaInfo.type = 'show';
                        console.log('✅ Found TVDB ID from TVmaze:', mediaInfo.tvdbId);
                    }

                    callback(mediaInfo);
                } catch (error) {
                    console.error('❌ TVmaze parse error:', error);
                    callback(mediaInfo);
                }
            },
            onerror: function(error) {
                console.error('❌ TVmaze request error:', error);
                callback(mediaInfo);
            },
            ontimeout: function() {
                console.error('❌ TVmaze timeout');
                callback(mediaInfo);
            }
        });
    }

    function extractIMDb() {
        const url = window.location.href;
        const imdbMatch = url.match(/title\/(tt\d+)/);
        const imdbId = imdbMatch ? imdbMatch[1] : null;

        let title = null;
        const titleSelectors = [
            'h1[data-testid="hero__pageTitle"] span',
            'h1[data-testid="hero__pageTitle"]',
            'h1.sc-',
            'h1',
            '[data-testid="hero-title-block__title"]'
        ];

        for (const selector of titleSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                title = element.textContent.trim();
                break;
            }
        }

        const pageTitle = document.title.toLowerCase();
        const type = (pageTitle.includes('tv series') || pageTitle.includes('tv mini')) ? 'show' : 'movie';

        return { imdbId, title, type };
    }

    function extractTMDb() {
        const url = window.location.href;
        const tmdbMatch = url.match(/\/(movie|tv)\/(\d+)/);
        const tmdbId = tmdbMatch ? tmdbMatch[2] : null;
        const type = tmdbMatch && tmdbMatch[1] === 'tv' ? 'show' : 'movie';

        let title = null;
        const titleSelectors = ['h2 a', 'h2', '.title h2', 'section h2'];
        for (const selector of titleSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                title = element.textContent.trim();
                break;
            }
        }

        let imdbId = null;
        const imdbLink = document.querySelector('a[href*="imdb.com/title/"]');
        if (imdbLink) {
            const match = imdbLink.href.match(/title\/(tt\d+)/);
            imdbId = match ? match[1] : null;
        }

        return { tmdbId, imdbId, title, type };
    }

    function extractTVDb() {
        const titleSelectors = ['h1', '.change_translation_text', '[data-test="series-name"]'];
        let title = null;
        for (const selector of titleSelectors) {
            const element = document.querySelector(selector);
            if (element && element.textContent.trim()) {
                title = element.textContent.trim();
                break;
            }
        }

        let imdbId = null;
        const imdbLink = document.querySelector('a[href*="imdb.com"]');
        if (imdbLink) {
            const match = imdbLink.href.match(/tt\d+/);
            imdbId = match ? match[0] : null;
        }

        let tvdbId = null;
        const urlMatch = window.location.href.match(/series\/.*?-(\d+)/);
        if (urlMatch) tvdbId = urlMatch[1];

        return { tvdbId, imdbId, title, type: 'show' };
    }

    function extractLetterboxd() {
        const title = document.querySelector('h1.headline-1')?.textContent?.trim();

        let tmdbId = null;
        const tmdbLink = document.querySelector('a[href*="themoviedb.org"]');
        if (tmdbLink) {
            const match = tmdbLink.href.match(/movie\/(\d+)/);
            tmdbId = match ? match[1] : null;
        }

        let imdbId = null;
        const imdbLink = document.querySelector('a[href*="imdb.com"]');
        if (imdbLink) {
            const match = imdbLink.href.match(/tt\d+/);
            imdbId = match ? match[0] : null;
        }

        return { tmdbId, imdbId, title, type: 'movie' };
    }

    function extractTrakt() {
        const url = window.location.href;
        const type = url.includes('/movies/') ? 'movie' : 'show';
        const title = document.querySelector('h1')?.textContent?.trim() ||
                     document.querySelector('.mobile-title h1')?.textContent?.trim();

        let imdbId = null;
        const imdbLink = document.querySelector('a[href*="imdb.com"]');
        if (imdbLink) {
            const match = imdbLink.href.match(/tt\d+/);
            imdbId = match ? match[0] : null;
        }

        let tmdbId = null;
        const tmdbLink = document.querySelector('a[href*="themoviedb.org"]');
        if (tmdbLink) {
            const match = tmdbLink.href.match(/\/(movie|tv)\/(\d+)/);
            tmdbId = match ? match[2] : null;
        }

        return { imdbId, tmdbId, title, type };
    }

    function addMenuToLargestTitle(mediaInfo) {
        const titleSelectors = [
            'h1[data-testid="hero__pageTitle"]',
            'h1.sc-',
            'h1',
            'h2',
            '.title',
            '[data-testid="hero-title-block__title"]'
        ];

        let largestElement = null;
        let largestFontSize = 0;

        for (const selector of titleSelectors) {
            const elements = document.querySelectorAll(selector);
            elements.forEach(element => {
                const fontSize = parseFloat(window.getComputedStyle(element).fontSize);
                const text = element.textContent.trim();
                if (fontSize > largestFontSize && text.length > 0) {
                    largestFontSize = fontSize;
                    largestElement = element;
                }
            });
        }

        if (!largestElement) {
            console.error('Could not find title element');
            return;
        }

        createRivenMenu(mediaInfo, largestElement);

        if (config.baseUrl && config.apiKey && (mediaInfo.imdbId || mediaInfo.tmdbId)) {
            checkLibraryStatus(mediaInfo);
        } else {
            const statusDiv = document.getElementById('riven-status');
            if (statusDiv) {
                if (!mediaInfo.tmdbId && !mediaInfo.tvdbId) {
                    statusDiv.innerHTML = `
                        <div style="color: #ff5555;">
                            ❌ No TMDb/TVDB ID found
                        </div>
                        <div style="color: #aaa; font-size: 10px; margin-top: 5px;">
                            Tried TMDb, Trakt, and TVmaze
                        </div>
                    `;
                }
            }
        }
    }

    function createRivenMenu(mediaInfo, targetElement) {
        const menuContainer = document.createElement('div');
        menuContainer.id = 'riven-menu-container';
        menuContainer.style.cssText = `
            display: inline-block;
            margin-left: 20px;
            vertical-align: middle;
            position: relative;
        `;

        const toggleButton = document.createElement('button');
        toggleButton.id = 'riven-toggle-btn';
        toggleButton.innerHTML = '🎬 Riven';
        toggleButton.style.cssText = `
            background-color: #000000;
            color: #ffffff;
            border: 2px solid #ffffff;
            padding: 10px 20px;
            font-size: 14px;
            font-weight: bold;
            cursor: pointer;
            border-radius: 5px;
            transition: all 0.3s ease;
        `;

        const menuPanel = document.createElement('div');
        menuPanel.id = 'riven-menu-panel';
        menuPanel.style.cssText = `
            display: none;
            position: absolute;
            top: 100%;
            left: 0;
            margin-top: 10px;
            background-color: rgba(0, 0, 0, 0.95);
            border: 2px solid #ffffff;
            border-radius: 8px;
            padding: 15px;
            min-width: 300px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.5);
        `;

        menuPanel.innerHTML = `
            <div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid #fff;">
                <strong style="color: #fff; font-size: 14px;">📝 ${mediaInfo.title}</strong>
            </div>
            <div id="riven-status" style="margin-bottom: 15px; padding: 10px; background: #1a1a1a; border-radius: 5px; color: #fff; font-size: 12px;">
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="riven-spinner" style="
                        border: 3px solid #333;
                        border-top: 3px solid #fff;
                        border-radius: 50%;
                        width: 20px;
                        height: 20px;
                        animation: spin 1s linear infinite;
                    "></div>
                    <span>Checking library...</span>
                </div>
            </div>
            <div style="margin-bottom: 10px;">
                <div style="color: #aaa; font-size: 11px; margin-bottom: 5px;">
                    ${mediaInfo.imdbId ? 'IMDb: ' + mediaInfo.imdbId : ''}
                    ${mediaInfo.tmdbId ? (mediaInfo.imdbId ? ' | ' : '') + 'TMDb: ' + mediaInfo.tmdbId : ''}
                    ${mediaInfo.tvdbId ? ' | TVDB: ' + mediaInfo.tvdbId : ''}
                    ${!mediaInfo.tmdbId && !mediaInfo.tvdbId ? '<span style="color: #ff5555;">⚠️ No IDs</span>' : ''}
                </div>
                <div style="color: #aaa; font-size: 11px;">
                    Type: ${mediaInfo.type.toUpperCase()}
                </div>
            </div>
            <div style="display: flex; gap: 10px; margin-top: 15px;">
                <button id="riven-request-btn" style="
                    flex: 1;
                    background-color: #00aa00;
                    color: white;
                    border: none;
                    padding: 10px;
                    font-weight: bold;
                    cursor: pointer;
                    border-radius: 5px;
                    font-size: 13px;
                ">Request</button>
                <button id="riven-refresh-btn" style="
                    background-color: #0066cc;
                    color: white;
                    border: none;
                    padding: 10px 15px;
                    cursor: pointer;
                    border-radius: 5px;
                    font-size: 13px;
                ">🔄</button>
                <button id="riven-hide-btn" style="
                    background-color: #666;
                    color: white;
                    border: none;
                    padding: 10px 15px;
                    cursor: pointer;
                    border-radius: 5px;
                    font-size: 13px;
                ">Hide</button>
            </div>
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);

        menuContainer.appendChild(toggleButton);
        menuContainer.appendChild(menuPanel);

        targetElement.parentNode.insertBefore(menuContainer, targetElement.nextSibling);

        toggleButton.onclick = () => {
            const isVisible = menuPanel.style.display === 'block';
            menuPanel.style.display = isVisible ? 'none' : 'block';
            toggleButton.style.backgroundColor = isVisible ? '#000000' : '#333333';

            if (!isVisible) {
                startAutoRefresh(mediaInfo);
            } else {
                stopAutoRefresh();
            }
        };

        document.getElementById('riven-request-btn').onclick = () => {
            if (!config.baseUrl || !config.apiKey) {
                showSettingsDialog();
                return;
            }
            requestMedia(mediaInfo);
        };

        document.getElementById('riven-refresh-btn').onclick = () => {
            checkLibraryStatus(mediaInfo);
        };

        document.getElementById('riven-hide-btn').onclick = () => {
            stopAutoRefresh();
            menuContainer.style.display = 'none';
            showNotification('Menu hidden for this page', 'success');
        };

        document.addEventListener('click', (e) => {
            if (!menuContainer.contains(e.target)) {
                menuPanel.style.display = 'none';
                toggleButton.style.backgroundColor = '#000000';
                stopAutoRefresh();
            }
        });
    }

    function startAutoRefresh(mediaInfo) {
        stopAutoRefresh();
        refreshInterval = setInterval(() => {
            const menuPanel = document.getElementById('riven-menu-panel');
            if (menuPanel && menuPanel.style.display === 'block') {
                checkLibraryStatus(mediaInfo, true);
            } else {
                stopAutoRefresh();
            }
        }, 3000);
    }

    function stopAutoRefresh() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    }

    function checkLibraryStatus(mediaInfo, isAutoRefresh = false) {
        if (!isAutoRefresh) {
            console.log('🔍 Checking library status');
        }

        const searchQuery = encodeURIComponent(mediaInfo.title);
        const apiUrl = `${config.baseUrl}/api/v1/items?search=${searchQuery}&limit=50`;

        GM_xmlhttpRequest({
            method: 'GET',
            url: apiUrl,
            headers: {
                'Authorization': `Bearer ${config.apiKey}`,
                'Content-Type': 'application/json'
            },
            onload: function(response) {
                const statusDiv = document.getElementById('riven-status');
                if (!statusDiv) return;

                if (response.status === 200) {
                    try {
                        const data = JSON.parse(response.responseText);
                        const items = data.items || [];
                        let matchedItem = null;

                        if (items.length > 0) {
                            for (const item of items) {
                                if (mediaInfo.imdbId && item.imdb_id === mediaInfo.imdbId) {
                                    matchedItem = item;
                                    break;
                                }
                                if (mediaInfo.tmdbId && item.tmdb_id === parseInt(mediaInfo.tmdbId)) {
                                    matchedItem = item;
                                    break;
                                }
                                if (mediaInfo.tvdbId && item.tvdb_id === parseInt(mediaInfo.tvdbId)) {
                                    matchedItem = item;
                                    break;
                                }
                            }
                        }

                        if (matchedItem) {
                            const state = matchedItem.state || 'Unknown';
                            const stateEmoji = getStateEmoji(state);

                            statusDiv.innerHTML = `
                                <div style="color: #00ff00;">
                                    ${stateEmoji} <strong>In Library</strong>
                                </div>
                                <div style="color: #aaa; font-size: 11px; margin-top: 5px;">
                                    Status: ${state}
                                </div>
                            `;

                            const requestBtn = document.getElementById('riven-request-btn');
                            if (requestBtn && state !== 'Failed') {
                                requestBtn.textContent = 'Already in Library';
                                requestBtn.style.backgroundColor = '#666';
                                requestBtn.disabled = true;
                            }
                        } else {
                            statusDiv.innerHTML = `
                                <div style="color: #ffaa00;">
                                    ⚠️ <strong>Not in Library</strong>
                                </div>
                                <div style="color: #aaa; font-size: 11px; margin-top: 5px;">
                                    Ready to request
                                </div>
                            `;

                            const requestBtn = document.getElementById('riven-request-btn');
                            if (requestBtn) {
                                requestBtn.textContent = 'Request';
                                requestBtn.style.backgroundColor = '#00aa00';
                                requestBtn.disabled = false;
                            }
                        }
                    } catch (error) {
                        statusDiv.innerHTML = `<div style="color: #ff5555;">❌ Parse Error</div>`;
                    }
                }
            }
        });
    }

    function getStateEmoji(state) {
        const stateMap = {
            'Completed': '✅', 'Downloaded': '⬇️', 'Symlinked': '🔗',
            'Pending': '⏳', 'Failed': '❌', 'Requested': '📝',
            'Indexed': '📇', 'Scraped': '🔍', 'PartiallyCompleted': '🔄',
            'Ongoing': '▶️', 'Unreleased': '🔜', 'Paused': '⏸️', 'Unknown': '❓'
        };
        return stateMap[state] || '📊';
    }

    function requestMedia(mediaInfo) {
        console.log('📤 Requesting media:', mediaInfo);

        if (!mediaInfo.tmdbId && !mediaInfo.tvdbId) {
            showNotification('❌ No TMDb or TVDB ID available after all lookups', 'error');
            return;
        }

        const requestBtn = document.getElementById('riven-request-btn');
        const originalText = requestBtn.textContent;
        requestBtn.disabled = true;
        requestBtn.textContent = 'Requesting...';

        let queryParams = [];
        if (mediaInfo.tmdbId) queryParams.push(`tmdb_ids=${mediaInfo.tmdbId}`);
        if (mediaInfo.tvdbId) queryParams.push(`tvdb_ids=${mediaInfo.tvdbId}`);

        const mediaType = mediaInfo.type === 'show' ? 'tv' : 'movie';
        queryParams.push(`media_type=${mediaType}`);

        const apiUrl = `${config.baseUrl}/api/v1/items/add?${queryParams.join('&')}`;
        console.log('📡 Request URL:', apiUrl);

        GM_xmlhttpRequest({
            method: 'POST',
            url: apiUrl,
            headers: { 'Authorization': `Bearer ${config.apiKey}` },
            onload: function(response) {
                console.log('📥 Response:', response.status, response.responseText);

                if (response.status >= 200 && response.status < 300) {
                    requestBtn.textContent = '✓ Requested!';
                    requestBtn.style.backgroundColor = '#00aa00';
                    showNotification('✅ Media requested successfully!', 'success');
                    setTimeout(() => checkLibraryStatus(mediaInfo), 2000);
                } else {
                    requestBtn.textContent = '✗ Failed';
                    requestBtn.style.backgroundColor = '#aa0000';

                    let errorMsg = `❌ Request failed (${response.status})`;
                    try {
                        const err = JSON.parse(response.responseText);
                        if (err.detail) errorMsg += `: ${err.detail}`;
                    } catch (e) {}

                    showNotification(errorMsg, 'error');
                }

                setTimeout(() => {
                    if (requestBtn.textContent === '✓ Requested!') {
                        requestBtn.disabled = false;
                        requestBtn.textContent = originalText;
                        requestBtn.style.backgroundColor = '#00aa00';
                    }
                }, 3000);
            },
            onerror: function() {
                requestBtn.textContent = '✗ Error';
                requestBtn.style.backgroundColor = '#aa0000';
                showNotification('❌ Network error', 'error');
            }
        });
    }

    function showNotification(message, type) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            background-color: ${type === 'success' ? '#00aa00' : '#aa0000'};
            color: white; padding: 15px 20px; border-radius: 5px;
            box-shadow: 0 4px 8px rgba(0,0,0,0.4); z-index: 10001;
            font-size: 14px; font-weight: bold; max-width: 350px;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }

    function showSettingsDialog() {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background-color: rgba(0, 0, 0, 0.8); z-index: 99999;
            display: flex; justify-content: center; align-items: center;
        `;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background-color: #1a1a1a; color: white; padding: 30px;
            border-radius: 10px; border: 3px solid white; max-width: 500px;
            width: 90%; box-shadow: 0 10px 40px rgba(0,0,0,0.5);
        `;

        dialog.innerHTML = `
            <h2 style="margin-top: 0; color: #fff;">⚙️ Riven API Configuration</h2>
            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Base URL:</label>
                <input type="text" id="riven_base_url" value="${config.baseUrl}"
                    placeholder="http://192.168.50.111:8080"
                    style="width: 100%; padding: 10px; box-sizing: border-box; background: #333; color: white; border: 2px solid white; border-radius: 5px; font-size: 14px;">
            </div>
            <div style="margin-bottom: 25px;">
                <label style="display: block; margin-bottom: 5px; font-weight: bold;">API Key:</label>
                <input type="password" id="riven_api_key" value="${config.apiKey}"
                    placeholder="Your API key"
                    style="width: 100%; padding: 10px; box-sizing: border-box; background: #333; color: white; border: 2px solid white; border-radius: 5px; font-size: 14px;">
            </div>
            <div style="display: flex; gap: 10px;">
                <button id="save_settings"
                    style="flex: 1; padding: 12px; background: #00aa00; color: white; border: none; cursor: pointer; font-weight: bold; border-radius: 5px; font-size: 16px;">
                    ✓ Save & Reload
                </button>
                <button id="cancel_settings"
                    style="flex: 1; padding: 12px; background: #aa0000; color: white; border: none; cursor: pointer; font-weight: bold; border-radius: 5px; font-size: 16px;">
                    ✗ Cancel
                </button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        document.getElementById('save_settings').onclick = () => {
            const baseUrl = document.getElementById('riven_base_url').value.trim();
            const apiKey = document.getElementById('riven_api_key').value.trim();

            if (!baseUrl || !apiKey) {
                alert('⚠️ Please fill in both fields!');
                return;
            }

            GM_setValue('riven_base_url', baseUrl.replace(/\/$/, ''));
            GM_setValue('riven_api_key', apiKey);

            overlay.remove();
            showNotification('✅ Settings saved! Reloading...', 'success');
            setTimeout(() => location.reload(), 1500);
        };

        document.getElementById('cancel_settings').onclick = () => overlay.remove();
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    }
})();
