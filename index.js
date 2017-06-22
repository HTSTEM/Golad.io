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
function sendTime() {
    io.emit('time', { time: new Date().toJSON() });
}
setInterval(sendTime, 1000);


server.listen(port, (err) => {  
    if (err) {
        return console.log('something bad happened', err)
    }

    console.log(`server is listening on ${port}`)
});

io.on('connection', function(socket) {
    console.log('Connection Established.');
    var clientIp = socket.request.connection.remoteAddress;
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
});
