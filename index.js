const fs = require('fs');
const boardTools = require('./board')

const express = require("express");
const app = require('express')();
const http = require('http').createServer(app);
const io = new require('socket.io')(http);

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


var ingame = []//keep track of ips with game, dummy variable for now

io.on('connection', function(socket) {
    console.log('Connection Established.');
    var clientIp = socket.request.connection.remoteAddress;//used for continuing game
    var player = 1;//may have to change this all of this when 2 players are involved
    var gameString = '';
    var id = socket.id;
    var board = [];
    var rules = [];
    var path = socket.request.headers.referer;
    path = path.split('/').slice(-1)[0];//get last item
    if (path != ""){
        socket.emit('beginMP');
    }
    socket.on('undo',function(data){
        console.log(clientIp+' undo '+data);
        gameString = boardTools.tryUndo(gameString,data,player);
        console.log(gameString);
        board = boardTools.remakeBoard(gameString);
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
    socket.on('mprequest',function(){
        var fs = require('fs');
        var dir = randStr(16);
        console.log(dir)
        socket.emit('redirect','/'+dir)
    });
});

function randStr(length){
    var text = "";
    var charset = "abcdefghijklmnopqrstuvwxyz0123456789";
    for(var i=0; i < length; i++)
        text += charset.charAt(Math.floor(Math.random() * charset.length));
    return text;
}

// Start HTTP server on Heroku port or 5000
http.listen(app.get('port'), function(){
    console.log('listening on *:' + app.get('port').toString());
});

