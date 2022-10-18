let http = require('http');
let url = require('url');
let fs = require('fs');

let server = http.createServer((request, response) => {
    console.log('connection');
    let path = url.parse(request.url).pathname;
    switch (path) {
        case '/':
            response.writeHead(200, {'Content-Type': 'text/html'});
            response.write('<h1>You Pick The Wrong House Fool</h1>\
                <img src="https://i1.sndcdn.com/artworks-fBvQUKQfO8Kervzy-PnlM0g-t500x500.jpg">');
            response.end();
            break;
        case '/index.html':
            fs.readFile(__dirname + path, (error, data) => {
                if (error) {
                    response.writeHead(404);
                    response.write("page dose not exist - 404");
                } else {
                    response.writeHead(200, {'Content-Type': 'text/html'});
                    response.write(data, 'utf-8');
                }
                response.end();
            })
            break;
        default:
            response.writeHead(404);
            response.write("page dose not exist - 404");
            response.end();
            break;
    }
});

let server_io = require('socket.io')(server);
server_io.sockets.on('connection', (socket) => {
    socket.on('chatroom-message', (message) => {
        server_io.emit('chatroom-refresh', message);
    });
});

server.listen(3001);