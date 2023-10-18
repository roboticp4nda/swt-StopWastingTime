let timerDiv;
const DEFAULT_TIMER_OPACITY = 0.4;
let interval;

/* Move the timer div when dragging */
function dragElement({ movementX, movementY }) {
  let divStyle = window.getComputedStyle(timerDiv);
  let width = parseInt(divStyle.width);
  let height = parseInt(divStyle.height);

  // We use .style.right to position as that is the default value set
  let rightValue = parseInt(divStyle.right);
  let topValue = parseInt(divStyle.top);

  // Contain the element within the main body (X axis)
  if (rightValue > 0) {
    if (
      rightValue + width <
      Math.min(document.documentElement.clientWidth, window.innerWidth)
    ) {
      // Move the div based the mouse movement distance (X axis)
      timerDiv.style.right = rightValue - movementX + "px";
    } else {
      // Left boundary (using .style.right) is based on the width of the page and the width of the element
      timerDiv.style.right =
        Math.min(
          Math.min(document.documentElement.clientWidth, window.innerWidth) - width,
          rightValue - movementX
        ) + "px";
    }
  } else {
    // If the position somehow goes negative, reset it back to 0
    timerDiv.style.right = Math.max(0, rightValue - movementX) + "px";
  }

  // Contain the element within the main body (Y axis)
  if (topValue > 0) {
    if (
      topValue + height <
      Math.min(document.documentElement.clientHeight, window.innerHeight)
    ) {
      // Move the div based the mouse movement distance (Y axis)
      timerDiv.style.top = topValue + movementY + "px";
    } else {
      // Bottom boundary (using .style.top) is based on the height of the page and the height of the element
      timerDiv.style.top =
        Math.min(
          Math.min(document.documentElement.clientHeight, window.innerHeight) - height,
          topValue + movementY
        ) + "px";
    }
  } else {
    // If the position somehow goes negative, reset it back to 0
    timerDiv.style.top = Math.max(0, topValue + movementY) + "px";
  }
}

/* Set up the listeners on the given element (called on each tabUpdate, as previous timerDiv might get destroyed) */
function addDragEventListeners(element) {
  timerDiv = element;

  // While dragging
  timerDiv.addEventListener("mousedown", (e) => {
    // Open custom context menu on right-click
    if (e.button === 2) {
      createCustomContextMenu(timerDiv, e);
      return;
    }
    // Remove text selection on the entire page
    document.onselectstart = function () {
      return false;
    };

    // Change pointer to drag icon
    document.body.classList.add("dragging");
    timerDiv.classList.add("dragging");

    // Keep track of pointer actions even if it leaves the browser window (e.g. mouseup)
    document.body.setPointerCapture(e.pointerId);

    document.body.addEventListener("mousemove", dragElement);
  });

  // When released
  document.body.addEventListener("mouseup", (e) => {
    document.onselectstart = null;
    document.body.classList.remove("dragging");
    timerDiv.classList.remove("dragging");
    document.body.releasePointerCapture(e.pointerId);
    document.body.removeEventListener("mousemove", dragElement);

    // Send message to background to store final position
    browser.runtime.sendMessage({
      request: "storeTimerPosition",
      right: timerDiv.style.right,
      top: timerDiv.style.top,
    });
  });
}

/* Remove default context menu on timer div */
function removeDefaultContextMenu(element) {
  timerDiv = element;
  timerDiv.addEventListener("contextmenu", (e) => {
    e.preventDefault();
  });
}

/* Create and display the custom context menu on the timer */
function createCustomContextMenu(timerDiv, e) {
  let contextMenu = document.getElementById("swt-custom-context-menu");

  // Create menu
  if (!contextMenu) {
    contextMenu = document.createElement("div");
    contextMenu.id = "swt-custom-context-menu";
    contextMenu.innerHTML =
      '<ul class="custom-context-menu-list">' +
      '<li class="custom-context-menu-item" id="swt-hide-timer">Hide Timer</li>' +
      '<li class="custom-context-menu-line"></li>' +
      '<li class="custom-context-menu-label">Opacity:</li>' +
      '<li class="custom-context-menu-item"><input type="range" min="10" max="100" value="40" class="slider" id="swt-opacity-slider"></li>' +
      "</ul>";
    contextMenu.onselectstart = () => {
      return false;
    };
    document.body.appendChild(contextMenu);

    // Remove default context menu from the menu
    contextMenu.addEventListener("contextmenu", (e) => {
      e.preventDefault();
    });

    // Listener for opacity change, mouseup so it only fires when the user stops input
    let slider = document.getElementById("swt-opacity-slider");
    slider.addEventListener("mouseup", (e) => {
      changeOpacity(e.target.value, timerDiv);
    });

    // Set the current (saved) opacity value on the slider
    getSavedOpacity().then((opacity) => {
      slider.value = opacity * 100;
    });
  }

  // Display menu
  contextMenu.style.display = "initial";

  // If the context menu would go out of bounds, display it to the left/top of pointer instead of right/bottom
  let leftPos = e.clientX;
  if (leftPos + contextMenu.clientWidth > document.documentElement.clientWidth) {
    leftPos = leftPos - contextMenu.clientWidth;
  }

  let topPos = e.clientY;
  if (topPos + contextMenu.clientHeight > document.documentElement.clientHeight) {
    topPos = topPos - contextMenu.clientHeight;
  }
  contextMenu.style.left = leftPos + "px";
  contextMenu.style.top = topPos + "px";

  // Listener for close menu
  document.addEventListener("mousedown", (e) => {
    // Don't close if the user is just opening the context menu via right-click
    if (e.button === 2 && e.target.id === timerDiv.id) {
      return;
    }

    // Don't close if opacity is being changed
    if (e.target.id === "swt-opacity-slider") {
      return;
    }

    // Hide the timer
    if (e.target.id === "swt-hide-timer" && e.button !== 2) {
      browser.runtime.sendMessage({
        request: "changeTimerVisibility",
        status: "hidden",
      });
    }

    // Don't close if the user clicks inside the context menu, except 'Hide Timer'
    else if (
      e.target.id === "swt-custom-context-menu" ||
      e.target.offsetParent.id === "swt-custom-context-menu"
    ) {
      return;
    }

    // Close the menu
    contextMenu.style.display = "none";
    document.removeEventListener("mousedown", this);
  });
}

/* Set opacity of timer div */
async function changeOpacity(opacity, timerDiv) {
  let opacityPercentage = opacity / 100;
  timerDiv.style.opacity = opacityPercentage;
  await browser.storage.local.set({ opacity: opacityPercentage });
}

/* Get the saved opacity (or default if empty) from storage */
async function getSavedOpacity() {
  let response = await browser.storage.local.get("opacity");
  if (!isEmptyObj(response)) {
    return response["opacity"];
  }
  return DEFAULT_TIMER_OPACITY;
}

function isEmptyObj(obj) {
  return Object.keys(obj).length === 0 && obj.constructor === Object;
}

/* TEMPORARY SOLUTION
 * Send a ping to background regularly to prevent it from going to sleep when there is an active timer
 * Default timeout in Firefox is 30 seconds
 */

/* Run interval only if the window is visible */
document.addEventListener("visibilitychange", () => {
  if (document.hidden) {
    letBackgroundSleep();
  } else {
    keepBackgroundAwake();
  }
});

/* On focus gain, set up interval */
document.addEventListener("focus", () => {
  keepBackgroundAwake();
});

/* Set up the interval */
function keepBackgroundAwake() {
  if (!interval) {
    interval = setInterval(async () => {
      // Remove interval if focus has been lost since the last ping
      if (!document.hasFocus()) {
        letBackgroundSleep();
      }
      await browser.runtime.sendMessage({ request: "ping" });
    }, 14000);
  }
}

/* Remove interval */
function letBackgroundSleep() {
  if (interval) {
    clearInterval(interval);
    interval = null;
  }
}

// Set up the interval by default when the code is first injected
keepBackgroundAwake();
