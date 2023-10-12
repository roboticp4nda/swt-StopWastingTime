const UPDATE_INTERVAL_SECONDS = 1;
let timer = null;
let activeRules;
let activeTabId;
let intervalLastFireDate;

/* When getting an action event via popup.js */
browser.runtime.onMessage.addListener(
    function(message, _sender, sendResponse) {
        switch (message.request) {
            case 'startTimer':
                startTimer(message.seconds, message.ruleId);
                break;
            case 'stopTimer':
                stopTimer();
                break;
            case 'getActiveRules':
                sendResponse({activeRules: activeRules});
                break;
            case 'storeRule':
                storeRule(message.ruleId, message.ruleObject);
                break;
            default:
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
            browser.tabs.query({currentWindow: true, active: true})
            .then((tabs) => {
                if (tabs[0].id == tabId) {
                    stopTimer();
                }
            })
        }
    }
)

/* Main flow for new and updated tabs */
function tabHandler() {
    browser.tabs.query({currentWindow: true, active: true})
        .then(async function(tabs) {
            let rules = await getRulesByUrl(tabs[0].url);

            // No rule for this website, no action needed
            if (!rules || rules.length < 1) {
                return;
            }

            activeTabId = tabs[0].id;
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
        })
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
        stopTimer();
        return;
    }
}


/* Updates the timer UI with the current time left */
function updateUI(timeLeftFormatted, action, previousTabId) {
    function createOrUpdateTimerUI(timeLeftFormatted) {
        if (!document.getElementById('swt-timer')) {
            const timerDiv = document.createElement('div');
            timerDiv.id = 'swt-timer';
            timerDiv.innerHTML = timeLeftFormatted;
            document.body.appendChild(timerDiv);
        }
        else {
            document.getElementById('swt-timer').innerHTML = timeLeftFormatted;
        }
    }

    function deleteTimerUI() {
        const timerDiv = document.getElementById('swt-timer')
        if (timerDiv) {
            document.getElementById('swt-timer').remove();
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
        let blockList = rules[rule].blockList;
        let exceptList = rules[rule].exceptList;

        // If any strings in the exception list matches, we ignore this rule
        if (exceptList.length > 0 && hasMatch(exceptList, url)) {
            continue;
        }

        // Add any matches to the return array
        if (blockList.length > 0 && hasMatch(blockList, url)) {
            matchedRules.push({
                "id": rules[rule].id,
                "timeLeft": rules[rule].timeLeftSeconds,
                "priority": rules[rule].priority
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