let changesMade = false;
let ruleBeingEdited = null;

/* Listeners for the settings page */
document.getElementById('add-new-rule').addEventListener('click', () => openSettings('Add New Rule'));
document.getElementById('settings-close').addEventListener('click', () => closeSettings());
document.getElementById('settings-cancel').addEventListener('click', () => closeSettings());
document.getElementById('settings-form').addEventListener('change', () => changesMade = true);
document.getElementById('settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveSettings();
});

/* Adds the rule to local storage with values from form */
async function createNewRule(ruleName, allocatedTime, blockList, exceptList) {
    id = await getNextId();
    await browser.storage.local.set({'nextId': (id + 1)});

    let priority = await getTotalRules();

    let rule = {
        'id': id,
        'name': ruleName,
        'blockList': blockList,
        'exceptList': exceptList,
        'timeAllocatedMinutes': allocatedTime,
        'timeLeftSeconds': allocatedTime * 60,
        'isEnabled': true,
        'lastReset': new Date().setHours(0,0,0,0),
        'priority': priority,
    }

    await storeRule(id, rule);
}

/* Edits the rule specified in global variable <ruleBeingEdited> with new values from form */
async function editRule(ruleName, allocatedTime, blockList, exceptList) {
    rule = ruleBeingEdited;
    id = ruleBeingEdited.id;

    // Update the name
    rule.name = ruleName;

    // Update the time left by calculating difference
    if (rule.timeAllocatedMinutes != allocatedTime) {
        rule.timeLeftSeconds = Math.max(
            rule.timeLeftSeconds - ((rule.timeAllocatedMinutes - allocatedTime) * 60), 0
        )
        rule.timeAllocatedMinutes = allocatedTime
    }

    // Update the lists
    rule.blockList = blockList;
    rule.exceptList = exceptList;

    await storeRule(id, rule);
}

/* Changes the priority of the selected rule (either increase or decrease)
 * Increasing priority lowers the priority number, 0: highest priority
 */
async function editPriority(id, change) {
    let rules = await browser.storage.local.get();
    let oldPriority = rules[id].priority;
    switch (change) {
        // Increase priority, decrement priority number
        case 'increase':
            // Can't decrement below min
            if (oldPriority <= 0) {
                return;
            }
            for (let rule in rules) {
                if (rules[rule].priority == oldPriority - 1) {
                    rules[rule].priority = oldPriority;
                    await storeRule(rules[rule].id, rules[rule]);
                    break;
                }
            }
            rules[id].priority -= 1;
            break;

        // Decrease priority, increment priority number
        case 'decrease':
            // Can't increment above max
            if (oldPriority >= rules.length - 2) {
                return;
            }
            for (let rule in rules) {
                if (rules[rule].priority == oldPriority + 1) {
                    rules[rule].priority = oldPriority;
                    await storeRule(rules[rule].id, rules[rule]);
                    break;
                }
            }
            rules[id].priority += 1;
            break;

        default:
            break;
    }

    await storeRule(id, rules[id]);
    await recalculateAndRerender();
}

/* Stores the passed <rule> object in storage, with key <id> */
async function storeRule(id, rule) {
    await browser.runtime.sendMessage({request: 'storeRule', ruleId: id, ruleObject: rule});
}

/* Forces a recheck on the current tab and its rules */
async function recheckTabRules() {
    await browser.runtime.sendMessage({request: 'recheckTabRules'});
}

/* Deletes a rule specified by its id */
async function deleteRule(id, force) {
    if (!force && !confirmAction('delete')) {
        return;
    }
    let deletedPriority = await browser.storage.local.get(id).then((rule) => {return rule[id].priority});
    await browser.storage.local.remove(id);
    
    // Move all priorities one up to cover the deleted one
    let rules = await browser.storage.local.get();
    for (let rule in rules) {
        if (rules[rule].priority > deletedPriority) {
            rules[rule].priority -= 1;
            storeRule(rule, rules[rule]);
        }
    }

    await recalculateAndRerender();
}

/* Handles any change in the status of the rule (enabled/disabled) */
async function ruleStatusChanged(isEnabled, id) {
    let rule = await browser.storage.local.get(id);
    if (!rule) {
        return;
    }

    rule[id].isEnabled = isEnabled;

    await storeRule(id, rule[id]);
    await recalculateAndRerender();
}

/* Confirm dialog for deleting rule or attempting to close settings without saving */
function confirmAction(action) {
    if (action === 'delete'){
        return window.confirm('Are you sure you want to delete this rule?\nNote: You can shift-click to bypass this dialog.');
    }
    if (action === 'cancel') {
        return window.confirm('You have unsaved changes! Do you still want to abort?');
    }

    // Default action, shouldn't be visible
    return window.confirm('Please confirm action');
}

/* Gets the current number of rules in storage
 * Used to calculate the next default priority 
 */
async function getTotalRules() {
    let rules = await browser.storage.local.get();
    return Math.max(Object.keys(rules).length - 1, 0);
}

/* Gets the next available id in storage */
async function getNextId() {
    let id = await browser.storage.local.get('nextId');

    // If nextId is not defined yet, means we have no rules, we initialize the id at 0
    if (isEmptyObj(id)) {
        await browser.storage.local.set({'nextId': 0})
        id = 0;
    }
    else {
        id = id['nextId'];
    }

    return id;
}

/* Validates and saves (adds or edits) the rule with the input values */
async function saveSettings() {
    let hasError = false;
    clearErrors();
    let name = document.getElementById('input-name').value;
    let time = document.getElementById('input-time').value;
    let blockList = document.getElementById('input-blocklist').value;
    let exceptList = document.getElementById('input-exceptlist').value;

    // If name is empty
    if (!name || name.trim().length < 1) {
        displayError('name', 'Name must not be empty');
        hasError = true;
    }

    // Convert time to number if it is valid
    if (!isNaN(time)) {
        time = Math.floor(+time)
    }
    else {
        displayError('time', 'Invalid number');
        hasError = true;
    }

    // Separate the strings by commas
    blockList = commaSeparatedStringToArray(blockList);
    if (!blockList || blockList.length < 1) {
        displayError('blocklist', 'Must contain at least one valid string');
        hasError = true;
    }
    exceptList = commaSeparatedStringToArray(exceptList);

    if (hasError) {
        return;
    }

    if (ruleBeingEdited) {
        await editRule(name, time, blockList, exceptList);
    }
    else {
        await createNewRule(name, time, blockList, exceptList);
    }

    changesMade = false;
    await recalculateAndRerender();
    closeSettings();
}

/* The page to display if the user clicks add/edit rule */
function openSettings(header, id) {
    changesMade = false;
    if (id) {
        // TODO: Stop timer?
        browser.storage.local.get(id)
        .then((rule) => {
            document.getElementById('input-name').value = rule[id].name;
            document.getElementById('input-time').value = rule[id].timeAllocatedMinutes;
            document.getElementById('input-blocklist').value = rule[id].blockList.join(', ');
            document.getElementById('input-exceptlist').value = rule[id].exceptList.join(', ');
            document.getElementById('settings-save').innerHTML = 'Edit Rule';
            ruleBeingEdited = rule[id];
        })
        
    }
    else {
        document.getElementById('input-name').value = '';
        document.getElementById('input-time').value = 60;
        document.getElementById('input-blocklist').value = '';
        document.getElementById('input-exceptlist').value = '';
        document.getElementById('settings-save').innerHTML = 'Add Rule';
    }
    clearErrors();
    document.getElementById('settings-header').innerHTML = header;
    document.body.classList.add('overflow-hidden');
    document.body.classList.remove('overflow-y-scroll');
    let rulePage = document.getElementById('rule-page');
    rulePage.classList.remove('slide-out');
    rulePage.classList.add('slide-in');
}

/* Navigate back to the main page, remove the add/edit page from view */
function closeSettings() {
    if (changesMade) {
        // TODO: Resume timer?
        // Don't close if user isn't finished
        if (!confirmAction('cancel')) {
            return;
        }
    }
    document.body.classList.remove('overflow-hidden');
    document.body.classList.add('overflow-y-scroll');
    let rulePage = document.getElementById('rule-page');
    rulePage.classList.remove('slide-in');
    rulePage.classList.add('slide-out');
    ruleBeingEdited = null;
}

/* Splits and sanitizes a string by commas */
function commaSeparatedStringToArray(str) {
    let output = [];
    try {
        let split = str.split(',');
        for (let s of split) {
            s = s.toLowerCase().trim();
            if (s.length < 1) {
                continue;
            }
            output.push(s);
        }
    }
    catch (e) {
        return null;
    }

    return output;
}

/* Displays an error for the specified field upon input */
function displayError(field, error) {
    try {
        let errorDiv = document.getElementById('form-error-' + field);
        errorDiv.innerHTML = error;
        document.getElementById('input-' + field).focus();
    }
    catch (e) {
        return;
    }
}

/* Clears all input error messages */
function clearErrors() {
    document.getElementById('form-error-name').innerHTML = '';
    document.getElementById('form-error-time').innerHTML = '';
    document.getElementById('form-error-blocklist').innerHTML = '';
    document.getElementById('form-error-exceptlist').innerHTML = '';
}

/* Recalculate timers and visuals */
async function recalculateAndRerender() {
    await recheckTabRules();
    if (!updateInterval) {
        updateTimeleft();
    }
    populateRuleset();
}