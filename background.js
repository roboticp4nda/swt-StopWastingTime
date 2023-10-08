const UPDATE_INTERVAL_SECONDS = 1;
let timer;
let timeLeftSeconds;
let activeTabId;
let intervalLastFireDate;

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
            startTimer(4, 1337)
            browser.scripting.insertCSS({
                files: ['swt.css'],
                target: {tabId: activeTabId}
            })
        }
    }
)

function startTimer(seconds, ruleId) {
    if (timer) {
        stopTimer();
    }
    timeLeftSeconds = seconds;
    updateUI(formatTime(timeLeftSeconds));
    intervalLastFireDate = new Date();
    timer = setInterval(intervalSync, UPDATE_INTERVAL_SECONDS * 100, ruleId);
}

function stopTimer() {
    if (timer) {
        clearInterval(timer);
    }
}

/* Checks if UPDATE_INTERVAL_SECONDS has elapsed since last iteration/update, then calls the main interval function
 * This way we make sure that on average, it takes 1 second to count down 1 second
 * Otherwise, there would be cumulating delays (1000ms setInterval would be 1000ms pause + 20ms+ runtime)
 */
function intervalSync(ruleId) {
    let date = new Date();
    let diff = date - intervalLastFireDate;
    if (diff >= UPDATE_INTERVAL_SECONDS * 1000) {
        intervalLastFireDate.setSeconds(intervalLastFireDate.getSeconds() + (Math.floor(diff / 1000)));
        countdownTimer(ruleId);
    }
}

/* Main interval function, called by intervalSync every UPDATE_INTERVAL_SECONDS */
function countdownTimer(ruleId) {
    // Time has run out - create blocking overlay, stop timer
    if (timeLeftSeconds <= 0) {
        createBlockingOverlay();
        stopTimer();
        return;
    }

    // Decrement timer
    timeLeftSeconds -= 1;

    // Update the timer UI
    updateUI(formatTime(timeLeftSeconds));
}


/* Update the timer UI with the current time left */
function updateUI(timeLeftFormatted) {
    function updateTimerUI(timeLeftFormatted) {
        if (!document.getElementById('swt-timer')) {
            const timerDiv = document.createElement('div');
            timerDiv.id = 'swt-timer';
            timerDiv.innerHTML = 'time: ' + timeLeftFormatted;
            document.body.appendChild(timerDiv);
        }
        else {
            document.getElementById('swt-timer').innerHTML = 'time: ' + timeLeftFormatted;
        }
    }

    browser.scripting.executeScript({
        args: [timeLeftFormatted],
        func: updateTimerUI,
        target: {tabId: activeTabId}
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
                blockingOverlayDiv.innerHTML = '<div class="swt-blocking-overlay-text">Overlay text goes here</div>';
                document.body.appendChild(blockingOverlayDiv);
            }
        },
        target: {tabId: activeTabId}
    });
}

/* Removes the blocking overlay from the webpage's html */
function removeBlockingOverlay() {
    browser.scripting.executeScript({
        func: () => {
            if (document.getElementById('swt-blocking-overlay')) {
                document.body.removeChild(blockingOverlayDiv);
            }
        },
        target: {tabId: activeTabId}
    });
}