// ==UserScript==
// @name         Extract All Posted Links (v3.1 - Embed Video Support)
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  Extrae links, decodifica SimpCity/SMG y captura videos incrustados (iframes/embeds).
// @match        *://forums.socialmediagirls.com/threads/*
// @match        *://*.simpcity.su/threads/*
// @match        *://*.simpcity.cr/threads/*
// @match        *://xbunker.cc/threads/*
// @match        *://leakedmodels.com/forum/threads/*
// @match        *://nudostar.com/forum/threads/*
// @match        *://titsintops.com/phpBB2/threads/*
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
        excludeTerms: [
            '/styles/', '/smilies/', '/avatars/', 'Pepe', 'emotes', 'attachments/thumbnails',
            'goto/comment', 'goto/post', '/search/', '/members/', 'register', 'login',
            'help/', 'terms/', 'privacy/', 'whats-new', 'adglare.net', 'adtng', 'chatsex.xxx',
            'abs.twimg.com', 'favicon', 'cdn.jsdelivr.net', '7tv.app', 'stylesfactory.pl',
            'xenforo.com', 'logo', 'misc/', 'svg+xml', 'google.com', 'thread-loader',
            'css', 'js', 'analytics', 'facebook.com', 'twitter.com'
        ],

        disallowedExactURLs: [
            'https://simpcity.su/', 'https://simpcity.cr/', 'https://nudostar.com/',
            'https://forums.socialmediagirls.com/', 'https://liveporncams.xxx/',
            'https://fansly.com/assets/images/twitter-card-image.png',
            'https://pixeldrain.com/res/img/pixeldrain_32.png', 'https://chatsex.xxx/',
            'https://static-eu-cdn.eporner.com/favicon.png', 'https://mega.nz/rich-folder.png'
        ],

        ignorePasswords: ['protection', 'link', 'required', 'yes', 'none', 'hidden', 'click'],

        waitBetweenPages: 2.5
    };

    const passRegex = /\b(?:pass|password|pw|contraseña)[:\-\s]+([a-zA-Z0-9._!@#]+)/i;

    function cleanAndDecode(url) {
        if (!url) return null;
        let finalUrl = url;

        if (finalUrl.includes('redirect/?to=')) {
            const match = finalUrl.match(/to=([^&]+)/);
            if (match) {
                try { finalUrl = atob(decodeURIComponent(match[1])); } catch (e) { }
            }
        } else if (finalUrl.includes('link-confirmation?url=')) {
            const match = finalUrl.match(/url=([^&]+)/);
            if (match) {
                try { finalUrl = atob(decodeURIComponent(match[1])); } catch (e) { }
            }
        }

        finalUrl = finalUrl.split(/[ "\s<>']+/)[0];
        finalUrl = finalUrl.split('&s=')[0].split('?s=')[0].split('&amp;s=')[0];
        if (finalUrl.includes('#lg=')) finalUrl = finalUrl.split('#')[0];

        return finalUrl;
    }

    function isValuable(url) {
        if (!url || !url.startsWith('http')) return false;
        const lowerUrl = url.toLowerCase();
        if (CONFIG.excludeTerms.some(term => lowerUrl.includes(term.toLowerCase()))) return false;
        if (CONFIG.disallowedExactURLs.some(exact => url === exact)) return false;
        return true;
    }

    function getCleanModelName() {
        const match = location.href.match(/threads\/([^\/]+)|thread\/([^\/]+)/);
        if (match) {
            let slug = (match[1] || match[2]).split('.')[0];
            return decodeURIComponent(slug).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9-_]/g, "_");
        }
        return 'extracted_links';
    }

    function getCurrentPageNumber() {
        const match = location.href.match(/[?&]page=(\d+)|\/page-(\d+)/);
        if (match) return parseInt(match[1] || match[2]);
        return 1;
    }

    // --- UI ---
    const container = document.createElement('div');
    Object.assign(container.style, {
        position: 'fixed', top: '100px', right: '20px', zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: '8px',
        backgroundColor: '#1a1a1a', padding: '12px', borderRadius: '8px',
        border: '2px solid #ffcc00', boxShadow: '0px 0px 15px rgba(255, 204, 0, 0.5)'
    });
    document.body.appendChild(container);

    const btnBulk = document.createElement('button');
    btnBulk.textContent = GM_getValue('is_extracting', false) ? 'RUNNING...' : 'START EXTRACTION';
    Object.assign(btnBulk.style, {
        padding: '12px', backgroundColor: '#ffcc00', color: 'black',
        fontWeight: 'bold', border: 'none', borderRadius: '5px', cursor: 'pointer'
    });
    container.appendChild(btnBulk);

    const btnReset = document.createElement('button');
    btnReset.textContent = 'Reset Session';
    Object.assign(btnReset.style, {
        padding: '6px', backgroundColor: '#444', color: 'white',
        border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '11px'
    });
    container.appendChild(btnReset);

    // --- PROCESO ---
    function extractCurrentPage() {
        const foundLinks = new Set();
        const baseDomain = window.location.origin;

        document.querySelectorAll('.bbWrapper, .message-attachments, .attachmentList').forEach(post => {
            const passMatch = post.innerText.match(passRegex);
            let foundPassword = null;

            if (passMatch) {
                const potentialPass = passMatch[1].trim();
                if (!CONFIG.ignorePasswords.includes(potentialPass.toLowerCase())) {
                    foundPassword = potentialPass;
                }
            }

            post.querySelectorAll('a, img, source, video, iframe, [data-s9e-mediaembed-src]').forEach(el => {
                let rawUrl = el.href ||
                             el.src ||
                             el.getAttribute('data-url') ||
                             el.getAttribute('data-src') ||
                             el.getAttribute('data-s9e-mediaembed-src');

                if (!rawUrl || rawUrl.startsWith('data:')) return;
                if (rawUrl.startsWith('/')) rawUrl = baseDomain + rawUrl;

                let cleanUrl = cleanAndDecode(rawUrl);

                if (isValuable(cleanUrl)) {
                    if (foundPassword && !cleanUrl.includes(baseDomain) && !cleanUrl.includes('password=')) {
                        const sep = cleanUrl.includes('?') ? '&' : '?';
                        cleanUrl = `${cleanUrl}${sep}password=${foundPassword}`;
                    }
                    foundLinks.add(cleanUrl);
                }
            });
        });
        return Array.from(foundLinks);
    }

    function processPage() {
        if (!GM_getValue('is_extracting', false)) return;

        let currentLinks = GM_getValue('session_links', []);
        const newLinks = extractCurrentPage();
        const combined = [...new Set([...currentLinks, ...newLinks])];
        GM_setValue('session_links', combined);

        const nextButton = document.querySelector('a.pageNav-jump--next, a[rel="next"], .pageNav-main .pageNav-page--next + a');
        if (nextButton && nextButton.href !== location.href) {
            btnBulk.textContent = `Página Sig... (${combined.length} links)`;
            setTimeout(() => nextButton.click(), CONFIG.waitBetweenPages * 1000);
        } else {
            // *** ÚNICA MODIFICACIÓN: header con última página ***
            const lastPage = getCurrentPageNumber();
            const timestamp = new Date().toLocaleString();
            const header = `# Ultima pagina extraida: ${lastPage} | Total links: ${combined.length} | Fecha: ${timestamp}`;
            const content = header + '\n' + combined.join('\n');

            const cleanName = getCleanModelName();
            const blob = new Blob([content], { type: 'text/plain' });
            const tempLink = document.createElement('a');
            tempLink.href = URL.createObjectURL(blob);
            tempLink.download = `${cleanName}.txt`;
            tempLink.click();

            GM_deleteValue('session_links');
            GM_deleteValue('is_extracting');
            alert(`COMPLETO: ${combined.length} enlaces. Última página: ${lastPage}`);
            location.reload();
        }
    }

    btnBulk.addEventListener('click', () => {
        GM_setValue('is_extracting', true);
        GM_setValue('session_links', []);
        processPage();
    });

    btnReset.addEventListener('click', () => {
        GM_deleteValue('is_extracting');
        GM_deleteValue('session_links');
        alert("Sesión reseteada.");
        location.reload();
    });

    if (GM_getValue('is_extracting', false)) {
        setTimeout(processPage, 2000);
    }
})();