const B64 = '0123456789:;ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('')//boardstate alphabet
const B20 = 'ABCDEFGHIJKLMNOPQRST'.split('')//move position alphabet

const http = require('http');
const fs = require('fs');
const port = 8080;
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

var server = http.createServer(requestHandler);
var io = require('socket.io').listen(server);

server.listen(port, (err) => {  
    if (err) {
        return console.log('something bad happened', err)
    }

    console.log(`server is listening on ${port}`)
});

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
        console.log('hi')
        socket.emit('newboard',newBoard(density,size))
    });
});

function newBoard(density,size){
    var board= [];

    for (var y = 0; y < Math.floor(size/2); y++) {//half the board
        board.push([]);
        for (var x = 0; x < size; x++) {
            var val;
            var r = Math.random();
            if ((2*r) < density){
                val = 1;
            }else if (r < density){
                val = 2;
            }else{
                val = 0;
            }
            board[y].push({currentState: val, nextState: 0});
        }
    }
    for (y = 0; y < Math.ceil(size/2); y ++) {//fill other half
        board.push([]); 
    }
    for (y = 0; y < Math.floor(size/2); y++) {//rotate board
        for (x = 0; x < size; x++) {
            if (board[y][size - x - 1].currentState == 2)
                val = 1;
            else if (board[y][size - x - 1].currentState == 1)
                val = 2;
            else
                val = 0;

            board[size-y-1].push({currentState: val, nextState: 0});
        }
    }
    if (size%2==1){//odd case
        centre = []
        centFlip = []
        for(var i=0; i < Math.floor(size/2); i++){//create array
            var val;
            var r = Math.random();
            if ((2*r) < density){
                centre.push({currentState: 1, nextState: 0});
                centFlip.push({currentState: 2, nextState: 0});
            }else if (r < density){
                centre.push({currentState: 2, nextState: 0});
                centFlip.push({currentState: 1, nextState: 0});
            }else{
                centre.push({currentState: 0, nextState: 0});
                centFlip.push({currentState: 0, nextState: 0});
            }
        }
        final = centre.concat([{currentState: 0, nextState: 0}]).concat(centFlip.reverse())
        board[Math.floor(size/2)]=final
    }
    return board

}

function boardToString(board){
    var count =0;
    var value =0;
    var string = '';
    for(var x=0;x<board.length;x++){
        for(var y=board[0].length-1; y>=0; y--){//invert y axis
            count++;
            value+= board[x][y].currentState*Math.pow(4,3-count);//base 4 cellstate stuff
            if (count==3){//base 4, 64 bit alphabet, 3 cells per digit
                count=0;
                string+=B64[value];
                value = 0
            }
        }
    }
}
