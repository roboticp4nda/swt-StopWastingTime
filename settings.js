let changesMade = false;

document.getElementById('add-new-rule').addEventListener('click', () => openSettings('Add New Rule'));
document.getElementById('settings-close').addEventListener('click', () => closeSettings());
document.getElementById('settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveSettings();
});

/* Listeners for isActive checkboxes */
function createActivateListeners() {
    // TODO
    document.querySelector();
}

/* Handlers for edit buttons */
function createEditListeners() {
    // TODO
    document.querySelector();
}

/* Handlers for delete buttons */
function createDeleteListeners() {
    // TODO
    document.querySelector();
}

/* Adds the rule to local storage */
async function addRule(ruleName, allocatedTime, blockList, exceptList) {
    id = await getNextId();
    await browser.storage.local.set({'nextId': (id + 1)});

    let priority = await getTotalRules();

    rule = {
        'name': ruleName,
        'blockList': blockList,
        'exceptList': exceptList,
        'timeAllocatedMinutes': allocatedTime,
        'timeLeftSeconds': allocatedTime,
        'isEnabled': true,
        'lastReset': new Date().setHours(0,0,0,0),
        'priority': priority,
        'inProgress': false
    }

    storageObj = {};
    storageObj[id] = rule;

    await browser.storage.local.set(storageObj);
}

/* Gets the current number of rules in storage
 * Used to calculate the next default priority 
 */
async function getTotalRules() {
    let rules = await browser.storage.local.get();
    return Object.keys(rules).length;

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

function saveSettings() {
    let name = document.getElementById('input-rule-name').value;
    let time = document.getElementById('input-allocated-time').value;
    let blockList = document.getElementById('input-blocklist').value;
    let exceptList = document.getElementById('input-exceptlist').value;

    // Default if somehow left empty
    if (!name) {
        name = "Unnamed Rule";
    }

    // Check if time is a valid number
    if (typeof time === 'number') {
        time = Math.floor(time)
    }
    else {
        closeSettings();
        return;
    }

    // Separate the strings by commas
    blockList = commaSeparatedStringToArray(blockList);
    if (!blockList) {
        closeSettings();
        return;
    }
    exceptList = commaSeparatedStringToArray(exceptList);

    // Add the rule, close settings, re-render list
    addRule(name, time, blockList, exceptList);
    populateRuleset();
    closeSettings();
}

/* The page to display if the user clicks add/edit rule */
function openSettings(header, id) {
    if (id) {
        // TODO: Stop timer?
        // TODO: pre-populate and prepare for edit
    }
    else {
        document.getElementById('input-rule-name').value = '';
        document.getElementById('input-allocated-time').value = 60;
        document.getElementById('input-blocklist').value = '';
        document.getElementById('input-exceptlist').value = '';
        document.getElementById('settings-save').innerHTML = 'Add Rule';
    }
    document.getElementById('settings-header').innerHTML = header;
    document.body.classList.add('overflow-hidden');
    document.body.classList.remove('overflow-auto');
    let rulePage = document.getElementById('rule-page');
    rulePage.classList.remove('slide-out');
    rulePage.classList.add('slide-in');
}

/* Navigate back to the main page, remove the add/edit page from view */
function closeSettings() {
    if (changesMade) {
        // TODO: Resume timer?
        // TODO: confirm
    }
    document.body.classList.remove('overflow-hidden');
    document.body.classList.add('overflow-auto');
    let rulePage = document.getElementById('rule-page');
    rulePage.classList.remove('slide-in');
    rulePage.classList.add('slide-out');

}

/* Splits and sanitizes a string by commas */
function commaSeparatedStringToArray(str) {
    let output = [];
    try {
        let split = str.split(",");
        for (s of split) {
            if (s.length < 1) {
                continue;
            }
            output.push(s.toLowerCase().trim());
        }
    }
    catch (e) {
        return null;
    }

    return output;
}