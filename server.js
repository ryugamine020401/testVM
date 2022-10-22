/* ###################################################################### */
//const HOST = '192.168.43.6';
const HOST = '127.0.0.1';
const PORT = 3001;

let http = require('http');
let url = require('url');
let fs = require('fs');
let member = 0; // number of people online
let userid_arr = []; // user-id-list
let temp_arr = [];

/* ###################################################################### */
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
        case '/js/main.js':
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

/* ###################################################################### */
server.listen(PORT, HOST);
let server_io = require('socket.io')(server);

server_io.on('connection', (socket) => {
    // ----------------------------------------
    member += 1;
    /* give all user number of people who still online */
    server_io.emit('member-refresh', member);

    /* when somebody disconnect */
    socket.on('disconnect', () => {
        member -= 1;
        /* give all user number of people who still online */
        server_io.emit('member-refresh', member);
        /* let all user give their id again for refresh user-id-list */
        temp_arr = [...userid_arr];
        userid_arr = [];
        server_io.emit('send-your-id');
    });

    /* new client want to add into p2p network */
    socket.on('new-user-request', (userid) => {
        userid_arr = [userid, ...userid_arr];
        server_io.emit('new-user-id', userid);
        server_io.emit('all-user-id', userid_arr);
    });

    /* receive all user id (when somebody disconnect, need to see who still online) */
    socket.on('send-id', (userid) => {
        /* add id to user-id-list (in server) */
        userid_arr = [userid, ...userid_arr];
        /* somebody leave */
        if (temp_arr != []) {
            /* remove the client id who still online */
            temp_arr.splice(temp_arr.indexOf(userid), 1);
            /* the final one means the left one */
            if (!temp_arr[1]) {
                /* send new info to every client */
                server_io.emit('all-user-id', userid_arr);
                server_io.emit('close-video', temp_arr[0]);
                temp_arr = [];
            }
        }
    });

    // ----------------------------------------
    /* somebody left the room or stop capture */
    socket.on('stop-stream', (userid) => {
        server_io.emit('close-video', userid);
    });

    /* somebody send a message in chatroom */
    socket.on('new-chat-message', (message) => {
        /* give all user the message and who gives */
        server_io.emit('chatroom-refresh', message);
    });



    // ----------------------------------------
});

/* ###################################################################### */