(function() {
  var lastTime = 0;
  var vendors = ['webkit', 'moz'];
  for(var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
    window.requestAnimationFrame = window[vendors[x]+'RequestAnimationFrame'];
    window.cancelAnimationFrame =
    window[vendors[x]+'CancelAnimationFrame'] || window[vendors[x]+'CancelRequestAnimationFrame'];
  }

  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = function(callback, element) {
      var currTime = new Date().getTime();
      var timeToCall = Math.max(0, 16 - (currTime - lastTime));
      var id = window.setTimeout(function() { callback(currTime + timeToCall); },
      timeToCall);
      lastTime = currTime + timeToCall;
      return id;
    };
  }

  if (!window.cancelAnimationFrame) {
    window.cancelAnimationFrame = function(id) {
      clearTimeout(id);
    };
  }
}());
function KeyboardInputManager() {
  this.events = {};

  this.listen();
}

KeyboardInputManager.prototype.on = function (event, callback) {
  if (!this.events[event]) {
    this.events[event] = [];
  }
  this.events[event].push(callback);
};

KeyboardInputManager.prototype.emit = function (event, data) {
  var callbacks = this.events[event];
  if (callbacks) {
    callbacks.forEach(function (callback) {
      callback(data);
    });
  }
};

KeyboardInputManager.prototype.listen = function () {
  var self = this;

  var map = {
    38: 0, // Up
    39: 1, // Right
    40: 2, // Down
    37: 3, // Left
    75: 0, // vim keybindings
    76: 1,
    74: 2,
    72: 3,
    87: 0, // W
    68: 1, // D
    83: 2, // S
    65: 3, // A
    81: 5, // Q
    70: 4, // F
    82: 5, // R
    69: 4  // E
  };

  var holdingMap = {
    49: 1,
    50: 2,
    51: 3
  };

  var restartMap = [
    8, //backspace
    27, //esc
    48 //0
  ];

  var slice = [].slice;

  document.addEventListener("keydown", function (event) {
    var modifiers = event.altKey || event.ctrlKey || event.metaKey ||
                    event.shiftKey;
    var mapped    = map[event.which];
    var holdingMapped = holdingMap[event.which];

    if (!modifiers) {
      if (mapped !== undefined) {
        event.preventDefault();
        self.emit("move", mapped);
      } else if (holdingMapped !== undefined) {
        event.preventDefault();
        self.emit("hidden", holdingMapped);
      } else if (event.which >= 65 && event.which <= 90) {
        event.preventDefault();
        self.emit("rotate");
      }

      if (restartMap.indexOf(event.which) > -1) {
        event.preventDefault();
        self.restart.bind(self)(event);
      }
    }
  });
  document.addEventListener('keyup', function (event) {
    var holdingMapped = holdingMap[event.which];
    if (holdingMapped !== undefined) {
      event.preventDefault();
      self.emit("hidden", false);
    }
  });
  var retry = document.querySelector(".retry-button");
  retry.addEventListener("click", this.restart.bind(this));
  retry.addEventListener("touchend", this.restart.bind(this));

  var keepPlaying = document.querySelector(".keep-playing-button");
  keepPlaying.addEventListener("click", this.keepPlaying.bind(this));
  keepPlaying.addEventListener("touchend", this.keepPlaying.bind(this));

  // Listen to swipe events
  var touchStartClientX, touchStartClientY;
  var gameContainer = document.getElementsByClassName("game-container")[0];

  gameContainer.addEventListener("touchstart", function (event) {
    if (event.touches.length > 1) return;

    touchStartClientX = event.touches[0].clientX;
    touchStartClientY = event.touches[0].clientY;
    event.preventDefault();
  });

  gameContainer.addEventListener("touchmove", function (event) {
    event.preventDefault();
  });

  gameContainer.addEventListener("touchend", function (event) {
    if (event.touches.length > 0) return;

    var dx = event.changedTouches[0].clientX - touchStartClientX;
    var absDx = Math.abs(dx);

    var dy = event.changedTouches[0].clientY - touchStartClientY;
    var absDy = Math.abs(dy);

    if (Math.max(absDx, absDy) > 10) {
      // (right : left) : (down : up)
      self.emit("move", absDx > absDy ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0));
    }
  });
  //touch buttons
  slice.call(document.querySelectorAll('.touch-button.long-tap')).forEach(function(button) {
    var layer = button.textContent;
    button.addEventListener('touchstart', function (event) {
      event.preventDefault();
      self.emit("hidden", layer);
    });
    button.addEventListener('touchstart', function (event) {
      event.preventDefault();
    });
    button.addEventListener('touchend', function (event) {
      self.emit("hidden", false);
    });
  });
  slice.call(document.querySelectorAll('.touch-button.tap')).forEach(function(button) {
    var touchStartClientX, touchStartClientY;
    button.addEventListener("touchstart", function (event) {
      if (event.touches.length > 1) return;

      touchStartClientX = event.touches[0].clientX;
      touchStartClientY = event.touches[0].clientY;
      event.preventDefault();
    });

    button.addEventListener("touchmove", function (event) {
      event.preventDefault();
    });

    button.addEventListener("touchend", function (event) {
      if (event.touches.length > 0) return;

      var dx = event.changedTouches[0].clientX - touchStartClientX;
      var absDx = Math.abs(dx);

      var dy = event.changedTouches[0].clientY - touchStartClientY;
      var absDy = Math.abs(dy);

      if (Math.max(absDx, absDy) < 20) {
        var type = button.dataset.type || 'rotate';
        var value = button.dataset.value || 0;
        self.emit(type, value);
      }
    });
  });
};

KeyboardInputManager.prototype.restart = function (event) {
  event.preventDefault();
  this.emit("restart");
};

KeyboardInputManager.prototype.keepPlaying = function (event) {
  event.preventDefault();
  this.emit("keepPlaying");
};
function HTMLActuator() {
  this.gridContainer    = document.querySelector(".grid-container");
  this.tileContainer    = document.querySelector(".tile-container");
  this.scoreContainer   = document.querySelector(".score-container");
  this.bestContainer    = document.querySelector(".best-container");
  this.messageContainer = document.querySelector(".game-message");

  this.score = 0;
  var clearUselessTile = this.clearUselessTile.bind(this);
  ['webkitTransitionEnd', 'oTransitionEnd', 'transitionend'].forEach(function(eventName) {
    document.addEventListener(eventName, clearUselessTile);
  })
}

HTMLActuator.prototype.rotate = function (rotated) {
  if (rotated) {
    this.gridContainer.classList.add('rotated');
  } else {
    this.gridContainer.classList.remove('rotated');
  }
};

HTMLActuator.prototype.hidden = function (layer, size) {
  if (layer === false || layer === undefined) {
    var dom = document.querySelectorAll('.cube.hidden');
    [].slice.call(dom).forEach(function(d) {
      d.classList.remove('hidden');
    });
  } else {
    for (var x = 0; x < size; x++) {
      for (var y = 0; y < size; y++) {
        for (var z = 0; z < size; z++) {
          if (z + 1 == layer) {
            continue;
          }
          [].slice.call(document.querySelectorAll('.' + this.positionClass({
            x: x,
            y: y,
            z: z
          }).replace(/ .+/g, ''))).forEach(function(d) {
            d.classList.add('hidden');
          });
        }
      }
    }
  }
};

HTMLActuator.prototype.clearUselessTile = function() {
  var self = this;
  [].slice.call(document.querySelectorAll('.tile-useless')).forEach(function(d) {
    self.tileContainer.removeChild(d.parentNode);
  });
}

HTMLActuator.prototype.actuate = function (grid, metadata) {
  var self = this;

  window.requestAnimationFrame(function () {
    self.clearContainer(self.tileContainer);
    grid.cells.forEach(function (face) {
      face.forEach(function (column) {
        column.forEach(function (cell) {
          if (cell) {
            self.addTile(cell);
          }
        });
      });
    });

    self.updateScore(metadata.score);
    self.updateBestScore(metadata.bestScore);

    if (metadata.terminated) {
      if (metadata.over) {
        self.message(false); // You lose
      } else if (metadata.won) {
        self.message(true); // You win!
      }
    }

  });
};

// Continues the game (both restart and keep playing)
HTMLActuator.prototype.continue = function (restart) {
  if (typeof ga !== "undefined") {
    ga("send", "event", window.gameName || "game", restart ? "restart" : "keep playing");
  }
  this.clearMessage();
};

HTMLActuator.prototype.clearContainer = function (container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
};

HTMLActuator.prototype.addTile = function (tile) {
  var self = this;

  var wrapper   = document.createElement("div");
  var inner     = document.createElement("div");
  var position  = tile.previousPosition || { x: tile.x, y: tile.y, z: tile.z };
  var positionClass = this.positionClass(position);

  // We can't use classlist because it somehow glitches when replacing classes
  var classes = ["tile", "tile-" + tile.value, 'cube', positionClass, "tile-" + tile.type];
  var value = tile.value;
  if (value > 8192) {
    (function() {
      var i = 1, n = value;
      while (n > 2) {
        i++;
        n /= 2;
      }
      value = '2^' + i;
    })();
  }

  if (tile.value > 2048) classes.push("tile-super");

  this.applyClasses(wrapper, classes);

  ['u', 'd', 'l', 'r', 'f', 'b'].forEach(function(f) {
    var face = document.createElement("div");
    self.applyClasses(face, ['cube-face', 'cube-face-' + f]);
    face.textContent = value;
    inner.appendChild(face);
  });

  if (tile.previousPosition) {
    // Make sure that the tile gets rendered in the previous position first
    window.requestAnimationFrame(function () {
      classes[3] = self.positionClass({ x: tile.x, y: tile.y, z: tile.z });
      self.applyClasses(wrapper, classes); // Update the position
    });
    if (tile.merged) {
      inner.classList.add("tile-useless");
    }
  } else if (tile.mergedFrom) {
    inner.classList.add("tile-merged");

    // Render the tiles that merged
    tile.mergedFrom.forEach(function (merged) {
      self.addTile(merged);
    });
  } else {
    inner.classList.add("tile-new");
  }

  // Add the inner part of the tile to the wrapper
  wrapper.appendChild(inner);

  // Put the tile on the board
  this.tileContainer.appendChild(wrapper);
};

HTMLActuator.prototype.applyClasses = function (element, classes) {
  element.setAttribute("class", classes.join(" "));
};

HTMLActuator.prototype.normalizePosition = function (position) {
  return { x: position.x + 1, y: position.y + 1, z: position.z + 1 };
};

HTMLActuator.prototype.positionClass = function (position) {
  position = this.normalizePosition(position);
  return "cube-" + position.x + "-" + position.y + "-" + position.z + ' x-' + position.x + ' y-' + position.y + ' z-' + position.z;
};

HTMLActuator.prototype.updateScore = function (score) {
  this.clearContainer(this.scoreContainer);

  var difference = score - this.score;
  this.score = score;

  this.scoreContainer.textContent = this.score;

  if (difference > 0) {
    var addition = document.createElement("div");
    addition.classList.add("score-addition");
    addition.textContent = "+" + difference;

    this.scoreContainer.appendChild(addition);
  }
};

HTMLActuator.prototype.updateBestScore = function (bestScore) {
  this.bestContainer.textContent = bestScore;
};

HTMLActuator.prototype.message = function (won) {
  var type    = won ? "game-won" : "game-over";
  var message = won ? "You win!" : "Game over!";
  if (typeof ga !== "undefined") {
    ga("send", "event", window.gameName || "game", "end", type, this.score);
  }

  this.messageContainer.classList.add(type);
  this.messageContainer.getElementsByTagName("p")[0].textContent = message;
};

HTMLActuator.prototype.clearMessage = function () {
  // IE only takes one value to remove at a time.
  this.messageContainer.classList.remove("game-won");
  this.messageContainer.classList.remove("game-over");
};
function Grid(size) {
  this.size = size;

  this.cells = [];

  this.build();
}

// Build a grid of the specified size
Grid.prototype.build = function () {
  for (var x = 0; x < this.size; x++) {
    var face = this.cells[x] = [];
    for (var y = 0; y < this.size; y++) {
        var row = face[y] = [];
        for (var z = 0; z < this.size; z++) {
          row.push(null);
        }
    }
  }
};

// Find the first available random position
Grid.prototype.randomAvailableCell = function () {
  var cells = this.availableCells();

  if (cells.length) {
    return cells[Math.floor(Math.random() * cells.length)];
  }
};

Grid.prototype.availableCells = function () {
  var cells = [];

  this.eachCell(function (x, y, z, tile) {
    if (!tile) {
      cells.push({ x: x, y: y, z: z });
    }
  });

  return cells;
};

// Call callback for every cell
Grid.prototype.eachCell = function (callback) {
  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      for (var z = 0; z < this.size; z++) {
        callback(x, y, z, this.cells[x][y][z]);
      }
    }
  }
};

// Check if there are any cells available
Grid.prototype.cellsAvailable = function () {
  return !!this.availableCells().length;
};

// Check if the specified cell is taken
Grid.prototype.cellAvailable = function (cell) {
  return !this.cellOccupied(cell);
};

Grid.prototype.cellOccupied = function (cell) {
  return !!this.cellContent(cell);
};

Grid.prototype.cellContent = function (cell) {
  if (this.withinBounds(cell)) {
    return this.cells[cell.x][cell.y][cell.z];
  } else {
    return null;
  }
};

// Inserts a tile at its position
Grid.prototype.insertTile = function (tile) {
  this.cells[tile.x][tile.y][tile.z] = tile;
};

Grid.prototype.removeTile = function (tile) {
  this.cells[tile.x][tile.y][tile.z] = null;
};

Grid.prototype.withinBounds = function (position) {
  return position.x >= 0 && position.x < this.size &&
         position.y >= 0 && position.y < this.size &&
         position.z >= 0 && position.z < this.size;
};
function Tile(position, value, type) {
  this.x                = position.x;
  this.y                = position.y;
  this.z                = position.z;
  this.value            = value || 2;
  this.type             = type || 'number';

  this.previousPosition = null;
  this.mergedFrom       = null; // Tracks tiles that merged together
  this.merged           = false;
}

Tile.prototype.savePosition = function () {
  this.previousPosition = { x: this.x, y: this.y, z:this.z };
};

Tile.prototype.updatePosition = function (position) {
  this.x = position.x;
  this.y = position.y;
  this.z = position.z;
};
window.fakeStorage = {
  _data: {},

  setItem: function (id, val) {
    return this._data[id] = String(val);
  },

  getItem: function (id) {
    return this._data.hasOwnProperty(id) ? this._data[id] : undefined;
  },

  removeItem: function (id) {
    return delete this._data[id];
  },

  clear: function () {
    return this._data = {};
  }
};

function LocalScoreManager() {
  this.key     = (window.gameName || "") + "-bestScore";

  var supported = this.localStorageSupported();
  this.storage = supported ? window.localStorage : window.fakeStorage;
}

LocalScoreManager.prototype.localStorageSupported = function () {
  var testKey = "test";
  var storage = window.localStorage;

  try {
    storage.setItem(testKey, "1");
    storage.removeItem(testKey);
    return true;
  } catch (error) {
    return false;
  }
};

LocalScoreManager.prototype.get = function () {
  return this.storage.getItem(this.key) || 0;
};

LocalScoreManager.prototype.set = function (score) {
  this.storage.setItem(this.key, score);
};

function GameManager(size, InputManager, Actuator, ScoreManager) {
  this.size         = size; // Size of the grid
  this.inputManager = new InputManager;
  this.scoreManager = new ScoreManager;
  this.actuator     = new Actuator;
  this.rotated      = false;
  this.startTiles   = 2;

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("rotate", this.rotate.bind(this));
  this.inputManager.on("hidden", this.hidden.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));

  this.setup();
}

// Rotate the container
GameManager.prototype.rotate = function () {
  this.rotated = !this.rotated;
  this.actuator.rotate(this.rotated);
};

// Hide some layers
GameManager.prototype.hidden = function (layer) {
  this.actuator.hidden(layer, this.size);
};

// Restart the game
GameManager.prototype.restart = function () {
  this.actuator.continue(true);
  this.setup();
};

// Keep playing after winning
GameManager.prototype.keepPlaying = function () {
  this.keepPlaying = true;
  this.actuator.continue();
};

GameManager.prototype.isGameTerminated = function () {
  if (this.over || (this.won && !this.keepPlaying)) {
    return true;
  } else {
    return false;
  }
};

// Set up the game
GameManager.prototype.setup = function () {
  this.grid        = new Grid(this.size);

  this.score       = 0;
  this.over        = false;
  this.won         = false;
  this.keepPlaying = false;
  this.bonus       = {};
  this.max         = 2;

  // Add the initial tiles
  this.addStartTiles();

  // Update the actuator
  this.actuate();
};

// Set up the initial tiles to start the game with
GameManager.prototype.addStartTiles = function () {
  for (var i = 0; i < this.startTiles; i++) {
    this.addRandomTile();
  }
};

// Adds a tile in a random position
GameManager.prototype.addRandomTile = function () {
  if (this.grid.cellsAvailable()) {
    var value = Math.random() < 0.9 ? 2 : 4;
    var tile = new Tile(this.grid.randomAvailableCell(), value);

    this.grid.insertTile(tile);
  }
};

// Add bonus tile
GameManager.prototype.addBonus = function () {
  if (Math.random() > 0.2 * this.grid.availableCells().length / Math.pow(this.size, 3)) {
    return;
  }
  var maxBonus = 4;
  var values = [4, 64, 256];
  var value = values[Math.floor(Math.random() * values.length)];
  if (this.bonus[value] === undefined) {
    this.bonus[value] = 0;
  }
  if (this.bonus[value] == 2) {
    return;
  }
  for (var num in this.bonus) {
    maxBonus -= this.bonus[num];
  }
  if (maxBonus <= 0) {
    return;
  }
  if (this.grid.cellsAvailable()) {
    this.bonus[value]++;
    var tile = new Tile(this.grid.randomAvailableCell(), value, 'bonus');
    this.grid.insertTile(tile);
  }
};

// remove bonus tile
GameManager.prototype.removeBonus = function (value) {
  if (this.bonus[value] !== undefined) {
    delete this.bonus[value];
  }
};

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
  if (this.scoreManager.get() < this.score) {
    this.scoreManager.set(this.score);
  }

  this.actuator.actuate(this.grid, {
    score:      this.score,
    over:       this.over,
    won:        this.won,
    bestScore:  this.scoreManager.get(),
    terminated: this.isGameTerminated()
  });

};

// Save all tile positions and remove merger info
GameManager.prototype.prepareTiles = function () {
  var self = this;
  this.grid.eachCell(function (x, y, z, tile) {
    if (tile) {
      if (tile.type === 'bonused') {
        self.grid.removeTile({ x: x, y: y, z:z });
      } else {
        tile.mergedFrom = null;
        tile.savePosition();
      }
    }
  });
};

// Move a tile and its representation
GameManager.prototype.moveTile = function (tile, cell) {
  this.grid.cells[tile.x][tile.y][tile.z] = null;
  this.grid.cells[cell.x][cell.y][cell.z] = tile;
  tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  // 0: up, 1: right, 2:down, 3: left
  var self = this;

  if (this.isGameTerminated()) return; // Don't do anything if the game's over

  var cell, tile;

  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;
  // Save the current tile positions and remove merger information
  this.prepareTiles();
  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      traversals.z.forEach(function (z) {
        cell = { x: x, y: y, z:z };
        tile = self.grid.cellContent(cell);

        if (tile) {
          var positions = self.findFarthestPosition(cell, vector);
          var next      = self.grid.cellContent(positions.next);

          // Only one merger per row traversal?
          if (next && next.value === tile.value && next.type === tile.type && !next.mergedFrom) {
            var type = next.type === 'number' ? 'number' : 'bonused';
            var merged = new Tile(positions.next, tile.value * 2, type);
            merged.mergedFrom = [tile, next];
            tile.merged = next.merged = true;

            self.grid.insertTile(merged);
            self.grid.removeTile(tile);
            if (tile.type === 'bonus') {
              self.removeBonus(tile.value);
            }

            // Converge the two tiles' positions
            tile.updatePosition(positions.next);

            // Update the score
            self.score += merged.value;
            if (merged.value > self.max) {
              self.max = merged.value;
            }
            // The mighty 2048 tile
            if (merged.value === 2048 && merged.type === 'number') self.won = true;
          } else {
            self.moveTile(tile, positions.farthest);
          }

          if (!self.positionsEqual(cell, tile)) {
            moved = true; // The tile moved from its original cell!
          }
        }
      });
    });
  });

  if (moved) {
    this.addRandomTile();
    this.addBonus();

    if (!this.movesAvailable()) {
      this.over = true; // Game over!
    }

    this.actuate();
  }
};

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  // Vectors representing tile movement
  var map = !this.rotated ? {
    0: { x: 0,  y: -1, z: 0 }, // up
    1: { x: 1,  y: 0, z: 0 },  // right
    2: { x: 0,  y: 1, z: 0 },  // down
    3: { x: -1, y: 0, z: 0 },  // left
    4: { x: 0,  y: 0, z: 1 },  // front
    5: { x: 0, y: 0, z: -1 }   // back
  } : {
    0: { x: 0,  y: -1, z: 0 }, // up
    1: { x: 0,  y: 0, z: 1 },  // right should be front
    2: { x: 0,  y: 1, z: 0 },  // down
    3: { x: 0, y: 0, z: -1 },  // left should be back
    4: { x: -1,  y: 0, z: 0 },  // front should be left
    5: { x: 1, y: 0, z: 0 }   // back should be right
  };

  return map[direction];
};

// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [], z: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
    traversals.z.push(pos);
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();
  if (vector.z === 1) traversals.z = traversals.z.reverse();

  return traversals;
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var previous;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y, z: previous.z + vector.z };
  } while (this.grid.withinBounds(cell) &&
           this.grid.cellAvailable(cell));

  return {
    farthest: previous,
    next: cell // Used to check if a merge is required
  };
};

GameManager.prototype.movesAvailable = function () {
  return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

// Check for available matches between tiles (more expensive check)
GameManager.prototype.tileMatchesAvailable = function () {
  var self = this;

  var tile;

  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      for (var z= 0; z < this.size; z++) {
        tile = this.grid.cellContent({ x: x, y: y, z: z });

        if (tile) {
          for (var direction = 0; direction < 6; direction++) {
            var vector = self.getVector(direction);
            var cell   = { x: x + vector.x, y: y + vector.y, z: z + vector.z };

            var other  = self.grid.cellContent(cell);

            if (other && other.value === tile.value && other.type === tile.type) {
              return true; // These two tiles can be merged
            }
          }
        }
      }
    }
  }

  return false;
};

GameManager.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y && first.z === second.z;
};
window.requestAnimationFrame(function () {
  window.gameName = '2048-3d';
  window.game = new GameManager(3, KeyboardInputManager, HTMLActuator, LocalScoreManager);
  'ontouchstart' in window && (document.querySelector('.touch-buttons').classList.add('show'));
});