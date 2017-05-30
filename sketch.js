/*
 States:
 0: Dead
 1: Red
 2: Blue
 3: Half-created red
 4: Half-created red
 */

var GRID_WIDTH = 20;
var GRID_HEIGHT = 20;
var TILE_PADDING = 0;
var RED = "#ff0000"; //"#D55336";
var DARK_RED = "#AB422B";
var BLUE = "#0066ff"; //"#30A7C2";
var DARK_BLUE = "#26869B";
var GREY = "#262626"; //"#333333";
var BLACK = "#000000"; //"#222222";
var FANCY_MIDDLE = true;

var BIRTH_COUNT = [3];
var STAY_COUNT = [2, 3];
var GAME_STRING = "B" + BIRTH_COUNT.join("") + "/" + "S" + STAY_COUNT.join("");

var canvas;
var gridTiles;
var tileSize;
var xOff;
var yOff;
var ctx;

var renderNeighbours = false;
var changedThisDrag = [];

var currentPlayer = 1;
var moveStarted = false;
var moveFinished = false;
var creationTile = [];
var stolenTiles = [];
var origCol = 0;
var currentMove = "A";

var turnNumber = 1;

var tileSizePerc = 100;
var tileSizePercGrow = 5;
var tileSizePercSpeed = 10;
var changedTiles = [];

function roundRect(ctx, x, y, width, height, radius, fill, stroke) {
    if (typeof stroke == 'undefined') {
        stroke = true;
    }
    if (typeof radius === 'undefined') {
        radius = 5;
    }
    if (typeof radius === 'number') {
        radius = {tl: radius, tr: radius, br: radius, bl: radius};
    } else {
        var defaultRadius = {tl: 0, tr: 0, br: 0, bl: 0};
        for (var side in defaultRadius) {
            radius[side] = radius[side] || defaultRadius[side];
        }
    }
    ctx.beginPath();
    ctx.moveTo(x + radius.tl, y);
    ctx.lineTo(x + width - radius.tr, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
    ctx.lineTo(x + width, y + height - radius.br);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
    ctx.lineTo(x + radius.bl, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
    ctx.lineTo(x, y + radius.tl);
    ctx.quadraticCurveTo(x, y, x + radius.tl, y);
    ctx.closePath();
    if (fill) {
        ctx.fill();
    }
    if (stroke) {
        ctx.stroke();
    }

}

function textOntoTile(x, y, text) {
    ctx.font = "15px sans-serif";

    var xp = xOff + x * (tileSize + TILE_PADDING) + (tileSize - ctx.measureText(text).width) / 2;
    var yp = yOff + y * (tileSize + TILE_PADDING) + tileSize - (tileSize - 15) / 2;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(text, xp, yp);
}

function drawAll() {
    $("#ruleset").text(GAME_STRING);

    ctx.fillStyle = BLACK;
    ctx.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
    );

    var gridWidth = Math.min(canvas.width, canvas.height) - (TILE_PADDING * (Math.max(GRID_WIDTH, GRID_HEIGHT) + 1));
    //var gridWidth = Math.min(canvas.width, canvas.height) + (TILE_PADDING * (Math.max(GRID_WIDTH, GRID_HEIGHT) + 1));

    tileSize = gridWidth / Math.max(GRID_WIDTH, GRID_HEIGHT);


    tileSize = Math.floor(tileSize);

    xOff = Math.floor((canvas.width - ((GRID_WIDTH * tileSize) + TILE_PADDING * (GRID_WIDTH + 1))) / 2);
    yOff = Math.floor((canvas.height - ((GRID_HEIGHT * tileSize) + TILE_PADDING * (GRID_HEIGHT + 1))) / 2);

    for (var y = 0; y < GRID_HEIGHT; y++) {
        for (var x = 0; x < GRID_WIDTH; x++) {
            redrawTile(x, y);
        }
    }
}

function checkNextStates() {
    var counts = getCellsCount();
    $("#player1-count").html("&#x25FC&#xd7 " + counts.red);
    $("#player2-count").html("&#x25FC&#xd7 " + counts.blue);

    for (var x = 0; x < GRID_WIDTH; x++) {
        for (var y = 0; y < GRID_HEIGHT; y++) {
            var n = getNeighbours(x, y);

            if (BIRTH_COUNT.includes(n) && gridTiles[x][y].currentState == 0) {
                var rn = getRedNeighbours(x, y);
                if (n - rn < rn)
                    gridTiles[x][y].nextState = 1;
                else
                    gridTiles[x][y].nextState = 2;
            }
            else if (!(STAY_COUNT.includes(n))) {
                gridTiles[x][y].nextState = 0;
            }
            else {
                gridTiles[x][y].nextState = gridTiles[x][y].currentState
            }

        }
    }
}

function gameOfLifeTick() {
    if (currentPlayer == 2) {
        turnNumber++;
    }

    moveStarted = false;
    moveFinished = false;
    stolenTiles = [];
    creationTile = [];
    origCol = 0;
    currentMove = "A";
    $("#turn").text(turnNumber + "A / " + turnNumber + "A");

    if (currentPlayer == 1)
        currentPlayer = 2;
    else
        currentPlayer = 1;

    checkNextStates();

    changedTiles = [];

    for (var x = 0; x < GRID_WIDTH; x++) {
        for (var y = 0; y < GRID_HEIGHT; y++) {
            if (gridTiles[x][y].currentState != gridTiles[x][y].nextState) {
                gridTiles[x][y].currentState = gridTiles[x][y].nextState;
                changedTiles.push({x:x, y:y});
            }
        }
    }

    checkNextStates();

    tileSizePerc = 0;
    growTiles();
}

function getNeighbours(x, y) {
    var neighbours = 0;

    for (var dx = -1; dx < 2; dx++) {
        for (var dy = -1; dy < 2; dy++) {
            if (x + dx >= 0 && x + dx < GRID_WIDTH && y + dy >= 0 && y + dy < GRID_HEIGHT) {
                if (!(dx == 0 && dy == 0)) {
                    if (gridTiles[x + dx][y + dy].currentState != 0) {
                        neighbours += 1;
                    }
                }
            }
        }
    }

    return neighbours;
}

function getRedNeighbours(x, y) {
    var redNeighbours = 0;

    for (var dx = -1; dx < 2; dx++) {
        for (var dy = -1; dy < 2; dy++) {
            if (x + dx >= 0 && x + dx < GRID_WIDTH && y + dy >= 0 && y + dy < GRID_HEIGHT) {
                if (!(dx == 0 && dy == 0)) {
                    if (gridTiles[x + dx][y + dy].currentState == 1 || gridTiles[x + dx][y + dy].currentState == 3) {
                        redNeighbours += 1;
                    }
                }
            }
        }
    }

    return redNeighbours;
}

function getCellsCount() {
    var redCells = 0;
    var blueCells = 0;

    for (var y = 0; y < GRID_HEIGHT; y++) {
        for (var x = 0; x < GRID_WIDTH; x++) {
            if (gridTiles[x][y].currentState == 1)
                redCells ++;
            else if (gridTiles[x][y].currentState == 2)
                blueCells ++;
        }
    }

    return {red: redCells, blue: blueCells};
}

function refreshTile(x, y) {
    checkNextStates();

    for (var dx = -1; dx < 2; dx++) {
        for (var dy = -1; dy < 2; dy++) {
            if (x + dx >= 0 && x + dx < GRID_WIDTH && y + dy >= 0 && y + dy < GRID_HEIGHT) {
                redrawTile(x + dx, y + dy);
            }
        }
    }
}

function redrawTile(x, y) {
    var margins = 3;
    if (Math.min(canvas.width, canvas.height) <= 500) {
        margins = 2;
    }
    if (Math.min(canvas.width, canvas.height) <= 400) {
        margins = 1;
    }

    var x_abs;
    var y_abs;
    var size;

    if (gridTiles[x][y].currentState <= 2) {
        switch (gridTiles[x][y].currentState) {
            case 0:
                ctx.fillStyle = GREY;
                break;
            case 1:
                ctx.fillStyle = RED;
                break;
            case 2:
                ctx.fillStyle = BLUE;
                break;
        }

        x_abs = xOff + x * (tileSize + TILE_PADDING) + margins + ((tileSize - margins * 2) / 100) * (100 - tileSizePerc) / 2;
        y_abs = yOff + y * (tileSize + TILE_PADDING) + margins + ((tileSize - margins * 2) / 100) * (100 - tileSizePerc) / 2;
        size = ((tileSize - margins * 2) / 100) * tileSizePerc;

        ctx.fillRect(x_abs,
            y_abs,
            size,
            size);

        switch (gridTiles[x][y].nextState) {
            case 0:
                ctx.fillStyle = GREY;
                break;
            case 1:
                ctx.fillStyle = RED;
                break;
            case 2:
                ctx.fillStyle = BLUE;
                break;
        }

        x_abs = xOff + x * (tileSize + TILE_PADDING) + (tileSize / 3) + 1 + ((tileSize / 3 - 2) / 100) * (100 - tileSizePerc) / 2;
        y_abs = yOff + y * (tileSize + TILE_PADDING) + (tileSize / 3) + 1 + ((tileSize / 3 - 2) / 100) * (100 - tileSizePerc) / 2;
        size = ((tileSize / 3 - 2) / 100) * tileSizePerc;

        ctx.fillRect(x_abs,
            y_abs,
            size,
            size);
    } else {
        switch (gridTiles[x][y].currentState) {
            case 3:
                ctx.fillStyle = RED;
                break;
            case 4:
                ctx.fillStyle = BLUE;
                break;
        }

        x_abs = xOff + x * (tileSize + TILE_PADDING) + margins;
        y_abs = yOff + y * (tileSize + TILE_PADDING) + margins;
        size = tileSize - margins * 2;

        ctx.fillRect(x_abs,
            y_abs,
            size,
            size);

        ctx.fillStyle = GREY;

        x_abs = xOff + x * (tileSize + TILE_PADDING) + margins + 3;
        y_abs = yOff + y * (tileSize + TILE_PADDING) + margins + 3;
        size = tileSize - margins * 2 - 6;

        ctx.fillRect(x_abs,
            y_abs,
            size,
            size);

        switch (gridTiles[x][y].currentState) {
            case 3:
                ctx.fillStyle = RED;
                break;
            case 4:
                ctx.fillStyle = BLUE;
                break;
        }

        size = tileSize - margins * 2;
        x_abs = (xOff + x * (tileSize + TILE_PADDING) + margins) + (size / 2) - 2;
        y_abs = yOff + y * (tileSize + TILE_PADDING) + margins;
        var width = 4;

        ctx.fillRect(x_abs,
            y_abs,
            width,
            size);

        if (stolenTiles.length > 0) {
            size = tileSize - margins * 2 - 6;
            x_abs = xOff + x * (tileSize + TILE_PADDING) + margins + 3;
            y_abs = yOff + y * (tileSize + TILE_PADDING) + margins + 3;
            width = size / 2 - 2;

            ctx.fillRect(x_abs,
                y_abs,
                width,
                size);
        }
        if (stolenTiles.length > 1) {
            size = tileSize - margins * 2 - 6;
            x_abs = xOff + x * (tileSize + TILE_PADDING) + margins + 5 + size / 2;
            y_abs = yOff + y * (tileSize + TILE_PADDING) + margins + 3;
            width = size / 2 - 2;

            ctx.fillRect(x_abs,
                y_abs,
                width,
                size);
        }



        switch (gridTiles[x][y].nextState) {
            case 0:
                ctx.fillStyle = GREY;
                break;
            case 1:
                ctx.fillStyle = RED;
                break;
            case 2:
                ctx.fillStyle = BLUE;
                break;
        }

        x_abs = xOff + x * (tileSize + TILE_PADDING) + (tileSize / 3) + 1;
        y_abs = yOff + y * (tileSize + TILE_PADDING) + (tileSize / 3) + 1;
        size = (tileSize / 3 - 2);

        ctx.fillRect(x_abs,
            y_abs,
            size,
            size);
    }


    if (renderNeighbours) {
        textOntoTile(x, y, getNeighbours(x, y));
    }
}

function containsObject(obj, list) {
    var i;
    for (i = 0; i < list.length; i++) {
        if (list[i].x === obj.x && list[i].y === obj.y) {
            return true;
        }
    }

    return false;
}

function mouseChangeMove (event) {
    for (var y = 0; y < GRID_HEIGHT; y++) {
        for (var x = 0; x < GRID_WIDTH; x++) {
            if (!(containsObject({x:x, y:y}, changedThisDrag))) {
                var rect = [xOff + x * (tileSize + TILE_PADDING), yOff + y * (tileSize + TILE_PADDING), tileSize, tileSize];

                if (event.pageX > rect[0] && event.pageX < rect[0] + rect[2]) {
                    if (event.pageY > rect[1] && event.pageY < rect[1] + rect[3]) {
                        var otherPlayer;
                        var i;
                        if (currentPlayer == 1)
                            otherPlayer = 2;
                        else
                            otherPlayer = 1;

                        if ((gridTiles[x][y].currentState == currentPlayer || gridTiles[x][y].currentState == otherPlayer) && !moveStarted) {
                            origCol = gridTiles[x][y].currentState;
                            gridTiles[x][y].currentState = 0;
                            moveStarted = true;
                            moveFinished = true;
                            currentMove = "B";
                            creationTile = "[" + x + "," + y + "]";
                        }
                        else if (gridTiles[x][y].currentState == 0 && creationTile == "[" + x + "," + y + "]" && moveFinished) {
                            gridTiles[x][y].currentState = origCol;
                            origCol = 0;
                            for (i = 0; i < stolenTiles.length; i ++) {
                                gridTiles[stolenTiles[i][0]][stolenTiles[i][1]].currentState = currentPlayer;
                            }
                            stolenTiles = [];
                            moveStarted = false;
                            moveFinished = false;
                            currentMove = "A";
                            creationTile = null;
                        }
                        else if (gridTiles[x][y].currentState == 0 && stolenTiles.includes("[" + x + "," + y + "]")) {
                            gridTiles[x][y].currentState = origCol;
                            origCol = 0;
                            stolenTiles.splice(stolenTiles.indexOf("[" + x + "," + y + "]"), 1);
                            if (currentMove == "D")
                                currentMove = "C";
                            else if (currentMove == "C")
                                currentMove = "B";
                            moveStarted = true;
                            moveFinished = false;
                        }
                        else if (gridTiles[x][y].currentState == currentPlayer + 2) {
                            origCol = gridTiles[x][y].currentState;
                            gridTiles[x][y].currentState = 0;
                            for (i = 0; i < stolenTiles.length; i ++) {
                                gridTiles[eval(stolenTiles[i])[0]][eval(stolenTiles[i])[1]].currentState = currentPlayer;
                            }
                            stolenTiles = [];
                            moveStarted = false;
                            moveFinished = false;
                            currentMove = "A";
                            creationTile = null;
                        }
                        else if (gridTiles[x][y].currentState != otherPlayer && !moveStarted) {
                            gridTiles[x][y].currentState = currentPlayer + 2;
                            moveStarted = true;
                            moveFinished = false;
                            currentMove = "B";
                            creationTile = "[" + x + "," + y + "]";
                        }
                        else if (gridTiles[x][y].currentState == currentPlayer && moveStarted && !moveFinished) {
                            origCol = gridTiles[x][y].currentState;
                            gridTiles[x][y].currentState = 0;
                            stolenTiles.push("[" + x + "," + y + "]");
                            currentMove = "C";
                            if (stolenTiles.length >= 2) {
                                currentMove = "D";
                                moveFinished = true;
                            }
                        }

                        var turn = $("#turn");
                        if (currentPlayer == 1)
                            turn.text(turnNumber + currentMove + " / " + turnNumber + "A");
                        else
                            turn.text(turnNumber + "A / " + turnNumber + currentMove);

                        checkNextStates();
                        checkNextStates();
                        drawAll();
                        /*changedTiles = [];
                        for (var x_ = 0; x_ < GRID_WIDTH; x_++) {
                            for (var y_ = 0; y_ < GRID_HEIGHT; y_++) {
                                if (gridTiles[x_][y_].currentState != gridTiles[x_][y_].nextState) {
                                    changedTiles.push({x:x_, y:y_});
                                }
                            }
                        }
                        refreshTile(x, y);
                        checkNextStates();

                        for (i = 0; i < changedTiles.length; i++) {
                            redrawTile(changedTiles[i].x, changedTiles[i].y);
                        }*/
                        return;
                    }
                }
            }
        }
    }
}

function growTiles() {
    if (tileSizePerc < 100) {
        tileSizePerc += tileSizePercGrow;

        if (tileSizePerc > 100) {
            tileSizePerc = 100;
        }

        var st = performance.now();
        for (var i = 0; i < changedTiles.length; i++) {
            refreshTile(changedTiles[i].x, changedTiles[i].y);
            redrawTile(changedTiles[i].x, changedTiles[i].y);
        }
        var dt = performance.now() - st;

        if (tileSizePerc < 100) {
            setTimeout(growTiles, tileSizePercSpeed - dt)
        }


    }
}

function getCH() {
    return $("#mainGame").height();
    //return document.body.clientWidth;
}
function getCW() {
    return $("#mainGame").width();
    //return document.body.clientWidth;
}

$(window).resize(function () {
    canvas.width = getCW();
    canvas.height = getCH();
    $("#gameCanvas").offset($("#mainGame").position());

    drawAll();
});

$(window).mousedown(function (event) {
    //mouseDown = true;
    mouseChangeMove(event);
});

$(window).keydown(function () {
    if (tileSizePerc == 100 && moveFinished) {
        gameOfLifeTick();
    }
});

$().ready(function () {
    canvas = document.getElementById("gameCanvas");
    ctx = canvas.getContext("2d");
    $("#gameCanvas").offset($("#mainGame").position());

    canvas.width = getCW();
    canvas.height = getCH();
    canvas.width = getCW();
    canvas.height = getCH();

    console.log("Welcome to GOLAD.io V0.0.1");
    console.log("Spawning grid...");

    gridTiles = [];

    for (var y = 0; y < GRID_HEIGHT / 2; y++) {
        gridTiles.push([]);

        for (var x = 0; x < GRID_WIDTH; x++) {
            var val;
            var r = Math.random();
            if (r < 0.3)
                val = 1;
            else if (r < 0.6)
                val = 2;
            else
                val = 0;

            gridTiles[y].push({currentState: val, nextState: 0});
        }
    }
    for (y = 0; y < GRID_WIDTH / 2; y ++) { gridTiles.push([]); }

    for (y = 0; y < GRID_HEIGHT / 2; y++) {
        for (x = 0; x < GRID_WIDTH; x++) {
            if (gridTiles[y][GRID_WIDTH - x - 1].currentState == 2)
                val = 1;
            else if (gridTiles[y][GRID_WIDTH - x - 1].currentState == 1)
                val = 2;
            else
                val = 0;

            gridTiles[GRID_HEIGHT / 2 + (GRID_HEIGHT / 2 - y - 1)].push({currentState: val, nextState: 0});
        }
    }

    checkNextStates();

    console.log("Done!");

    drawAll();
});