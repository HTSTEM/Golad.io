/*
 States:
 0: Dead
 1: Red
 2: Blue
 3: Neutral
 4: Half-created red
 5: Half-created red
 */
var socket;
var online=true;
try{
    var nsp = window.location.href.split('/').slice(-1)[0];
    console.log(nsp);
    socket = io('/'+nsp);
}catch(err){
    online=false;
}

var GRID_WIDTH = 20;
var GRID_HEIGHT = 20;
var TILE_PADDING = 0;
var RED = "#ff0000"; //"#D55336";
var DARK_RED = "#AB422B";
var BLUE = "#0066ff"; //"#30A7C2";
var DARK_BLUE = "#26869B";
var GREY = "#262626"; //"#333333";
var BLACK = "#000000"; //"#222222";
var WHITE = "#ffffff"
var FANCY_MIDDLE = true;

var BIRTH_COUNT = [3];
var STAY_COUNT = [2,3];
var RULE_STRING = "B" + BIRTH_COUNT.join("") + "/" + "S" + STAY_COUNT.join("");
var THIS_PLAYER;//MP game only 1=red, 2=blue, anything else=spectating7
var P1NAME = 'Player 1';
var P2NAME = 'Player 2';

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
var moveNumber = {curr: [1,"A"], max: [1,"A"]};
var gameEnd = false;

var turnNumber = 1;

var tileSizePerc = 100;
var tileSizePercGrow = 5;
var tileSizePercSpeed = 10;
var changedTiles = [];

var gameString = ''//20x20, no time limits, no time bonus, both humans

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

function drawText(){
    $("#ruleset").text(RULE_STRING);
    $("#p1name").html(P1NAME);
    $("#p2name").html(P2NAME);
}

function drawAll() {
    drawText();

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
    if (moveFinished && (currentPlayer == THIS_PLAYER || !online)){
        $("#end").removeClass("locked");
    }else{
        $("#end").addClass("locked");
    }
    if (currentPlayer == 1) {
        $("#player1").addClass("blink");
        $("#player2").removeClass("blink");
    } else {
        $("#player1").removeClass("blink");
        $("#player2").addClass("blink");
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
                var rn = getColouredNeighbours(x, y, 1);
                var bn = getColouredNeighbours(x, y, 2);
                if (rn>bn){
                    gridTiles[x][y].nextState = 1;
                }else if(bn>rn){
                    gridTiles[x][y].nextState = 2;
                }else if(rn==bn){
                    gridTiles[x][y].nextState = 3;
                }
            }
            else if (!(STAY_COUNT.includes(n))) {
                gridTiles[x][y].nextState = 0;
            }
            else {
                if (gridTiles[x][y].currentState <= 3)
                    gridTiles[x][y].nextState = gridTiles[x][y].currentState;
                else
                    gridTiles[x][y].nextState = gridTiles[x][y].currentState - 3;
            }
        }
    }
}

function gameOfLifeTick(send=true) {

    turnNumber++;
    console.log(turnNumber);
    moveNumber.curr = [turnNumber,"A"];
    moveNumber.max = moveNumber.curr;
    console.log(moveNumber);
    
    moveStarted = false;
    moveFinished = false;
    stolenTiles = [];
    creationTile = [];
    origCol = 0;
    $("#end").addClass("locked");
    $("#turn").text(moveNumber.curr.join('') + " / " + moveNumber.max.join(''));

    if (currentPlayer == 1)
        currentPlayer = 2;
    else
        currentPlayer = 1;

    if (currentPlayer == 1) {
        $("#player1").addClass("blink");
        $("#player2").removeClass("blink");
    } else {
        $("#player1").removeClass("blink");
        $("#player2").addClass("blink");
    }

    checkNextStates();

    changedTiles = [];

    for (var x = 0; x < GRID_WIDTH; x++) {
        for (var y = 0; y < GRID_HEIGHT; y++) {
            //console.log(gridTiles[x][y].currentState,gridTiles[x][y].nextState);
            if (gridTiles[x][y].currentState != gridTiles[x][y].nextState) {
                gridTiles[x][y].currentState = gridTiles[x][y].nextState;
                changedTiles.push({x:x, y:y});
            }
        }
    }

    checkNextStates();

    tileSizePerc = 0;
    growTiles();
    if (online){
        if(send){
            socket.emit('iterate','E')//send iterate message
        }
    }else{
        gameString+='E,';
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

function getColouredNeighbours(x, y, colour) {
    var colouredNeighbours = 0;

    for (var dx = -1; dx < 2; dx++) {
        for (var dy = -1; dy < 2; dy++) {
            if (x + dx >= 0 && x + dx < GRID_WIDTH && y + dy >= 0 && y + dy < GRID_HEIGHT) {
                if (!(dx == 0 && dy == 0)) {
                    if (gridTiles[x + dx][y + dy].currentState == colour || gridTiles[x + dx][y + dy].currentState == colour+3) {
                        colouredNeighbours += 1;
                    }
                }
            }
        }
    }

    return colouredNeighbours;
}

function getCellsCount() {
    var redCells = 0;
    var blueCells = 0;
    var whiteCells = 0;

    for (var y = 0; y < GRID_HEIGHT; y++) {
        for (var x = 0; x < GRID_WIDTH; x++) {
            if (gridTiles[x][y].currentState == 1)
                redCells ++;
            else if (gridTiles[x][y].currentState == 2)
                blueCells ++;
            else if(gridTiles[x][y].currentState == 3){
                whiteCells ++;
            }
        }
    }

    return {red: redCells, blue: blueCells, white: whiteCells};
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

    if (gridTiles[x][y].currentState <= 3) {
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
            case 3:
                ctx.fillStyle = WHITE;
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
            case 3:
                ctx.fillStyle = WHITE;
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
            case 4:
                ctx.fillStyle = RED;
                break;
            case 5:
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
            case 4:
                ctx.fillStyle = RED;
                break;
            case 5:
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
            case 3:
                ctx.fillStyle = WHITE;
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
    if (THIS_PLAYER != currentPlayer && online){
        return;
    }
    for (var y = 0; y < GRID_HEIGHT; y++) {
        for (var x = 0; x < GRID_WIDTH; x++) {
            if (!(containsObject({x:x, y:y}, changedThisDrag))) {
                var rect = [xOff + x * (tileSize + TILE_PADDING), yOff + y * (tileSize + TILE_PADDING), tileSize, tileSize];
                if (event.offsetX > rect[0] && event.offsetX < rect[0] + rect[2]) {
                    if (event.offsetY > rect[1] && event.offsetY < rect[1] + rect[3]) {
                        var otherPlayer;
                        var i;
                        var action = null;
                        if (currentPlayer == 1){
                            otherPlayer = 2;
                        }else{
                            otherPlayer = 1;
                        }
                        if ((gridTiles[x][y].currentState != 0 && gridTiles[x][y].currentState <= 3) && 
                            !moveStarted) {//kill any cell
                            origCol = gridTiles[x][y].currentState;
                            gridTiles[x][y].currentState = 0;
                            moveStarted = true;
                            moveFinished = true;
                            moveNumber.curr[1] = "B";
                            creationTile = "[" + x + "," + y + "]";
                            action={type:'move',move:B20[x]+B20[y]+'A'};//send message
                        }//undo full move
                        else if (gridTiles[x][y].currentState == 0 && creationTile == "[" + x + "," + y + "]" && moveFinished) {
                            gridTiles[x][y].currentState = origCol;
                            origCol = 0;
                            for (i = 0; i < stolenTiles.length; i ++) {//undo sacrafices
                                gridTiles[stolenTiles[i][0]][stolenTiles[i][1]].currentState = currentPlayer;
                            }
                            stolenTiles = [];
                            moveStarted = false;
                            moveFinished = false;
                            moveNumber.curr[1] = "A";
                            creationTile = null;
                            action={type:'undo',move:'all'};//undo moves up to last E (handled by server)
                        }
                        else if (gridTiles[x][y].currentState == 0 && stolenTiles.includes("[" + x + "," + y + "]")) {//unsacrifice
                            gridTiles[x][y].currentState = currentPlayer;

                            stolenTiles.splice(stolenTiles.indexOf("[" + x + "," + y + "]"), 1);
                            if (moveNumber.curr[1] == "D")
                                moveNumber.curr[1] = "C";
                            else if (moveNumber.curr[1] == "C")
                                moveNumber.curr[1] = "B";
                            moveStarted = true;
                            moveFinished = false;
                            action={type:'undo',move:B20[x]+B20[y]};//send message
                        }
                        else if (gridTiles[x][y].currentState == currentPlayer + 3) {//unbirth cell
                            origCol = gridTiles[x][y].currentState;
                            gridTiles[x][y].currentState = 0;
                            for (i = 0; i < stolenTiles.length; i ++) {
                                gridTiles[eval(stolenTiles[i])[0]][eval(stolenTiles[i])[1]].currentState = currentPlayer;
                            }
                            stolenTiles = [];
                            moveStarted = false;
                            moveFinished = false;
                            moveNumber.curr[1] = "A";
                            creationTile = null;
                            action={type:'undo',move:'all'};
                        }
                        else if (gridTiles[x][y].currentState == 0 && !moveStarted) {//birth tile
                            gridTiles[x][y].currentState = currentPlayer + 3;
                            moveStarted = true;
                            moveFinished = false;
                            moveNumber.curr[1]= "B";
                            creationTile = "[" + x + "," + y + "]";
                            action={type:'move',move:B20[x]+B20[y]+"D"};
                        }
                        else if (gridTiles[x][y].currentState == currentPlayer && moveStarted && !moveFinished) {//sacrifice
                            origCol = gridTiles[x][y].currentState;
                            gridTiles[x][y].currentState = 0;
                            stolenTiles.push("[" + x + "," + y + "]");
                            moveNumber.curr[1] = "C";
                            if (stolenTiles.length >= 2) {
                                moveNumber.curr[1] = "D";
                                moveFinished = true;
                                action={type:'move',move:B20[x]+B20[y]+"C"};
                            }else{
                                action={type:'move',move:B20[x]+B20[y]+"B"};
                            }
                        }
                        if (action!=null){
                            if (online){
                                socket.emit(action.type,action.move)
                            }else if(action.type=='move'){
                                gameString += action.move+",";
                            }else if(action.type=='undo'){
                                gameString = tryUndo(gameString,action.move,currentPlayer);
                            }
                        }
                        moveNumber.max = moveNumber.curr;
                        var turn = $("#turn");
                        turn.text(moveNumber.curr.join('') + " / " + moveNumber.max.join(''));

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
        } else {
            var cc = getCellsCount();
            if (cc.red == 0 && cc.blue == 0) {
                gameString+='L';
                alert("It's a draw!");
                $("#playing").fadeOut();
                $("#titlescreen").show();
            } else if (cc.red == 0) {
                gameString+='I';
                alert("Blue won!");
                $("#playing").fadeOut();
                $("#titlescreen").show();
            } else if (cc.blue == 0) {
                gameString+='F';
                alert("Red won!");
                $("#playing").fadeOut();
                $("#titlescreen").show();
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

$("#mainGame").bind('touchstart click', function (event) {
    mouseChangeMove(event);
});

$(window).keydown(function () {
    if (tileSizePerc == 100 && moveFinished) {
        gameOfLifeTick();
    }
});

$("#end").bind('touchstart click', function (event) {
    if (tileSizePerc == 100 && moveFinished) {
        gameOfLifeTick();
    }
});
$("#playbtn").bind('touchstart click', function (event) {
    online = false;
    $("#playing").show();
    $("#winner").hide();
    $("#titlescreen").fadeOut(function () {setupGame();});
});
$("#onlnbtn").bind('touchstart click', function (event) {
    if(online){
        requestMP();
    }else{
        window.alert("You are not online.");
    }
});
$("#getbtn").bind('touchstart click', function (event) {
    if (gameString == ''){
        window.alert("There is no game.");
    }else if (gameString.slice(-1)[0]==","){
        window.prompt("Here's the gamestring!",gameString.slice(0,-1));
    }else{
        window.prompt("Here's the gamestring!",gameString);
    }
});
function setupGame () {
    $("#playing").show();
    $("#winner").hide();
    $("#titlescreen").hide;
    canvas = document.getElementById("gameCanvas");
    ctx = canvas.getContext("2d");
    $("#gameCanvas").offset($("#mainGame").position());

    canvas.width = getCW();
    canvas.height = getCH();
    canvas.width = getCW();
    canvas.height = getCH();

    console.log("Welcome to GOLAD.io V0.0.1");
    console.log("Spawning grid...");
    if (online){
        console.log('emitting');
        socket.emit('newgame',0.5,RULE_STRING,GRID_WIDTH,99999,99999);
    }else{
        gridTiles = newBoard(0.5,GRID_WIDTH);
        if (currentPlayer == 1) {
            $("#player1").addClass("blink");
            $("#player2").removeClass("blink");
        } else {
            $("#player1").removeClass("blink");
            $("#player2").addClass("blink");
        }

        checkNextStates();
        console.log("Done!");
        drawAll();
        gameString = makeString()
        console.log(gameString)
    }
}

function makeString(){//I don't think we need this. Keep it for now.
    var string = RULE_STRING+',';
    string += GRID_WIDTH +',';
    string += '99999,99999,';//time stuff for now
    string += '0,';//No AI for now
    string += boardToString(gridTiles)+',';
    return string
}


$().ready(function () {
    if (window.location.href.split('/').slice(-1)[0]=='' || !online){
        $("#playing").hide();
        $("#winner").hide();
        $("#titlescreen").fadeIn();
    }else{
        $("#playing").show();
        $("#winner").hide();
        $("#titlescreen").hide();
    }
});

function requestMP(){
    if (online){
        socket.emit('mprequest');
    }
}

function playOut(moves){
    console.log(moves);
    if (moves.length!=0 && moves[0] != ''){
        var move = moves[0];
        var type = move.slice(-1)[0];
        console.log(move)
        if (type=='E'){
            moveStarted = true;
            moveFinished = true;
            gameOfLifeTick(false);//animations!
        }else{
            var x = B20.indexOf(move[0]);
            var y = B20.indexOf(move[1]);
            if(type=='D'){
                gridTiles[x][y].currentState = currentPlayer + 3;
                creationTile = "[" + x + "," + y + "]";
            }else if(type=='B' || type=='C'){
                gridTiles[x][y].currentState = 0;
                stolenTiles.push("[" + x + "," + y + "]");
            }else if(type=='A'){
                gridTiles[x][y].currentState = 0;
                creationTile = "[" + x + "," + y + "]";
            }
            checkNextStates();
            checkNextStates();
            drawAll();
        }
        setTimeout(playOut,1000,moves.slice(1));//play next move after 1 second
    }else{
        drawAll();
    }
}

function getEndgameMessage(endtype){
    var p1 = P1NAME;
    var p1s = P1NAME;
    var p1pos = P1NAME + "'s";
    var p2 = P2NAME;
    var p2s = P2NAME;
    var p2pos = P2NAME + "'s";
    if (THIS_PLAYER==1){//grammatical correctness is hard
        p1s = 'You';
        p1 = 'you';
        p1pos = 'your';
    }else if(THIS_PLAYER==2){
        p2s = 'You';
        p1 = 'you';
        p2pos = 'your';
    }
    switch(endtype){
        case 0: return p2s+' was wiped out and '+p1+' won!';
        case 1: return p2s+' ran out of time and '+p1+' won!';
        case 2: return p2s+' resigned and '+p1+' won!';
        case 3: return p1s+' was wiped out and '+p2+' won!';
        case 4: return p1s+' ran out of time and '+p2+' won!';
        case 5: return p1s+' resigned and '+p2+' won!';
        case 6: return 'Both populations were wiped out simultaneously.';
        case 7: return p2s+' accepted '+p1pos+' offer for a draw.';
        case 8: return p1s+' accepted '+p2pos+' offer for a draw.';
    }
}

if (online){
    socket.on('gameupdate', function (data){//update gamestring
        if (!data.includes(gameString)||gameString===''){//new game
            var moves=data.split(",").slice(6);
            var movesMade = countItems(moves,'E');
            currentPlayer = movesMade%2+1;
            gridTiles = remakeBoard(data);
            checkNextStates();
            drawAll();
        }else if(data.includes(gameString)){//play out moves
            var newMoves = data.replace(gameString,'');
            console.log("gamestring", gameString);
            console.log("data", data);
            playOut(newMoves.split(","));
        }
        gameString = data;
        console.log(gameString);
    });
    socket.on('redirect', function (data){
        window.location.href = data;
    });
    socket.on('beginMP', function (){
        setupGame();
    });
    socket.on('gameEnd', function (data){
        gameEnd = true;
        gameString += data;
        var type = data.charCodeAt(0)-70;//70=F
        var message = getEndgameMessage(type);
        window.alert(message);
        
    });
    socket.on('setName', function (player, name){
        switch(player){
            case 1:
                P1NAME = name;
                break;
            case 2:
                P2NAME = name;
                break;
        }
        drawText();
    });
    socket.on('setVars', function(vars, vals){
        for (var i = 0; i<vars.length; i++){
            window[vars[i]]=vals[i];
            console.log(vars[i],window[vars[i]]);
        }
        drawAll();
    });
}
