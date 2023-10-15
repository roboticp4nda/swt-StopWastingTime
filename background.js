const UPDATE_INTERVAL_SECONDS = 1;
let timer = null;
let activeRules;
let activeTabId;
let intervalLastFireDate;


/* When extension icon is clicked */
browser.action.onClicked.addListener(async function(tab) {
    // Request permission for all urls if not given yet
    let hasHostPerms = await browser.permissions.request({
      origins: ['<all_urls>']
    })

    // Open the popup if permission was granted
    if (hasHostPerms) {
        browser.action.setPopup({popup: browser.runtime.getURL('popup.html')})
    }
});

/* When getting an action event via popup.js */
browser.runtime.onMessage.addListener(
    async function(message) {
        switch (message.request) {
            case 'changeTimerVisibility':
                changeActiveTimerVisibility(message.status);
                return true;
            case 'storeTimerPosition':
                storeTimerPosition(message.right, message.top);
                return true;
            case 'recheckTabRules':
                tabHandler();
                return true;
            case 'getActiveRules':
                return activeRules;
            case 'storeRule':
                await storeRule(message.ruleId, message.ruleObject);
                return true;
            default:
                return false;
        }
    }
)

/* When the tab gets updated (e.g. navigation) */
browser.tabs.onUpdated.addListener(
    function(_tabId, changeInfo, tabInfo) {
        // No action if a tab was updated in the background (no focus)
        if (!tabInfo.active) {
            return;
        }
        // Ignore anchors - they don't navigate us away from the site
        if (changeInfo.url && !changeInfo.title && !changeInfo.url.includes('#')) {
            tabHandler();
        }
    }
)

/* When a new tab gets focus */
browser.tabs.onActivated.addListener(
    function (activeInfo) {
        if (activeInfo.previousTabId) {
            stopTimer();
            updateUI(null, 'delete', activeInfo.previousTabId);
        }
        tabHandler();
    }
)

/* When a new window gets focus */
browser.windows.onFocusChanged.addListener(
    function(windowId) {
        // No action if focus is lost for a non-browser window
        if (windowId > 0) {
            // Remove the timer from non-focused window(s)
            browser.tabs.query({currentWindow: false, active: true})
            .then((tabs) => {
                for (let tab of tabs) {
                    updateUI(null, 'delete', tab.id);
                }
            })

            tabHandler();
        }
    }
)

/* Stops the timer if a window is closed, or if the active tab is closed
 * Does not stop if a non-focused tab is closed from the background
 */
browser.tabs.onRemoved.addListener(
    function(tabId, removeInfo) {
        if (removeInfo.isWindowClosing) {
            stopTimer();
        }
        else {
            try {
                browser.tabs.query({currentWindow: true, active: true})
                .then((tabs) => {
                    if (tabs[0].id == tabId) {
                        stopTimer();
                    }
                })
            } catch (e) {
                console.log(e);
                return e;
            }
        }
    }
)

/* Main flow for new and updated tabs */
function tabHandler() {
    browser.tabs.query({currentWindow: true, active: true})
        .then(async function(tabs) {
            let rules = await getRulesByUrl(tabs[0].url);
            activeTabId = tabs[0].id;

            // No rule for this website, no action needed
            if (!rules || rules.length < 1) {
                activeRules = null;

                // In case rule is deleted/deactivated while we're blocked
                removeBlockingOverlay();
                return;
            }
            
            activeRules = rules;

            // Inject our CSS into the currently active tab
            browser.scripting.insertCSS({
                files: ['swt.css'],
                target: {tabId: activeTabId}
            });

            // Highest priority is at index 0
            if (rules[0].timeLeft > 0) {
                removeBlockingOverlay();
                startTimer();
            }
            else {
                createBlockingOverlay();
            }

            // Inject content JS - this only fires once, so we need to constantly update our timerDiv on subsequent tab updates
            await browser.scripting.executeScript({
                files: ['content.js'],
                target: {tabId: activeTabId}
            });

            browser.scripting.executeScript({
                func: () => {
                    let timerDiv = document.getElementById('swt-timer')
                    addDragEventListeners(timerDiv);
                    removeDefaultContextMenu(timerDiv);
                },
                target: {tabId: activeTabId}
            });
        });
}

/* Starts the timer/sets up the interval for the specified rules */
function startTimer() {
    if (timer) {
        stopTimer();
    }
    updateUI(formatTime(activeRules[0].timeLeft), 'create');
    intervalLastFireDate = new Date();
    timer = setInterval(intervalSync, UPDATE_INTERVAL_SECONDS * 100);
}

/* Stops the timer and clears the interval */
function stopTimer() {
    if (timer) {
        clearInterval(timer);
        timer = null;
    }
}

/* Checks if UPDATE_INTERVAL_SECONDS has elapsed since last iteration/update, then calls the main interval function
 * This way we make sure that on average, it takes 1 second to count down 1 second
 * Otherwise, there would be cumulating delays (1000ms setInterval would be 1000ms pause + 20ms+ runtime)
 */
function intervalSync() {
    let date = new Date();
    let diff = date - intervalLastFireDate;
    if (diff >= UPDATE_INTERVAL_SECONDS * 1000) {
        intervalLastFireDate.setSeconds(intervalLastFireDate.getSeconds() + (Math.floor(diff / 1000)));
        countdownTimer();
    }
}

/* Main interval function, called by intervalSync every UPDATE_INTERVAL_SECONDS */
async function countdownTimer() {
    /* If all rules are deleted while we're on an affected website, remove timer/overlay */
    if (!activeRules) {
        updateUI(null, 'delete', activeTabId);
        stopTimer();
        return;
    }
    // Update all active timers in storage
    for (let activeRule of activeRules) {
        if (activeRule.timeLeft > 0) {
            let rule = await browser.storage.local.get(activeRule.id.toString());
            activeRule.timeLeft -= 1;
            rule[activeRule.id].timeLeftSeconds -= 1;
            storeRule(activeRule.id, rule[activeRule.id]);
        }
    }

    // Update the main active timer
    updateUI(formatTime(activeRules[0].timeLeft), 'update');

    // Time has run out - create blocking overlay, stop timer
    if (activeRules[0].timeLeft <= 0) {
        createBlockingOverlay();
        updateUI(null, 'delete', activeTabId);
        stopTimer();
        return;
    }
}


/* Updates the timer UI with the current time left */
function updateUI(timeLeftFormatted, action, previousTabId) {
    function createOrUpdateTimerUI(timeLeftFormatted) {
        const DEFAULT_TIMER_OPACITY = 0.4;

        // Create timer UI
        if (!document.getElementById('swt-timer')) {
            const timerDiv = document.createElement('div');
            timerDiv.id = 'swt-timer';
            timerDiv.innerHTML = timeLeftFormatted;
            timerDiv.onselectstart = () => {return false};
            document.body.appendChild(timerDiv);

            // Sets position to the saved location if the user has previously moved it
            browser.storage.local.get('timerPosition')
            .then((response) => {
                // Make sure that the object is not out of bounds on the new webpage //
                function checkValidPosition(response) {
                    response = response['timerPosition'];
                    // We also extract <num>px from storage into an integer
                    timerDiv.style.right = Math.min(
                        Math.min(Math.min(document.body.clientWidth, window.innerWidth) - timerDiv.clientWidth),
                        Math.max(0, parseInt(response.right.match(/\d+/)[0]))
                    ) + 'px';
    
                    timerDiv.style.top = Math.min(
                        Math.min(Math.min(document.body.clientHeight, window.innerHeight) - timerDiv.clientHeight),
                        Math.max(0, parseInt(response.top.match(/\d+/)[0]))
                    ) + 'px';

                    // If the timer has moved due to resize/force move, save the new position
                    // Disabled for now
                    /*if (timerDiv.style.right != response.right || timerDiv.style.top != response.top) {
                        browser.runtime.sendMessage({request: 'storeTimerPosition', 'right': timerDiv.style.right, 'top': timerDiv.style.top});
                    }*/
                }

                if (!isEmptyObj(response)) {
                    checkValidPosition(response);
                }

                // Also check position each time the window gets resized
                window.addEventListener('resize', async function() {
                    let response = await browser.storage.local.get('timerPosition');
                    if (!isEmptyObj(response)) {
                        checkValidPosition(response);
                    }
                });
            })

            // Sets opacity to saved setting
            browser.storage.local.get('opacity')
            .then((response) => {
                let opacity = DEFAULT_TIMER_OPACITY;
                if (!isEmptyObj(response)) {
                    opacity = response['opacity'];
                }
                timerDiv.style.opacity = opacity;
            })

            // Unhides timer based on setting
            .then(() => {
                browser.storage.local.get('timerVisible').then(
                    (response) => {
                        let visibility = true;
                        if (!isEmptyObj(response)) {
                            visibility = response['timerVisible'];
                        }
                        if (visibility) {
                            timerDiv.style.visibility = 'visible';
                        }
                })
            })
        }

        // Update already existing timer UI with new value
        else {
            document.getElementById('swt-timer').innerHTML = timeLeftFormatted;
        }

        function isEmptyObj(obj) {
            return Object.keys(obj).length === 0 && obj.constructor === Object;
        }
    }

    function deleteTimerUI() {
        const timerDiv = document.getElementById('swt-timer')
        if (timerDiv) {
            timerDiv.remove();
            document.getElementById('swt-custom-context-menu').remove();
        }
    }

    let call;
    let tabId = activeTabId;
    switch (action) {
        case 'create':
        case 'update':
            call = createOrUpdateTimerUI;
            break;
        case 'delete':
            call = deleteTimerUI;
            tabId = previousTabId;
            break;
        default:
            return;
    }

    browser.scripting.executeScript({
        args: [timeLeftFormatted],
        func: call,
        target: {tabId: tabId}
    });
}

/* Formats seconds to mm:ss format */
function formatTime(seconds) {
    if (seconds) {
        let minutes = Math.floor(seconds / 60);
        seconds = seconds % 60;
        return (
            (minutes < 10 ? '0' + minutes : minutes) + ':' +
            (seconds < 10 ? '0' + seconds : seconds)
        );
    }
    else {
        return '00:00';
    }

}

/* Injects the blocking overlay into the webpage's html if time has run out */
function createBlockingOverlay() {
    browser.scripting.executeScript({
        func: () => {
            if (!document.getElementById('swt-blocking-overlay')) {
                const blockingOverlayDiv = document.createElement('div');
                blockingOverlayDiv.id = 'swt-blocking-overlay';
                blockingOverlayDiv.innerHTML = '<div class="swt-blocking-overlay-text">You have exceeded your daily allocated time for this website.<br />Time to be productive!</div>';
                document.body.appendChild(blockingOverlayDiv);
            }
            document.body.classList.add('swt-blocking-hide-overflow');
        },
        target: {tabId: activeTabId}
    });
}

/* Removes the blocking overlay from the webpage's html */
function removeBlockingOverlay() {
    browser.scripting.executeScript({
        func: () => {
            if (document.getElementById('swt-blocking-overlay')) {
                document.getElementById('swt-blocking-overlay').remove();
            }
            document.body.classList.remove('swt-blocking-hide-overflow');
        },
        target: {tabId: activeTabId}
    });
}

/* Gets the matching rule IDs and times left from local storage based on the active URL */
async function getRulesByUrl(url) {
    if (!url) {
        return null;
    }
    /* Iterate through an array to see if any of them match the url */
    function hasMatch(array, url) {
        for (let s of array) {
            if (url.includes(s)) {
                return true;
            }
        }
        return false;
    }

    let matchedRules = [];
    let rules = await browser.storage.local.get();

    if (isEmptyObj(rules)) {
        return null;
    }
    
    for (let rule in rules) {
        if (isNaN(rule)) {
            continue;
        }

        // Reset the rule's time left if it passes midnight
        rules[rule] = resetRule(rules[rule]);

        // Skip rule if currently not enabled
        if (!rules[rule].isEnabled) {
            continue;
        }

        let blockList = rules[rule].blockList;
        let exceptList = rules[rule].exceptList;

        // If any strings in the exception list matches, we ignore this rule
        if (exceptList.length > 0 && hasMatch(exceptList, url)) {
            continue;
        }

        // Add any matches to the return array
        if (blockList.length > 0 && hasMatch(blockList, url)) {
            matchedRules.push({
                'id': rules[rule].id,
                'timeLeft': rules[rule].timeLeftSeconds,
                'priority': rules[rule].priority
            });
        }
    }

    // Sort by priority, as we need to reference the highest priority one at index 0
    matchedRules.sort((a, b) => a.priority - b.priority);
    return matchedRules;
}

/* Stores the passed <rule> object in storage, with key <id> */
async function storeRule(id, rule) {
    storageObj = {};
    storageObj[id] = rule;
    await browser.storage.local.set(storageObj);
}

/* Checks if an object is empty, localStorage returns such if the key in .get(key) is not found
 * https://stackoverflow.com/a/68636342 */
function isEmptyObj(obj) {
    return Object.keys(obj).length === 0 && obj.constructor === Object;
}

/* Resets the rule's allocated time if it's a new day */
function resetRule(rule) {
    let lastReset = rule.lastReset;
    let today = new Date().setHours(0,0,0,0);
    
    if (today - lastReset > 0) {
        rule.timeLeftSeconds = rule.timeAllocatedMinutes * 60;
        rule.lastReset = today;
        storeRule(rule.id, rule);
    }

    return rule;
}

/* Stores the position of the timer if the user has moved it */
async function storeTimerPosition(right, top) {
    await browser.storage.local.set({'timerPosition': {'right': right, 'top': top}})
}

async function changeActiveTimerVisibility(visibility) {
    if (visibility === 'visible') {
        await browser.storage.local.set({'timerVisible': true});
    }
    else {
        visibility = 'hidden';
        await browser.storage.local.set({'timerVisible': false});
    }
    
    browser.scripting.executeScript({
        func: (visibility) => {
            let timerDiv = document.getElementById('swt-timer');
            timerDiv.style.visibility = visibility;
        },
        args: [visibility],
        target: {tabId: activeTabId}
    });
}