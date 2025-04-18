var jsPsychCircleClickTask = (function (jspsych) {
  "use strict";

  const info = {
    name: "circle-click",
    version: "0.0.1",
    parameters: {
      /** Parameter template */
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
      /** Provide a clear description of the data1 that could be used as documentation. We will eventually use these comments to automatically build documentation and produce metadata. */
      final_score: {
        type: jspsych.ParameterType.INT,
      }, 
      red_dot_clicked: {
        type: jspsych.ParameterType.BOOL,
      },
    },
  };

  /**
   * **plugin-cicle-click-task**
   *
   * A plugin that creates circles on the screen which add to a cumulative score when clicked
   *
   * @author James Hatch
   * @see {@link /plugin-cicle-click-task/README.md}
   */
  class CircleClickTaskPlugin {
    constructor(jsPsych) {
      this.jsPsych = jsPsych;
    }
    trial(display_element, trial) {
      //establishing non-exported variables
      const numCircles = 10;
      const trialDuration = 15000; // 15 seconds
      let circles = [];
      let trialRunning = true;
      let score = trial.starting_score || 0;
      let redDotShown = false;
      let redDotClicked = false;

      var trial_data = {
        //establishing variables to export
        final_score: 0, 
      };

      // Set up score display
      const scoreCounter = document.createElement("div");
      scoreCounter.style.position = "fixed";
      scoreCounter.style.top = "20px";
      scoreCounter.style.right = "20px";
      scoreCounter.style.fontSize = "24px";
      scoreCounter.style.fontWeight = "bold";
      scoreCounter.innerText = "Score: 0";
      display_element.appendChild(scoreCounter);

      // Get a random position
      function getRandomPosition() {
        const padding = 60;
        const x = Math.random() * (window.innerWidth - padding);
        const y = Math.random() * (window.innerHeight - padding);
        return { x, y };
      }

      //disable mouse cursor
      function disableMouse() {
        document.body.style.pointerEvents = "none";
      }
      
      //enable mouse cursor
      function enableMouse() {
        document.body.style.pointerEvents = "auto";
      }

      // Create a single clickable circle
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
        circle.style.cursor = "pointer";

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

      // Mouse Disruption Tools
      let fakeCursor;
      let lastMouseX = 0;
      let lastMouseY = 0;


      function trackMouse(e) {
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        if (fakeCursor) {
          fakeCursor.style.left = `${lastMouseX}px`;
          fakeCursor.style.top = `${lastMouseY}px`;
        }
      }

      function freezeMouse(e) {
        if (fakeCursor) {
          fakeCursor.style.left = `${lastMouseX}px`;
          fakeCursor.style.top = `${lastMouseY}px`;
        }
      }

      function setupFakeCursor() {
        fakeCursor = document.createElement("div");
        fakeCursor.style.position = "fixed";
        fakeCursor.style.width = "20px";
        fakeCursor.style.height = "20px";
        fakeCursor.style.backgroundColor = "black";
        fakeCursor.style.borderRadius = "50%";
        fakeCursor.style.zIndex = "9999";
        fakeCursor.style.pointerEvents = "none";
        fakeCursor.style.left = "0px"; 
        fakeCursor.style.top = "0px"; 
        document.body.appendChild(fakeCursor);
        
        // Add global style to hide the cursor
        const style = document.createElement("style");
        style.id = "hide-cursor-style";
        style.innerHTML = `
          html, body, * {
            cursor: none !important;
          }
        `;
        document.head.appendChild(style);
      
        document.addEventListener("mousemove", trackMouse);
      }

      function lockMouseMovement() {
        document.removeEventListener("mousemove", trackMouse);
        document.addEventListener("mousemove", freezeMouse);
      }

      function unlockMouseMovement() {
        document.removeEventListener("mousemove", freezeMouse);
        document.addEventListener("mousemove", trackMouse);
      }

      function removeFakeCursor() {
        document.body.style.cursor = "auto";
        
        // Remove global cursor hiding style
        const style = document.getElementById("hide-cursor-style");
        if (style) style.remove();
      
        // Remove the fake cursor div
        if (fakeCursor && fakeCursor.parentNode) {
          fakeCursor.parentNode.removeChild(fakeCursor);
        }
      
        document.removeEventListener("mousemove", trackMouse);
        document.removeEventListener("mousemove", freezeMouse);
      }

      function disableMouse() {
        display_element.style.pointerEvents = "none";
      }

      function enableMouse() {
        display_element.style.pointerEvents = "auto";
      }

      if (trial.mouse_disruption_type >= 1) {
        console.log("Setting up fake cursor");
        setupFakeCursor();
      }

      for (let i = 0; i < numCircles; i++) {
        createCircle();
      }


      // delay of 2.5 seconds (starts 1.25 seconds before the red dot)
      // red dot shows up for 2 seconds
      // red dot can appear between +1.25 from the start and -2 seconds before the end
      // delay can occur from the start to -3.5 seconds from the end

      //time that the red dot can occur
      const redDotDelay = ((Math.random() * 12250) + 1250);

      const showRedDot = () => {
        if (!trialRunning) return;
        redDotShown = true;

        //time of the delay
        if (trial.mouse_disruption_type == 3) {
          lockMouseMovement();
          disableMouse();
          setTimeout(() => {
            unlockMouseMovement();
            enableMouse();
          }, redDotDelay - 1250);
        }

        const pos = getRandomPosition();
        const redDot = document.createElement("div");
        redDot.style.position = "absolute";
        redDot.style.width = "80px";
        redDot.style.height = "80px";
        redDot.style.borderRadius = "50%";
        redDot.style.backgroundColor = "#cc0000";
        redDot.style.left = `${pos.x}px`;
        redDot.style.top = `${pos.y}px`;
        redDot.style.cursor = "pointer";

        redDot.addEventListener("click", () => {
          if (!trialRunning) return;
          redDotClicked = true;
          if (redDot.parentNode) display_element.removeChild(redDot);
        });

        display_element.appendChild(redDot);

        //time that the dot is on the screen
        jsPsych.pluginAPI.setTimeout(() => {
          if (!redDotClicked && redDot.parentNode) {
            display_element.removeChild(redDot);
            score = 0;
            scoreCounter.innerText = `Score: ${score}`;
          }
        }, 2000);
      };

      jsPsych.pluginAPI.setTimeout(showRedDot, redDotDelay);

      //time of the delay, time the dot is on the screen
      if (trial.mouse_disruption_type == 2) {
        let disruptionTime;
        do {
          disruptionTime = Math.random() * trialDuration;
        } while (disruptionTime >= redDotDelay - 1250 && disruptionTime <= redDotDelay + 3500);

        jsPsych.pluginAPI.setTimeout(() => {
          lockMouseMovement();
          disableMouse();
          setTimeout(() => {
            unlockMouseMovement();
            enableMouse();
          }, 2500);
        }, disruptionTime);
      }

      jsPsych.pluginAPI.setTimeout(() => {
        trialRunning = false;

        for (let circle of circles) {
          if (circle.parentNode) {
            display_element.removeChild(circle);
          }
        }
        circles = [];

        removeFakeCursor();

        // Show final score
        display_element.innerHTML = `
          <div style="text-align:center; font-size:40px; padding-top:20vh;">
            Final Score: ${score}
          </div>
        `;

         // Wait a moment before ending the trial (optional)  
        jsPsych.pluginAPI.setTimeout(() => {
          trial_data.final_score = score;
          trial_data.red_dot_clicked = redDotClicked;
          this.jsPsych.finishTrial(trial_data);
        }, 2000); // 2 second delay to show final score

      }, trialDuration);
    }
  }
  CircleClickTaskPlugin.info = info
  
  return CircleClickTaskPlugin;
})(jsPsychModule);
