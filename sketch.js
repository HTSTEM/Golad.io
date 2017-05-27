/*
 States:
 0: Dead
 1: Red
 2: Blue
 */

var GRID_WIDTH = 20;
var GRID_HEIGHT = 20;
var TILE_PADDING = 0;
var RED = "#D55336";
var DARK_RED = "#AB422B";
var BLUE = "#30A7C2";
var DARK_BLUE = "#26869B";
var GREY = "#333333";
var BLACK = "#222222";
var FANCY_MIDDLE = true;

var canvas;
var gridTiles;
var tileSize;
var xOff;
var yOff;
var ctx;
var mouseDown = false;
var renderNeighbours = false;
var changedThisDrag = [];
var currentPlayer = 1;

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
    for (var x = 0; x < GRID_WIDTH; x++) {
        for (var y = 0; y < GRID_HEIGHT; y++) {
            var n = getNeighbours(x, y);
            if (n < 2) {
                gridTiles[x][y].nextState = 0;
            } else if (n > 3) {
                gridTiles[x][y].nextState = 0;
            }
            if (gridTiles[x][y].currentState != 0 && (n == 2 || n == 3)) {
                gridTiles[x][y].nextState = gridTiles[x][y].currentState;
            }
            if (gridTiles[x][y].currentState == 0 && n == 3) {
                var rn = getRedNeighbours(x, y);
                if (n - rn < rn)
                    gridTiles[x][y].nextState = 1;
                else
                    gridTiles[x][y].nextState = 2;
            }
            if (gridTiles[x][y].currentState == 0 && n == 2) {
                gridTiles[x][y].nextState = 0;
            }
        }
    }
}

function gameOfLifeTick() {
    checkNextStates();

    var changed = [];

    for (var x = 0; x < GRID_WIDTH; x++) {
        for (var y = 0; y < GRID_HEIGHT; y++) {
            if (gridTiles[x][y].currentState != gridTiles[x][y].nextState) {
                gridTiles[x][y].currentState = gridTiles[x][y].nextState;
                changed.push({x:x, y:y});
            }
        }
    }

    checkNextStates();

    for (var i = 0; i < changed.length; i++) {
        redrawTile(changed[i].x, changed[i].y);
    }
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
                    if (gridTiles[x + dx][y + dy].currentState == 1) {
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

    ctx.fillRect(xOff + x * (tileSize + TILE_PADDING) + 3,
        yOff + y * (tileSize + TILE_PADDING) + 3,
        tileSize - 6,
        tileSize - 6);

    switch (gridTiles[x][y].currentState) {
        case 0:
            ctx.fillStyle = GREY;
            break;
        case 1:
            ctx.fillStyle = DARK_RED;
            break;
        case 2:
            ctx.fillStyle = DARK_BLUE;
            break;
    }
    ctx.fillRect(xOff + x * (tileSize + TILE_PADDING) + 3,
        yOff + y * (tileSize + TILE_PADDING) + ((tileSize - 3) / 6 * 5),
        tileSize - 6,
        (tileSize - 3) / 6);

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
    ctx.fillRect(xOff + x * (tileSize + TILE_PADDING) + (tileSize / 3) + 1,
        yOff + y * (tileSize + TILE_PADDING) + (tileSize / 3) + 1,
        tileSize / 3 - 2,
        tileSize / 3 - 2);

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

function mouseChangeMove () {
    for (var y = 0; y < GRID_HEIGHT; y++) {
        for (var x = 0; x < GRID_WIDTH; x++) {
            if (!(containsObject({x:x, y:y}, changedThisDrag))) {
                var rect = [xOff + x * (tileSize + TILE_PADDING), yOff + y * (tileSize + TILE_PADDING), tileSize, tileSize];
                if (event.offsetX > rect[0] && event.offsetX < rect[0] + rect[2]) {
                    if (event.offsetY > rect[1] && event.offsetY < rect[1] + rect[3]) {
                        gridTiles[x][y].currentState ++;
                        if (gridTiles[x][y].currentState == 3)
                            gridTiles[x][y].currentState = 0;
                        changedThisDrag.push({x:x, y:y});
                        refreshTile(x, y);
                        return;
                    }
                }
            }
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
    changedThisDrag = [];

    mouseChangeMove();
});

$(window).mouseup(function (event) {
    mouseDown = false;
});

$(window).mousemove(function (event) {
    if (mouseDown) {
        mouseChangeMove();
    }
});

$(window).keydown(function () {
    gameOfLifeTick();
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

            console.log((GRID_HEIGHT / 2 + (GRID_HEIGHT / 2 - y - 1)));
            gridTiles[GRID_HEIGHT / 2 + (GRID_HEIGHT / 2 - y - 1)].push({currentState: val, nextState: 0});
        }
    }

    checkNextStates();

    console.log("Done!");

    drawAll();
});