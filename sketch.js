//this version has the golden fish, rounds with cooperation points, updated rules and scores pages, and a visual spiral timer instead of a countdown 

const serial = new p5.WebSerial();
let portButton;

let fish = [];
let ripples = [];
let timer = 10;
let lastTimeCheck = 0;
let gameOver = false;
let gameOverTime = 0;
let round = 1;
const maxRounds = 8;

let spiral;
let rulesEraser = false
let erasedRulesImage;

let soundEnabled = false;

let gameState = 'rules'; // Possible states: 'rules', 'game', 'scores', 'gameOver'
let debounceTime = 200; // Debounce duration in ms
let lastStateChange = 0; // Timestamp of the last state change


let waitingForInput = false;

// Rules screen control
let rulesImage;
let showRules = true;
let gameStarted = false;
let keyWasPressed = false;

// Button state tracking from serial
let button1 = 0, button2 = 0, button3 = 0, button4 = 0;
let prevButton1 = 0, prevButton2 = 0, prevButton3 = 0, prevButton4 = 0;

// Track cooperation for bonus points
let wasButton1Pressed = false;
let wasButton2Pressed = false;
let wasButton3Pressed = false;
let wasButton4Pressed = false;

let scorePopups = [];

let gameOverDelayStart = 0;
const GAME_OVER_DELAY = 500; // 5 seconds in milliseconds
let ignoreButtonPresses = false; // Flag to ignore initial button presses


// Add these global variables at the start
let goldenFishRound = 0; // The round where the golden fish will appear
let hasGoldenFishSpawned = false;

const PLAYER_COLORS = {
  yellow: '#F7B200',
  red: '#FF0000',
  blue: '#0000FF',
  green: '#10CC23'
};

let player1Yellow = 0;
let player2Red = 0;
let player3Blue = 0;
let player4Green = 0;

let isSplitting = false;
let splitStartTime = 0;
const splitDuration = 1000;

let plopSound;

function preload() {
  plopSound = loadSound('plop.wav')
  rulesImage = loadImage('rulesv3.png');
  //erasedRulesImage = loadImage('rulesErased.png');
}

function setup() {
  createCanvas(600, 600);
  background(100);
  textFont('monospace');

  spiral = new Spiral();

  // Initialize cooperation tracking flags
  wasButton1Pressed = false;
  wasButton2Pressed = false;
  wasButton3Pressed = false;
  wasButton4Pressed = false;


  for (let i = 0; i < 4; i++) {
    fish.push(new Fish(random(60, width - 60), random(60, height - 60)));
  }
}






function removeFish(index) {
  let removedFish = fish[index];
  let fishHead = removedFish.segments[0];
  ripples.push(new Ripple(fishHead.x, fishHead.y));
  fish.splice(index, 1);
}



function buttonPressed() {
  return keyIsDown(81) || keyIsDown(67) || keyIsDown(77) || keyIsDown(80);
}
function keyPressed() {

  if (gameState != 'game') {
    keyWasPressed = true;
  }
  else if (gameState == 'game' && fish.length > 0) {
    let selectedFish = fish[0];
    let fishType = selectedFish.type;
    let keyPressed = key.toUpperCase();

    if (keyPressed === 'Q') {
      removeFish(0);
      plopSound.play();
      player1Yellow += (fishType === 'golden' ? 3 : 1);
      scorePopups.push(new ScorePopup('yellow', 1));
      wasButton1Pressed = true;
    }
    if (keyPressed === 'C') {
      removeFish(0);
      plopSound.play();
      player4Green += (fishType === 'golden' ? 3 : 1);
      scorePopups.push(new ScorePopup('green', 1));
      wasButton4Pressed = true;
    }
    if (keyPressed === 'M') {
      removeFish(0);
      plopSound.play();
      player2Red += (fishType === 'golden' ? 3 : 1);
      scorePopups.push(new ScorePopup('red', 1));
      wasButton2Pressed = true;
    }
    if (keyPressed === 'P') {
      removeFish(0);
      plopSound.play();
      player3Blue += (fishType === 'golden' ? 3 : 1);
      scorePopups.push(new ScorePopup('blue', 1));
      wasButton3Pressed = true;
    }
  }
}


function draw() {
  if (millis() - lastStateChange < debounceTime) {
    return; // Ignore input during debounce
  }

  switch (gameState) {
    case 'rules':
      showRulesScreen();
      break;
    case 'game':
      playGame();
      break;
    case 'scores':
      showScoresScreen();
      break;
    case 'gameOver':
      showGameOverScreen();
      break;
  }
}

function showRulesScreen() {
  background("#111");
  imageMode(CENTER);

  let imgRatio = rulesImage.width / rulesImage.height;
  let canvasRatio = (width - 40) / (height - 40);

  let scaledWidth, scaledHeight;
  if (imgRatio > canvasRatio) {
    scaledWidth = width - 40;
    scaledHeight = (width - 40) / imgRatio;
  } else {
    scaledHeight = height - 40;
    scaledWidth = (height - 40) * imgRatio;
  }

  image(rulesImage, width / 2, height / 2, scaledWidth, scaledHeight);
  textAlign(CENTER, CENTER);
  textSize(24);
  fill(255);
  //text("Press any button to start", width / 2, height - 50);

  if (keyWasPressed) {
    lastStateChange = millis();
    gameState = 'game';
    resetGame(true); // Reset the game without awarding fish
  }
}

function playGame() {
  background("#c0eff5");

  if (timer > 0) {
    spiral.display(timer);
  }

  // Timer logic
  let now = millis();
  if (now - lastTimeCheck >= 1000) {
    timer--;
    lastTimeCheck = now;

    // Debug logging
    if (round === goldenFishRound) {
      console.log("Current round is golden fish round");
      console.log("Has golden spawned:", hasGoldenFishSpawned);
      console.log("Fish count:", fish.length);
      console.log("Golden fish exists:", fish.some(f => f.type === 'golden'));
    }
  }

  if (timer <= 0) {
    if (!gameOver && round <= maxRounds) {
      awardCooperationPoints();

      if (round < maxRounds) {
        doubleFish();
        round++;
        // Reset for next round
        resetCooperationFlags();
        timer = 10;
        lastTimeCheck = millis();

        // Check if we need to spawn golden fish for the new round
        if (round === goldenFishRound && !hasGoldenFishSpawned) {
          console.log("Starting golden fish round");
          fish.push(new Fish(random(60, width - 60), random(60, height - 60), null, 'golden'));
          hasGoldenFishSpawned = true;
        }
      } else {
        gameState = 'scores';
        lastStateChange = millis();
        return;
      }
    }

    timer = 10;
    resetCooperationFlags();
  }

  // Update and display fish
  for (let i = 0; i < fish.length; i++) {
    fish[i].update();
    fish[i].display();
  }

  // Update and display ripples
  for (let i = ripples.length - 1; i >= 0; i--) {
    ripples[i].update();
    ripples[i].display();
    if (ripples[i].isDead()) {
      ripples.splice(i, 1);
    }
  }

  // Update and display score popups
  for (let i = scorePopups.length - 1; i >= 0; i--) {
    scorePopups[i].update();
    scorePopups[i].display();
    if (scorePopups[i].isDead()) {
      scorePopups.splice(i, 1);
    }
  }

  // Draw game UI (border, scores, timer, etc.)
  drawBorderUI();

  // // Check for button presses to remove fish
  // if (!ignoreButtonPresses) {
  //   checkButtonPresses();
  // }

  // Handle game over condition
  if (fish.length === 0 && !gameOver) {
    gameOver = true;
    gameState = 'gameOver';
    lastStateChange = millis();
  }
}



function showScoresScreen() {
  background("#111");
  textFont('monospace');

  // Keep original scores array and sorting
  let scores = [
    { name: "Player 1 (Yellow - Q)", score: player1Yellow, color: PLAYER_COLORS.yellow },
    { name: "Player 2 (Red - M)", score: player2Red, color: PLAYER_COLORS.red },
    { name: "Player 3 (Blue - P)", score: player3Blue, color: PLAYER_COLORS.blue },
    { name: "Player 4 (Green - C)", score: player4Green, color: PLAYER_COLORS.green }
  ];
  scores.sort((a, b) => b.score - a.score);

  // Title
  textSize(32);
  fill(255);
  textAlign(CENTER, CENTER);
  text("FINAL SCORES", width / 2, 80);

  // Display scores
  const startY = 150;
  const lineSpacing = 80;
  textSize(28);

  for (let i = 0; i < scores.length; i++) {
    const y = startY + (i * lineSpacing);
    const score = scores[i];

    // Extract color name from the full name
    const colorName = score.name.match(/\((.*?)\)/)[1];

    // Draw color name
    noStroke()
    textAlign(LEFT);
    fill(score.color);
    text(colorName, 50, y);

    // Draw score
    textAlign(RIGHT);
    fill(255);

    text(`${score.score} points`, width - 50, y);

    // Draw separator
    stroke(255);
    strokeWeight(1);
    line(50, y + 30, width - 50, y + 30);
  }

  // Bottom text (keeping original functionality text)
  textSize(24);
  fill(255);
  textAlign(CENTER, CENTER);
  text("PRESS ANY KEY TO PLAY AGAIN", width / 2, height - 80);

  // Keep original state change logic
  if (keyWasPressed) {
    lastStateChange = millis();
    gameState = 'rules';
  }
}

function showGameOverScreen() {
  background("black");
  textSize(48);
  fill("red");
  textAlign(CENTER, CENTER);
  noStroke()
  text("You all lose.", width / 2, height / 2);
  textSize(24);
  fill("white");
  text("Press any button to continue", width / 2, height / 2 + 50);

  if (keyWasPressed) {
    lastStateChange = millis();
    gameState = 'rules';
  }
}







// Modify the doubleFish function to handle golden fish reproduction
function doubleFish() {
  let newFish = [];
  spiral.reset();

  for (let i = 0; i < fish.length; i++) {
    let parentFish = fish[i];
    let parentPos = parentFish.segments[0];

    if (parentFish.type === 'golden' && timer <= 0) {
      // Golden fish creates 3 normal fish at the end of the round
      for (let j = 0; j < 3; j++) {
        let angle = parentFish.angle + (TWO_PI / 3) * j;
        let newFishObj = new Fish(parentPos.x, parentPos.y, angle);
        newFishObj.startSplitting(angle);
        newFish.push(newFishObj);
      }
      // Remove the golden fish
      fish.splice(i, 1);
      i--;
    } else if (parentFish.type !== 'golden' && fish.length + newFish.length < 8) {
      // Normal fish splitting behavior - only if under population limit
      let splitAngle1 = parentFish.angle + PI / 4;
      let splitAngle2 = parentFish.angle - PI / 4;

      parentFish.startSplitting(splitAngle1);

      let newFishObj = new Fish(parentPos.x, parentPos.y, parentFish.angle);
      newFishObj.startSplitting(splitAngle2);
      newFish.push(newFishObj);
    }
  }

  fish = fish.concat(newFish);
  isSplitting = true;
  splitStartTime = millis();
}

function resetGame(resetRound = false) {
  if (resetRound) {
    round = 1;
    player1Yellow = 0;
    player2Red = 0;
    player3Blue = 0;
    player4Green = 0;
    // Set which round the golden fish will appear (between rounds 2-7)
    goldenFishRound = Math.floor(random(2, 7)); // Changed to 2-7 to ensure it happens before final round
    hasGoldenFishSpawned = false;
    console.log("Game reset. Golden fish will appear in round:", goldenFishRound);
  }

  spiral.reset();

  gameOver = false;
  timer = 10;
  lastTimeCheck = millis();
  fish = [];
  scorePopups = [];
  ripples = [];

  // Reset cooperation tracking
  wasButton1Pressed = false;
  wasButton2Pressed = false;
  wasButton3Pressed = false;
  wasButton4Pressed = false;

  button1 = button2 = button3 = button4 = 0;
  prevButton1 = prevButton2 = prevButton3 = prevButton4 = 0;
  ignoreButtonPresses = false;

  // Initialize starting fish
  for (let i = 0; i < 4; i++) {
    fish.push(new Fish(random(60, width - 60), random(60, height - 60)));
  }
}



function displayFinalScores() {
  if (!gameStarted) return;

  background("#111");
  textFont('monospace');

  let scores = [
    { name: "Player 1 (Yellow)", score: player1Yellow, color: PLAYER_COLORS.yellow },
    { name: "Player 2 (Red)", score: player2Red, color: PLAYER_COLORS.red },
    { name: "Player 3 (Blue)", score: player3Blue, color: PLAYER_COLORS.blue },
    { name: "Player 4 (Green)", score: player4Green, color: PLAYER_COLORS.green }
  ];

  // Keep original sort logic
  scores.sort((a, b) => b.score - a.score);

  // Title
  textSize(32);
  fill(255);
  textAlign(CENTER, CENTER);
  text("FINAL SCORES", width / 2, 80);

  // Score display
  const startY = 200;
  const lineSpacing = 80;
  textSize(28);

  for (let i = 0; i < scores.length; i++) {
    const y = startY + (i * lineSpacing);
    const score = scores[i];

    // Extract player color name from the full name
    const colorName = score.name.match(/\((.*?)\)/)[1];

    // Draw player color name
    textAlign(LEFT);
    fill(score.color);
    text(colorName, 50, y);

    // Draw points
    textAlign(RIGHT);
    fill(255);
    text(`${score.score} points`, width - 50, y);

    // Draw separator line
    stroke(255);
    strokeWeight(1);
    line(50, y + 30, width - 50, y + 30);
  }

  // Bottom text
  textSize(24);
  fill(255);
  // textAlign(CENTER, CENTER);
  //text("PRESS ANY BUTTON TO PLAY AGAIN", width/2, height - 80);

  // Keep original state management
  if (button1 === 1 || button2 === 1 || button3 === 1 || button4 === 1) {
    resetGame(true);
    showRules = true;
    gameStarted = false;
    gameOver = false;
  }
}



// Ripple class
class Ripple {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.diameter = 20;
    this.maxDiameter = 100;
    this.opacity = 255;
    this.speed = 3;
  }

  update() {
    this.diameter += this.speed;
    this.opacity -= 6;
  }

  display() {
    noFill();
    stroke(255, this.opacity);
    strokeWeight(2);
    circle(this.x, this.y, this.diameter);
    circle(this.x, this.y, this.diameter - 20);
    circle(this.x, this.y, this.diameter - 40);
  }

  isDead() {
    return this.opacity <= 0;
  }
}

function styleLabel() {


}


function drawBorderUI() {
  push();

  // Draw the top bar
  fill(0);
  noStroke();
  rect(0, 0, width, 50);

  fill(0);
  // Draw the left and right black side bars 
  rect(0, 0, 40, height); // Left bar
  rect(width - 40, 0, 40, height); // Right bar

  // Display game title in top left
  textFont('monospace');
  textSize(18);
  fill(255);
  textAlign(LEFT, CENTER);
  fill(255, 220);

  text("Reel It In", 40, 27);

  // Display round count in top right
  textAlign(RIGHT, CENTER);
  text(`Round  ${round}/${maxRounds}`, width - 40, 27);


  // Draw the bottom black bar
  fill(0)
  rect(0, height - 50, width, 50);



  // Define score UI parameters
  const scoreSpacing = width / 4;
  const yPos = height - 25;
  textSize(18);
  textAlign(LEFT, CENTER);

  // Function to draw each player's score
  function drawPlayerScore(label, score, xPos, color) {
    fill(color);
    textStyle(BOLD);
    text(label, xPos, yPos);
    fill(255, 240);
    textStyle(NORMAL);
    text(" " + score + " pts", xPos + 20, yPos);  // 12px to the right (roughly adjusted)
  }

  let spacer = 35
  // Draw player scores at bottom
  drawPlayerScore("Q: ", player1Yellow, scoreSpacing * 0.5 - spacer, "#F7B200");
  drawPlayerScore("C: ", player4Green, scoreSpacing * 1.5 - spacer, "#10CC23");
  drawPlayerScore("M:", player2Red, scoreSpacing * 2.5 - spacer, "#FF0000");
  drawPlayerScore("P: ", player3Blue, scoreSpacing * 3.5 - spacer - 10, "#6A6AFF");





  pop();

}



class ScorePopup {

  constructor(side, points = 1) {
    this.opacity = 255;
    this.age = 0;
    this.side = side;
    this.speed = 0;
    this.points = points;

    switch (side) {
      case 'yellow':
        this.x = 75;
        this.y = height - 60;
        this.moveX = 0;
        this.moveY = -1;
        this.color = color(PLAYER_COLORS.yellow);
        break;
      case 'green':
        this.x = width / 2 - 75;
        this.y = height - 60;
        this.moveX = 0;
        this.moveY = -1;
        this.color = color(PLAYER_COLORS.green);
        break;
      case 'red':
        this.x = width / 2 + 75;
        this.y = height - 60;
        this.moveX = 0;
        this.moveY = -1;
        this.color = color(PLAYER_COLORS.red);
        break;
      case 'blue':
        this.x = width - 75;
        this.y = height - 60;
        this.moveX = 0;
        this.moveY = -1;
        this.color = color(PLAYER_COLORS.blue);
        break;

    }
  }

  update() {
    this.age++;
    if (this.age > 30) {
      this.speed += 0.2;
      this.x += this.moveX * this.speed;
      this.y += this.moveY * this.speed;
      this.opacity -= 8;
    }
  }

  display() {
    push();
    textAlign(CENTER, CENTER);
    textSize(24);
    textStyle(BOLD);
    noStroke();

    translate(this.x, this.y);
    rotate(this.rotation);

    fill(this.color, this.opacity);

    text(`+${this.points}`, 0, 0);
    pop();
  }

  isDead() {
    return this.opacity <= 0;
  }
}


function awardCooperationPoints() {
  if (!wasButton1Pressed) {
    player1Yellow += 2;
    scorePopups.push(new ScorePopup('yellow', 2));
  }
  if (!wasButton2Pressed) {
    player2Red += 2;
    scorePopups.push(new ScorePopup('red', 2));
  }
  if (!wasButton3Pressed) {
    player3Blue += 2;
    scorePopups.push(new ScorePopup('blue', 2));
  }
  if (!wasButton4Pressed) {
    player4Green += 2;
    scorePopups.push(new ScorePopup('green', 2));
  }
}

function resetCooperationFlags() {
  wasButton1Pressed = false;
  wasButton2Pressed = false;
  wasButton3Pressed = false;
  wasButton4Pressed = false;
}


class Spiral {
  constructor() {
    this.totalEllipses = 800;
    this.maxRadius = 200;
    this.ellipseSize = 20;
    this.color = color("#9ED8DF"); // color
    this.startTime = millis(); // Store start time for smooth animation
  }

  display(timerValue) {
    push();
    noStroke();
    fill(this.color);

    // Calculate precise time remaining including fractions of a second
    let currentTime = millis();
    let elapsedTime = (currentTime - this.startTime) / 1000; // Convert to seconds
    let preciseTimeRemaining = 10 - (elapsedTime % 10);

    // Calculate how many ellipses to draw based on precise time
    let ellipsesToDraw = map(preciseTimeRemaining, 0, 10, 0, this.totalEllipses);

    // Draw each ellipse in the spiral
    for (let i = ellipsesToDraw; i > 0; i--) {
      // Map the i-th ellipse to its angle (3 full rotations)
      let t = map(i, 0, this.totalEllipses, 0, TWO_PI * 3);

      // Calculate radius for this ellipse
      let radius = map(i, 0, this.totalEllipses, 0, this.maxRadius);

      // Calculate position using polar coordinates
      let x = width / 2 + radius * cos(t);
      let y = height / 2 + radius * sin(t);

      // Draw the ellipse
      ellipse(x, y, this.ellipseSize, this.ellipseSize);
    }

    pop();
  }

  reset() {
    this.startTime = millis(); // Reset the start time
  }
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(random(i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function drawMetric(label, value, x, y, labelColor, valueColor, labelStyle = BOLD, valueStyle = NORMAL) {
  fill(labelColor);
  textStyle(labelStyle);
  text(label, x, y);

  fill(valueColor);
  textStyle(valueStyle);
  text(value, x + 24, y);  // Space between label and value
}
