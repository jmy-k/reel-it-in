class Fish {
   constructor(x, y, parentAngle = null, type = 'normal') {
    this.x = x;
    this.y = y;
    this.segments = [];
    // Adjust segment count based on fish type
    this.segmentCount = type === 'golden' ? 20 : 15;
    // Adjust size based on fish type
    this.maxSegmentSize = type === 'golden' ? 25 : 
                         type === 'poison' ? 15 : 20;
    this.delay = 2;
    this.speed = type === 'golden' ? 1.3 : 
                type === 'poison' ? 1.4 : 1.7;
    this.angle = parentAngle !== null ? parentAngle : random(TWO_PI);
    this.squiggleOffset = 0;
    this.oscillation = 0.5;
    this.type = type;
    
    // Set colors based on fish type
    if (type === 'golden') {
      this.headColor = color('#FFD700');
      this.tailColor = color('#FFA500');
    } else if (type === 'poison') {
      this.headColor = color('#64007C');
      this.tailColor = color('#CB21C4');
    } else {
      this.headColor = color('#FF460B');
      this.tailColor = color('#FFB21C');
    }

    // Existing properties
    this.splitting = false;
    this.splitProgress = 0;
    this.splitDirection = 0;
    this.originalX = x;
    this.originalY = y;
    this.targetX = x;
    this.targetY = y;
    this.margin = 50;
    this.bounce = false;
    this.bounceTime = 0;
    this.reproductionRate = type !== 'normal' ? Infinity : random(5000, 15000);
    this.lastReproductionTime = millis();
    this.canReproduce = type === 'normal';

    // Initialize segments with size variation based on type
    for (let i = 0; i < this.segmentCount; i++) {
      let sizeReduction = type === 'golden'
        ? (i * this.maxSegmentSize / (this.segmentCount * 1))
        : (i * this.maxSegmentSize / this.segmentCount);
      
      this.segments.push({
        x: x,
        y: y,
        size: this.maxSegmentSize - sizeReduction
      });
    }
  }


 
  startSplitting(direction) {
    this.splitting = true;
    this.splitProgress = 0;
    this.splitDirection = direction;
    let leadingSegment = this.segments[0];
    this.originalX = leadingSegment.x;
    this.originalY = leadingSegment.y;
    
    const splitDistance = 60;
    this.targetX = constrain(
      this.originalX + cos(this.splitDirection) * splitDistance,
      this.margin,
      width - this.margin
    );
    this.targetY = constrain(
      this.originalY + sin(this.splitDirection) * splitDistance,
      this.margin,
      height - this.margin
    );
    
    this.canReproduce = false;
  }
  
  
  
  checkReproduction() {
    if (!this.canReproduce || this.splitting) return null;
    
    let currentTime = millis();
    if (currentTime - this.lastReproductionTime >= this.reproductionRate) {
      this.lastReproductionTime = currentTime;
      
      // Create new fish at current position with slightly varied angle
      let leadingSegment = this.segments[0];
      let newAngle = this.angle + random(-PI/4, PI/4);
      let newFish = new Fish(leadingSegment.x, leadingSegment.y, newAngle);
      
      // Start splitting animation for both fish
      this.startSplitting(this.angle + PI/4);
      newFish.startSplitting(this.angle - PI/4);
      
      return newFish;
    }
    return null;
  }

  update() {
    let leadingSegment = this.segments[0];

    if (this.splitting) {
      // Update split animation
      this.splitProgress = min(1, this.splitProgress + 0.05);
      
      // Use easing function for smooth movement
      let eased = this.splitProgress * (2 - this.splitProgress);
      
      // Calculate new position with bounds checking
      let newX = lerp(this.originalX, this.targetX, eased);
      let newY = lerp(this.originalY, this.targetY, eased);
      
      // Update leading segment position
      leadingSegment.x = newX;
      leadingSegment.y = newY;

      if (this.splitProgress >= 1) {
        this.splitting = false;
        this.canReproduce = true; // Re-enable reproduction after split
        // Set the angle to match the split direction
        this.angle = this.splitDirection;
      }
    } else {
      let currentAngle = this.angle + sin(this.squiggleOffset) * this.oscillation;
      
      // Calculate next position
      let nextX = leadingSegment.x + cos(currentAngle) * this.speed;
      let nextY = leadingSegment.y + sin(currentAngle) * this.speed;

      // Check boundary collisions
      if (nextX < this.margin || nextX > width - this.margin || 
          nextY < this.margin || nextY > height - this.margin) {
        
        if (!this.bounce) {
          if (nextX < this.margin || nextX > width - this.margin) {
            this.angle = PI - currentAngle;
          } else {
            this.angle = -currentAngle;
          }
          
          this.angle += random(-0.2, 0.2);
          this.angle = this.angle % TWO_PI;
          if (this.angle < 0) this.angle += TWO_PI;

          this.squiggleOffset = 0;
          this.bounce = true;
          this.bounceTime = millis();
        }
      }

      if (this.bounce && millis() - this.bounceTime > 500) {
        this.bounce = false;
      }

      leadingSegment.x = constrain(nextX, this.margin, width - this.margin);
      leadingSegment.y = constrain(nextY, this.margin, height - this.margin);
      this.squiggleOffset += 0.1;
    }

    // Update trailing segments
    for (let i = this.segments.length - 1; i > 0; i--) {
      this.segments[i].x += (this.segments[i - 1].x - this.segments[i].x) / this.delay;
      this.segments[i].y += (this.segments[i - 1].y - this.segments[i].y) / this.delay;
    }
  }

  // Keep existing display method
  display() {
    // Draw segments from tail to head
    for (let i = this.segments.length - 1; i > 0; i--) {
      let segmentColor = lerpColor(this.headColor, this.tailColor, i / this.segmentCount);
      fill(segmentColor);
      noStroke();
      ellipse(this.segments[i].x, this.segments[i].y, this.segments[i].size, this.segments[i].size);
    }
    // Draw head
    fill(this.headColor);
    ellipse(this.segments[0].x, this.segments[0].y, this.segments[0].size, this.segments[0].size);
  }
}