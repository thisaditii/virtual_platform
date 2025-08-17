const APP_ID = "57c28707569f4c68ae05b7cdba68d43a";
const TOKEN = null;
const CHANNEL = sessionStorage.getItem('VSR_roomName');


const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
let localTracks = {
    videoTrack: null,
    audioTrack: null
};
let remoteUsers = {};
let localUID;


const updateGridLayout = () => {
    const container = document.getElementById('video-streams');
    if (!container) return;

    container.className = 'video-streams';
    const participantCount = container.children.length;
    
    let layoutClass = '';
    if (participantCount === 1) {
        layoutClass = 'layout-1';
    } else if (participantCount === 2) {
        layoutClass = 'layout-2';
    } else if (participantCount === 3) {
        layoutClass = 'layout-3';
    } else if (participantCount === 4) {
        layoutClass = 'layout-4';
    } else if (participantCount >= 5 && participantCount <= 6) {
        layoutClass = 'layout-6';
    } else if (participantCount > 6) {
        layoutClass = 'layout-9';
    }
    
    if (layoutClass) {
        container.classList.add(layoutClass);
    }
};


const handleUserPublished = async (user, mediaType) => {
    await client.subscribe(user, mediaType);
    remoteUsers[user.uid] = user;

    let playerContainer = document.getElementById(`player-container-${user.uid}`);
    if (mediaType === 'video') {
        if (!playerContainer) {
            playerContainer = document.createElement('div');
            playerContainer.id = `player-container-${user.uid}`;
            playerContainer.className = 'video-player';
            playerContainer.innerHTML = `<p class="user-uid">${user.uid}</p>`;
            document.getElementById('video-streams').appendChild(playerContainer);
        }
        user.videoTrack.play(playerContainer);
    }
    
    if (mediaType === 'audio') {
        user.audioTrack.play();
    }

    updateGridLayout();
};

const handleUserLeft = (user) => {
    delete remoteUsers[user.uid];
    const playerContainer = document.getElementById(`player-container-${user.uid}`);
    if (playerContainer) {
        playerContainer.remove();
    }
    updateGridLayout();
};

const joinAndDisplayLocalStream = async () => {
    client.on('user-published', handleUserPublished);
    client.on('user-left', handleUserLeft);

    try {
        localUID = await client.join(APP_ID, CHANNEL, TOKEN, null);
        
        [localTracks.audioTrack, localTracks.videoTrack] = await AgoraRTC.createMicrophoneAndCameraTracks();

        const videoStreamsContainer = document.getElementById('video-streams');
        const localPlayerContainer = document.createElement('div');
        localPlayerContainer.id = `player-container-${localUID}`;
        localPlayerContainer.className = 'video-player';
        localPlayerContainer.innerHTML = `<p class="user-uid">${localUID} (You)</p>`;
        videoStreamsContainer.appendChild(localPlayerContainer);

        localTracks.videoTrack.play(localPlayerContainer);
        updateGridLayout();

        await client.publish(Object.values(localTracks));

    } catch (error) {
        console.error("Failed to join or publish tracks:", error);
        alert("Could not join the call. Please ensure you have granted camera/microphone permissions.");
        window.location.href = '/';
    }
};

const leaveAndCleanUp = async () => {
    for (const trackName in localTracks) {
        const track = localTracks[trackName];
        if (track) {
            track.stop();
            track.close();
            localTracks[trackName] = null;
        }
    }
    await client.leave();
    sessionStorage.removeItem('VSR_roomName');
    window.location.href = '/';
};

const toggleMic = async () => {
    if (!localTracks.audioTrack) return;
    const micBtn = document.getElementById('mic-btn');
    const isMuted = localTracks.audioTrack.muted;
    
    await localTracks.audioTrack.setMuted(!isMuted);

    if (!isMuted) {
        micBtn.innerHTML = '<i data-lucide="mic-off"></i>';
    } else {
        micBtn.innerHTML = '<i data-lucide="mic"></i>';
    }
    if(window.lucide) window.lucide.createIcons();
};

const toggleCamera = async () => {
    if (!localTracks.videoTrack) return;
    const cameraBtn = document.getElementById('camera-btn');
    const isMuted = localTracks.videoTrack.muted;

    await localTracks.videoTrack.setMuted(!isMuted);

    if (!isMuted) {
        cameraBtn.innerHTML = '<i data-lucide="video-off"></i>';
    } else {
        cameraBtn.innerHTML = '<i data-lucide="video"></i>';
    }
    if(window.lucide) window.lucide.createIcons();
};


let socket;
let canvas, ctx;
let isDrawing = false;
let lastX = 0, lastY = 0;
let currentColor = '#000000';
let whiteboardVisible = false;

const setupWhiteboard = () => {
    canvas = document.getElementById('whiteboard-canvas');
    if (!canvas) {
        console.error("Whiteboard canvas not found. Aborting setup.");
        return;
    }
    ctx = canvas.getContext('2d');
    canvas.width = canvas.parentElement.clientWidth;
    canvas.height = canvas.parentElement.clientHeight;

    socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);

    socket.on('connect', () => {
        console.log('Socket connected to server');
        socket.emit('join_whiteboard', { room: CHANNEL });
    });

    socket.on('drawing', data => {
        draw(data.x0, data.y0, data.x1, data.y1, data.color);
    });

    socket.on('clear_whiteboard', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    canvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        [lastX, lastY] = [e.clientX - rect.left, e.clientY - rect.top];
    });
    canvas.addEventListener('mousemove', (e) => {
        if (!isDrawing) return;
        const rect = canvas.getBoundingClientRect();
        const [x, y] = [e.clientX - rect.left, e.clientY - rect.top];
        socket.emit('drawing', {
            room: CHANNEL,
            x0: lastX,
            y0: lastY,
            x1: x,
            y1: y,
            color: currentColor
        });
        draw(lastX, lastY, x, y, currentColor);
        [lastX, lastY] = [x, y];
    });
    canvas.addEventListener('mouseup', () => isDrawing = false);
    canvas.addEventListener('mouseout', () => isDrawing = false);

    const colorBoxes = document.querySelectorAll('.color-box');
    colorBoxes.forEach(box => {
        box.addEventListener('click', () => {
            document.querySelector('.color-box.active')?.classList.remove('active');
            box.classList.add('active');
            currentColor = box.dataset.color;
        });
    });

    document.getElementById('clear-whiteboard-btn').addEventListener('click', () => {
        socket.emit('clear_whiteboard', { room: CHANNEL });
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
};

const draw = (x0, y0, x1, y1, color) => {
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.stroke();
    ctx.closePath();
};

const toggleWhiteboard = () => {
    const videoStreams = document.getElementById('video-streams');
    const whiteboardContainer = document.getElementById('whiteboard-container');
    
    if (whiteboardVisible) {
        whiteboardContainer.style.display = 'none';
        videoStreams.style.display = 'grid';
    } else {
        whiteboardContainer.style.display = 'flex';
        videoStreams.style.display = 'none';
        if (!canvas) {
            setupWhiteboard();
        }
    }
    whiteboardVisible = !whiteboardVisible;
};

(async () => {
    if (!CHANNEL) {
        alert('Error: Room name not found. Redirecting to home.');
        window.location.href = '/';
        return;
    }

    document.getElementById('mic-btn').addEventListener('click', toggleMic);
    document.getElementById('camera-btn').addEventListener('click', toggleCamera);
    document.getElementById('leave-btn').addEventListener('click', leaveAndCleanUp);
    
    document.getElementById('whiteboard-toggle-btn').addEventListener('click', toggleWhiteboard);

    await joinAndDisplayLocalStream();
})();