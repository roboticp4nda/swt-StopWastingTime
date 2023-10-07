document.getElementById('start').addEventListener('click', (e) => {
    browser.runtime.sendMessage({command: "startTimer", seconds: 10, ruleId: 1337})
})
document.getElementById('stop').addEventListener('click', (e) => {
    browser.runtime.sendMessage({command: "stopTimer"})
})