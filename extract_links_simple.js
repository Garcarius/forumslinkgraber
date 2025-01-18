// ==UserScript==
// @name         Extract All Posted Links Simple
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Adds a button to extract all posted links (ignoring unwanted ones) and directly downloads the file.
// @author       YourName
// @match        https://forums.socialmediagirls.com/threads/*
// @match        https://www.simpcity.su/threads/*
// @match        https://simpcity.su/threads/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    // Exclude unwanted links
    const excludeTerms = [
        'adglare.net', 'adtng', 'chatsex.xxx', 'cambb.xxx', 'comments',
        'instagram.com', 'onlyfans.com', 'reddit.com', 'tiktok.com','https://abs.twimg.com','myfans','favicon.ico','analvids','cdn.jsdelivr.net','rabbitsreviews','notfans',
        'youtube.com', 'youtu.be', 'data:image/svg+xml', 'google.com/chrome','thread', 'member', 'comments', 'posts','manyvids','privacy',
                'energizeio.com', 'theporndude.com', 'onlyfans.com','instagram.com', 'reddit.com', 'tiktok.com','dvdfab','categories',
                'youtube.com', 'misc', 'help', 'forums', 'direct-messages', 'tags', 'account','simpcity.su/#','https://static.bunkr.ru/img/logo_bunkr-9Kl5M1Y.svg',
                '.su/search/', 'whats-new', '.su/goto', '.su/#premium-fan', 'manyvids', 'https://x.com','.su/data/','.x.com','assets',
                '.su/online/', 'su/#requests','linktr','https://candy.engine.adglare.net/','https://a.medfoodsafety.com','https://secure.chewynet.com','https://wmctjd.com/',
                'https://www.stylesfactory.pl','https://s.eunow4u.com/','https://xenforo.com/','https://v6.realxxx.com/','undressai','asmr','.com/search/'
    ];

    const disallowedExactURLs = [
        'https://simpcity.su/', 'https://liveporncams.xxx/', 'https://pixeldrain.com/res/img/pixeldrain_32.png', 'https://chatsex.xxx/',
        'https://cambb.xxx/', 'https://bunnyagent.com/', 'https://bongacams.com/', 'https://thothub.to/', 'https://www.escortsaffair.com/',
        'https://www.masturbate2gether.com/', 'https://www.porndiscounts.com/', 'https://xentr.net/', 'https://customers.addonslab.com/',
        'https://www.erome.com/android-chrome-192x192.png', 'https://cdn.betterttv.net/emote/5e429433d736527d5cd2c2d6/2x','https://simp6.jpg5.su/images3/PeepoSimp6f4bbd927ce71622.png',
        'https://forums.socialmediagirls.com/','https://mega.nz/rich-folder.png','https://simp6.jpg5.su/images3/SC_Xmas_Logo_Compressed-10abdd9cea978a076.gif'
    ];

    const siteTerms = ['.badge', '.reaction', '.bookmark', '.comment'];

    // Create and style the button
    const button = document.createElement('button');
    button.textContent = 'Extract Links';
    button.style.position = 'fixed';
    button.style.top = '10px';
    button.style.right = '10px';
    button.style.zIndex = 1000;
    button.style.padding = '10px';
    button.style.backgroundColor = '#40b5c8';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';

    // Append the button to the page
    document.body.appendChild(button);

    // Function to decode Base64 URLs
    function decodeBase64Url(base64String) {
        try {
            return decodeURIComponent(atob(base64String).split('').map(c =>
                '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
            ).join(''));
        } catch (e) {
            console.error('Error decoding Base64 URL:', e);
            return null;
        }
    }

    // Event listener for button click
    button.addEventListener('click', () => {
        const links = [];
        const combinedSelector = 'a[href], iframe[src], img[src]';

        document.querySelectorAll(combinedSelector).forEach(link => {
            let href = link.href || link.src;

            if (!href || !href.includes('http')) return;

            if (href.includes('goto/link-confirmation?url=')) {
                const encodedUrl = new URL(href).searchParams.get('url');
                const decodedUrl = decodeBase64Url(encodedUrl);
                if (decodedUrl) href = decodedUrl;
            }

            // Check against excludeTerms and disallowedExactURLs
            if (
                !excludeTerms.some(term => href.includes(term)) &&
                !disallowedExactURLs.includes(href) &&
                !siteTerms.some(term => link.closest(term))
            ) {
                links.push(href);
            }
        });

        const uniqueLinks = [...new Set(links)];
        if (uniqueLinks.length === 0) {
            alert('No relevant links found!');
            return;
        }

        const linksText = uniqueLinks.join('\n');
        const blob = new Blob([linksText], { type: 'text/plain' });
        const tempLink = document.createElement('a');
        const currentURL = window.location.href;
        const baseNameMatch = currentURL.match(/threads\/([^\/]+)/);
        const fileName = baseNameMatch ? baseNameMatch[1] : 'extracted_links';

        tempLink.href = URL.createObjectURL(blob);
        tempLink.download = `${fileName}.txt`;
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);

        alert('Links downloaded!');
    });
})();
