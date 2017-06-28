const fs = require('fs');
const uuidv4 = require('uuid/v4');
const express = require("express");
const app = require('express')();
const http = require('http').createServer(app);
const io = new require('socket.io').listen(http);

const boardTools = require('./board')

var clients = [];
var games = [];

fs.readdir('./games', function(err, items) {
    games = items;
    for (var i=0; i<games.length; i++) {
        games[i] = games[i].split('.')[0];//remove file ending
    }
});

app.set('port', (process.env.PORT || 8080));
//app.use("", express.static(__dirname));
app.all('*', function(req, res){
    console.log(req.path);
    var last = req.path.split('/').slice(-1);
    if (last[0].indexOf(".")!==-1){
        res.sendFile(__dirname+req.path);
    }else{
        res.sendFile(__dirname+'/index.html');
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
        newSocket(dir);
    });
});

function newSocket(namespace){
    var nsp = io.of('/'+namespace);
    nsp.on("connect",function(socket){
        var clientIp = socket.request.connection.remoteAddress;//used for continuing game
        var player = 1;//may have to change this all of this when 2 players are involved
        var id = socket.id;
        var path = namespace;
        if (path != ""){
            socket.emit('beginMP');
        }
        socket.on('undo',function(data){
            var gameData = JSON.parse(fs.readFileSync('./games/'+path+'.json', 'utf8'));
            var oldString = gameData.gameString
            console.log(clientIp+' undo '+data);
            gameData.gameString = boardTools.tryUndo(gameData.gameString,data,player);
            if (oldString != gameData.gameString){
                console.log(gameData.gameString);
                gameData.board = boardTools.remakeBoard(gameData.gameString);
                socket.broadcast.emit('gameupdate',gameData.gameString);
                fs.writeFileSync('./games/'+path+'.json',JSON.stringify(gameData));
            }
        });
        socket.on('move',function(data){
            var gameData = JSON.parse(fs.readFileSync('./games/'+path+'.json', 'utf8'));
            console.log(clientIp+' move '+data);
            var legit = boardTools.checkLegit(gameData.gameString,gameData.board,player,data)
            console.log(legit);
            if(legit){
                gameData.board = boardTools.doMoves(gameData.board, [data], gameData.rules, player);
                gameData.gameString += data+',';
                socket.broadcast.emit('gameupdate',gameData.gameString);
                fs.writeFileSync('./games/'+path+'.json',JSON.stringify(gameData));
            }
        });
        socket.on('iterate',function(data){
            var gameData = JSON.parse(fs.readFileSync('./games/'+path+'.json', 'utf8'));
            console.log(clientIp+' iterate '+data);
            var legit = boardTools.checkLegit(gameData.gameString,gameData.board,player,data)
            console.log(legit);
            if(legit){
                gameData.board = boardTools.doMoves(gameData.board, [data], gameData.rules, player);
                player = player%2+1;
                gameData.gameString+=data+',';
                socket.broadcast.emit('gameupdate',gameData.gameString);
                fs.writeFileSync('./games/'+path+'.json',JSON.stringify(gameData));
            }
        });
        socket.on('newgame',function(density,rule,size,timelimit,timebonus){
            if (games.includes(path)){
                var json = fs.readFileSync('./games/'+path+'.json', 'utf8');
                var gameData = JSON.parse(json);
                if(gameData.p1[0]!=clientIp){
                    gameData.p2 = [clientIp,"Player 2"];//get name later or smthn
                }
                socket.emit("gameupdate",gameData.gameString);
                fs.writeFileSync('./games/'+path+'.json',JSON.stringify(gameData));//async file write breaks things
            }else{
                var board = boardTools.newBoard(density,size);
                var rules = boardTools.parseRule(rule);
                var gameString = rule+','+size+','+timelimit+','+timebonus+',0,'+boardTools.boardToString(board)+',';
                var gameData = {
                    "p1":[clientIp,"Player 1"],//get name later
                    "gameString":gameString,
                    "board":board,
                    "rules":rules
                };
                socket.emit('gameupdate',gameData.gameString);
                console.log(gameData.gameString);
                fs.writeFileSync('./games/'+path+'.json',JSON.stringify(gameData));
                games.push(path);
            }
        });
        socket.on('disconnect', function() {
            console.log(clientIp, "Disconnected")
            deleteFromArray(clients, socket.id);
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

