let socket = io.connect();
const username = window.prompt('輸入名字', 'USER') || 'USER';
document.getElementById("username").innerText = username;

socket.on('chatroom-refresh', (message) => {
    document.getElementById("chatroom").innerHTML += `<div>
        <span>${message.account}</span>
        <span> : </span>
        <span>${message.content}</span>
    </div>`
});

let sent_to_Server = function () {
    let message = document.getElementById("chat-input").value;
    if (message != '') socket.emit('chatroom-message', {'account': username, 'content': message});
    document.getElementById("chat-input").value = '';
}