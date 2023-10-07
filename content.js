function updateTimerUI(timeLeft) {
    if (!document.getElementById("swt-timer")) {
        const timerDiv = document.createElement("div");
        timerDiv.id = "swt-timer";
        timerDiv.innerHTML = "time: " + timeLeft;
        document.body.appendChild(timerDiv);
    }
    else {
        document.getElementById("swt-timer").innerHTML = "time: " + timeLeft;
    }
}
//<div class="swt-overlay"><div class="swt-overlay-text">Overlay text goes here</div></div>