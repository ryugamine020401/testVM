/* ###################################################################### */
const PEER_PORT = '3000';

let socket;
let myPeer = new Peer(undefined, {
    host: '/',
    port: PEER_PORT
});

let myname; // user name
let myid; // peer id
let userid_arr = []; // user-id-list

let cameraStatus = false;
// let micStatus = false;

let videoBox; // <div> tag which put videos 
let myVideo; // local video (element <video>)
let localStream;

/* ###################################################################### */
function add_newVideo(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    videoBox.append(video);
}

function captureVideo() {
    navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
    })
    .then( (stream) => {
        localStream = stream;
        add_newVideo(myVideo, stream);
        brocastStreaming(stream);
    })
    .catch( (error) => {
        console.error(error.message);
    });
}
function stopCapture() {
    if (localStream) {
        /* stop fetch media */
        localStream.getTracks().forEach((track) => {track.stop();});
        /* release source */
        myVideo.srcObject = null;
        myVideo.remove();
    }
}

function toggleCamera() {
    cameraStatus = (cameraStatus == true)? false: true;
    document.getElementById("camera-toggle").innerText = (cameraStatus == true)? "關閉相機": "開啟相機";
    if (cameraStatus == true) {
        captureVideo();
    } else {
        stopCapture();
    }
}

/* ###################################################################### */
function brocastStreaming(stream) {
    userid_arr.map( (id) => {
        console.log(stream);
        let call = myPeer.call(id, stream);
        console.log(call);
    });
}

function listenStreaming() {
    myPeer.on('call', (call) => {
        console.log('listening');
        call.answer(null);
        let video = document.createElement('video');
        video.muted = true;
        call.on('stream', (remoteStream) => {
            console.log(remoteStream);
            add_newVideo(video, remoteStream);
        });
    });
}

/* ###################################################################### */
function sendchat_to_Server() {
    let message = document.getElementById("chat-input").value;
    if (message != '') {
        socket.emit('new-chat-message', {'username': myname, 'content': message});
        document.getElementById("chat-input").value = '';
    }
}

/* ###################################################################### */
function Init() {
    /* connect to server */
    socket = io.connect();
    /* input name and show */
    myname = window.prompt('輸入名字', 'USER') || 'USER';
    document.getElementById("username").innerText = myname;
    /* add event in DOM */
    document.getElementById("chat-send").addEventListener('click', sendchat_to_Server);
    document.getElementById("camera-toggle").addEventListener('click', toggleCamera);
    /* assign someting to obj */
    videoBox = document.getElementById("videoBox");
    myVideo = document.createElement('video');
    myVideo.muted = true;

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
        socket.emit('send-id', myid);
    });

    // socket.on('server-test', (message) => { console.log(message); });

    // ----------------------------------------
    /* peer init when client open the page, will receive a peer-id */
    myPeer.on('open', (id) => {
        myid = id;
        /* server need to know who still online */
        socket.emit('new-user-request', myid);
    });

    /* printout p2p message when recrive */
    /*myPeer.on("connection", (conn) => {
        conn.on("data", (data) => {
            console.log(data);
        });
    });*/

    /* new client need to know all user id for p2p */
    socket.on('all-user-id', (id_arr) => {
        /* acquire all user id */
        userid_arr = [...id_arr];
        // console.log('all user expect self: ', userid_arr);
        // 未連接網路，準備連接網路中所有的user
        /*
        userid_arr.map( (id) => {
            let conn = myPeer.connect(id);
            conn.on("open", () => {
                conn.send(`hi! I am your kouhai: ${myname}`);
            });
        });
        */
    });

    /* new client added, receive its id */
    socket.on('new-user-id', (userid) => {
        if (myid != userid) {
            /* add new client id to user-id-list */
            userid_arr = [userid, ...userid_arr];
            // 已經連接網路，準備連接新進來的user
            // console.log('new user: ', id);
            /*let conn = myPeer.connect(userid);
            conn.on("open", () => {
                conn.send(`hi! I am your senpai: ${myname}`);
            });*/
        }
    });

    // ----------------------------------------
}

Init();
listenStreaming();
/* ###################################################################### */