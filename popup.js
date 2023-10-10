document.getElementById('addNewRule').addEventListener('click', (e) => {
    addRule();
})


document.addEventListener('DOMContentLoaded', function() {
    /* Populate the list of rules from localStorage */
    const rulesetDiv = document.getElementById('ruleset-container');
    if (rulesetDiv) {
        testRules.sort((a, b) => a.priority - b.priority);
        let activeRuleId;
        for (rule of testRules) {
            rulesetDiv.innerHTML += '<div class="row row-active row-hover align-items-center border-secondary border-top border-opacity-25" id="swt-rule-' + rule.id + '">' +
            '<div class="col sm fs-3 text-end"><span class="settings-icon" role="button">' + (rule.priority > 0 ? '↑' : '') + '</span></div>' +
            '<div class="col sm fs-3 text-start"><span class="settings-icon" role="button">' + (rule.priority < testRules.length-1 ? '↓' : '') + '</span></div>' +
            '<div class="col-4 text-truncate">' + rule.name + '</div>' +
            '<div class="col-2 text-center" id="swt-timeleft-'+ rule.id +'">' + formatTime(rule.timeLeftSeconds) + '</div>' +
            '<div class="col-4 text-center"> <span class="d-inline p-2 settings-icon"><input role=button class="form-check-input" type="checkbox" value=""' + (rule.isEnabled ? ' checked' : '') + '></span>' +
            '<span class="d-inline p-1 settings-icon" role="button">' + '⚙' + '</span>' +
            '<span class="d-inline p-1 settings-icon" role="button">' + '🗑️' + '</span></div>' +
            '</div>'

            // Color the timeleft column if running or depleted
            let timeleftColumn = document.getElementById('swt-timeleft-' + rule.id);
            if (rule.timeLeftSeconds < 1) {
                timeleftColumn.classList.add('rule-depleted');
            }
            else if (rule.inProgress) {
                timeleftColumn.classList.add('rule-in-progress', 'fw-bold');
                activeRuleId = rule.id;
            }
        }
    

        /* While popup is open, keep updating the time left of the active rule */
        let updateInterval = setInterval(
            async function () {
                let response = await browser.runtime.sendMessage({request: "getActiveTimeleft"});
                if (response && activeRuleId) {
                    let timeleftColumn = document.getElementById('swt-timeleft-' + activeRuleId);
                    timeleftColumn.innerText = formatTime(response.timeleft);

                    // Update visuals and stop the interval if we hit 00:00
                    if (response.timeleft < 1) {
                        timeleftColumn.classList.remove('rule-in-progress', 'fw-bold');
                        timeleftColumn.classList.add('rule-depleted');
                        clearInterval(updateInterval);
                    }
                }
                else {
                    clearInterval(updateInterval);
                }
            }, 1000
        )
    }
})

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

/* */
async function addRule() {
    let id = await browser.storage.local.get("nextId");

    // If nextId is not defined yet, means we have no rules, we initialize the id at 0
    if (isEmptyObj(id)) {
        await browser.storage.local.set({"nextId": 0})
        id = 0;
    }
    else {
        id = id["nextId"];
    }
}







var testRules = [
    { 
        'id': 152,
        'name': 'Google',
        'blockString': 'google.com',
        'exceptString': 'mail.google.com, accounts.google.com',
        'timeAllocatedMinutes': 180,
        'timeLeftSeconds': 7900,
        'isEnabled': true,
        'lastReset': new Date('2023-10-09'),
        'priority': 0,
        'inProgress': true
    },
    { 
        'id': 155,
        'name': 'Reddit',
        'blockString': 'reddit.com',
        'exceptString': 'r/learnprogramming',
        'timeAllocatedMinutes': 20,
        'timeLeftSeconds': 15,
        'isEnabled': true,
        'lastReset': new Date('2023-10-08'),
        'priority': 1,
        'inProgress': false
    },
    { 
        'id': 170,
        'name': 'Social Media',
        'blockString': 'reddit.com, facebook.com, twitter.com, tiktok.com',
        'exceptString': '',
        'timeAllocatedMinutes': 30,
        'timeLeftSeconds': 0,
        'isEnabled': true,
        'lastReset': new Date('2023-10-09'),
        'priority': 3,
        'inProgress': false
    },
    { 
        'id': 252,
        'name': 'edddddddddddddddddddddd dddddddddddddX',
        'blockString': 'edx.com',
        'exceptString': '',
        'timeAllocatedMinutes': 1,
        'timeLeftSeconds': 10,
        'isEnabled': false,
        'lastReset': new Date('2023-10-05'),
        'priority': 2,
        'inProgress': false
    },
    { 
        'id': 252,
        'name': 'edddddddddddddddddddddd dddddddddddddX',
        'blockString': 'edx.com',
        'exceptString': '',
        'timeAllocatedMinutes': 1,
        'timeLeftSeconds': 10,
        'isEnabled': false,
        'lastReset': new Date('2023-10-05'),
        'priority': 2,
        'inProgress': false
    },
    { 
        'id': 252,
        'name': 'edddddddddddddddddddddd dddddddddddddX',
        'blockString': 'edx.com',
        'exceptString': '',
        'timeAllocatedMinutes': 1,
        'timeLeftSeconds': 10,
        'isEnabled': false,
        'lastReset': new Date('2023-10-05'),
        'priority': 2,
        'inProgress': false
    },
    { 
        'id': 252,
        'name': 'edddddddddddddddddddddd dddddddddddddX',
        'blockString': 'edx.com',
        'exceptString': '',
        'timeAllocatedMinutes': 1,
        'timeLeftSeconds': 10,
        'isEnabled': false,
        'lastReset': new Date('2023-10-05'),
        'priority': 2,
        'inProgress': false
    },
    { 
        'id': 252,
        'name': 'edddddddddddddddddddddd dddddddddddddX',
        'blockString': 'edx.com',
        'exceptString': '',
        'timeAllocatedMinutes': 1,
        'timeLeftSeconds': 10,
        'isEnabled': false,
        'lastReset': new Date('2023-10-05'),
        'priority': 2,
        'inProgress': false
    },
    { 
        'id': 252,
        'name': 'edddddddddddddddddddddd dddddddddddddX',
        'blockString': 'edx.com',
        'exceptString': '',
        'timeAllocatedMinutes': 1,
        'timeLeftSeconds': 10,
        'isEnabled': false,
        'lastReset': new Date('2023-10-05'),
        'priority': 2,
        'inProgress': false
    },
    { 
        'id': 252,
        'name': 'edddddddddddddddddddddd dddddddddddddX',
        'blockString': 'edx.com',
        'exceptString': '',
        'timeAllocatedMinutes': 1,
        'timeLeftSeconds': 10,
        'isEnabled': false,
        'lastReset': new Date('2023-10-05'),
        'priority': 2,
        'inProgress': false
    },
    { 
        'id': 252,
        'name': 'edddddddddddddddddddddd dddddddddddddX',
        'blockString': 'edx.com',
        'exceptString': '',
        'timeAllocatedMinutes': 1,
        'timeLeftSeconds': 10,
        'isEnabled': false,
        'lastReset': new Date('2023-10-05'),
        'priority': 2,
        'inProgress': false
    },
    { 
        'id': 252,
        'name': 'edddddddddddddddddddddd dddddddddddddX',
        'blockString': 'edx.com',
        'exceptString': '',
        'timeAllocatedMinutes': 1,
        'timeLeftSeconds': 10,
        'isEnabled': false,
        'lastReset': new Date('2023-10-05'),
        'priority': 2,
        'inProgress': false
    },
    { 
        'id': 252,
        'name': 'edddddddddddddddddddddd dddddddddddddX',
        'blockString': 'edx.com',
        'exceptString': '',
        'timeAllocatedMinutes': 1,
        'timeLeftSeconds': 10,
        'isEnabled': false,
        'lastReset': new Date('2023-10-05'),
        'priority': 2,
        'inProgress': false
    },
    { 
        'id': 252,
        'name': 'edddddddddddddddddddddd dddddddddddddX',
        'blockString': 'edx.com',
        'exceptString': '',
        'timeAllocatedMinutes': 1,
        'timeLeftSeconds': 10,
        'isEnabled': false,
        'lastReset': new Date('2023-10-05'),
        'priority': 2,
        'inProgress': false
    },
    { 
        'id': 252,
        'name': 'edddddddddddddddddddddd dddddddddddddX',
        'blockString': 'edx.com',
        'exceptString': '',
        'timeAllocatedMinutes': 1,
        'timeLeftSeconds': 10,
        'isEnabled': false,
        'lastReset': new Date('2023-10-05'),
        'priority': 2,
        'inProgress': false
    },
    { 
        'id': 252,
        'name': 'edddddddddddddddddddddd dddddddddddddX',
        'blockString': 'edx.com',
        'exceptString': '',
        'timeAllocatedMinutes': 1,
        'timeLeftSeconds': 10,
        'isEnabled': false,
        'lastReset': new Date('2023-10-05'),
        'priority': 2,
        'inProgress': false
    },
    { 
        'id': 252,
        'name': 'edddddddddddddddddddddd dddddddddddddX',
        'blockString': 'edx.com',
        'exceptString': '',
        'timeAllocatedMinutes': 1,
        'timeLeftSeconds': 10,
        'isEnabled': false,
        'lastReset': new Date('2023-10-05'),
        'priority': 2,
        'inProgress': false
    },
]

/* Checks if an object is empty, localStorage returns such if the key in .get(key) is not found
 * https://stackoverflow.com/a/68636342 */
function isEmptyObj(obj) {
    return Object.keys(obj).length === 0 && obj.constructor === Object;
}