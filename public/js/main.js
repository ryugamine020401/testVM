/* ###################################################################### */
let socket;

let myPeer = new Peer(undefined, {
    host: '/',
    secure: true,
    port: 3000,
    path: '/'
});

/* ---------------------------------------- */
const VIDEO_QUALITY = {
    audio: false,
    video: {
        width: 192, //768,
        height: 108 //432
    }
};

const AUDIO_QUALITY = {
    audio: true,
    video: false
};

const SCREEN_QUALITY = {
    audio: {
        autoGainControl: false,
        channelCount: 2,
        echoCancellation: false,
        latency: 0,
        noiseSuppression: false,
        sampleRate: 96000,
        sampleSize: 16,
        volume: 1.0
    },
    video: {
        MediaSource: 'screen', 
        width: 1920, 
        height: 1080,
        frameRate: { max: 60 }
    }
};

/* ---------------------------------------- */
let myname;
let myid;
let userid_arr = [];
let username_arr = [];

let cameraStatus = false;
let micStatus = false;
let screenStatus = false;

let mutedState = false;
let video_arr = [];
let audio_arr = [];

/* ---------------------------------------- */
let myVideoStream = null;
let myVideoContainer = document.createElement('div');
let myVideo = document.createElement('video');
let myVideoName = document.createElement('div');
let myAudioStream = null;
let myAudio = document.createElement('audio');
let myScreenStream = null;
let myScreenContainer = document.createElement('div');
let myScreen = document.createElement('video');
let myScreenName = document.createElement('div');

/* ###################################################################### */
function video_arrange() {
    let type = document.getElementById("video-layout").value;
    let video_count = document.querySelectorAll('video').length;
    let root = document.documentElement;
    let multiple = 0;
    switch (type) {
        case 'auto':
            if (video_count <= 1) {
                multiple = 65;
            } else if (video_count <= 4) {
                multiple = 32;
            } else {
                multiple = 21;
            }
            break;
        case 'type1':
            multiple = 65;
            break;
        case 'type2':
            multiple = 32;
            break;
        case 'type3':
            multiple = 21;
            break;
    }
    root.style.setProperty('--vh',`${multiple *9}px`);
    root.style.setProperty('--vw',`${multiple *16}px`);
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
                    container.remove();
                    video_arrange();
                }
            }
        });
        socket.on('close-audio', (userid) => {
            if (call.peer == userid) {
                audio.remove();
                let audienceName = document.getElementById('audience-' + userid);
                if (audienceName) {
                    audienceName.innerText = audienceName.innerText.replace(' ...?????????', '');
                }
            }
        });
        /* ---------------------------------------- */
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
    videoName.className = 'videoName';
    container.className = 'video-container';
    container.id = 'video-' + streamId;
    container.append(video);
    container.append(videoName);
    videoBox.append(container);
    videoName.addEventListener('click', () => {
        video.requestFullscreen();
    });
}

/* creat <audio> tag in DOM */
function add_newAudio(audio, audioStream, userid) {
    let audioBox = document.getElementById("audioBox");
    audio.srcObject = audioStream;
    audio.addEventListener('loadedmetadata', () => {
        audio.play();
    });
    audioBox.append(audio);
    let audienceName = document.getElementById('audience-' + userid);
    if (audienceName) {
        audienceName.innerText += ' ...?????????';
    }
}

/* ###################################################################### */
/* button onclick event:
   open/close camera and control streaming... */
async function toggleCamera() {
    if (cameraStatus == false) {
        myVideoStream = await navigator.mediaDevices.getUserMedia(VIDEO_QUALITY)
        .catch( (error) => {alert(error.message);} );
        if (myVideoStream) {
            add_newVideo(myVideoContainer, myVideo, myVideoStream, myVideoName, '???', myVideoStream.id);
            video_arrange();
            brocastStreaming(myVideoStream);
            cameraStatus = true;
            document.getElementById("camera-toggle").innerText = "????????????";
        }
    } else {
        if (myVideoStream) {
            /* stop fetch media */
            myVideoStream.getTracks().forEach((track) => {track.stop();});
            myVideoContainer.remove();
            video_arrange();
            socket.emit('stop-videoStream', myid, myVideoStream.id);
            myVideoStream = null;
        }
        cameraStatus = false;
        document.getElementById("camera-toggle").innerText = "????????????";
    }
}

/* button onclick event:
   open/close mic and control streaming... */
async function toggleMic() {
    if (micStatus == false) {
        myAudioStream = await navigator.mediaDevices.getUserMedia(AUDIO_QUALITY)
        .catch( (error) => {alert(error.message);} );
        if (myAudioStream) {
            add_newAudio(myAudio, myAudioStream, myid);
            brocastStreaming(myAudioStream);
            micStatus = true;
            document.getElementById("mic-toggle").innerText = "???????????????";
        }
    } else {
        if (myAudioStream) {
            /* stop fetch media */
            myAudioStream.getTracks().forEach((track) => {track.stop();});
            myAudio.remove();
            socket.emit('stop-audioStream', myid);
            myAudioStream = null;
            let audienceName = document.getElementById('audience-' + myid);
            if (audienceName) {
                audienceName.innerText = audienceName.innerText.replace(' ...?????????', '');
            }
        }
        micStatus = false;
        document.getElementById("mic-toggle").innerText = "???????????????";
    }
}

/* button onclick event:
   open/close screen sharing and control streaming... */
async function toggleScreen() {
    if (screenStatus == false) {
        myScreenStream = await navigator.mediaDevices.getDisplayMedia(SCREEN_QUALITY)
        .catch( (error) => {console.log(error.message);} );
        if (myScreenStream) {
            add_newVideo(myScreenContainer, myScreen, myScreenStream, myScreenName, '???', myScreenStream.id);
            video_arrange();
            brocastStreaming(myScreenStream);
            screenStatus = true;
            document.getElementById("screen-toggle").innerText = "??????????????????";
            myScreenStream.getVideoTracks()[0].onended = function () {
                /* stop fetch media */
                myScreenStream.getTracks().forEach((track) => {track.stop();});
                myScreenContainer.remove();
                video_arrange();
                socket.emit('stop-videoStream', myid, myScreenStream.id);
                myScreenStream = null;
                screenStatus = false;
                document.getElementById("screen-toggle").innerText = "??????????????????";
            }
        }
    } else {
        if (myScreenStream) {
            /* stop fetch media */
            myScreenStream.getTracks().forEach((track) => {track.stop();});
            myScreenContainer.remove();
            video_arrange();
            socket.emit('stop-videoStream', myid, myScreenStream.id);
            myScreenStream = null;
        }
        screenStatus = false;
        document.getElementById("screen-toggle").innerText = "??????????????????";
    }
}

/* button onclick event:
   send a message to chatroom */
function sendchat_to_Server() {
    let input = document.getElementById("chat-input");
    let message = input.value;
    if (message.replaceAll(' ', '').replaceAll('\n', '') == '') return;
    socket.emit('new-chat-message', {'username': myname, 'content': message});
    input.value = '';
}

/* ###################################################################### */
/* remove autoplay limit */
function join() {
    let audio = document.createElement("audio");
    audio.src = "sound/join.mp3";
    audio.addEventListener('play', () => {
        document.querySelector('.confirmArea').style.display = 'none';
        document.querySelector('.topArea').style.display = 'block';
        document.querySelector('.mainArea').style.display = 'flex';
        /* send real request to server when audio ended */
        socket.emit('new-user-request', myid, myname);
    });
    audio.play();
}

function Init() {
    /* add join event */
    let join_btn = document.getElementById("join-check");
    join_btn.addEventListener('click', () => {
        join_btn.disabled = true;
        let name_input = document.getElementById("name-input");
        myname = name_input.value;
        if (myname.length > 15) {
            join_btn.disabled = false;
            name_input.value = '';
            alert('?????????????????????????????? (??????15??????)');
        } else {
            if (myname == '') myname = 'USER';
            document.getElementById("username").innerText = myname;
            join();
        }
    });

    /* add event in DOM */
    document.getElementById("camera-toggle").addEventListener('click', toggleCamera);
    document.getElementById("mic-toggle").addEventListener('click', toggleMic);
    document.getElementById("screen-toggle").addEventListener('click', toggleScreen);
    document.getElementById("video-layout").addEventListener('change', video_arrange);
    document.getElementById("chat-send").addEventListener('click', sendchat_to_Server);
    document.getElementById('chat-input').addEventListener('keyup', (e) => {
        if (/*e.code == "Enter" ||*/ e.code == "NumpadEnter") sendchat_to_Server();
    });
    
    /* we dont want to listen voice from ourself */
    myVideo.muted = true;
    myAudio.muted = true;
    myScreen.muted = true;

    /* bind audio sounds ctrl to checkbox */
    let muted_toggle = document.getElementById("muted-toggle");
    muted_toggle.checked = true;
    muted_toggle.addEventListener('click', () => {
        mutedState = !muted_toggle.checked;
        audio_arr.map( (audio) => {
            audio.muted = mutedState;
        });
        video_arr.map( (video) => {
            video.muted = mutedState;
        });
    });
}

function socketInit() {
    /* connect to server */
    socket = io.connect();

    /* somebody sent a message, receive it and show on the chatroom */
    socket.on('chatroom-refresh', (message) => {
        let room = document.getElementById("chatroom");
        let name = document.createElement('span');
        let content = document.createElement('span');
        name.className = 'text-wrapper';
        content.className = 'text-wrapper';
        name.innerText = message.username + ' : ';
        content.innerText = message.content.replaceAll('\n', ' ');
        room.append(name);
        room.append(content);
        room.innerHTML += `<div style="height:5px"></div>`;
        room.scrollTop = room.scrollHeight;
    });

    /* load chatroom history */
    socket.on('chat-history', (chat_history) => {
        let room = document.getElementById("chatroom");
        chat_history.map( (message) => {
            let name = document.createElement('span');
            let content = document.createElement('span');
            name.className = 'text-wrapper';
            content.className = 'text-wrapper';
            name.innerText = message.username + ' : ';
            content.innerText = message.content.replaceAll('\n', ' ');
            room.append(name);
            room.append(content);
            room.innerHTML += `<div style="height:5px"></div>`;
        });
        room.scrollTop = room.scrollHeight;
    });

    /* ---------------------------------------- */
    /* server give all user id: refresh user-id-list */
    socket.on('all-user-id', (id_arr, name_arr) => {
        userid_arr = id_arr;
        username_arr = name_arr;
        document.getElementById("number-of-audience").innerText = `?????? : ${userid_arr.length}`;
        let audience = document.getElementById("audience");
        userid_arr.map( (userid, i) => {
            if (!document.getElementById('audience-' + userid)) {
                let audienceName = document.createElement('div');
                audienceName.id = 'audience-' + userid;
                audienceName.innerText = (userid==myid)? username_arr[i]+' (???)': username_arr[i];
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

    /* remove username when somebody left the room */
    socket.on('someone-left', (userid) => {
        if (document.getElementById('audience-' + userid)) {
            document.getElementById('audience-' + userid).remove();
        }
    });

    /* peer init when client open the page, will receive a peer-id */
    myPeer.on('open', (id) => {
        myid = id;
    });
}

/* ###################################################################### */
Init();
socketInit();
listenStreaming();