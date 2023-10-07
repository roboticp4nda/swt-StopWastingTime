const UPDATE_INTERVAL_SECONDS = 1;
let timer;
let timeLeft;
let activeTabId;

/* When getting an action event via popup.js */
browser.runtime.onMessage.addListener(
    function(request) {
        switch (request.command) {
            case 'startTimer':
                startTimer(request.seconds, request.ruleId);
                break;
            case 'stopTimer':
                stopTimer();
                break;
            default:
        }
    }
)


/* When the tab changes (new URL or new tab) */
browser.tabs.onUpdated.addListener(
    function(tabId, _changeInfo, tabInfo) {
        activeTabId = tabId;
        if (tabInfo.status === 'complete') {
            startTimer(10, 1337)
            browser.scripting.insertCSS({
                files: ['swt.css'],
                target: {tabId: activeTabId}
            })
            updateUI(activeTabId);
        }
    }
)

function startTimer(seconds, ruleId) {
    if (timer) {
        stopTimer();
    }
    
    timer = setTimeout(countdownTimer, UPDATE_INTERVAL_SECONDS * 1000, seconds, ruleId);

}

function stopTimer() {
    if (timer) {
        clearTimeout(timer);
    }
}

function countdownTimer(seconds, ruleId) {
    // Time has run out - create blocking overlay, stop timer
    if (seconds <= 0) {
        stopTimer();
        return;
    }
    let newSeconds = seconds - 1;
    console.log(seconds);
    timeLeft = seconds;
    updateUI();
    timer = setTimeout(countdownTimer, UPDATE_INTERVAL_SECONDS * 1000, newSeconds, ruleId);
}


/* Update the timer UI with the current time left */
function updateUI() {
    /**
     * We first define functions via the external script file, then call the external update function afterwards
     * This way we can pass arguments via executeScript() if the script is in an external script file (can't pass 'args' and 'files' at the same time)
     * Reference: https://stackoverflow.com/a/73586624
     */
    browser.scripting.executeScript({
        target: {tabId: activeTabId}, files: ['content.js']
    }, () => {browser.scripting.executeScript({
                args: [timeLeft],
                func: (...args) => updateTimerUI(...args),
                target: {tabId: activeTabId}
            })
        }
    )
}