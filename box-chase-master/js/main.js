'use strict';
var player, startButton, isPlaying, cursors, spider, stars, scoreText, resultText, boxMap, boxLayer, score = 0, attempts = 0; // global variables
var camera;
var playerSpawn = {x:400, y:297};
var spiderSpawn = {x:20, y:210};
var H_VEL = 200; // horizontal speed of player
var V_VEL = 270; // vertical speed of player
var enemyVel;
var INIT_ENEMY_VEL = 50; // initial speed of spider
var config = {
    type: Phaser.AUTO,
    width: 800,
    height: 320,
    scene: {
        preload: preload,
        create: create,
        update: update
    },
    pixelArt: false,
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 500 }
        }
    },
    callbacks: {
        postBoot: function () {
            resize();
        }
    }
};
//Initialise game
var game = new Phaser.Game(config);
function preload() {
    // images
    this.load.image('background', 'images/background-sized.jpg');
    this.load.image('smallTrees', 'images/tree-64-96.png');
    this.load.image('star', 'images/star.png');
    this.load.image('boxTiles', 'images/boxSheet.png');
    this.load.image('largeTrees', 'images/tree-64-192.png');
    // spritesheets
    this.load.spritesheet('player', 'images/idle_right.png', { frameWidth: 43, frameHeight: 48 }); // 6?
    this.load.spritesheet('button', 'images/button.png', { frameWidth: 120, frameHeight: 40 });
    this.load.spritesheet('spider', 'images/spider.png', { frameWidth: 42, frameHeight: 32 });  //  5?
    // data
    this.load.tilemapCSV('boxesCSV', 'data/BoxesTrees_boxes.csv');
    this.load.tilemapCSV('largeTreesCSV', 'data/BoxesTrees_trees.csv');
    this.load.tilemapCSV('smallTreesCSV', 'data/BoxesTrees_treesSmall.csv');
}

function create() {
    window.addEventListener("resize", resize, false)
    score = 0;
    this.add.image(400, 160, 'background').setScrollFactor(0, 0);
    // small trees data loaded from separate CSV file, tile dimensions specified in parameter object
    var smallTreeMap = this.make.tilemap({ key: 'smallTreesCSV', tileWidth: 32, tileHeight: 32 });
    // associate smallTrees tileset with map
    var smallTrees = smallTreeMap.addTilesetImage('smallTrees', 'smallTrees');
    // specify an integar for layerID, in this case first parameter =  0, as not specified in a CSV file
    smallTreeMap.createStaticLayer(0, [smallTrees], 0, 0).setScrollFactor(0.25, 1);
    // large trees data loaded from separate CSV file
    var largeTreeMap = this.make.tilemap({ key: 'largeTreesCSV', tileWidth: 32, tileHeight: 32 });
    // associate largeTrees tileset with map
    var largeTrees = largeTreeMap.addTilesetImage('largeTrees', 'largeTrees');
      // specify an integar for layerID, set scroll factor to create parallax effect
    largeTreeMap.createStaticLayer(0, [largeTrees], 0, 0).setScrollFactor(0.5, 1);
    // boxes data loaded from separate CSV file
    boxMap = this.make.tilemap({ key: 'boxesCSV', tileWidth: 32, tileHeight: 32 });
    // associate box tileset with map
    var boxTiles = boxMap.addTilesetImage('boxTiles');
    boxLayer = boxMap.createStaticLayer(0, [boxTiles], 0, 0);
    boxLayer.setCollisionBetween(0, 10000);
    // set world bounds from boxMap
    this.physics.world.setBounds(0, 0, boxMap.widthInPixels, boxMap.heightInPixels);
    // player
    player = this.physics.add.sprite(playerSpawn.x, playerSpawn.y, 'player');
    // reduce size of player's physics body to improve visual effect of collision
    player.body.setSize(player.width - 16, player.height - 2);
    // set player drag so slows down when not moving
    player.setDragX(1000);
    player.setCollideWorldBounds(true);
    this.physics.add.collider(player, boxLayer);
    // create player animations
    this.anims.create({
        key: 'move',
        frames: this.anims.generateFrameNumbers('player', { start: 0, end: 4 }),
        frameRate: 15,
        repeat: -1
    });
    // enemy
    enemyVel = INIT_ENEMY_VEL;
    spider = this.physics.add.sprite(spiderSpawn.x, spiderSpawn.y, 'spider');
    // specify enemy z-index so appears on top of stars
    spider.setDepth(1);
    spider.setDragX(1000);
    spider.setCollideWorldBounds(true);
    this.physics.add.collider(spider, boxLayer);
    // create spider animation
    this.anims.create({
        key: 'wobble',
        frames: this.anims.generateFrameNumbers('spider', { start: 0, end: 2 }),
        frameRate: 15,
        repeat: -1
    });
    spider.anims.play('wobble', true);
    // camera
    camera = this.cameras.getCamera("");
    //Follow the player but do not allow the camera to look out of the map's bounds.
    camera.startFollow(player);
    camera.setBounds(0, 0, boxMap.widthInPixels, boxMap.heightInPixels);
    // create score text and anchor by setting scroll factor
    scoreText = this.add.text(0, 32, 'Score = 0', { fontFamily: 'Arial', fontSize: '24px',  fill: '#000'});
    scoreText.x = game.config.width - (64 + scoreText.width)
    scoreText.setScrollFactor(0,0);
    var instructions = 'Collect all the stars while avoiding the killer spider. Use the arrow keys to move and space bar to jump.'
    var instructionText = this.add.text(32, 32, instructions, { fontFamily: 'Arial', fontSize: '24px',  fill: '#000', wordWrap: {width: Math.round((game.config.width - 64)*(2/3))}});
    // create start button - just text with background
    var startButton = this.add.text(game.config.width / 2, game.config.height / 2, 'Start Game', { fontFamily: 'Arial', fontSize: '32px', backgroundColor: '#000', fill: '#FFF'});
    // set z-index of start button so appears over everything else
    startButton.setDepth(2);
    startButton.x -= startButton.width/2;
    startButton.y -= startButton.height/2;
    // make start text interactive and listen to pointerdown event
    startButton.setInteractive();
    startButton.on('pointerdown', function () {
        trackEvent('Start');
      isPlaying = true;
      instructionText.destroy();
      this.destroy(); // do this last
    })
    // store a reference to the keyboard
    cursors = this.input.keyboard.createCursorKeys();
    // check to see if the spider touches the player
    this.physics.add.overlap(player, spider, spiderAttack, null, this);
    // make stars
    initStars.call(this);
}


function update() {
    if (isPlaying) {
        if (cursors.right.isDown) {
            player.setVelocityX(H_VEL);
            player.anims.play('move', true);
            player.flipX = false;
        }
        //Left
        else if (cursors.left.isDown) {
            player.setVelocityX(-H_VEL);
            player.anims.play('move', true); player.flipX = false;
            player.flipX = true;
        }
        //Idle
        else {
            player.anims.stop();
        }
        if (Phaser.Input.Keyboard.JustDown(cursors.space) && player.body.blocked.down) {
            player.setVelocityY(-V_VEL);
        }
        if (spider.body.blocked.right || spider.body.blocked.left) {
            spider.setVelocityY(-enemyVel);
        }
        if (spider.x >= player.x) {
            spider.setVelocityX(-enemyVel);
        } else {
            spider.setVelocityX(enemyVel);
        }
    }
}
function spiderAttack(){
    isPlaying = false; // disables controls
    this.physics.pause(); // prevents overlap from constantly executing
    player.setTint(0xff0000); // signify player dead
    player.anims.stop();
    spider.anims.stop();
    resultText = this.add.text(32, 32, 'You Lose!', { fontFamily: 'Arial', fontSize: '90px',  fill: '#f00'});
    resultText.x = (game.config.width / 2) - (resultText.width / 2) + camera.scrollX;
    trackEvent('Die', 'Score', score);
    showRestart.call(this);
}

function showRestart(){
  // create a restart button just like the start button
  var restartButton = this.add.text(game.config.width / 2 + camera.scrollX, game.config.height / 2 + camera.scrollY, 'Restart Game', { fontFamily: 'Arial', fontSize: '32px', backgroundColor: '#000', fill: '#FFF'});
  restartButton.setDepth(2);
  restartButton.x -= restartButton.width/2;
  restartButton.y -= restartButton.height/2;
    restartButton.setInteractive();
  var scene = this;
  // on pointerdown, reset varibales and restart game
  restartButton.on('pointerdown', function(){
    enemyVel = INIT_ENEMY_VEL;
    player.clearTint();
    spider.x = spiderSpawn.x;
    spider.y = spiderSpawn.y;
    player.x = playerSpawn.x;
    player.y = playerSpawn.y;
    spider.anims.play('wobble', true);
    isPlaying = true;
    scene.physics.resume()
    initStars.call(scene);
    if(resultText){
      resultText.destroy();
      }
      attempts++;
      trackEvent('Restart', 'Attempts', attempts);
    this.destroy(); // do this last
  })
}
function collectStar(player, star) {
    // Removes the star from the screen
    star.disableBody(true, true); // get rid of current star for now
    //  Add and update the score
    score += 10;
    if(enemyVel < H_VEL - 20){ // increment the spider speed each time a star is collected,  to an upper limit just less than player speed
          enemyVel += 10;
    }
    scoreText.text = 'Score = ' + score;
    // does the score relate to the total number of stars?
    if(score/10 == stars.getChildren().length){
        showWin.call(this);
        trackEvent('Win', 'Score', score);
    }

}
function showWin(){
  isPlaying = false; // disables controls
  this.physics.pause(); // prevents overlap from constantly executing
  player.setTint(0x00ff00); // signify player wins
  player.anims.stop();
  spider.anims.stop();
  resultText = this.add.text(32, 32, 'You Win!', { fontFamily: 'Arial', fontSize: '90px',  fill: '#0f0'});
  resultText.x = (game.config.width/2) - (resultText.width/2) + camera.scrollX;
  showRestart.call(this);
}
function initStars(){
  score = 0; // initialise score
  scoreText.text = 'Score = ' + score; // reset score text
  // stars
  var starsNum = 23;
  if(stars){ // clear the existing physics group before reusing it
    stars.clear(true);
  }
  stars = this.physics.add.group({ // distribute stars
    key: 'star',
    repeat: starsNum,
    setXY: { x: 16, y: 0, stepX: Math.floor(boxMap.widthInPixels/(starsNum+1)) }
  });
  stars.children.iterate(function (child) {
      child.setCollideWorldBounds(true); // otherwise stars will fall through the floor
  });
  this.physics.add.collider(stars, boxLayer); // otherwise stars will fall through the box tiles
  this.physics.add.overlap(player, stars, collectStar, null, this); // check for player collecting stars
}
function resize() {
    var canvas = document.querySelector("canvas");
    var windowWidth = window.innerWidth;
    var windowHeight = window.innerHeight;
    var windowRatio = windowWidth / windowHeight;
    var gameRatio = game.config.width / game.config.height;
    if (windowRatio < gameRatio) {
        canvas.style.width = windowWidth + "px";
        canvas.style.height = (windowWidth / gameRatio) + "px";
    }
    else {
        canvas.style.width = (windowHeight * gameRatio) + "px";
        canvas.style.height = windowHeight + "px";
    }
}

function trackEvent(action, label, value) {
    var str = "BoxGame local event tracking: action = " + action + ", label = " + label + ", value = " + value;
    console.log(str)
    gtag('event', action, {
        'event_catagory': 'BoxGame',
        'event_label': label,
        'value': value
    });   
}
