let timerDiv;

/* Move the timer div when dragging */
function dragElement({movementX, movementY}) {
    let divStyle = window.getComputedStyle(timerDiv);
    let width = parseInt(divStyle.width);
    let height = parseInt(divStyle.height);

    // We use .style.right to position as that is the default value set
    let rightValue = parseInt(divStyle.right);
    let topValue = parseInt(divStyle.top);

    // Contain the element within the main body (X axis)
    if (rightValue > 0) {
        if (rightValue + width < Math.min(document.body.clientWidth, window.innerWidth)) {
            // Move the div based the mouse movement distance (X axis)
            timerDiv.style.right = rightValue - movementX + 'px';
        }
        else {
            // Left boundary (using .style.right) is based on the width of the page and the width of the element
            timerDiv.style.right = Math.min(Math.min(document.body.clientWidth, window.innerWidth) - width, rightValue - movementX) + 'px';
        }
    }
    else {
        // If the position somehow goes negative, reset it back to 0
        timerDiv.style.right = Math.max(0, rightValue - movementX) + 'px';
    }

    // Contain the element within the main body (Y axis)
    if (topValue > 0) {
        if (topValue + height < Math.min(document.body.clientHeight, window.innerHeight)) {
            // Move the div based the mouse movement distance (Y axis)
            timerDiv.style.top = topValue + movementY + 'px';
        }
        else {
            // Bottom boundary (using .style.top) is based on the height of the page and the height of the element
            timerDiv.style.top = Math.min(Math.min(document.body.clientHeight, window.innerHeight) - height, topValue + movementY) + 'px';
        }
    }
    else {
        // If the position somehow goes negative, reset it back to 0
        timerDiv.style.top = Math.max(0, topValue + movementY) + 'px';
    }   
}

/* Set up the listeners on the given element (called on each tabUpdate, as previous timerDiv might get destroyed) */
function addDragEventListeners(element) {
    timerDiv = element;

    // While dragging
    timerDiv.addEventListener('mousedown', (e) => {
        // Remove text selection on the entire page
        document.onselectstart = function() {return false;};

        // Change pointer to drag icon
        document.body.classList.add('dragging');
        timerDiv.classList.add('dragging');

        // Keep track of pointer actions even if it leaves the browser window (e.g. mouseup)
        document.body.setPointerCapture(e.pointerId);

        document.body.addEventListener('mousemove', dragElement);
    });

    // When released
    document.body.addEventListener('mouseup', (e) => {
        document.onselectstart = '';
        document.body.classList.remove('dragging');
        timerDiv.classList.remove('dragging');
        document.body.releasePointerCapture(e.pointerId);
        document.body.removeEventListener('mousemove', dragElement);

        // Send message to background to store final position
        browser.runtime.sendMessage({request: 'storeTimerPosition', 'right': timerDiv.style.right, 'top': timerDiv.style.top});
    });
}


/* Set opacity of timer div */
// TODO