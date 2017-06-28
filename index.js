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
    if (path != '' && games.includes(path)){
        newSocket(path);
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
    nsp.on("connect",function(nsp){
        var clientId = cookie.parse(nsp.handshake.headers.cookie).id;///used for continuing game
        var player = 0;
        var id = nsp.id;
        var path = namespace;
        if (path != ""){
            nsp.emit('beginMP');
        }
        nsp.on('undo',function(data){
            var gameData = JSON.parse(fs.readFileSync('./games/'+path+'.json', 'utf8'));
            var oldString = gameData.gameString
            console.log(clientId+' undo '+data);
            gameData.gameString = boardTools.tryUndo(gameData.gameString,data,player);
            if (oldString != gameData.gameString){
                console.log(gameData.gameString);
                gameData.board = boardTools.remakeBoard(gameData.gameString);
                nsp.broadcast.emit('gameupdate',gameData.gameString);
                fs.writeFileSync('./games/'+path+'.json',JSON.stringify(gameData));
            }
        });
        nsp.on('move',function(data){
            var gameData = JSON.parse(fs.readFileSync('./games/'+path+'.json', 'utf8'));
            console.log(clientId+' move '+data);
            var legit = boardTools.checkLegit(gameData.gameString,gameData.board,player,data)
            console.log(legit);
            if(legit){
                gameData.board = boardTools.doMoves(gameData.board, [data], gameData.rules, player);
                gameData.gameString += data+',';
                nsp.broadcast.emit('gameupdate',gameData.gameString);
                fs.writeFileSync('./games/'+path+'.json',JSON.stringify(gameData));
            }
        });
        nsp.on('iterate',function(data){
            var gameData = JSON.parse(fs.readFileSync('./games/'+path+'.json', 'utf8'));
            console.log(clientId+' iterate '+data);
            var legit = boardTools.checkLegit(gameData.gameString,gameData.board,player,data)
            console.log(legit);
            if(legit){
                gameData.board = boardTools.doMoves(gameData.board, [data], gameData.rules, player);
                gameData.turn= gameData.turn%2+1;
                gameData.gameString+=data+',';
                nsp.broadcast.emit('gameupdate',gameData.gameString);
                fs.writeFileSync('./games/'+path+'.json',JSON.stringify(gameData));
            }
        });
        nsp.on('newgame',function(density,rule,size,timelimit,timebonus){
            if (games.includes(path)){
                var json = fs.readFileSync('./games/'+path+'.json', 'utf8');
                var gameData = JSON.parse(json);
                if(gameData.p1[0]!=clientId){
                    gameData.p2 = [clientId,"Player 2"];//get name later or smthn
                }
                nsp.emit("gameupdate",gameData.gameString);
                fs.writeFileSync('./games/'+path+'.json',JSON.stringify(gameData));//async file write breaks things
            }else{
                var board = boardTools.newBoard(density,size);
                var rules = boardTools.parseRule(rule);
                var gameString = rule+','+size+','+timelimit+','+timebonus+',0,'+boardTools.boardToString(board)+',';
                var gameData = {
                    "p1":[clientId,"Player 1"],//get name later
                    "gameString":gameString,
                    "board":board,
                    "rules":rules,
                    "turn":1
                };
                nsp.emit('gameupdate',gameData.gameString);
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
        nsp.on('disconnect', function() {
            console.log(clientId, "Disconnected")
            deleteFromArray(clients, nsp.id);
            deleteFromArray(namespaces,path);
        });
    });
    clients.push(nsp);
}

function deleteFromArray(array, element) {
    position = array.indexOf(element);
    array.splice(position, 1);
}

// Start HTTP server on Heroku port or 5000
http.listen(app.get('port'), function(){
    console.log('listening on *:' + app.get('port').toString());
});

