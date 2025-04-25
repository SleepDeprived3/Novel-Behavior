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
      const trialDuration = 10000; // 10s
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
        const padding = 100;
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
        // addEventListenerWithTracking(document, 'pointerlockerror', pointerLockErrorHandler);
        addEventListenerWithTracking(document, 'click', simulateClickAtCursor);
      }
  
      function pointerLockChangeHandler() {
        if (document.pointerLockElement === display_element) {
          isMouseLocked = true;
        } else {
          isMouseLocked = false;
        }
      }
      
      function pointerLockErrorHandler(e) {
        console.warn("Pointer lock failed", e);
      }

      function lockMouseMovement() {
        isMovementFrozen = true;
      }

      function unlockMouseMovement() {
        isMovementFrozen = false;
      }

      // Add a flag to prevent infinite recursion of click events
      let isSimulatingClick = false;
      
      // Add a click simulation for circles and red dot when pointer is locked
      function simulateClickAtCursor(e) {
        // Only process real clicks (not our own simulated ones)
        if (!isMouseLocked || isSimulatingClick || e.isTrusted === false) return;
        
        isSimulatingClick = true;
        
        // Create a click event at the cursor position
        const clickEvent = new MouseEvent('click', {
          bubbles: true,
          cancelable: true,
          clientX: lastMouseX,
          clientY: lastMouseY,
          isTrusted: false // Mark as programmatic click
        });
        
        // Find element at cursor position
        const elementAtPoint = document.elementFromPoint(lastMouseX, lastMouseY);
        if (elementAtPoint) {
          elementAtPoint.dispatchEvent(clickEvent);
        }
        
        isSimulatingClick = false;
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
      
      // Store jsPsych instance and this reference for later use
      const plugin = this;

      function setupPointerLockEvents(){
        // Add event listeners for pointer lock changes
        addEventListenerWithTracking(document, 'pointerlockchange', pointerLockChangeHandler);
        addEventListenerWithTracking(document, 'pointerlockerror', pointerLockErrorHandler);
      }
      
      // Show a start dot that the user must click to begin the trial
      function showStartDot() {
        const startDot = document.createElement("div");
        startDot.id = "start-dot";
        startDot.style.position = "absolute";
        startDot.style.width = "100px";
        startDot.style.height = "100px";
        startDot.style.borderRadius = "50%";
        startDot.style.backgroundColor = "#6aa84f";
        startDot.style.left = "50%";
        startDot.style.top = "50%";
        startDot.style.transform = "translate(-50%, -50%)";
        startDot.style.cursor = "pointer";
        startDot.style.display = "flex";
        startDot.style.alignItems = "center";
        startDot.style.justifyContent = "center";
        startDot.style.color = "white";
        startDot.style.fontWeight = "bold";
        startDot.style.userSelect = "none";
        startDot.innerHTML = "Click to<br>Start";
        startDot.style.textAlign = "center";
        
        startDot.addEventListener("click", () => {
          
          setupPointerLockEvents();
          
          // Request pointer lock within user gesture (more Safari friendly)
          
          display_element.requestPointerLock();
          
          if (document.pointerLockElement === display_element) {
            console.log("Pointer lock requested successfully.");
          }

          display_element.removeChild(startDot);

          // Setup fake cursor after user interaction
          setupFakeCursor();
          
          // Start the main trial
          startMainTrial();
        });
        
        display_element.appendChild(startDot);
      }
      
      // Function to start the main trial after clicking the start dot
      function startMainTrial() {

        const disruptionDuration = 2000;

        // Create all the circles
        for (let i = 0; i < numCircles; i++) {
          createCircle();
        }
        
        // Set up the red dot timing
        // between 2s and trialDuration - 1.25s
        const redDotDelay = Math.round(Math.random() * (trialDuration - 3250)) + 2000;
        
        // Set up disruption timing based on trial type
        if (trial.mouse_disruption_type === 3) {
          const disruptionStart = redDotDelay - 1500;
          if (disruptionStart >= 0) {
            plugin.jsPsych.pluginAPI.setTimeout(() => {
              lockMouseMovement();
              disableMouse();
              plugin.jsPsych.pluginAPI.setTimeout(() => {
                unlockMouseMovement();
                enableMouse();
              }, 2000);
            }, disruptionStart);
          }
        }
        
        if (trial.mouse_disruption_type === 2) {
          const disruptionBufferBeforeRedDot = 2000;
          const disruptionBufferAfterRedDot = 2000;
          let disruptionTime;

          const beforeDotWindowStart = 0;
          const beforeDotWindowEnd = redDotDelay - disruptionBufferBeforeRedDot;
          const afterDotWindowStart = redDotDelay + disruptionBufferAfterRedDot;
          const afterDotWindowEnd = trialDuration - disruptionDuration;

          // Randomly select a disruption time within the allowed windows
          if(Math.random() < 0.5) {
            disruptionTime = Math.round(Math.random() * (beforeDotWindowEnd - beforeDotWindowStart)) + beforeDotWindowStart;
          } else {
            disruptionTime = Math.round(Math.random() * (afterDotWindowEnd - afterDotWindowStart)) + afterDotWindowStart;
          }

          plugin.jsPsych.pluginAPI.setTimeout(() => {
            lockMouseMovement();
            disableMouse();
            plugin.jsPsych.pluginAPI.setTimeout(() => {
              unlockMouseMovement();
              enableMouse();
            }, disruptionDuration);
          }, disruptionTime);

          trial_data.disruption_time = disruptionTime;
          trial_data.red_dot_delay = redDotDelay;
        }
        
        // Schedule red dot appearance
        function showRedDot() {
          if (!trialRunning) return;

          const pos = getRandomPosition();
          const redDot = document.createElement("div");
          redDot.style.position = "absolute";
          redDot.style.width = "80px";
          redDot.style.height = "80px";
          redDot.style.borderRadius = "50%";
          redDot.style.backgroundColor = "red";
          redDot.style.left = `${pos.x}px`;
          redDot.style.top = `${pos.y}px`;

          redDot.addEventListener("click", () => {
            if (!trialRunning) return;
            redDotClicked = true;
            display_element.removeChild(redDot);
          });

          display_element.appendChild(redDot);
          redDotShown = true;

          // Remove the red dot after 2 seconds if not clicked
          plugin.jsPsych.pluginAPI.setTimeout(() => {
            if (redDot.parentNode) {
              display_element.removeChild(redDot);
              score = 0;
            }
          }, 2000);
        }

        plugin.jsPsych.pluginAPI.setTimeout(showRedDot, redDotDelay);
        
        // Set trial timeout - critical for ending the trial properly
        plugin.jsPsych.pluginAPI.setTimeout(() => {
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
          
          // Use plugin reference to access the jsPsych instance
          plugin.jsPsych.pluginAPI.setTimeout(() => {
            trial_data.final_score = score;
            trial_data.red_dot_clicked = redDotClicked;
            trial_data.disruption_type = trial.mouse_disruption_type;
            plugin.jsPsych.finishTrial(trial_data);
          }, 2000);
        }, trialDuration);
      }
      
      // Initialize the trial with the start dot instead of immediately creating circles
      showStartDot();
    }
  }

  CircleClickTaskPlugin.info = info;
  return CircleClickTaskPlugin;
})(jsPsychModule);
