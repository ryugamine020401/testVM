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
let peers = {};

/* ###################################################################### */
function add_newVideo(video, stream) {
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    videoBox.append(video);
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

function capture_and_brocast() {
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

/* ###################################################################### */
function brocastStreaming(stream) {
    userid_arr.map( (userid) => {
        if (userid != myid) {
            let call = myPeer.call(userid, stream);
            peers[userid] = call;
        }
    });
    socket.on('new-user-id', (userid) => {
        let call = myPeer.call(userid, stream);
        peers[userid] = call;
    });
}

function listenStreaming() {
    myPeer.on('call', (call) => {
        call.answer(null);
        let video = document.createElement('video');
        video.muted = true;
        call.on('stream', (remoteStream) => {
            add_newVideo(video, remoteStream);
        });
        call.on('close', () => {
            video.remove();
        });
    });
}

/* ###################################################################### */
function toggleCamera() {
    cameraStatus = (cameraStatus == true)? false: true;
    document.getElementById("camera-toggle").innerText = (cameraStatus == true)? "關閉相機": "開啟相機";
    if (cameraStatus == true) {
        capture_and_brocast();
    } else {
        stopCapture();
    }
}

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

    // socket.on('server-test', (message) => { console.log(message); });
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

    // ----------------------------------------
    /* peer init when client open the page, will receive a peer-id */
    myPeer.on('open', (id) => {
        myid = id;
        socket.emit('new-user-request', myid);
    });

    /* server give all user id: refresh user-id-list */
    socket.on('all-user-id', (id_arr) => {
        userid_arr = id_arr;
    });

    // ----------------------------------------
}

Init();
listenStreaming();
/* ###################################################################### */