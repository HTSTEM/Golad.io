const fs = require('fs');

var express = require("express");
var app = require('express')();
var http = require('http').Server(app);
var io = new require('socket.io')(http);

app.set('port', (process.env.PORT || 5000));
app.use("", express.static(__dirname));
app.get('/', function(req, res){
    res.sendFile(__dirname + '/index.html');
});

const mime = {//mimetypes, add as needed
    'jpg':'image/jpg',
    'gif':'image/gif',
    'txt':'text/plain',
    'ico':'image/ico',
    'svg':'image/svg+xml',
    'html':'text/html',
    'js':'application/javascript',
    'css':'text/css'
};
var ingame = []//keep track of ips with game, dummy variable for now

const requestHandler = (request, response) => {  
     if (request.method==='GET'){//handles GET requests
        console.log(request.url);
        var rawUrl = request.url.split('?')[0];//removes arguments
        var sections=rawUrl.split('/');
        //adds a slash if last element isn't a filename
        if (sections[sections.length-1].indexOf('.')===-1 && 
            rawUrl.charAt(rawUrl.length-1) != '/'){
            rawUrl+='/';
        }
        //if url goes nowhere, get index.html from that folder
        if (rawUrl.endsWith('/')){
            rawUrl+="index.html";
        }
        //assume response is wanted
        var sendReply = true;
        var mimetype='';
        try{//get mimetype
            var parts = rawUrl.split('.');//get file ending
            var ext = parts.slice(-1)[0];
            mimetype=mime[ext];
        }catch(err){//don't send if mimetype not found
            sendReply=false;
        }

        if (sendReply){
            if (mimetype.split('/')[0]==='image'){//treat images seperately
                try{
                    var img = fs.readFileSync(rawUrl.slice(1));
                    response.writeHead(200, {'Content-Type': mimetype});
                    response.end(img,'binary');
                }catch(err){}
            }else{//handles text
                fs.readFile(rawUrl.slice(1),'utf-8',(err,data)=>{
                    if (err) {
                        return console.log(err);
                    }else{
                        response.writeHead(200, {'Content-Type': mimetype});
                        response.write(data);
                        response.end()
                    }
                });
            }
        }
    }else if(request.method==='POST'){//handle post request
        request.on('data', function (data) {
            console.log(data)//prints data sent to command line
            //add stuff if needed
        });
    }
}


io.on('connection', function(socket) {
    console.log('Connection Established.');
    var clientIp = socket.request.connection.remoteAddress;//used for continuing game
    id = socket.id;
    socket.on('undo',function(data){//TODO add stuff later
        console.log(clientIp+' undo '+data)
    });
    socket.on('move',function(data){
        console.log(clientIp+' move '+data)
    });
    socket.on('iterate',function(data){
        console.log(clientIp+' iterate '+data)
    });
    socket.on('newgame',function(density,rule,size,timelimit,timebonus){
        board = boardTools.newBoard(density,size)
        toSend = rule+','+size+','+timelimit+','+timebonus+',0,'+boardTools.boardToString(board)+','
        socket.emit('gameupdate',toSend)
        console.log(toSend)
    });
});


// Start HTTP server on Heroku port or 5000
http.listen(app.get('port'), function(){
    console.log('listening on *:' + app.get('port').toString());
});

