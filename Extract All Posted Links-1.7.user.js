// ==UserScript==
// @name         Extract All Posted Links v1.9
// @namespace    http://tampermonkey.net/
// @version      1.9
// @updateURL    https://github.com/Garcarius/forumslinkgraber/raw/main/Extract%20All%20Posted%20Links-1.9.user.js
// @downloadURL  https://github.com/Garcarius/forumslinkgraber/raw/main/Extract%20All%20Posted%20Links-1.9.user.js
// @description  Adds a button to extract all posted links (ignoring unwanted ones) and handles redirects. Now includes options to download or copy links to clipboard, with enhanced UI.
// @author       Garcarius
// @match        https://simpcity.su/threads/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Create a container for the button and options
    let container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '10px';
    container.style.right = '10px';
    container.style.zIndex = 1000;
    container.style.padding = '10px';
    container.style.backgroundColor = 'rgba(64, 181, 200, 0.95)';
    container.style.borderRadius = '8px';
    container.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
    container.style.color = 'white';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.fontSize = '14px';

    // Create the Extract Links button
    let button = document.createElement('button');
    button.innerHTML = 'Extract Links';
    button.style.padding = '8px 12px';
    button.style.backgroundColor = '#40b5c8';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';
    button.style.marginBottom = '10px';
    button.style.width = '100%';
    button.style.fontSize = '16px';

    // Create the option container
    let optionsContainer = document.createElement('div');
    optionsContainer.style.marginTop = '10px';

    // Create the radio buttons for action selection
    let downloadOption = document.createElement('input');
    downloadOption.type = 'radio';
    downloadOption.id = 'action-download';
    downloadOption.name = 'extract-action';
    downloadOption.value = 'download';
    downloadOption.checked = true;

    let downloadLabel = document.createElement('label');
    downloadLabel.htmlFor = 'action-download';
    downloadLabel.textContent = ' Download as file';

    let copyOption = document.createElement('input');
    copyOption.type = 'radio';
    copyOption.id = 'action-copy';
    copyOption.name = 'extract-action';
    copyOption.value = 'copy';
    copyOption.style.marginLeft = '10px';

    let copyLabel = document.createElement('label');
    copyLabel.htmlFor = 'action-copy';
    copyLabel.textContent = ' Copy to clipboard';

    // Create the separator selection
    let separatorContainer = document.createElement('div');
    separatorContainer.style.marginTop = '10px';
    separatorContainer.style.display = 'none'; // Hidden by default

    let separatorLabel = document.createElement('label');
    separatorLabel.textContent = ' Separator: ';
    separatorLabel.style.marginRight = '5px';

    let separatorSelect = document.createElement('select');
    separatorSelect.id = 'separator-select';
    separatorSelect.style.marginLeft = '5px';

    let optionSpace = document.createElement('option');
    optionSpace.value = ' ';
    optionSpace.textContent = 'Space';

    let optionNewline = document.createElement('option');
    optionNewline.value = '\n';
    optionNewline.textContent = 'New Line';

    separatorSelect.appendChild(optionSpace);
    separatorSelect.appendChild(optionNewline);

    // Assemble the separator container
    separatorContainer.appendChild(separatorLabel);
    separatorContainer.appendChild(separatorSelect);

    // Assemble the options
    optionsContainer.appendChild(downloadOption);
    optionsContainer.appendChild(downloadLabel);
    optionsContainer.appendChild(copyOption);
    optionsContainer.appendChild(copyLabel);
    optionsContainer.appendChild(separatorContainer);

    // Append button and options to the container
    container.appendChild(button);
    container.appendChild(optionsContainer);

    // Append container to the body
    document.body.appendChild(container);

    // Create the toast notification container
    let toastContainer = document.createElement('div');
    toastContainer.id = 'toast-container';
    toastContainer.style.position = 'fixed';
    toastContainer.style.bottom = '20px';
    toastContainer.style.right = '20px';
    toastContainer.style.zIndex = 1001;
    toastContainer.style.display = 'flex';
    toastContainer.style.flexDirection = 'column';
    toastContainer.style.gap = '10px';
    document.body.appendChild(toastContainer);

    // Function to show toast notifications
    function showToast(message, duration = 3000) {
        let toast = document.createElement('div');
        toast.textContent = message;
        toast.style.backgroundColor = 'rgba(0,0,0,0.8)';
        toast.style.color = 'white';
        toast.style.padding = '10px 20px';
        toast.style.borderRadius = '5px';
        toast.style.boxShadow = '0 0 10px rgba(0,0,0,0.5)';
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.5s ease';

        toastContainer.appendChild(toast);

        // Trigger reflow to enable transition
        void toast.offsetWidth;
        toast.style.opacity = '1';

        // Remove the toast after the specified duration
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.addEventListener('transitionend', () => {
                toast.remove();
            });
        }, duration);
    }

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

    // Function to copy text to clipboard
    function copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(function() {
            showToast('Links copied to clipboard!');
        }, function(err) {
            console.error('Could not copy text: ', err);
            showToast('Failed to copy links to clipboard.', 5000);
        });
    }

    // Event listener to toggle separator selection visibility
    document.querySelectorAll('input[name="extract-action"]').forEach(radio => {
        radio.addEventListener('change', function() {
            if (copyOption.checked) {
                separatorContainer.style.display = 'block';
            } else {
                separatorContainer.style.display = 'none';
            }
        });
    });

    // Event listener for button click
    button.addEventListener('click', function() {
        // Collect all links, including those in embedded videos
        let links = [];
        document.querySelectorAll('a[href], iframe[src]').forEach(link => {
            let href = link.href || link.src;  // Use 'href' for <a> and 'src' for <iframe>

            // Check if the link contains a redirect confirmation
            if (href && href.includes('goto/link-confirmation?url=')) {
                // Extract and decode the actual URL from the Base64-encoded parameter
                try {
                    const urlObj = new URL(href);
                    const encodedUrl = urlObj.searchParams.get('url');
                    const decodedUrl = decodeBase64Url(encodedUrl);
                    if (decodedUrl) {
                        href = decodedUrl; // Use the decoded URL
                    }
                } catch (e) {
                    console.error('Invalid URL format:', href);
                }
            }

            // Exclude unwanted links (badges, reactions, comments, posts, etc.)
            if (href &&
                href.includes('http') &&  // Ensure it's a full URL
                !link.closest('.badge') &&   // Ignore badges
                !link.closest('.reaction') && // Ignore reactions
                !link.closest('.bookmark') && // Ignore bookmarks
                !link.closest('.comment') &&  // Ignore comments
                !href.includes('thread') &&   // Ignore post/thread links
                !href.includes('member') &&   // Ignore member/profile links
                !href.includes('comments') &&  // Ignore comment links
                !href.includes('posts') &&    // Ignore post links
                !href.includes('energizeio.com') &&    // Ignore specific unwanted domains
                !href.includes('theporndude.com') &&
                !href.includes('onlyfans.com') &&
                !href.includes('instagram.com') &&
                !href.includes('reddit.com') &&
                !href.includes('tiktok.com') &&
                !href.includes('youtube.com') &&
                !href.includes('simpcity.su')) {  // Ignore links containing 'simpcity.su'

                links.push(href);  // Add valid links to the list
            }
        });

        // Check if any links are found
        if (links.length === 0) {
            showToast('No relevant links found!', 4000);
            return;
        }

        // Determine the selected action
        let selectedAction = document.querySelector('input[name="extract-action"]:checked').value;
        let separator = separatorSelect.value;

        if (selectedAction === 'copy') {
            // Convert links array to string with chosen separator
            let linksText = links.join(separator);
            // Copy to clipboard
            copyToClipboard(linksText);
        } else {
            // Get the current URL and extract the base name after 'threads/'
            const currentURL = window.location.href;
            const baseNameMatch = currentURL.match(/threads\/([^\/]+)/); // Capture anything after 'threads/'
            const fileName = baseNameMatch ? baseNameMatch[1] : 'extracted_links';  // Default name if not found

            // Convert links array to string with line breaks
            let linksText = links.join("\n");

            // Create a Blob with the links
            let blob = new Blob([linksText], { type: 'text/plain' });

            // Create a temporary link to trigger the download
            let tempLink = document.createElement('a');
            tempLink.href = URL.createObjectURL(blob);
            tempLink.download = `${fileName}.txt`;  // Use extracted base name
            document.body.appendChild(tempLink);
            tempLink.click();
            document.body.removeChild(tempLink);

            showToast('Links downloaded as file!');
        }
    });

})();
