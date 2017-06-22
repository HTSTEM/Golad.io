const http = require('http');
const fs = require('fs');
const port = 8080;
const mime = {
    'jpg':'image/jpg',
    'gif':'image/gif',
    'txt':'text/plain',
    'ico':'image/ico',
    'svg':'image/svg+xml',
    'html':'text/html',
    'js':'application/javascript',
    'css':'text/css'
    
}

const requestHandler = (request, response) => {  
    if (request.method==='GET'){
        console.log(request.url)
        var sections=request.url.split('/');
        if (sections[sections.length-1].indexOf('.')===-1 && request.url.charAt(request.url.length-1) != '/'){
            request.url+='/';
        }
        if (request.url.endsWith('/')){
            request.url+="index.html";
        }

        var sendReply = true;
        var mimetype=''
        try{
            var parts = request.url.split('.');
            var ext = parts.slice(-1)[0];
            mimetype=mime[ext];
        }catch(err){
            sendReply=false;
        }

        if (sendReply){
            if (mimetype.split('/')[0]==='image'){
                var img = fs.readFileSync(request.url.slice(1));
                response.writeHead(200, {'Content-Type': mimetype});
                response.end(img,'binary');
            }else{
                fs.readFile(request.url.slice(1),'utf-8',(err,data)=>{
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
    }else if(request.method==='POST'){
        request.on('data', function (data) {
            console.log(data)
            //TODO add whatever is needed
        });
    }
}

const server = http.createServer(requestHandler)

server.listen(port, (err) => {  
    if (err) {
        return console.log('something bad happened', err)
    }
    console.log(`server is listening on ${port}`)
})
