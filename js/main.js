/* ###################################################################### */
const PEER_PORT = '3000';

let socket;
let myPeer = new Peer(undefined, {
    host: '/',
    port: PEER_PORT
});

let yourname;
let yourid;
let userid_arr = [];

/* ###################################################################### */
function sendchat_to_Server() {
    let message = document.getElementById("chat-input").value;
    if (message != '') {
        socket.emit('new-chat-message', {'username': yourname, 'content': message});
        document.getElementById("chat-input").value = '';
    }
}

/* ###################################################################### */
function Init() {
    socket = io.connect();
    yourname = window.prompt('輸入名字', 'USER') || 'USER';
    document.getElementById("username").innerText = yourname;
    /* add event in DOM */
    document.getElementById("chat-send").addEventListener('click', sendchat_to_Server);

    // ----------------------------------------
    /* somebody sent a message, receive it and show on the chatroom */
    socket.on('chatroom-refresh', (message) => {
        document.getElementById("chatroom").innerHTML += `<div>
            <span>${message.username}</span>
            <span> : </span>
            <span>${message.content}</span>
        </div>`;
    });

    /* somebody join or leave */
    socket.on('member-refresh', (member) => {
        document.getElementById("number-of-people").innerText = `線上人數 : ${member}`;
    });

    /* just do it */
    socket.on('send-your-id', () => {
        socket.emit('send-id', yourid);
    });

    // socket.on('server-test', (message) => { console.log(message); });

    // ----------------------------------------
    /* peer init when client open the page, will receive a peer-id */
    myPeer.on('open', (id) => {
        yourid = id;
        /* server need to know who still online */
        socket.emit('new-user-request', yourid);
    });

    /* printout p2p message when recrive */
    myPeer.on("connection", (conn) => {
        conn.on("data", (data) => {
            console.log(data);
        });
    });

    /* new client need to know all user id for p2p */
    socket.on('all-user-id', (id_arr) => {
        userid_arr = [...id_arr];
        // console.log('all user expect self: ', userid_arr);
        // 未連接網路，準備連接網路中所有的user
        userid_arr.map( (id) => {
            let conn = myPeer.connect(id);
            conn.on("open", () => {
                conn.send(`hi! I am your kouhai: ${yourname}`);
            });
        });
    });

    /* new client added, receive its id */
    socket.on('new-user-id', (userid) => {
        if (yourid != userid) {
            // 已經連接網路，準備連接新進來的user
            // console.log('new user: ', id);
            let conn = myPeer.connect(userid);
            conn.on("open", () => {
                conn.send(`hi! I am your senpai: ${yourname}`);
            });
        }
    });
    
    // ----------------------------------------
}

Init();
/* ###################################################################### */