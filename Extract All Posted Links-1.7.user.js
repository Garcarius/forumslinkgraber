// ==UserScript==
// @name         Extract All Posted Links 
// @namespace    http://tampermonkey.net/
// @version      1.8
// @description  Adds a button to extract all posted links (ignoring unwanted ones) and handles redirects, targeting only post content and ignoring the signature section.
// @author       Garcarius
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Create and style the button
    let button = document.createElement('button');
    button.innerHTML = 'Extract Links';
    button.style.position = 'fixed';
    button.style.top = '10px';
    button.style.right = '10px';
    button.style.zIndex = 1000;
    button.style.padding = '10px';
    button.style.backgroundColor = '#be464d';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';

    // Append button to the body
    document.body.appendChild(button);

    // Function to decode Base64 encoded URLs
    function decodeBase64Url(base64String) {
        try {
            return decodeURIComponent(atob(base64String).split('').map(function(c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));
        } catch (e) {
            console.error('Error decoding Base64 URL:', e);
            return null;
        }
    }

    // Event listener for button click
    button.addEventListener('click', function() {
        // Collect all links from post content, ignoring signatures
        let links = [];
        document.querySelectorAll('.message-userContent').forEach(content => {
            // Exclude any links that are within the .message-signature section
            const signature = content.closest('.message-main').querySelector('.message-signature');
            const postLinks = Array.from(content.querySelectorAll('a[href]')).filter(link => {
                return !(signature && signature.contains(link)); // Exclude links in the signature
            });

            postLinks.forEach(link => {
                let href = link.href;

                // Check if the link contains a redirect confirmation
                if (href && href.includes('goto/link-confirmation?url=')) {
                    // Extract and decode the actual URL from the Base64-encoded parameter
                    const encodedUrl = new URL(href).searchParams.get('url');
                    const decodedUrl = decodeBase64Url(encodedUrl);

                    if (decodedUrl) {
                        href = decodedUrl; // Use the decoded URL
                    }
                }

                // Exclude unwanted links (e.g., user profiles, thread links, etc.)
                if (href &&
                    href.includes('http') && // Ensure it's a full URL
                    !href.includes('thread') && // Ignore post/thread links
                    !href.includes('member') && // Ignore member/profile links
                    !href.includes('comments') && // Ignore comment links
                    !href.includes('posts') && // Ignore post links
                    !href.includes('energizeio.com') && // Ignore specific domains
                    !href.includes('theporndude.com') &&
                    !href.includes('simpcity.su')) {

                    links.push(href); // Add valid links to the list
                }
            });
        });

        // Check if any links are found
        if (links.length === 0) {
            alert('No relevant links found!');
            return;
        }

        // Get the current URL and extract the base name after 'threads/'
        const currentURL = window.location.href;
        const baseNameMatch = currentURL.match(/threads\/([^\/]+)/); // Capture anything after 'threads/'
        const fileName = baseNameMatch ? baseNameMatch[1] : 'extracted_links'; // Default name if not found

        // Convert links array to string with line breaks
        links.unshift(`=== $|{fileName}`)
        links.push("===")
        let linksText = links.join("\n");

        // Create a Blob with the links
        let blob = new Blob([linksText], { type: 'text/plain' });

        // Create a temporary link to trigger the download
        let tempLink = document.createElement('a');
        tempLink.href = URL.createObjectURL(blob);
        tempLink.download = `${fileName}.txt`; // Use extracted base name
        document.body.appendChild(tempLink);
        tempLink.click();
        document.body.removeChild(tempLink);
    });

})();