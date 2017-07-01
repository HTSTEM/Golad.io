const fs = require('fs');
const uuidv4 = require('uuid/v4');
const express = require("express");
const app = require('express')();
const http = require('http').createServer(app);
const io = new require('socket.io').listen(http);
const cookieParser = require("cookie-parser");
const cookie = require("cookie");

const boardTools = require('./board')

var clients = [];
var games = [];
var namespaces = [];

fs.readdir('./games', function(err, items) {
    games = items;
    for (var i=0; i<games.length; i++) {
        games[i] = games[i].split('.')[0];//remove file ending
    }
});

app.set('port', (process.env.PORT || 8080));
//app.use("", express.static(__dirname));
app.use(cookieParser());
app.all('*', function(req, res){
    console.log(req.path);
    var last = req.path.split('/').slice(-1);
    if (last[0].indexOf(".")!==-1){
        res.sendFile(__dirname+req.path);
    }else{
        res.sendFile(__dirname+'/index.html');
    }
    var cookie = req.cookies.id;
    if (cookie === undefined){
        var randomNumber=Math.random().toString();
        randomNumber=randomNumber.substring(2,randomNumber.length);
        res.cookie('id',uuidv4(), {maxAge: 99999999999, httpOnly: true});
        console.log('cookie created successfully');
    }
});

io.on('connection', function(socket) {
    var path = socket.request.headers.referer.split("/").slice(-1)[0];
    if (path != '' && games.includes(path) && !namespaces.includes(path)){
        console.log("Creating socket.");
        newSocket(path);
        namespaces.push(path);
        console.log(namespaces);
    }
    socket.on('mprequest',function(){
        var dir = uuidv4().replace(/-/g,'');//delete dashes
        console.log("joining",dir)
        socket.emit('redirect','/'+dir)
        if(!namespaces.includes(dir)){
            newSocket(dir);
            namespaces.push(dir);
        }
    });
});

function newSocket(namespace){
    var nsp = io.of('/'+namespace);
    nsp.on("connect",function(socket){
        var clientId = cookie.parse(socket.handshake.headers.cookie).id;///used for continuing game
        var player = 0;
        var id = socket.id;
        var path = namespace;
        if (path != ""){
            socket.emit('beginMP');
        }
        socket.on('undo',function(data){
            var gameData = JSON.parse(fs.readFileSync('./games/'+path+'.json', 'utf8'));
            var oldString = gameData.gameString;
            console.log(clientId+' undo '+data);
            gameData.gameString = boardTools.tryUndo(gameData.gameString,data,player);
            if (oldString != gameData.gameString){
                console.log(gameData.gameString);
                gameData.board = boardTools.remakeBoard(gameData.gameString);
                fs.writeFileSync('./games/'+path+'.json',JSON.stringify(gameData));
                socket.broadcast.emit('gameupdate',gameData.gameString);
                var moveStarted = true;
                sendVariables(socket, gameData, clientId);
            }
        });
        socket.on('move',function(data){
            var gameData = JSON.parse(fs.readFileSync('./games/'+path+'.json', 'utf8'));
            console.log(clientId+' move '+data);
            var legit = boardTools.checkLegit(gameData.gameString,gameData.board,player,data)
            console.log(legit);
            if(legit){
                gameData.board = boardTools.doMoves(gameData.board, [data], gameData.rules, player);
                gameData.gameString += data+',';
                fs.writeFileSync('./games/'+path+'.json',JSON.stringify(gameData));
                socket.broadcast.emit('gameupdate',gameData.gameString);
                sendVariables(socket, gameData, clientId);
            }
        });
        socket.on('iterate',function(data){
            var gameData = JSON.parse(fs.readFileSync('./games/'+path+'.json', 'utf8'));
            console.log(clientId+' iterate '+data);
            var legit = boardTools.checkLegit(gameData.gameString,gameData.board,player,data)
            console.log(legit);
            if(legit){
                gameData.board = boardTools.doMoves(gameData.board, [data], gameData.rules, player);
                gameData.turn= gameData.turn%2+1;
                gameData.gameString+='E,';
                fs.writeFileSync('./games/'+path+'.json',JSON.stringify(gameData));
                console.log(gameData.gameString);
                socket.broadcast.emit('gameupdate',gameData.gameString);
                socket.broadcast.emit('setVars',["moveStarted","moveFinished","currentPlayer"],[false,false,gameData.turn]);
            }
        });

        socket.on('endgame',function(data){
            // NOTE: You trusted the client to much. One player could resign for the other
            // NOTE: The game is meant to stay existent even after the endgame so people can go back and see it. 
            // NOTE: I'll probably add a gameFinished variable to the json
            console.log(data)
            var gameData = JSON.parse(fs.readFileSync('./games/' + path + '.json', 'utf8'));
            var sent_as = 0;
            if (clientId == gameData.p1[0]){
                sent_as = 1;
            }else if(clientId == gameData.p2[0]){
                sent_as = 2;
            }else{
                return;
            }
            if (data == "resign") {
                console.log("Player " + sent_as + " resigned!");
                if (sent_as == 1) {
                    nsp.emit("gameEnd", "K", 2);
                } else {
                    nsp.emit("gameEnd", "H", 1);
                }
            } else if (data == 'offer_draw') {
                nsp.emit("gameEnd", "offer_draw", sent_as);
            } else if (data == 'accept_draw') {
                if (gameData.drawOffer == 1){
                    nsp.emit("gameEnd", "M", 0);
                }else if (gameData.drawOffer == 2){
                    nsp.emit("gameEnd", "N", 0);
                }
            } else if (data == 'decline_draw') {
                nsp.emit("gameEnd", "decline_draw", 0);
                gameData.drawOffer = 0;
            }
            fs.writeFileSync('./games/'+path+'.json',JSON.stringify(gameData));
        });

        socket.on('newgame',function(density,rule,size,timelimit,timebonus){
            if (games.includes(path)){
                var json = fs.readFileSync('./games/'+path+'.json', 'utf8');
                var gameData = JSON.parse(json);
                if(gameData.p1[0]!=clientId && gameData.p2 == undefined){
                    gameData.p2 = [clientId,"Player 2"];//get name later or smthn
                }
                fs.writeFileSync('./games/'+path+'.json',JSON.stringify(gameData));//async file write breaks things
                console.log(gameData.gameString);
                socket.emit("gameupdate",gameData.gameString);
                sendVariables(socket, gameData, clientId);
                socket.emit('setVars',["currentPlayer"],[gameData.turn]);
            }else{
                var board = boardTools.newBoard(density,size);
                var rules = boardTools.parseRule(rule);
                var gameString = rule+','+size+','+timelimit+','+timebonus+',0,'+boardTools.boardToString(board)+',';
                var gameData = {
                    "p1":[clientId,"Player 1"],//get name later
                    "gameString":gameString,
                    "board":board,
                    "rules":rules,
                    "turn":1,
                    "drawOffer":0
                };
                socket.emit('gameupdate',gameData.gameString);
                socket.emit('setVars',["THIS_PLAYER"],[1]);
                console.log(gameData.gameString);
                fs.writeFileSync('./games/'+path+'.json',JSON.stringify(gameData));
                games.push(path);
            }
            var gameData = JSON.parse(fs.readFileSync('./games/'+path+'.json', 'utf8'));
            if (clientId == gameData.p1[0]){
                player = 1;
            }else if(clientId == gameData.p2[0]){
                player = 2;
        }
        });
        socket.on('disconnect', function() {
            console.log(clientId, "Disconnected")
            deleteFromArray(clients, socket.id);
        });
    });
    clients.push(nsp);
}

function sendVariables(socket, gameData, clientId){
    var moveStarted = true;
    var moveFinished = false;
    var player = 0;
    var lasttype = gameData.gameString.slice(-2)[0];
    if (lasttype == 'E' || 
      gameData.gameString.split(",")[6]=='' || 
      gameData.gameString.split(",")[6]==undefined){
        moveStarted = false;
    }else if(lasttype == 'A' || lasttype == 'C'){
        moveFinished = true;
    }
    if (clientId == gameData.p1[0]){
        player = 1;
    }else if(clientId == gameData.p2[0]){
        player = 2;
    }
    socket.emit('setVars',["moveStarted","moveFinished","THIS_PLAYER"],[moveStarted,moveFinished,player]);
}

function deleteFromArray(array, element) {
    position = array.indexOf(element);
    array.splice(position, 1);
}

// Start HTTP server on Heroku port or 5000
http.listen(app.get('port'), function(){
    console.log('listening on *:' + app.get('port').toString());
});

