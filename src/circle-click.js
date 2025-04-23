var jsPsychCircleClickTask = (function (jspsych) {
  "use strict";

  const info = {
    name: "circle-click",
    version: "0.0.1",
    parameters: {
      starting_score: {
        type: jspsych.ParameterType.INT,
        default: 0,
      },
      mouse_disruption_type: {
        type: jspsych.ParameterType.INT,
        default: 3, // 1 = none, 2 = random before/after red dot, 3 = at red dot
      },
    },
    data: {
      final_score: {
        type: jspsych.ParameterType.INT,
      }, 
      red_dot_clicked: {
        type: jspsych.ParameterType.BOOL,
      },
      disruption_type: {
        type: jspsych.ParameterType.INT,
      },
    },
  };

  class CircleClickTaskPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }
    trial(display_element, trial) {
      const numCircles = 10;
      const trialDuration = 15000; // 15s
      let circles = [];
      let trialRunning = true;
      let score = trial.starting_score || 0;
      let redDotShown = false;
      let redDotClicked = false;

      const trial_data = {
        final_score: 0, 
      };

      const scoreCounter = document.createElement("div");
      scoreCounter.style.position = "fixed";
      scoreCounter.style.top = "20px";
      scoreCounter.style.right = "20px";
      scoreCounter.style.fontSize = "24px";
      scoreCounter.style.fontWeight = "bold";
      scoreCounter.innerText = "Score: 0";
      display_element.appendChild(scoreCounter);

      function getRandomPosition() {
        const padding = 60;
        const x = Math.random() * (window.innerWidth - padding);
        const y = Math.random() * (window.innerHeight - padding);
        return { x, y };
      }

      function disableMouse() {
        display_element.style.pointerEvents = "none";
      }

      function enableMouse() {
        display_element.style.pointerEvents = "auto";
      }

      function createCircle() {
        const pos = getRandomPosition();
        const circle = document.createElement("div");
        circle.style.position = "absolute";
        circle.style.width = "80px";
        circle.style.height = "80px";
        circle.style.borderRadius = "50%";
        circle.style.backgroundColor = "#6aa84f";
        circle.style.left = `${pos.x}px`;
        circle.style.top = `${pos.y}px`;
        //circle.style.cursor = "pointer";

        circle.addEventListener("click", () => {
          if (!trialRunning) return;
          display_element.removeChild(circle);
          circles.splice(circles.indexOf(circle), 1);
          score++;
          scoreCounter.innerText = `Score: ${score}`;
          createCircle();
        });

        display_element.appendChild(circle);
        circles.push(circle);
      }

      // --- Mouse Disruption Setup ---
      let fakeCursor;
      let lastMouseX = 0;
      let lastMouseY = 0;
      let isMouseLocked = false;
      let isMovementFrozen = false;
      
      // Track all event listeners for proper cleanup
      const eventListeners = [];
      
      // Track initial mouse position
      function captureInitialMousePosition(e) {
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
      }
      
      // Add event listener to capture initial mouse position before setting up fake cursor
      addEventListenerWithTracking(document, "mousemove", captureInitialMousePosition);
      
      function addEventListenerWithTracking(element, eventType, handler) {
        element.addEventListener(eventType, handler);
        eventListeners.push({ element, eventType, handler });
      }
      
      function removeAllEventListeners() {
        eventListeners.forEach(({ element, eventType, handler }) => {
          element.removeEventListener(eventType, handler);
        });
        eventListeners.length = 0;
      }

      function trackMouse(e) {
        if (isMovementFrozen) return;

        if (isMouseLocked) {
          lastMouseX += e.movementX;
          lastMouseY += e.movementY;
        } else {
          lastMouseX = e.clientX;
          lastMouseY = e.clientY;
        }

        lastMouseX = Math.max(0, Math.min(window.innerWidth, lastMouseX));
        lastMouseY = Math.max(0, Math.min(window.innerHeight, lastMouseY));

        if (fakeCursor) {
          fakeCursor.style.left = `${lastMouseX}px`;
          fakeCursor.style.top = `${lastMouseY}px`;
        }
      }

      function setupFakeCursor() {
        // Create the fake cursor with initial mouse position
        fakeCursor = document.createElement("div");
        fakeCursor.style.position = "fixed";
        fakeCursor.style.width = "20px";
        fakeCursor.style.height = "20px";
        fakeCursor.style.backgroundColor = "black";
        fakeCursor.style.borderRadius = "50%";
        fakeCursor.style.zIndex = "9999";
        fakeCursor.style.pointerEvents = "none";
        fakeCursor.style.left = `${lastMouseX}px`; 
        fakeCursor.style.top = `${lastMouseY}px`; 
        document.body.appendChild(fakeCursor);
      
        let style = document.getElementById("hide-cursor-style");
        if (!style) {
          style = document.createElement("style");
          style.id = "hide-cursor-style";
          document.head.appendChild(style);
        }
      
        style.innerHTML = `
          html, body, * {
            cursor: none !important;
          }
      
          ::-webkit-scrollbar {
            display: none;
          }
        `;
      
        // Remove the initial position tracker and set up the main tracker
        document.removeEventListener("mousemove", captureInitialMousePosition);
        // Update the eventListeners array to remove the initial tracker
        for (let i = 0; i < eventListeners.length; i++) {
          if (eventListeners[i].handler === captureInitialMousePosition) {
            eventListeners.splice(i, 1);
            break;
          }
        }
        
        addEventListenerWithTracking(document, "mousemove", trackMouse);
        addEventListenerWithTracking(document, 'pointerlockchange', pointerLockChangeHandler);
        addEventListenerWithTracking(document, 'pointerlockerror', pointerLockErrorHandler);
        addEventListenerWithTracking(document, 'click', simulateClickAtCursor);

        display_element.requestPointerLock();
      }
  
      function pointerLockChangeHandler() {
        if (document.pointerLockElement === display_element) {
          isMouseLocked = true;
        } else {
          isMouseLocked = false;
        }
      }
      
      function pointerLockErrorHandler() {
        console.warn("Pointer lock failed");
      }

      function lockMouseMovement() {
        isMovementFrozen = true;
      }

      function unlockMouseMovement() {
        isMovementFrozen = false;
      }

      // Add a click simulation for circles and red dot when pointer is locked
      function simulateClickAtCursor() {
        if(!isMouseLocked) return;

        // Create a click event at the cursor position
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: lastMouseX,
          clientY: lastMouseY
        });
        
        // Find element at cursor position
        const elementAtPoint = document.elementFromPoint(lastMouseX, lastMouseY);
        if (elementAtPoint) {
          elementAtPoint.dispatchEvent(clickEvent);
        }
      }

      function removeFakeCursor() {
        document.body.style.cursor = "auto";
        const style = document.getElementById("hide-cursor-style");
        if (style) style.remove();
        if (fakeCursor && fakeCursor.parentNode) fakeCursor.parentNode.removeChild(fakeCursor);
        
        // Clean up all tracked event listeners
        removeAllEventListeners();
        
        // Exit pointer lock if active
        if (document.pointerLockElement === display_element) {
          document.exitPointerLock();
        }
      }

      setupFakeCursor();

      for (let i = 0; i < numCircles; i++) {
        createCircle();
      }

      // --- Red Dot + Disruption Timing ---
      const redDotDelay = Math.random() * (trialDuration - 3250) + 1250;

      if (trial.mouse_disruption_type === 3) {
        const disruptionStart = redDotDelay - 1500;
        if (disruptionStart >= 0) {
          jsPsych.pluginAPI.setTimeout(() => {
            lockMouseMovement();
            disableMouse();
            jsPsych.pluginAPI.setTimeout(() => {
              unlockMouseMovement();
              enableMouse();
            }, 2000);
          }, disruptionStart);
        }
      }

      if (trial.mouse_disruption_type === 2) {
        const disruptionDuration = 2000;
        const disruptionBufferBeforeRedDot = 2000;
        const disruptionBufferAfterRedDot = 2000;
        const latestAllowedDisruption = trialDuration - disruptionDuration;

        let disruptionTime;
        let attempts = 0;
        const maxAttempts = 100;

        do {
          disruptionTime = Math.random() * latestAllowedDisruption;
          attempts++;
        } while (
          attempts < maxAttempts &&
          (
            (disruptionTime >= redDotDelay - disruptionBufferBeforeRedDot &&
             disruptionTime <= redDotDelay + disruptionBufferAfterRedDot) ||
            (disruptionTime + disruptionDuration > trialDuration)
          )
        );

        jsPsych.pluginAPI.setTimeout(() => {
          lockMouseMovement();
          disableMouse();
          jsPsych.pluginAPI.setTimeout(() => {
            unlockMouseMovement();
            enableMouse();
          }, disruptionDuration);
        }, disruptionTime);
      }

      function showRedDot() {
        if (!trialRunning) return;
        redDotShown = true;
        const pos = getRandomPosition();
        const redDot = document.createElement("div");
        redDot.style.position = "absolute";
        redDot.style.width = "80px";
        redDot.style.height = "80px";
        redDot.style.borderRadius = "50%";
        redDot.style.backgroundColor = "#cc0000";
        redDot.style.left = `${pos.x}px`;
        redDot.style.top = `${pos.y}px`;
        //redDot.style.cursor = "pointer";

        redDot.addEventListener("click", () => {
          if (!trialRunning) return;
          redDotClicked = true;
          if (redDot.parentNode) display_element.removeChild(redDot);
        });

        display_element.appendChild(redDot);

        jsPsych.pluginAPI.setTimeout(() => {
          if (!redDotClicked && redDot.parentNode) {
            display_element.removeChild(redDot);
            score = 0;
            scoreCounter.innerText = `Score: ${score}`;
          }
        }, 1500);
      }

      jsPsych.pluginAPI.setTimeout(showRedDot, redDotDelay);

      jsPsych.pluginAPI.setTimeout(() => {
        trialRunning = false;
        for (let circle of circles) {
          if (circle.parentNode) display_element.removeChild(circle);
        }
        circles = [];
        removeFakeCursor();

        display_element.innerHTML = `
          <div style="text-align:center; font-size:40px; padding-top:20vh;">
            Current Score: ${score}
          </div>
        `;

        jsPsych.pluginAPI.setTimeout(() => {
          trial_data.final_score = score;
          trial_data.red_dot_clicked = redDotClicked;
          trial_data.disruption_type = trial.mouse_disruption_type;
          this.jsPsych.finishTrial(trial_data);
        }, 2000);

      }, trialDuration);
    }
  }

  CircleClickTaskPlugin.info = info;
  return CircleClickTaskPlugin;
})(jsPsychModule);
