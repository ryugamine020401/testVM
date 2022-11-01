/* ###################################################################### */
const PPI_CAM = {width: 192, height: 108};
const PPI_SCREEN = {MediaSource: 'screen', width: 1920, height: 1080};

let socket;
let myPeer = new Peer(undefined, {
    host: '/',
    secure: false,
    port: 3000,
    path: '/'
});

/* ---------------------------------------- */
let myname;
let myid;
let userid_arr = [];
let username_arr = [];

let cameraStatus = false;
let micStatus = false;
let screenStatus = false;
let firstVoice = false;  // for autoplay
let mutedState = true;  // for autoplay
let video_arr = [];  // for mute video
let audio_arr = []; // for mute audio

/* ---------------------------------------- */
let myVideoStream = null;
let myVideoBox = document.createElement('div');
let myVideo = document.createElement('video');
let myVideoName = document.createElement('div');
let myAudioStream = null;
let myAudio = document.createElement('audio');
let myScreenStream = null;
let myScreenBox = document.createElement('div');
let myScreen = document.createElement('video');
let myScreenName = document.createElement('div');

/* ###################################################################### */
function video_arrange() {
    let video_count = document.querySelectorAll('video').length;
    let root = document.documentElement;
    if (video_count <= 1) {
        root.style.setProperty('--vh','580px');
        root.style.setProperty('--vw','880px');
    } else if (video_count <= 4) {
        root.style.setProperty('--vh','280px');
        root.style.setProperty('--vw','496px');
    } else {
        root.style.setProperty('--vh','220px');
        root.style.setProperty('--vw','352px');
    }
}

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
        let container = document.createElement('div');
        let video = document.createElement('video');
        let audio = document.createElement('audio');
        let videoName = document.createElement('div');
        video.muted = mutedState;
        audio.muted = mutedState;
        /* ---------------------------------------- */
        call.on('stream', (remoteStream) => {
            if (remoteStream) {
                let type;
                let username = username_arr[userid_arr.indexOf(call.peer)];
                try {
                    type = remoteStream.getTracks()[1]['kind'];
                } catch {
                    type = remoteStream.getTracks()[0]['kind'];
                }
                if (type == 'video') {
                    add_newVideo(container, video, remoteStream, videoName, username, remoteStream.id);
                    video_arr = [video, ...video_arr];
                    video_arrange();
                } else if (type == 'audio') {
                    add_newAudio(audio, remoteStream, call.peer);
                    audio_arr = [audio, ...audio_arr];
                }
            }
        });
        /* ---------------------------------------- */
        socket.on('close-video', (userid, streamId) => {
            if (streamId != 'leave') {
                if (document.getElementById('video-'+streamId)) {
                    document.getElementById('video-'+streamId).remove();
                    video_arrange();
                }
            } else {
                if (call.peer == userid) {
                    video.srcObject = null;
                    video.remove();
                    videoName.remove();
                    container.remove();
                    video_arrange();
                }
            }
        });
        socket.on('close-audio', (userid) => {
            if (call.peer == userid) {
                audio.srcObject = null;
                audio.remove();
                let audienceName = document.getElementById('audience-' + userid);
                if (audienceName) {
                    audienceName.innerText = audienceName.innerText.replace(' ...說話中', '');
                }
            }
        });
        /*socket.on('close-screen', (userid, streamId) => {
            if (streamId != 'leave') {
                if (document.getElementById('video-'+streamId)) {
                    document.getElementById('video-'+streamId).remove();
                    video_arrange();
                }
            }
        });*/
    });
}

/* ###################################################################### */
/* creat <video> tag in DOM */
function add_newVideo(container, video, videoStream, videoName, username, streamId) {
    let videoBox = document.getElementById("videoBox");
    videoName.innerHTML = username;
    video.srcObject = videoStream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    });
    videoName.className = 'videoName'
    container.className = 'video-container';
    container.id = 'video-' + streamId;
    container.append(video);
    container.append(videoName);
    videoBox.append(container);
}

/* creat <audio> tag in DOM */
function add_newAudio(audio, audioStream, userid) {
    let audioBox = document.getElementById("audioBox");
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
    audioBox.append(audio);
    let audienceName = document.getElementById('audience-' + userid);
    if (audienceName) {
        audienceName.innerText += ' ...說話中';
    }
}

/* ###################################################################### */
/* button onclick event:
   open/close camera and control streaming... */
async function toggleCamera() {
    if (cameraStatus == false) {
        myVideoStream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: PPI_CAM
        }).catch( (error) => {alert(error.message);} );
        if (myVideoStream) {
            add_newVideo(myVideoBox, myVideo, myVideoStream, myVideoName, '您', myVideoStream.id);
            video_arrange();
            brocastStreaming(myVideoStream);
            cameraStatus = true;
            document.getElementById("camera-toggle").innerText = "關閉相機";
        }
    } else {
        if (myVideoStream) {
            /* stop fetch media */
            myVideoStream.getTracks().forEach((track) => {track.stop();});
            /* release source */
            myVideo.srcObject = null;
            myVideo.remove();
            myVideoName.remove();
            myVideoBox.remove();
            video_arrange();
            socket.emit('stop-videoStream', myid, myVideoStream.id);
            myVideoStream = null;
        }
        cameraStatus = false;
        document.getElementById("camera-toggle").innerText = "開啟相機";
    }
}

/* button onclick event:
   open/close mic and control streaming... */
async function toggleMic() {
    if (micStatus == false) {
        myAudioStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: false
        }).catch( (error) => {alert(error.message);} );
        if (myAudioStream) {
            add_newAudio(myAudio, myAudioStream, myid);
            brocastStreaming(myAudioStream);
            micStatus = true;
            document.getElementById("mic-toggle").innerText = "關閉麥克風";
        }
    } else {
        if (myAudioStream) {
            /* stop fetch media */
            myAudioStream.getTracks().forEach((track) => {track.stop();});
            /* release source */
            myAudio.srcObject = null;
            myAudio.remove();
            myAudioStream = null;
            let audienceName = document.getElementById('audience-' + myid);
            if (audienceName) {
                audienceName.innerText = audienceName.innerText.replace(' ...說話中', '');
            }
        }
        socket.emit('stop-audioStream', myid);
        micStatus = false;
        document.getElementById("mic-toggle").innerText = "開啟麥克風";
    }
}

/* button onclick event:
   open/close screen sharing and control streaming... */
async function toggleScreen() {
    if (screenStatus == false) {
        myScreenStream = await navigator.mediaDevices.getDisplayMedia({
            audio: true,
            video: PPI_SCREEN
        }).catch( (error) => {console.log(error.message);} );
        if (myScreenStream) {
            add_newVideo(myScreenBox, myScreen, myScreenStream, myScreenName, '您', myScreenStream.id);
            video_arrange();
            brocastStreaming(myScreenStream);
            screenStatus = true;
            document.getElementById("screen-toggle").innerText = "關閉畫面分享";
        }
    } else {
        if (myScreenStream) {
            /* stop fetch media */
            myScreenStream.getTracks().forEach((track) => {track.stop();});
            /* release source */
            myScreen.srcObject = null;
            myScreen.remove();
            myScreenName.remove();
            myScreenBox.remove();
            video_arrange();
            socket.emit('stop-videoStream', myid, myScreenStream.id);
            myScreenStream = null;
        }
        screenStatus = false;
        document.getElementById("screen-toggle").innerText = "開啟畫面分享";
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
    /* add event in DOM */
    myname = prompt('請輸入名字', 'USER') || 'USER';
    document.getElementById("username").innerText = myname;
    document.getElementById("chat-send").addEventListener('click', sendchat_to_Server);
    document.getElementById("camera-toggle").addEventListener('click', toggleCamera);
    document.getElementById("mic-toggle").addEventListener('click', toggleMic);
    document.getElementById("screen-toggle").addEventListener('click', toggleScreen);

    /* we dont want to listen voice from ourself */
    myVideo.muted = true;
    myAudio.muted = true;
    myScreen.muted = true;

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
        video_arr.map( (video) => {
            video.muted = mutedState;
        });
    });

    /* ---------------------------------------- */
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

    /* load chatroom history */
    socket.on('chat-history', (chat_history) => {
        chat_history.map( (message) => {
            document.getElementById("chatroom").innerHTML += `<div>
                <span>${message.username}</span>
                <span> : </span>
                <span>${message.content}</span>
            </div>`;
        })
    });

    /* just do it */
    socket.on('send-your-id', () => {
        socket.emit('send-id', myid, myname);
    });

    /* ---------------------------------------- */
    /* peer init when client open the page, will receive a peer-id */
    myPeer.on('open', (id) => {
        myid = id;
        socket.emit('new-user-request', myid, myname);
    });

    /* server give all user id: refresh user-id-list */
    socket.on('all-user-id', (id_arr, name_arr) => {
        userid_arr = id_arr;
        username_arr = name_arr;
        document.getElementById("number-of-audience").innerText = `成員 : ${userid_arr.length}`;
        let audience = document.getElementById("audience");
        userid_arr.map( (userid, i) => {
            if (!document.getElementById('audience-' + userid)) {
                let audienceName = document.createElement('div');
                audienceName.id = 'audience-' + userid;
                audienceName.innerText = (userid==myid)? username_arr[i]+'(您)': username_arr[i];
                audience.append(audienceName);
            }
        });
    });

    /* p2p send stream:
       when new client join the room, also send stream pakage.
    show the username on chatroom when somebody join the room. */
    socket.on('new-user-id', (userid, username) => {
        if (userid != myid) {
            if (myVideoStream) myPeer.call(userid, myVideoStream);
            if (myAudioStream) myPeer.call(userid, myAudioStream);
            if (myScreenStream) myPeer.call(userid, myScreenStream);
        }
    });

    /* show the username on chatroom when somebody left the room */
    socket.on('someone-left', (userid) => {
        if (document.getElementById('audience-' + userid)) {
            document.getElementById('audience-' + userid).remove();
        }
    });

    /* ---------------------------------------- */
}

/* ###################################################################### */
Init();
listenStreaming();