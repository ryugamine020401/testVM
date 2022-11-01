/* ###################################################################### */
//const HOST = '192.168.43.6';
const HOST = '10.2.0.4';
const PORT = 443;
const peerPORT = 3000;

let https = require('https');
let url = require('url');
let fs = require('fs');
let {PeerServer} = require('peer');

/* ---------------------------------------- */
let option = {
    ca: fs.readFileSync(__dirname + '/public/etc/ssl/ca_bundle.crt'),
    cert: fs.readFileSync(__dirname + '/public/etc/ssl/certificate.crt'),
    key: fs.readFileSync(__dirname + '/public/etc/ssl/private/private.key')
};
let myPeerServer = PeerServer({ 
    ssl: option,
    port: peerPORT, 
    path: '/'
});

/* ---------------------------------------- */
let userid_arr = [];
let username_arr = [];
let socketid_arr = [];
let chat_history = [];

/* ###################################################################### */
let server = https.createServer(option, (request, response) => {

    let path = url.parse(request.url).pathname;
    switch (path) {
        case '/':
            response.writeHead(200, {'Content-Type': 'text/html'});
            response.write('<h1>You Pick The Wrong House Fool</h1>\
                <img src="https://i1.sndcdn.com/artworks-fBvQUKQfO8Kervzy-PnlM0g-t500x500.jpg">');
            response.end();
            break;
        case '/index.html':
        case '/js/main.js':
            fs.readFile(__dirname + '/public' + path, (error, data) => {
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
        case '/sound/join.mp3':
            try {
                let mp3 = fs.readFileSync(__dirname + '/public' + path);
                response.writeHead(200, {'Content-Type': 'audio/mpeg'});
                response.write(mp3);
            } catch {
                response.writeHead(404);
                response.write("page dose not exist - 404");
            }
            response.end();
            break;
        default:
            response.writeHead(404);
            response.write("page dose not exist - 404");
            response.end();
            break;
    }
});

/* ###################################################################### */
let server_io = require('socket.io')(server);

server_io.on('connection', (socket) => {
    /* when somebody disconnect */
    socket.on('disconnect', () => {
        /* clear chatroom if nobody online */
        if (!socketid_arr[1]) chat_history = [];
        /* find the left one from arr */
        let index = socketid_arr.indexOf(socket.id);
        let leaveid =  userid_arr[index];
        /* remove the left one in arr */
        socketid_arr.splice(index, 1);
        userid_arr.splice(index, 1);
        username_arr.splice(index, 1);
        /* update clients data */
        server_io.emit('all-user-id', userid_arr, username_arr);
        server_io.emit('close-video', leaveid, 'leave');
        server_io.emit('close-audio', leaveid);
        server_io.emit('someone-left', leaveid);
    });

    /* new client want to add into p2p network */
    socket.on('new-user-request', (userid, username) => {
        /* add new client info to arr */
        socketid_arr = [...socketid_arr, socket.id];
        userid_arr = [...userid_arr, userid];
        username_arr = [...username_arr, username];
        /* update clients data */
        server_io.emit('new-user-id', userid, username);
        server_io.emit('all-user-id', userid_arr, username_arr);
        socket.emit('chat-history', chat_history);
    });

    /* ---------------------------------------- */
    /* somebody stop capture */
    socket.on('stop-videoStream', (userid, streamId) => {
        server_io.emit('close-video', userid, streamId);
    });
    socket.on('stop-audioStream', (userid) => {
        server_io.emit('close-audio', userid);
    });

    /* somebody send a message in chatroom */
    socket.on('new-chat-message', (message) => {
        /* give all client the message */
        server_io.emit('chatroom-refresh', message);
        /* save chatroom history */
        chat_history = [...chat_history, message];
    });

    /* ---------------------------------------- */
});

/* ###################################################################### */
myPeerServer.listen();
server.listen(PORT, HOST);
console.log('start');

