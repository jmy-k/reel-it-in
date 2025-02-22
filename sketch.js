//this version has the golden fish, rounds with cooperation points, updated rules and scores pages, and a visual spiral timer instead of a countdown. adjusted for use by keyboard instead of the arcade table

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
let rulesEraser = false;
let erasedRulesImage;

let soundEnabled = false;

let gameState = "gameplayRules";
let debounceTime = 200;
let lastStateChange = 0;

let waitingForInput = false;

let rulesImage;
let showRules = true;
let gameStarted = false;

// Button state tracking from serial
let button1 = 0,
  button2 = 0,
  button3 = 0,
  button4 = 0;
let prevButton1 = 0,
  prevButton2 = 0,
  prevButton3 = 0,
  prevButton4 = 0;

let wasButton1Pressed = false;
let wasButton2Pressed = false;
let wasButton3Pressed = false;
let wasButton4Pressed = false;

let scorePopups = [];

let gameOverDelayStart = 0;
const GAME_OVER_DELAY = 500;
let ignoreButtonPresses = false;

let goldenFishRound = 0;
let hasGoldenFishSpawned = false;

const PLAYER_COLORS = {
  yellow: "#F7B200",
  red: "#FF0000",
  blue: "#0000FF",
  green: "#10CC23",
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
  plopSound = loadSound("plop.wav");
  rulesImage = loadImage("rulesv4.png");
  gameplayImage = loadImage("gameplay.png");
}

function setup() {
  createCanvas(600, 600);
  background(100);
  textFont("monospace");

  spiral = new Spiral();

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
  if (gameState === "gameplayRules") {
    gameState = "rules";
    lastStateChange = millis();
    return;
  }
  if (gameState === "rules") {
    gameState = "game";
    lastStateChange = millis();
    resetGame(true);
    return;
  }
  if (gameState === "scores") {
    gameState = "gameplayRules";
    lastStateChange = millis();
    return;
  }

  else if (fish.length > 0) {
    let selectedFish = fish[0];
    let fishType = selectedFish.type;
    let keyPressed = key.toUpperCase();
    let points = fishType === "golden" ? 3 : 1;

    if (keyPressed === "Q") {
      removeFish(0);
      plopSound.play();
      player1Yellow += fishType === "golden" ? 3 : 1;
      scorePopups.push(new ScorePopup("yellow", points));
      wasButton1Pressed = true;
    }
    if (keyPressed === "C") {
      removeFish(0);
      plopSound.play();
      player4Green += fishType === "golden" ? 3 : 1;
      scorePopups.push(new ScorePopup("green", points));
      wasButton4Pressed = true;
    }
    if (keyPressed === "M") {
      removeFish(0);
      plopSound.play();
      player2Red += fishType === "golden" ? 3 : 1;
      scorePopups.push(new ScorePopup("red", points));
      wasButton2Pressed = true;
    }
    if (keyPressed === "P") {
      removeFish(0);
      plopSound.play();
      player3Blue += fishType === "golden" ? 3 : 1;
      scorePopups.push(new ScorePopup("blue", points));
      wasButton3Pressed = true;
    }
  }
}

function draw() {
  if (millis() - lastStateChange < debounceTime) {
    return;
  }

  switch (gameState) {
    case "gameplayRules":
      showGameplayScreen();
      console.log("gameplay")
      break;
    case "rules":
      showRulesScreen();
      console.log("rules")
      break;
    case "game":
      playGame();
      console.log("game")
      break;
    case "scores":
      showScoresScreen();
      console.log("scores")
      break;
    case "gameOver":
      showGameOverScreen();
      console.log("game over")
      break;
  }
}

function showGameplayScreen() {
  background("#111");
  imageMode(CENTER);
  image(gameplayImage, width / 2, height / 2, width - 40, height - 40);
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
}

function playGame() {
  background("#c0eff5");

  if (timer > 0) {
    spiral.display(timer);
  }

  let now = millis();
  if (now - lastTimeCheck >= 1000) {
    timer--;
    lastTimeCheck = now;

    if (round === goldenFishRound) {
      console.log("Current round is golden fish round");
      console.log("Has golden spawned:", hasGoldenFishSpawned);
      console.log("Fish count:", fish.length);
      console.log(
        "Golden fish exists:",
        fish.some((f) => f.type === "golden")
      );
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

        if (round === goldenFishRound && !hasGoldenFishSpawned) {
          fish.push(
            new Fish(
              random(60, width - 60),
              random(60, height - 60),
              null,
              "golden"
            )
          );
          hasGoldenFishSpawned = true;

          fish = shuffleArray(fish);
        }
      } else {
        gameState = "scores";
        lastStateChange = millis();
        return;
      }
    }

    timer = 10;
    resetCooperationFlags();
  }

  for (let i = 0; i < fish.length; i++) {
    fish[i].update();
    fish[i].display();
  }

  for (let i = ripples.length - 1; i >= 0; i--) {
    ripples[i].update();
    ripples[i].display();
    if (ripples[i].isDead()) {
      ripples.splice(i, 1);
    }
  }

  for (let i = scorePopups.length - 1; i >= 0; i--) {
    scorePopups[i].update();
    scorePopups[i].display();
    if (scorePopups[i].isDead()) {
      scorePopups.splice(i, 1);
    }
  }

  drawBorderUI();

  if (fish.length === 0 && !gameOver) {
    gameOver = true;
    gameState = "gameOver";
    lastStateChange = millis();
  }
}

function showScoresScreen() {
  background("#111");
  textFont("monospace");

  let scores = [
    {
      name: "Player 1 (Yellow - Q)",
      score: player1Yellow,
      color: PLAYER_COLORS.yellow,
    },
    { name: "Player 2 (Red - M)", score: player2Red, color: PLAYER_COLORS.red },
    {
      name: "Player 3 (Blue - P)",
      score: player3Blue,
      color: PLAYER_COLORS.blue,
    },
    {
      name: "Player 4 (Green - C)",
      score: player4Green,
      color: PLAYER_COLORS.green,
    },
  ];
  scores.sort((a, b) => b.score - a.score);

  textSize(32);
  fill(255);
  textAlign(CENTER, CENTER);
  text("FINAL SCORES", width / 2, 80);

  const startY = 150;
  const lineSpacing = 80;
  textSize(28);

  for (let i = 0; i < scores.length; i++) {
    const y = startY + i * lineSpacing;
    const score = scores[i];

    const colorName = score.name.match(/\((.*?)\)/)[1];

    noStroke();
    textAlign(LEFT);
    fill(score.color);
    text(colorName, 50, y);

    textAlign(RIGHT);
    fill(255);

    text(`${score.score} points`, width - 50, y);

    stroke(255);
    strokeWeight(1);
    line(50, y + 30, width - 50, y + 30);
  }

  textSize(24);
  fill(255);
  textAlign(CENTER, CENTER);
  text("PRESS ANY KEY TO PLAY AGAIN", width / 2, height - 80);

  // if (buttonPressed()) {
  //   lastStateChange = millis();
  //   gameState = "rules";
  // }
}

function showGameOverScreen() {
  background("black");
  textSize(48);
  fill("red");
  textAlign(CENTER, CENTER);
  noStroke();
  text("You all lose.", width / 2, height / 2);
  textSize(24);
  fill("white");
  text("Press any button to continue", width / 2, height / 2 + 50);

  if (keyIsPressed) {
    lastStateChange = millis();
    gameState = "gameplayRules";
  }
}

function doubleFish() {
  let newFish = [];
  spiral.reset();

  for (let i = 0; i < fish.length; i++) {
    let parentFish = fish[i];
    let parentPos = parentFish.segments[0];

    if (parentFish.type === "golden" && timer <= 0) {
      for (let j = 0; j < 3; j++) {
        let angle = parentFish.angle + (TWO_PI / 3) * j;
        let newFishObj = new Fish(parentPos.x, parentPos.y, angle);
        newFishObj.startSplitting(angle);
        newFish.push(newFishObj);
      }
      fish.splice(i, 1);
      i--;
    } else if (
      parentFish.type !== "golden" &&
      fish.length + newFish.length < 8
    ) {
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

    goldenFishRound = Math.floor(random(2, 7));
    hasGoldenFishSpawned = false;
    console.log(
      "Game reset. Golden fish will appear in round:",
      goldenFishRound
    );
  }

  spiral.reset();

  gameOver = false;
  timer = 10;
  lastTimeCheck = millis();
  fish = [];
  scorePopups = [];
  ripples = [];

  wasButton1Pressed = false;
  wasButton2Pressed = false;
  wasButton3Pressed = false;
  wasButton4Pressed = false;

  button1 = button2 = button3 = button4 = 0;
  prevButton1 = prevButton2 = prevButton3 = prevButton4 = 0;
  ignoreButtonPresses = false;

  for (let i = 0; i < 4; i++) {
    fish.push(new Fish(random(60, width - 60), random(60, height - 60)));
  }
}

function displayFinalScores() {
  if (!gameStarted) return;

  background("#111");
  textFont("monospace");

  let scores = [
    {
      name: "Player 1 (Yellow)",
      score: player1Yellow,
      color: PLAYER_COLORS.yellow,
    },
    { name: "Player 2 (Red)", score: player2Red, color: PLAYER_COLORS.red },
    { name: "Player 3 (Blue)", score: player3Blue, color: PLAYER_COLORS.blue },
    {
      name: "Player 4 (Green)",
      score: player4Green,
      color: PLAYER_COLORS.green,
    },
  ];

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
    const y = startY + i * lineSpacing;
    const score = scores[i];

    const colorName = score.name.match(/\((.*?)\)/)[1];

    textAlign(LEFT);
    fill(score.color);
    text(colorName, 50, y);

    textAlign(RIGHT);
    fill(255);
    text(`${score.score} points`, width - 50, y);

    stroke(255);
    strokeWeight(1);
    line(50, y + 30, width - 50, y + 30);
  }

  textSize(24);
  fill(255);

  if (button1 === 1 || button2 === 1 || button3 === 1 || button4 === 1) {
    resetGame(true);
    showRules = true;
    gameStarted = false;
    gameOver = false;
  }
}

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

function styleLabel() { }

function drawBorderUI() {
  push();

  fill(0);
  noStroke();
  rect(0, 0, width, 50);

  fill(0);
  rect(0, 0, 40, height); // Left bar
  rect(width - 40, 0, 40, height); // Right bar

  textFont("monospace");
  textSize(18);
  fill(255);
  textAlign(LEFT, CENTER);
  fill(255, 220);

  text("Reel It In", 40, 27);

  textAlign(RIGHT, CENTER);
  text(`Round  ${round}/${maxRounds}`, width - 40, 27);

  fill(0);
  rect(0, height - 50, width, 50);

  const scoreSpacing = width / 4;
  const yPos = height - 25;
  textSize(18);
  textAlign(LEFT, CENTER);

  function drawPlayerScore(label, score, xPos, color) {
    fill(color);
    textStyle(BOLD);
    text(label, xPos, yPos);
    fill(255, 240);
    textStyle(NORMAL);
    text(" " + score + " pts", xPos + 20, yPos);
  }

  let spacer = 35;
  drawPlayerScore("Q: ", player1Yellow, scoreSpacing * 0.5 - spacer, "#F7B200");
  drawPlayerScore("C: ", player4Green, scoreSpacing * 1.5 - spacer, "#10CC23");
  drawPlayerScore("M:", player2Red, scoreSpacing * 2.5 - spacer, "#FF0000");
  drawPlayerScore(
    "P: ",
    player3Blue,
    scoreSpacing * 3.5 - spacer - 10,
    "#6A6AFF"
  );

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
      case "yellow":
        this.x = 75;
        this.y = height - 60;
        this.moveX = 0;
        this.moveY = -1;
        this.color = color(PLAYER_COLORS.yellow);
        break;
      case "red":
        this.x = width / 2 + 75;
        this.y = height - 60;
        this.moveX = 0;
        this.moveY = -1;
        this.color = color(PLAYER_COLORS.red);
        break;
      case "blue":
        this.x = width - 75;
        this.y = height - 60;
        this.moveX = 0;
        this.moveY = -1;
        this.color = color(PLAYER_COLORS.blue);
        break;
      case "green":
        this.x = width / 2 - 75;
        this.y = height - 60;
        this.moveX = 0;
        this.moveY = -1;
        this.color = color(PLAYER_COLORS.green);
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
    // rotate(this.rotation);

    fill(this.color, this.opacity);

    text(`+${this.points}`, 0, 0);
    pop();
  }

  isDead() {
    return this.opacity <= 0;
  }
}

function awardCooperationPoints() {
  if (!wasButton1Pressed && gameState === "game") {
    player1Yellow += 2;
    scorePopups.push(new ScorePopup("yellow", 2));
  }
  if (!wasButton2Pressed && gameState === "game") {
    player2Red += 2;
    scorePopups.push(new ScorePopup("red", 2));
  }
  if (!wasButton3Pressed && gameState === "game") {
    player3Blue += 2;
    scorePopups.push(new ScorePopup("blue", 2));
  }
  if (!wasButton4Pressed && gameState === "game") {
    player4Green += 2;
    scorePopups.push(new ScorePopup("green", 2));
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
    this.color = color("#9ED8DF");
    this.startTime = millis();
  }

  display(timerValue) {
    push();
    noStroke();
    fill(this.color);

    let currentTime = millis();
    let elapsedTime = (currentTime - this.startTime) / 1000;
    let preciseTimeRemaining = 10 - (elapsedTime % 10);

    let ellipsesToDraw = map(
      preciseTimeRemaining,
      0,
      10,
      0,
      this.totalEllipses
    );

    for (let i = ellipsesToDraw; i > 0; i--) {
      let t = map(i, 0, this.totalEllipses, 0, TWO_PI * 3);

      let radius = map(i, 0, this.totalEllipses, 0, this.maxRadius);

      let x = width / 2 + radius * cos(t);
      let y = height / 2 + radius * sin(t);

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

function drawMetric(
  label,
  value,
  x,
  y,
  labelColor,
  valueColor,
  labelStyle = BOLD,
  valueStyle = NORMAL
) {
  fill(labelColor);
  textStyle(labelStyle);
  text(label, x, y);

  fill(valueColor);
  textStyle(valueStyle);
  text(value, x + 24, y); // Space between label and value
}
