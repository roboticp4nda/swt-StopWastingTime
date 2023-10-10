let changesMade = false;

document.getElementById('add-new-rule').addEventListener('click', (e) => {
    openSettings("Add New Rule");
})

document.getElementById('settings-close').addEventListener('click', (e) => {
    closeSettings();
})

function openSettings(header, id) {
    if (id) {
        // TODO: Stop timer?
        // TODO: pre-populate and prepare for edit
    }
    else {
        document.getElementById("save-button").innerHTML = "Add Rule"
    }
    document.getElementById("settings-header").innerHTML = header;
    document.body.classList.add('overflow-hidden');
    document.body.classList.remove('overflow-auto');
    let rulePage = document.getElementById('rule-page');
    rulePage.classList.remove('slide-out');
    rulePage.classList.add('slide-in');
}

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