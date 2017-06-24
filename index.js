const fs = require('fs');

var express = require("express");
var app = require('express')();
var http = require('http').Server(app);
var io = new require('socket.io')(http);
var boardTools = require('./board')

app.set('port', (process.env.PORT || 5000));
app.use("", express.static(__dirname));
app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

var ingame = []//keep track of ips with game, dummy variable for now

io.on('connection', function(socket) {
    console.log('Connection Established.');
    var clientIp = socket.request.connection.remoteAddress;//used for continuing game
    var player = 1;
    var gameString = '';
    var id = socket.id;
    var board = [];
    var rules = [];
    socket.on('undo',function(data){
        console.log(clientIp+' undo '+data)
        //TODO Check for legitness, undo
    });
    socket.on('move',function(data){
        console.log(clientIp+' move '+data);
        var legit = boardTools.checkLegit(gameString,board,player,data)
        console.log(legit);
        if(legit){
            board = boardTools.doMoves(board, [data], rules, player);
            gameString+=data+',';
        }
    });
    socket.on('iterate',function(data){
        console.log(clientIp+' iterate '+data);
        var legit = boardTools.checkLegit(gameString,board,player,data)
        console.log(legit);
        if(legit){
            board = boardTools.doMoves(board, [data], rules, player);
            player = player%2+1;
            gameString+=data+',';
        }
    });
    socket.on('newgame',function(density,rule,size,timelimit,timebonus){
        board = boardTools.newBoard(density,size);
        rules = boardTools.parseRule(rule);
        gameString = rule+','+size+','+timelimit+','+timebonus+',0,'+boardTools.boardToString(board)+',';
        socket.emit('gameupdate',gameString);
        console.log(gameString);
    });
});


// Start HTTP server on Heroku port or 5000
http.listen(app.get('port'), function(){
    console.log('listening on *:' + app.get('port').toString());
});

