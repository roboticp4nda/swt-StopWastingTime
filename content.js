/* Move the timer div when dragging */

let timerDiv;

function dragElement({movementX, movementY}) {
    let divStyle = window.getComputedStyle(timerDiv);
    let width = parseInt(divStyle.width);
    let height = parseInt(divStyle.height);
    let rightValue = parseInt(divStyle.right);
    let topValue = parseInt(divStyle.top);
    if (rightValue > 0) {
        if (rightValue + width < window.innerWidth) {
            timerDiv.style.right = rightValue - movementX + 'px';
        }
        else {
            timerDiv.style.right = Math.min(window.innerWidth - width, rightValue - movementX) + 'px';
        }
    }
    else {
        timerDiv.style.right = Math.max(0, rightValue - movementX) + 'px';
    }

    if (topValue > 0) {
        if (topValue + height < window.innerHeight) {
            timerDiv.style.top = topValue + movementY + 'px';
        }
        else {
            timerDiv.style.top = Math.min(window.innerHeight - height, topValue + movementY) + 'px';
        }
    }
    else {
        timerDiv.style.top = Math.max(0, topValue + movementY) + 'px';
    }   
}

function addDragEventListeners(element) {
    timerDiv = element;
    timerDiv.addEventListener('mousedown', (e) => {
        document.onselectstart = function() {return false;};
        document.body.classList.add('dragging');
        timerDiv.classList.add('dragging');
        document.body.setPointerCapture(e.pointerId);
        document.body.addEventListener('mousemove', dragElement);
    });
    document.body.addEventListener('mouseup', (e) => {
        document.onselectstart = '';
        document.body.classList.remove('dragging');
        timerDiv.classList.remove('dragging');
        document.body.releasePointerCapture(e.pointerId);
        document.body.removeEventListener('mousemove', dragElement);
    });
}


/* Set opacity of timer div */
// TODO