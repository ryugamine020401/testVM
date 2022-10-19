let socket;
let username;

function sent_to_Server() {
    let message = document.getElementById("chat-input").value;
    if (message != '') {
        socket.emit('chatroom-message', {'account': username, 'content': message});
        document.getElementById("chat-input").value = '';
    }
}

function Init() {
    socket = io.connect();
    username = window.prompt('輸入名字', 'USER') || 'USER';
    document.getElementById("username").innerText = username;
    document.getElementById("chat-sent").addEventListener('click', sent_to_Server);

    socket.on('chatroom-refresh', (message) => {
        document.getElementById("chatroom").innerHTML += `<div>
            <span>${message.account}</span>
            <span> : </span>
            <span>${message.content}</span>
        </div>`
    });
    socket.on('member-refresh', (member) => {
        document.getElementById("number-of-people").innerText = `線上人數 : ${member}`
    });
}

Init();