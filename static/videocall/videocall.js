const APP_ID = "57c28707569f4c68ae05b7cdba68d43a";
const TOKEN = null;
const CHANNEL = sessionStorage.getItem('VSR_roomName');
const client = AgoraRTC.createClient({ mode: 'rtc', codec: 'vp8' });
let localTracks = { videoTrack: null, audioTrack: null };
let remoteUsers = {};
let localUID;
if (!window.videoCallSocketInstance && typeof io !== 'undefined') {
    window.videoCallSocketInstance = io();
}
const videoSocket = window.videoCallSocketInstance || { emit: () => {}, on: () => {}, off: () => {} };

videoSocket.emit('join_whiteboard', { room: CHANNEL });

const updateGridLayout = () => {
    const container = document.getElementById('video-streams');
    if (!container) return;
    container.className = 'video-streams';
    const participantCount = container.children.length;
    let layoutClass = '';
    if (participantCount === 1) layoutClass = 'layout-1';
    else if (participantCount === 2) layoutClass = 'layout-2';
    else if (participantCount === 3) layoutClass = 'layout-3';
    else if (participantCount === 4) layoutClass = 'layout-4';
    else if (participantCount >= 5 && participantCount <= 6) layoutClass = 'layout-6';
    else if (participantCount > 6) layoutClass = 'layout-9';
    if (layoutClass) container.classList.add(layoutClass);
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
    if (mediaType === 'audio') user.audioTrack.play();
    updateGridLayout();
};

const handleUserLeft = (user) => {
    delete remoteUsers[user.uid];
    const playerContainer = document.getElementById(`player-container-${user.uid}`);
    if (playerContainer) playerContainer.remove();
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
        console.error(error);
        window.location.href = '/';
    }
};

const leaveAndCleanUp = async () => {
    for (const trackName in localTracks) {
        const track = localTracks[trackName];
        if (track) { track.stop(); track.close(); localTracks[trackName] = null; }
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
    micBtn.innerHTML = !isMuted ? '<i data-lucide="mic-off"></i>' : '<i data-lucide="mic"></i>';
    if(window.lucide) window.lucide.createIcons();
};

const toggleCamera = async () => {
    if (!localTracks.videoTrack) return;
    const cameraBtn = document.getElementById('camera-btn');
    const isMuted = localTracks.videoTrack.muted;
    await localTracks.videoTrack.setMuted(!isMuted);
    cameraBtn.innerHTML = !isMuted ? '<i data-lucide="video-off"></i>' : '<i data-lucide="video"></i>';
    if(window.lucide) window.lucide.createIcons();
};

let whiteboardVisible = false;

const executeVisibilityToggle = (visible) => {
    const videoStreams = document.getElementById('video-streams');
    const whiteboardContainer = document.getElementById('whiteboard-container');
    
    whiteboardVisible = visible;
    if (whiteboardVisible) {
        whiteboardContainer.style.display = 'flex';
        videoStreams.style.display = 'none';
        
        if (typeof window.initializeWhiteboardSystem === 'function') {
            window.initializeWhiteboardSystem();
        } else {
            const script = document.createElement('script');
            script.src = '/static/whiteboard/whiteboard.js?v=' + Date.now();
            script.onload = () => {
                if (typeof window.initializeWhiteboardSystem === 'function') {
                    window.initializeWhiteboardSystem();
                }
            };
            document.body.appendChild(script);
        }
    } else {
        whiteboardContainer.style.display = 'none';
        videoStreams.style.display = 'grid';
    }
};

const toggleWhiteboard = () => {
    const nextState = !whiteboardVisible;
    executeVisibilityToggle(nextState);
    videoSocket.emit('toggle_whiteboard', { room: CHANNEL, visible: nextState });
};

videoSocket.off('toggle_whiteboard');
videoSocket.on('toggle_whiteboard', (data) => {
    executeVisibilityToggle(data.visible);
});

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