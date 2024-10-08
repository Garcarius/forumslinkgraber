// ==UserScript==
// @name         Extract All Posted Links 
// @namespace    http://tampermonkey.net/
// @version      2.3
// @updateURL    https://github.com/Garcarius/forumslinkgraber/raw/main/extract_links_v1.js
// @downloadURL  https://github.com/Garcarius/forumslinkgraber/raw/main/extract_links_v1.js
// @description  Adds a button to extract all posted links (ignoring unwanted ones) and handles redirects. Now includes options to download or copy links to clipboard, with enhanced UI and local storage support to avoid duplicates. Added persistence for user settings.
// @author       Garcarius, neolith , NTFSvolume
// @match        https://simpcity.su/threads/*
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // Define a namespace for localStorage keys to avoid collisions
    const STORAGE_KEYS = {
        ACTION: 'extractAllLinksV2_action',
        IGNORE_HISTORY: 'extractAllLinksV2_ignoreHistory',
        SEPARATOR: 'extractAllLinksV2_separator',
        LINKS: 'extractedLinks'
    };

    // Helper function to get a value from localStorage
    function getStoredValue(key, defaultValue) {
        const stored = localStorage.getItem(key);
        return stored !== null ? JSON.parse(stored) : defaultValue;
    }

    // Helper function to set a value in localStorage
    function setStoredValue(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    // Create a container for the button and options
    let container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.top = '10px';
    container.style.right = '10px';
    container.style.zIndex = 1000;
    container.style.padding = '15px';
    container.style.backgroundColor = 'rgba(64, 181, 200, 0.95)';
    container.style.borderRadius = '8px';
    container.style.boxShadow = '0 0 15px rgba(0,0,0,0.5)';
    container.style.color = 'white';
    container.style.fontFamily = 'Arial, sans-serif';
    container.style.fontSize = '14px';
    container.style.width = '300px'; // Increased width from 250px to 300px

    // Create the Extract Links button
    let button = document.createElement('button');
    button.innerHTML = 'Extract Links';
    button.style.padding = '10px 15px';
    button.style.backgroundColor = '#40b5c8';
    button.style.color = 'white';
    button.style.border = 'none';
    button.style.borderRadius = '5px';
    button.style.cursor = 'pointer';
    button.style.marginBottom = '15px';
    button.style.width = '100%';
    button.style.fontSize = '16px';
    button.style.boxShadow = '0 2px 5px rgba(0,0,0,0.3)';
    button.style.transition = 'background-color 0.3s ease';

    // Button hover effect
    button.addEventListener('mouseover', () => {
        button.style.backgroundColor = '#2a9aa3';
    });
    button.addEventListener('mouseout', () => {
        button.style.backgroundColor = '#40b5c8';
    });

    // Create the option container
    let optionsContainer = document.createElement('div');
    optionsContainer.style.display = 'flex';
    optionsContainer.style.flexDirection = 'column';
    optionsContainer.style.gap = '10px';

    // Function to create individual option rows
    function createOptionRow(content) {
        let row = document.createElement('div');
        row.style.display = 'flex';
        row.style.alignItems = 'center';
        row.style.gap = '10px'; // Increased gap for better spacing
        return row;
    }

    // Create the radio buttons for action selection
    let actionRow = createOptionRow();

    let downloadOption = document.createElement('input');
    downloadOption.type = 'radio';
    downloadOption.id = 'action-download';
    downloadOption.name = 'extract-action';
    downloadOption.value = 'download';

    let downloadLabel = document.createElement('label');
    downloadLabel.htmlFor = 'action-download';
    downloadLabel.textContent = 'Download as file';
    downloadLabel.style.cursor = 'pointer';
    downloadLabel.style.whiteSpace = 'nowrap'; // Prevent label from wrapping

    let copyOption = document.createElement('input');
    copyOption.type = 'radio';
    copyOption.id = 'action-copy';
    copyOption.name = 'extract-action';
    copyOption.value = 'copy';

    let copyLabel = document.createElement('label');
    copyLabel.htmlFor = 'action-copy';
    copyLabel.textContent = 'Copy to clipboard';
    copyLabel.style.cursor = 'pointer';
    copyLabel.style.whiteSpace = 'nowrap'; // Prevent label from wrapping

    // Append radio buttons and labels to the action row
    actionRow.appendChild(downloadOption);
    actionRow.appendChild(downloadLabel);
    actionRow.appendChild(copyOption);
    actionRow.appendChild(copyLabel);

    // Create the Ignore History option
    let ignoreHistoryRow = createOptionRow();

    let ignoreHistoryCheckbox = document.createElement('input');
    ignoreHistoryCheckbox.type = 'checkbox';
    ignoreHistoryCheckbox.id = 'ignore-history';
    ignoreHistoryCheckbox.name = 'ignore-history';

    let ignoreHistoryLabel = document.createElement('label');
    ignoreHistoryLabel.htmlFor = 'ignore-history';
    ignoreHistoryLabel.textContent = 'Ignore History';
    ignoreHistoryLabel.style.cursor = 'pointer';
    ignoreHistoryLabel.style.whiteSpace = 'nowrap'; // Prevent label from wrapping

    // Append checkbox and label to the ignore history row
    ignoreHistoryRow.appendChild(ignoreHistoryCheckbox);
    ignoreHistoryRow.appendChild(ignoreHistoryLabel);

    // Create the separator selection
    let separatorRow = createOptionRow();
    separatorRow.style.display = 'none'; // Hidden by default

    let separatorLabel = document.createElement('label');
    separatorLabel.textContent = 'Separator:';
    separatorLabel.style.flex = '0 0 auto';
    separatorLabel.style.whiteSpace = 'nowrap'; // Prevent label from wrapping

    let separatorSelect = document.createElement('select');
    separatorSelect.id = 'separator-select';
    separatorSelect.style.flex = '1';

    let optionSpace = document.createElement('option');
    optionSpace.value = ' ';
    optionSpace.textContent = 'Space';

    let optionNewline = document.createElement('option');
    optionNewline.value = '\n';
    optionNewline.textContent = 'New Line';

    separatorSelect.appendChild(optionSpace);
    separatorSelect.appendChild(optionNewline);

    // Append label and select to the separator row
    separatorRow.appendChild(separatorLabel);
    separatorRow.appendChild(separatorSelect);

    // Assemble the options container
    optionsContainer.appendChild(actionRow);
    optionsContainer.appendChild(ignoreHistoryRow);
    optionsContainer.appendChild(separatorRow);

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
        toast.style.fontSize = '14px';
        toast.style.maxWidth = '300px';

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

    // Function to get stored URLs from localStorage
    function getStoredUrls() {
        let stored = localStorage.getItem(STORAGE_KEYS.LINKS);
        return stored ? JSON.parse(stored) : [];
    }

    // Function to save URLs to localStorage
    function saveStoredUrls(urls) {
        localStorage.setItem(STORAGE_KEYS.LINKS, JSON.stringify(urls));
    }

    // Function to load user settings from localStorage
    function loadSettings() {
        // Load Action Selection
        const storedAction = getStoredValue(STORAGE_KEYS.ACTION, 'download');
        if (storedAction === 'download') {
            downloadOption.checked = true;
            separatorRow.style.display = 'none';
        } else if (storedAction === 'copy') {
            copyOption.checked = true;
            separatorRow.style.display = 'flex';
        }

        // Load Ignore History
        const storedIgnoreHistory = getStoredValue(STORAGE_KEYS.IGNORE_HISTORY, false);
        ignoreHistoryCheckbox.checked = storedIgnoreHistory;

        // Load Separator
        const storedSeparator = getStoredValue(STORAGE_KEYS.SEPARATOR, '\n');
        if (storedSeparator === ' ') {
            separatorSelect.value = ' ';
        } else {
            separatorSelect.value = '\n';
        }
    }

    // Function to save user settings to localStorage
    function saveSettings() {
        // Save Action Selection
        const selectedAction = document.querySelector('input[name="extract-action"]:checked').value;
        setStoredValue(STORAGE_KEYS.ACTION, selectedAction);

        // Save Ignore History
        const ignoreHistory = ignoreHistoryCheckbox.checked;
        setStoredValue(STORAGE_KEYS.IGNORE_HISTORY, ignoreHistory);

        // Save Separator
        const separator = separatorSelect.value;
        setStoredValue(STORAGE_KEYS.SEPARATOR, separator);
    }

    // Load settings on script initialization
    loadSettings();

    // Event listener to toggle separator selection visibility and save action selection
    document.querySelectorAll('input[name="extract-action"]').forEach(radio => {
        radio.addEventListener('change', function() {
            if (copyOption.checked) {
                separatorRow.style.display = 'flex';
            } else {
                separatorRow.style.display = 'none';
            }
            saveSettings(); // Save the selected action
        });
    });

    // Event listener for Ignore History checkbox change
    ignoreHistoryCheckbox.addEventListener('change', function() {
        saveSettings(); // Save the ignore history preference
    });

    // Event listener for separator selection change
    separatorSelect.addEventListener('change', function() {
        saveSettings(); // Save the selected separator
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
                !href.includes('x.com') &&
                !href.includes('adtng') &&
                !href.includes('chaturbate') &&
                !href.includes('fansly.com') &&
                !href.includes('privacy.com.br') &&
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

        // Determine if history should be used
        let ignoreHistory = ignoreHistoryCheckbox.checked;
        let useStorage = !ignoreHistory;
        let storedUrls = useStorage ? getStoredUrls() : [];

        // Filter out already stored URLs if storage is enabled
        if (useStorage) {
            links = links.filter(link => !storedUrls.includes(link));
        }

        // After filtering, check if any links remain
        if (links.length === 0) {
            if (useStorage) {
                showToast('No new links found!', 4000);
            } else {
                showToast('No links found!', 4000);
            }
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

        // Save the new links to localStorage if enabled
        if (useStorage) {
            let updatedStoredUrls = storedUrls.concat(links);
            saveStoredUrls(updatedStoredUrls);
        }
    });

})();
