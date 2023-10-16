let updateInterval;

/* When the user opens the popup */
document.addEventListener('DOMContentLoaded', function() {
    populateRuleset();
    updateTimeleft();
    timerVisibilityHandler();
})

/* Checks if an object is empty, localStorage returns such if the key in .get(key) is not found
 * https://stackoverflow.com/a/68636342 */
function isEmptyObj(obj) {
    return Object.keys(obj).length === 0 && obj.constructor === Object;
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

/* Populates the list of rules from localStorage */
function populateRuleset() {
    let rulesetDiv = document.getElementById('ruleset-container');
    rulesetDiv.innerHTML = '';
    let rules = [];
    browser.storage.local.get()
    .then(
        (storageItems) => {
            for (let item in storageItems) {
                // Ignore any non-numeric keys such as 'nextId'
                if (!isNaN(item)) {
                    rules.push(storageItems[item]);
                }

                // Update the Show Timer toggle
                else if (item == 'timerVisible') {
                    let timerVisible = storageItems[item];
                    document.getElementById('timer-visibility-switch').checked = timerVisible;
                }
            }
        }
    )
    .then(
        function() {
            rules.sort((a, b) => a.priority - b.priority);
            for (let rule of rules) {
                // If past midnight and the timer hasn't been reset yet, display allocated time instead of time left
                // Timer will only be reset on next activation/refresh
                let timeleft = 
                    new Date().setHours(0,0,0,0) - rule.lastReset > 0 ? 
                    formatTime(rule.timeAllocatedMinutes * 60) : 
                    formatTime(rule.timeLeftSeconds);

                rulesetDiv.innerHTML += '<div class="row row-active row-hover align-items-center border-secondary border-top border-opacity-25" id="swt-rule-' + rule.id + '">' +
                '<div class="col sm fs-3 text-end"><span class="settings-icon increase-priority" role="button">' + (rule.priority > 0 ? '↑' : '') + '</span></div>' +
                '<div class="col sm fs-3 text-start"><span class="settings-icon decrease-priority" role="button">' + (rule.priority < rules.length-1 ? '↓' : '') + '</span></div>' +
                '<div class="col-4 text-truncate"><span title="' + rule.name + '">' + rule.name + '</span></div>' +
                '<div class="col-2 text-center fw-light" id="swt-timeleft-'+ rule.id +'">' + timeleft + '</div>' +
                '<div class="col-4 text-center"><span class="d-inline p-2 settings-icon"><input role="button" class="form-check-input enable-rule" type="checkbox" value=""' + (rule.isEnabled ? ' checked' : '') + '></span>' +
                '<span class="d-inline p-1 settings-icon edit-rule" role="button">' + '⚙' + '</span>' +
                '<span class="d-inline p-1 settings-icon delete-rule" role="button">' + '🗑️' + '</span></div>' +
                '</div>'

                // Format the timeleft column if disabled or depleted
                let timeleftColumn = document.getElementById('swt-timeleft-' + rule.id);
                if (!rule.isEnabled) {
                    timeleftColumn.classList.add('text-decoration-line-through');
                }
                if (rule.timeLeftSeconds < 1) {
                    timeleftColumn.classList.add('rule-depleted');
                }
            }
        }
    )
    .then(() => {
        setActiveRuleClasses();
        createEditListeners();
        createDeleteListeners();
        createPriorityListeners();
        createEnableListeners();
    })
}

/* Sets approriate classes to highlight rules that are currently active */
async function setActiveRuleClasses() {
    let activeRules = await browser.runtime.sendMessage({request: 'getActiveRules'});
    if (activeRules && activeRules.length > 0) {
        for (let i = 0, len = activeRules.length; i < len; i++) {
            let timeleftColumn = document.getElementById('swt-timeleft-' + activeRules[i].id);
            let formatClass = '';
            if (activeRules[i].timeLeft <= 0) {
                formatClass = 'rule-active-depleted';
            }
            else {
                formatClass = 'rule-active';
            }

            // First element in the array is the primary one (highest priority)
            if (i == 0) {
                timeleftColumn.classList.add('text-decoration-underline');
            }

            timeleftColumn.classList.remove('rule-depleted', 'fw-light');
            timeleftColumn.classList.add(formatClass, 'fw-bold');
        }
    }
}

/* While popup is open, keep updating the time left of the active rule */
function updateTimeleft() {
    updateInterval = setInterval(
        async function () {
            let activeRules = await browser.runtime.sendMessage({request: 'getActiveRules'});

            if (activeRules && activeRules.length > 0) {
                for (let rule of activeRules) {
                    let timeleftColumn = document.getElementById('swt-timeleft-' + rule.id);
                    timeleftColumn.innerText = formatTime(rule.timeLeft);

                    // Update visuals if we hit 00:00
                    if (rule.timeLeft <= 0) {
                        timeleftColumn.classList.remove('rule-active')
                        timeleftColumn.classList.add('rule-active-depleted');
                    }
                }
            }
            else {
                updateInterval = clearInterval(updateInterval);
            }
        }, 1000
    )
}

/* Handler for the 'Show Timer' visibility toggle */
function timerVisibilityHandler(isVisible) {
    document.getElementById('timer-visibility-switch')
    .addEventListener('click', async function(e) {
        if (e.target.checked) {
            await browser.runtime.sendMessage({request: 'changeTimerVisibility', status: 'visible'});
        }
        else {
            await browser.runtime.sendMessage({request: 'changeTimerVisibility', status: 'hidden'});
        }
        
    });
}

/* Listeners for priority buttons */
function createPriorityListeners() {
    // Increase priority buttons
    let buttons = document.querySelectorAll('.increase-priority');
    for (let button of buttons) {
        let id = button.parentNode.parentNode.id.match(/\d+/)[0];
        button.addEventListener('click', () => {
            editPriority(id, 'increase');
        })
    }

    // Decrease priority buttons
    buttons = document.querySelectorAll('.decrease-priority');
    for (let button of buttons) {
        let id = button.parentNode.parentNode.id.match(/\d+/)[0];
        button.addEventListener('click', () => {
            editPriority(id, 'decrease');
        })
    }
}

/* Listeners for isEnabled checkboxes */
function createEnableListeners() {
    let buttons = document.querySelectorAll('.enable-rule');
    for (let button of buttons) {
        let id = button.parentNode.parentNode.parentNode.id.match(/\d+/)[0];
        button.addEventListener('click', (e) => {
            ruleStatusChanged(e.target.checked, id);
        })
    }
}

/* Listeners for edit buttons */
function createEditListeners() {
    let buttons = document.querySelectorAll('.edit-rule');
    for (let button of buttons) {
        let id = button.parentNode.parentNode.id.match(/\d+/)[0];
        button.addEventListener('click', () => {
            openSettings('Edit Rule', id);
        })
    }
}

/* Listeners for delete buttons */
function createDeleteListeners() {
    let buttons = document.querySelectorAll('.delete-rule');
    for (let button of buttons) {
        let id = button.parentNode.parentNode.id.match(/\d+/)[0];

        button.addEventListener('click', (e) => {
            // If user is shift-clicking delete, force without confirm
            if (e.shiftKey) {
                deleteRule(id, true);
            }
            else {
                deleteRule(id, false);
            }
        })
    }
}