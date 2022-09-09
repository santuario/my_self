// # Quintus platformer example
//
// [Run the example](../quintus/examples/platformer/index.html)
// WARNING: this game must be run from a non-file:// url
// as it loads a level json file.
//
// This is the example from the website homepage, it consists
// a simple, non-animated platformer with some enemies and a 
// target for the player.
window.addEventListener("load",function() {

// Set up an instance of the Quintus engine  and include
// the Sprites, Scenes, Input and 2D module. The 2D module
// includes the `TileLayer` class as well as the `2d` componet.
var Q = window.Q = Quintus({audioSupported: [ 'wav','mp3','ogg' ]})
        .include("Sprites, Scenes, Input, 2D, Anim, Touch, UI, TMX, Audio")
        // Maximize this game to whatever the size of the browser is
        .setup({ maximize: true })
        // And turn on default input controls and touch input (for UI)
        .controls(true).touch()
        // Enable sounds.
        .enableSound();

// Load and init audio files.


Q.SPRITE_PLAYER = 1;
Q.SPRITE_COLLECTABLE = 2;
Q.SPRITE_ENEMY = 4;
Q.SPRITE_DOOR = 8;
Q.SPRITE_TEXT = 10;
Q.Sprite.extend("Player",{

  init: function(p) {

    this._super(p, {
      sheet: "player",  // Setting a sprite sheet sets sprite width and height
      sprite: "player",
      direction: "right",
      standingPoints: [ [ -16, 44], [ -23, 35 ], [-23,-48], [23,-48], [23, 35 ], [ 16, 44 ]],
      duckingPoints : [ [ -16, 44], [ -23, 35 ], [-23,-10], [23,-10], [23, 35 ], [ 16, 44 ]],
      jumpSpeed: -400,
      speed: 300,
      strength: 100,
      score: 0,
      openDoor: 0,
      type: Q.SPRITE_PLAYER,
      collisionMask: Q.SPRITE_DEFAULT | Q.SPRITE_DOOR | Q.SPRITE_COLLECTABLE
    });

    this.p.points = this.p.standingPoints;

    this.add('2d, platformerControls, animation, tween');

    this.on("bump.top","breakTile");

    this.on("sensor.tile","checkLadder");
    this.on("enemy.hit","enemyHit");
    this.on("jump");
    this.on("jumped");

    Q.input.on("down",this,"checkDoor");
  },

  jump: function(obj) {
    // Only play sound once.
    if (!obj.p.playedJump) {
    	Q.stageScene('tutorial', 4, {hidden:true});
      Q.audio.play('jump.mp3');
      obj.p.playedJump = true;
    }
  },

  jumped: function(obj) {
    obj.p.playedJump = false;
  },

  checkLadder: function(colObj) {
    if(colObj.p.ladder) { 
      this.p.onLadder = true;
      this.p.ladderX = colObj.p.x;
    }
  },

  checkDoor: function() {
    this.p.checkDoor = true;
  },

  resetLevel: function() {
    Q.stageScene("level1");
    this.p.strength = 100;
    this.animate({opacity: 1});
    //Q.stageScene('hud', 3, this.p);
    Q.stageScene('hud', 3, {hidden:true});
    Q.stageScene('tutorial', 4, {hidden:false});

  },

  enemyHit: function(data) {
    var col = data.col;
    var enemy = data.enemy;
    this.p.vy = -150;
    if (col.normalX == 1) {
      // Hit from left.
      this.p.x -=15;
      this.p.y -=15;
    }
    else {
      // Hit from right;
      this.p.x +=15;
      this.p.y -=15;
    }
    this.p.immune = true;
    this.p.immuneTimer = 0;
    this.p.immuneOpacity = 1;
    this.p.strength -= 25;
    //Q.stageScene('hud', 3, this.p);
    if (this.p.strength == 0) {
      this.resetLevel();
    }
  },

  continueOverSensor: function() {
    this.p.vy = 0;
    if(this.p.vx != 0) {
      this.play("walk_" + this.p.direction);
    } else {
      this.play("stand_" + this.p.direction);
    }
  },

  breakTile: function(col) {
    if(col.obj.isA("TileLayer")) {
      if(col.tile == 24) { col.obj.setTile(col.tileX,col.tileY, 36); }
      else if(col.tile == 36) { col.obj.setTile(col.tileX,col.tileY, 24); }
    }
    Q.audio.play('coin.mp3');
  },

  step: function(dt) {
    var processed = false;
    if (this.p.immune) {
      // Swing the sprite opacity between 50 and 100% percent when immune.
      if ((this.p.immuneTimer % 12) == 0) {
        var opacity = (this.p.immuneOpacity == 1 ? 0 : 1);
        this.animate({"opacity":opacity}, 0);
        this.p.immuneOpacity = opacity;
      }
      this.p.immuneTimer++;
      if (this.p.immuneTimer > 144) {
        // 3 seconds expired, remove immunity.
        this.p.immune = false;
        this.animate({"opacity": 1}, 1);
      }
    }

    if(this.p.onLadder) {
      this.p.gravity = 0;
     //console.log(this.p.y); 
      if(Q.inputs['up']) {
        if (this.p.openDoor > 0 && this.p.y < 280) {
           Q("TextG").invoke("updateText");
        }
        this.p.vy = -this.p.speed;
        this.p.x = this.p.ladderX;
        this.play("climb");
      } else if(Q.inputs['down']) {
        this.p.vy = this.p.speed;
        this.p.x = this.p.ladderX;
        this.play("climb");
      } else {
        this.continueOverSensor();
      }
      processed = true;
    } 
      
    if(!processed && this.p.door) {
      this.p.gravity = 1;
      if(this.p.checkDoor && this.p.landed > 0) {
        // Enter door.
        this.p.y = this.p.door.p.y;
        this.p.x = this.p.door.p.x;
        this.play('climb');
        this.p.toDoor = this.p.door.findLinkedDoor();
        processed = true;
      }
      else if (this.p.toDoor) {
        // Transport to matching door.
        this.p.y = this.p.toDoor.p.y;
        this.p.x = this.p.toDoor.p.x;
        this.stage.centerOn(this.p.x, this.p.y);
        this.p.toDoor = false;
        this.stage.follow(this);
        processed = true;
      }
    } 
      
    if(!processed) { 
      this.p.gravity = 1;
       
      if(Q.inputs['down'] && !this.p.door) {
        this.p.ignoreControls = true;
        this.play("duck_" + this.p.direction);
        if(this.p.landed > 0) {
          this.p.vx = this.p.vx * (1 - dt*2);
        }
        this.p.points = this.p.duckingPoints;
      } else {
        this.p.ignoreControls = false;
        this.p.points = this.p.standingPoints;

        if(this.p.vx > 0) {
          if(this.p.landed > 0) {
            this.play("walk_right");
          } else {
            this.play("jump_right");
          }
          this.p.direction = "right";
        } else if(this.p.vx < 0) {
          if(this.p.landed > 0) {
            this.play("walk_left");
          } else {
            this.play("jump_left");
          }
          this.p.direction = "left";
        } else {
          this.play("stand_" + this.p.direction);
        }
           
      }
    }

    this.p.onLadder = false;
    this.p.door = false;
    this.p.checkDoor = false;


    if(this.p.y > 1000) {
      this.stage.unfollow();
    }

    if(this.p.y > 2000) {
      this.resetLevel();
    }
  }
});

Q.Sprite.extend("Enemy", { 
  init: function(p,defaults) {

    this._super(p,Q._defaults(defaults||{},{
      sheet: p.sprite,
      vx: 50,
      defaultDirection: 'left',
      type: Q.SPRITE_ENEMY,
      collisionMask: Q.SPRITE_DEFAULT
    }));

    this.add("2d, aiBounce, animation");
    this.on("bump.top",this,"die");
    this.on("hit.sprite",this,"hit");
  },

  step: function(dt) {
    if(this.p.dead) {
      this.del('2d, aiBounce');
      this.p.deadTimer++;
      if (this.p.deadTimer > 24) {
        // Dead for 24 frames, remove it.
        this.destroy();
      }
      return;
    }
    var p = this.p;

    p.vx += p.ax * dt;
    p.vy += p.ay * dt;

    p.x += p.vx * dt;
    p.y += p.vy * dt;

    this.play('walk');
  },

  hit: function(col) {
    if(col.obj.isA("Player") && !col.obj.p.immune && !this.p.dead) {
      col.obj.trigger('enemy.hit', {"enemy":this,"col":col});
      Q.audio.play('hit.mp3');
    }
  },

  die: function(col) {
    if(col.obj.isA("Player")) {
      Q.audio.play('coin.mp3');
      this.p.vx=this.p.vy=0;
      this.play('dead');
      this.p.dead = true;
      var that = this;
      col.obj.p.vy = -300;
      this.p.deadTimer = 0;
    }
  }
});




Q.Sprite.extend("Locker", { 
  init: function(p,defaults) {

    this._super(p,Q._defaults(defaults||{},{
      sheet: p.sprite,
      vx: 0,
      vy:0,
      type: Q.SPRITE_TEXT,
      collisionMask: Q.SPRITE_DEFAULT
    }));

    this.add("2d, aiBounce, animation");
    this.on("hit.sprite",this,"die");
  },

  step: function(dt) {
    if(this.p.dead) {
      this.del('2d, aiBounce');
      this.p.deadTimer++;
      if (this.p.deadTimer > 24) {
        // Dead for 24 frames, remove it.
        this.destroy();
      }
      return;
    }
    
  },



  die: function(col) {
    if(col.obj.isA("Player")) {
       if (col.obj.p.openDoor > 0) {
          Q.audio.play('coin.mp3');
          this.p.vx=this.p.vy=40;
          this.play('dead');
           this.p.dead = true;
          var that = this;
          col.obj.p.vy = -300;
          this.p.deadTimer = 0;
          Q.stageScene('hud', 3, {hidden:true});
       }else{
         Q.audio.play('hit.mp3');
       }


      
    }
  }
});


Q.Locker.extend("Lock", {

});

Q.Locker.extend("SupportLock", {

});


Q.Sprite.extend("TextIntro", {
  init: function(p) {
       this._super(p, {
      sheet: "textIntro",
      collisionMask: Q.SPRITE_UI,
      vx: 0,
      vy: 0,
      gravity: 0
    });


  }
});


Q.Sprite.extend("TextA", {
  init: function(p) {
       this._super(p, {
      sheet: "textA",
      collisionMask: Q.SPRITE_UI,
      sensor: false,
      vx: 0,
      vy: 0,
      gravity: 0,
      frame:0
    });
  },
 update: function(dt) {
      //this.p.frame = 10;

  },
 
 updateText: function(){
      if(this.p.frame < 15){
        this.p.frame =  this.p.frame +1;
      }

 } 

});

Q.Sprite.extend("TextB", {
  init: function(p) {
       this._super(p, {
      sheet: "textB",
      collisionMask: Q.SPRITE_UI,
      sensor: false,
      vx: 0,
      vy: 0,
      gravity: 0,
      frame:0
    });
  },
 update: function(dt) {
      //this.p.frame = 10;

  },
 
 updateText: function(){
      if(this.p.frame < 15){
        this.p.frame =  this.p.frame +1;
      }else{
         Q("TextC").invoke("updateText");
      }

 } 

});


Q.Sprite.extend("TextC", {
  init: function(p) {
       this._super(p, {
      sheet: "textC",
      collisionMask: Q.SPRITE_UI,
      sensor: false,
      vx: 0,
      vy: 0,
      gravity: 0,
      frame:0
    });
  },
 update: function(dt) {
      //this.p.frame = 10;

  },
 
 updateText: function(){
      if(this.p.frame < 10){
        this.p.frame =  this.p.frame +1;
      }else{
         Q("TextD").invoke("updateText");
      }

 } 

});

Q.Sprite.extend("TextD", {
  init: function(p) {
       this._super(p, {
      sheet: "textD",
      collisionMask: Q.SPRITE_UI,
      sensor: false,
      vx: 0,
      vy: 0,
      gravity: 0,
      frame:0
    });
  },
 update: function(dt) {
      //this.p.frame = 10;

  },
 
 updateText: function(){
      if(this.p.frame < 5){
        this.p.frame =  this.p.frame +1;
      }else{
         Q("TextE").invoke("updateText");
      }

 } 

});


Q.Sprite.extend("TextE", {
  init: function(p) {
       this._super(p, {
      sheet: "textE",
      collisionMask: Q.SPRITE_UI,
      sensor: false,
      vx: 0,
      vy: 0,
      gravity: 0,
      frame:0
    });
  },
 update: function(dt) {
      //this.p.frame = 10;

  },
 
 updateText: function(){
      if(this.p.frame < 5){
        this.p.frame =  this.p.frame +1;
      }

 } 

});


Q.Sprite.extend("TextF", {
  init: function(p) {
       this._super(p, {
      sheet: "textF",
      collisionMask: Q.SPRITE_UI,
      sensor: false,
      vx: 0,
      vy: 0,
      gravity: 0,
      frame:0
    });
  }

});


Q.Sprite.extend("TextG", {
  init: function(p) {
       this._super(p, {
      sheet: "textG",
      collisionMask: Q.SPRITE_UI,
      sensor: false,
      vx: 0,
      vy: 0,
      gravity: 0,
      frame:0
    });
  },
 update: function(dt) {
      //this.p.frame = 10;

  },
 
 updateText: function(){
      if(this.p.frame < 15){
        this.p.frame =  this.p.frame +1;
      }else{
        //
      }

 } 

});


Q.Sprite.extend("TextH", {
  init: function(p) {
       this._super(p, {
      sheet: "textH",
      collisionMask: Q.SPRITE_UI,
      sensor: false,
      vx: 0,
      vy: 0,
      gravity: 0,
      frame:0
    });
  },
 update: function(dt) {
      //this.p.frame = 10;

  },
 
 updateText: function(){
    
     this.p.frame =  9;
 } 

});



Q.Enemy.extend("Fly", {

});

Q.Enemy.extend("Slime", {
  init: function(p) {
    this._super(p,{
      w: 55,
      h: 34
    });
  }
});

Q.Enemy.extend("Snail", {
  init: function(p) {
    this._super(p,{
      w: 55,
      h: 36
    });
  }

});

Q.Sprite.extend("Collectable", {
  init: function(p) {
    this._super(p,{
      sheet: p.sprite,
      type: Q.SPRITE_COLLECTABLE,
      collisionMask: Q.SPRITE_PLAYER,
      sensor: true,
      vx: 0,
      vy: 0,
      gravity: 0
    });
    this.add("animation");

    this.on("sensor");
  },

  // When a Collectable is hit.
  sensor: function(colObj) {
    // Increment the score.
    if (this.p.amount) {
   
      if(this.p.amount == 5){
        Q("TextA").invoke("updateText");
      }
      if(this.p.amount == 6){
        Q("TextB").invoke("updateText");
      }
      colObj.p.score += this.p.amount;
      //Q.stageScene('hud', 3, colObj.p);
    }
    Q.audio.play('coin.mp3');
    this.destroy();
  }
});

Q.Sprite.extend("Door", {
  init: function(p) {
    this._super(p,{
      sheet: p.sprite,
      type: Q.SPRITE_DOOR,
      collisionMask: Q.SPRITE_NONE,
      sensor: true,
      vx: 0,
      vy: 0,
      gravity: 0
    });
    this.add("animation");

    this.on("sensor");
  },
  findLinkedDoor: function() {
    return this.stage.find(this.p.link);
  },
  // When the player is in the door.
  sensor: function(colObj) {
    // Mark the door object on the player.
    colObj.p.door = this;
  }
});

Q.Collectable.extend("Heart", {
  // When a Heart is hit.
  sensor: function(colObj) {
    // Increment the strength.
    if (this.p.amount) {
      colObj.p.strength = Math.max(colObj.p.strength + 25, 100);
      //Q.stageScene('hud', 3, colObj.p);
      Q.audio.play('heart.mp3');
       Q("TextH").invoke("updateText");
    }
    this.destroy();
  }
});


Q.Collectable.extend("Key_Yellow", {
  // When a Heart is hit.
  sensor: function(colObj) {
    // Increment the strength.
    if (this.p.amount) {
      colObj.p.openDoor = 1;
      colObj.p.strength = Math.max(colObj.p.strength + 25, 100);
      Q.stageScene('hud', 3, {hidden:false});
      Q.audio.play('heart.mp3');
    }
    this.destroy();
  }
});




Q.scene("level1",function(stage) {
  Q.stageTMX("level1.tmx",stage);


  stage.add("viewport").follow(Q("Player").first());



});

Q.scene('hud',function(stage) {
  var container = stage.insert(new Q.UI.Container({
    x: 50, y: 0
  }));


var sprite = new Q.Sprite({ asset: "lock_key.png", x: 10, y: 40, scale: 1, hidden: stage.options.hidden });
      container.insert(sprite);
 
 

  container.fit(20);
});


Q.scene('tutorial',function(stage) {
  var container = stage.insert(new Q.UI.Container({
    x: 50, y: 0
  }));

      
var spriteTutorial = new Q.Sprite({ asset: "tutorial.png", x: 90, y: 40, scale: 1, hidden: stage.options.hidden});
      container.insert(spriteTutorial);
 

  container.fit(20);
});



Q.loadTMX("enemy01.png,lock_key.png, tutorial.png,level1.tmx, collectables.json, doors.json, enemies.json, locks.json, fire.mp3, jump.mp3, heart.mp3, hit.mp3, coin.mp3, player.json, player.png", function() {
    Q.compileSheets("player.png","player.json");
    Q.compileSheets("collectables.png","collectables.json");
    Q.compileSheets("enemies.png","enemies.json");
    Q.compileSheets("doors.png","doors.json");
    Q.compileSheets("textIntro.png","textIntro.json");
    Q.compileSheets("textA.png","textA.json");
    Q.compileSheets("textB.png","textB.json");
    Q.compileSheets("textC.png","textC.json");
    Q.compileSheets("textD.png","textD.json");
    Q.compileSheets("textE.png","textE.json");
    Q.compileSheets("textF.png","textF.json");
    Q.compileSheets("textG.png","textG.json");
    Q.compileSheets("textH.png","textH.json");
    Q.compileSheets("locks.png","locks.json");

    Q.animations("player", {
      walk_right: { frames: [0,1,2,3,4,5,6,7,8,9,10], rate: 1/15, flip: false, loop: true },
      walk_left: { frames:  [0,1,2,3,4,5,6,7,8,9,10], rate: 1/15, flip:"x", loop: true },
      jump_right: { frames: [13], rate: 1/10, flip: false },
      jump_left: { frames:  [13], rate: 1/10, flip: "x" },
      stand_right: { frames:[14], rate: 1/10, flip: false },
      stand_left: { frames: [14], rate: 1/10, flip:"x" },
      duck_right: { frames: [15], rate: 1/10, flip: false },
      duck_left: { frames:  [15], rate: 1/10, flip: "x" },
      climb: { frames:  [16, 17], rate: 1/3, flip: false }
    });
    var EnemyAnimations = {
      walk: { frames: [0,1], rate: 1/3, loop: true },
      dead: { frames: [2], rate: 1/10 }
    };


    var LocksAnimations = {
      walk: { frames: [0], rate: 1/3, loop: true },
      dead: { frames: [1], rate: 1/10 }
    };

  
  Q.animations("lock", LocksAnimations);
  Q.animations("supportLock", LocksAnimations);
    
    
    

    Q.animations("fly", EnemyAnimations);
    Q.animations("slime", EnemyAnimations);
    Q.animations("snail", EnemyAnimations);
    Q.stageScene("level1");
    Q.stageScene('hud', 3, {hidden:true});
    Q.stageScene('tutorial', 4, {hidden:false});


  
}, {
  progressCallback: function(loaded,total) {
    var element = document.getElementById("loading_progress");
    element.style.width = Math.floor(loaded/total*100) + "%";
    if (loaded == total) {
      document.getElementById("loading").remove();
    }
  }
});

// ## Possible Experimentations:
// 
// The are lots of things to try out here.
// 
// 1. Modify level.json to change the level around and add in some more enem3ies.
// 2. Add in a second level by creating a level2.json and a level2 scene that gets
//    loaded after level 1 is complete.
// 3. Add in a title screen
// 4. Add in a hud and points for jumping on enemies.
// 5. Add in a `Repeater` behind the TileLayer to create a paralax scrolling effect.

});
