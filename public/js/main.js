/* ###################################################################### */
let socket;
let myPeer = new Peer(undefined, {
    host: '/',
    port: '3000',
    path: '/'
});

let myname;
let myid;
let userid_arr = [];
let username_arr = [];

let cameraStatus = false;
let micStatus = false;
let firstVoice = false;  // for autoplay audio
let mutedState = true;  // for autoplay screen
let video_arr = [];  // for mute viode
let audio_arr = []; // for mute audio

let myVideoStream = null;
let videoBox = document.getElementById("videoBox");
let myVideoBox = document.createElement('span');
let myVideo = document.createElement('video');
let myVideoName = document.createElement('span');
let myAudioStream = null;
let audioBox = document.getElementById("audioBox");
let myAudioBox = document.createElement('span');
let myAudio = document.createElement('audio');
let myAudioName = document.createElement('span');

/* ###################################################################### */
/* creat <video> tag in DOM */
function add_newVideo(span, video, videoStream, span2, username) {
    span2.innerHTML = username;
    video.srcObject = videoStream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    span.append(video);
    span.append(span2);
    videoBox.append(span);
}
/* creat <audio> tag in DOM */
function add_newAudio(span, audio, audioStream, span2, username) {
    span2.innerHTML = username;
    audio.srcObject = audioStream;
    audio.addEventListener('loadedmetadata', () => {
        if (firstVoice) {
            audio.play();
        } else {
            audio.pause();
            document.addEventListener('click', () => {
                if (firstVoice) audio.play();
            });
            document.addEventListener('mousemove', () => {
                if (firstVoice) audio.play();
            });
        }
    });
    span.append(audio);
    span.append(span2);
    audioBox.append(span);
}

/* close local camera and remove <video> tag in DOM */
function stopCaptureVideo() {
    if (myVideoStream) {
        /* stop fetch media */
        myVideoStream.getTracks().forEach((track) => {track.stop();});
        /* release source */
        myVideo.srcObject = null;
        myVideo.remove();
        myVideoName.remove();
        myVideoBox.remove();
        myVideoStream = null;
    }
}
/* close local mic and remove <audio> tag in DOM */
function stopCaptureAudio() {
    if (myAudioStream) {
        /* stop fetch media */
        myAudioStream.getTracks().forEach((track) => {track.stop();});
        /* release source */
        myAudio.srcObject = null;
        myAudio.remove();
        myAudioName.remove();
        myAudioBox.remove();
        myAudioStream = null;
    }
}

/* open local camera and stream to other client */
async function captureVideo() {
    myVideoStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {width: 200, height: 200}
        // video: {MediaSource: 'screen'}
    });
    add_newVideo(myVideoBox, myVideo, myVideoStream, myVideoName, '您的相機/ ');
    brocastStreaming(myVideoStream);
}
/* open local mic and stream to other client */
async function captureAudio() {
    myAudioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false
    });
    add_newAudio(myAudioBox, myAudio, myAudioStream, myAudioName, '您的聲音/ ');
    brocastStreaming(myAudioStream);
}

/* ###################################################################### */
/* p2p send stream:
   send stream pakage to client which is in the list */
function brocastStreaming(stream) {
    userid_arr.map( (userid) => {
        if (userid != myid) {
            let call = myPeer.call(userid, stream);
        }
    });
}

/* p2p receive stream:
   receive stream pakage and control <video>/<audio> obj in DOM if somebody start/stop a stream */
function listenStreaming() {
    myPeer.on('call', (call) => {
        call.answer(null);
        let span = document.createElement('span');
        let video = document.createElement('video');
        let span2 = document.createElement('span');
        let span_a = document.createElement('span');
        let audio = document.createElement('audio');
        let span2_a = document.createElement('span');
        video.muted = true;
        audio.muted = mutedState;
        call.on('stream', (remoteStream) => {
            if (remoteStream) {
                let type;
                try {
                    type = remoteStream.getVideoTracks()[0]['kind'];
                } catch {
                    type = remoteStream.getAudioTracks()[0]['kind'];
                }
                let username = username_arr[userid_arr.indexOf(call.peer)];
                if (type == 'video') {
                    add_newVideo(span, video, remoteStream, span2, username+'的相機/ ');
                    // video_arr = [video, ...video_arr];
                } else if (type == 'audio') {
                    add_newAudio(span_a, audio, remoteStream, span2_a, username+'的聲音/ ');
                    audio_arr = [audio, ...audio_arr];
                }
            } 
        });
        socket.on('close-video', (userid) => {
            if (call.peer == userid) {
                video.srcObject = null;
                video.remove();
                span2.remove();
                span.remove();
            }
        });
        socket.on('close-audio', (userid) => {
            if (call.peer == userid) {
                audio.srcObject = null;
                audio.remove();
                span2_a.remove();
                span_a.remove();
            }
        });
    });
}

/* ###################################################################### */
/* button onclick event:
   open or close camera and control streaming... */
function toggleCamera() {
    cameraStatus = (cameraStatus == true)? false: true;
    document.getElementById("camera-toggle").innerText = (cameraStatus == true)? "關閉相機": "開啟相機";
    if (cameraStatus == true) {
        captureVideo();
    } else {
        stopCaptureVideo();
        socket.emit('stop-videoStream', myid);
    }
}
/* button onclick event:
   open or close mic and control streaming... */
function toggleMic() {
    micStatus = (micStatus == true)? false: true;
    document.getElementById("mic-toggle").innerText = (micStatus == true)? "關閉麥克風": "開啟麥克風";
    if (micStatus == true) {
        captureAudio();
    } else {
        stopCaptureAudio();
        socket.emit('stop-audioStream', myid);
    }
}

/* button onclick event:
   send a message to chatroom */
function sendchat_to_Server() {
    let message = document.getElementById("chat-input").value;
    if (message != '') {
        socket.emit('new-chat-message', {'username': myname, 'content': message});
        document.getElementById("chat-input").value = '';
    }
}

/* ###################################################################### */
function Init() {
    // ----------------------------------------
    /* add event in DOM */
    myname = prompt('請輸入名字', 'USER') || 'USER';
    alert('必須手動開啟視訊音量');
    document.getElementById("username").innerText = myname;
    document.getElementById("chat-send").addEventListener('click', sendchat_to_Server);
    document.getElementById("camera-toggle").addEventListener('click', toggleCamera);
    document.getElementById("mic-toggle").addEventListener('click', toggleMic);
    /* we dont want to listen voice from ourself */
    myVideo.muted = true;
    myAudio.muted = true;
    /* bind audio sounds ctrl to checkbox */
    let muted_toggle = document.getElementById("muted-toggle");
    muted_toggle.addEventListener('click', () => {
        if (muted_toggle.checked == false) {
            mutedState = true;
        } else {
            if (firstVoice == false) {
                let audio = document.createElement("audio");
                audio.src = "sound/join.mp3";
                audio.play();
                firstVoice = true;
            }
            mutedState = false;
        }
        audio_arr.map( (audio) => {
            audio.muted = mutedState;
        });
    });

    // ----------------------------------------
    /* connect to server */
    socket = io.connect();

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
        socket.emit('send-id', myid, myname);
    });

    // ----------------------------------------
    /* peer init when client open the page, will receive a peer-id */
    myPeer.on('open', (id) => {
        myid = id;
        socket.emit('new-user-request', myid, myname);
    });

    /* server give all user id: refresh user-id-list */
    socket.on('all-user-id', (id_arr, name_arr) => {
        userid_arr = id_arr;
        username_arr = name_arr;
    });

    /* p2p send stream:
       when new client join the room, also send stream pakage.
    show the username on chatroom when somebody join the room. */
    socket.on('new-user-id', (userid, username) => {
        if (userid != myid) {
            if (myVideoStream) myPeer.call(userid, myVideoStream);
            if (myAudioStream) myPeer.call(userid, myAudioStream);
        }
        username = (userid == myid)? '您': username;
        document.getElementById("chatroom").innerHTML += `<div>
            <span>* ${username} 已加入 *</span>
        </div>`;
    });

    /* show the username on chatroom when somebody left the room */
    socket.on('someone-left', (username) => {
        document.getElementById("chatroom").innerHTML += `<div>
            <span>* ${username} 已離開 *</span>
        </div>`;
    });

    // ----------------------------------------
}
/* ###################################################################### */

Init();
listenStreaming();