let changesMade = false;
let ruleBeingEdited = null;

document.getElementById('add-new-rule').addEventListener('click', () => openSettings('Add New Rule'));
document.getElementById('settings-close').addEventListener('click', () => closeSettings());
document.getElementById('settings-cancel').addEventListener('click', () => closeSettings());
document.getElementById('settings-form').addEventListener('submit', (e) => {
    e.preventDefault();
    saveSettings();
});

/* Adds the rule to local storage */
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
        'inProgress': false
    }

    await storeRule(id, rule);
}

async function editRule(ruleName, allocatedTime, blockList, exceptList) {
    rule = ruleBeingEdited;
    id = ruleBeingEdited.id;

    // Update the name
    console.log(rule)
    console.log(rule.name)
    console.log(ruleName)
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

async function editPriority(id, change) {
    // TODO
    let rule = await browser.storage.local.get(id);
    switch (change) {
        case 'increase':
            break;
        case 'decrease':
            break;
        default:
            break;
    }
    rule['priority'] 
}

async function storeRule(id, rule) {
    storageObj = {};
    storageObj[id] = rule;

    await browser.storage.local.set(storageObj);
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

async function saveSettings() {
    let name = document.getElementById('input-rule-name').value;
    let time = document.getElementById('input-allocated-time').value;
    let blockList = document.getElementById('input-blocklist').value;
    let exceptList = document.getElementById('input-exceptlist').value;

    // Default if somehow left empty
    if (!name) {
        name = "Unnamed Rule";
    }

    // Convert time to number if it is valid
    if (!isNaN(time)) {
        time = Math.floor(+time)
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
    if (ruleBeingEdited) {
        await editRule(name, time, blockList, exceptList);
    }
    else {
        await createNewRule(name, time, blockList, exceptList);
    }

    populateRuleset();
    closeSettings();
}

/* The page to display if the user clicks add/edit rule */
function openSettings(header, id) {
    if (id) {
        // TODO: Stop timer?
        browser.storage.local.get(id)
        .then((rule) => {
            document.getElementById('input-rule-name').value = rule[id].name;
            document.getElementById('input-allocated-time').value = rule[id].timeAllocatedMinutes;
            document.getElementById('input-blocklist').value = rule[id].blockList.join(', ');
            document.getElementById('input-exceptlist').value = rule[id].exceptList.join(', ');
            document.getElementById('settings-save').innerHTML = 'Edit Rule';
            ruleBeingEdited = rule[id];
        })
        
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

    ruleBeingEdited = null;
}

/* Splits and sanitizes a string by commas */
function commaSeparatedStringToArray(str) {
    let output = [];
    try {
        let split = str.split(",");
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
function displayError(field, value) {
    // TODO
}

/* Clears all input error messages */
function clearErrors() {
    // TODO
}