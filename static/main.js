document.addEventListener('DOMContentLoaded', () => { 
    const contentDiv = document.getElementById('content'); 
    const homeBtn = document.getElementById('btn-home'); 
    const todoBtn = document.getElementById('btn-todo'); 
    const timerBtn = document.getElementById('btn-timer'); 
    const videoBtn = document.getElementById('btn-videocall'); 
    
    const videoModal = document.getElementById('video-modal'); 
    const closeModalBtn = document.getElementById('close-video-modal-btn'); 
    const createView = document.getElementById('create-view'); 
    const joinView = document.getElementById('join-view'); 
    const showJoinViewLink = document.getElementById('show-join-view'); 
    const showCreateViewLink = document.getElementById('show-create-view'); 
    const createRoomInput = document.getElementById('create-room-input'); 
    const createRoomBtn = document.getElementById('create-room-btn'); 
    const joinLinkInput = document.getElementById('join-link-input'); 
    const joinRoomBtn = document.getElementById('join-room-btn'); 

    const authModal = document.getElementById('auth-modal');
    const closeAuthModalBtn = document.getElementById('close-auth-modal-btn');
    const loginView = document.getElementById('login-view');
    const signupView = document.getElementById('signup-view');
    const showSignupLink = document.getElementById('show-signup-view');
    const showLoginLink = document.getElementById('show-login-view');
    const loginUsernameInput = document.getElementById('login-username');
    const loginPasswordInput = document.getElementById('login-password');
    const loginSubmitBtn = document.getElementById('login-submit-btn');
    const signupUsernameInput = document.getElementById('signup-username');
    const signupPasswordInput = document.getElementById('signup-password');
    const signupSubmitBtn = document.getElementById('signup-submit-btn');
    const appTitle = document.querySelector('.app-title'); 

    const navItems = [homeBtn, todoBtn, timerBtn, videoBtn];
    let isLoggedIn = false; 

    const images = [ 'url("https://images.pexels.com/photos/414171/pexels-photo-414171.jpeg")', 'url("https://images.pexels.com/photos/158607/cairn-fog-mystical-background-158607.jpeg")', 'url("https://images.pexels.com/photos/34950/pexels-photo.jpg")' ];
    let currentImageIndex = 0;
    function changeBackgroundImage() {
        document.body.style.backgroundImage = images[currentImageIndex];
        currentImageIndex = (currentImageIndex + 1) % images.length;
    }
    changeBackgroundImage(); 
    setInterval(changeBackgroundImage, 10000); 

    function showMessage(message, type = 'info') {
        const messageBox = document.createElement('div');
        messageBox.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 15px 25px;
            border-radius: 8px;
            font-family: 'Inter', sans-serif;
            font-size: 1rem;
            color: white;
            z-index: 2000;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            opacity: 0;
            transition: opacity 0.5s ease-out, transform 0.5s ease-out;
        `;
        if (type === 'error') {
            messageBox.style.backgroundColor = '#CF6679'; 
        } else if (type === 'success') {
            messageBox.style.backgroundColor = '#03DAC6'; 
        } else {
            messageBox.style.backgroundColor = '#BB86FC'; 
        }

        messageBox.textContent = message;
        document.body.appendChild(messageBox);

        setTimeout(() => {
            messageBox.style.opacity = 1;
            messageBox.style.transform = 'translateX(-50%) translateY(0)';
        }, 50);

        setTimeout(() => {
            messageBox.style.opacity = 0;
            messageBox.style.transform = 'translateX(-50%) translateY(-20px)';
            messageBox.addEventListener('transitionend', () => messageBox.remove());
        }, 3000);
    }

    function setSidebarEnabled(enabled) {
        navItems.forEach(item => {
            if (enabled) {
                item.classList.remove('disabled');
            } else {
                item.classList.add('disabled');
            }
        });
        const sidebar = document.querySelector('.sidebar');
        let logoutBtn = document.getElementById('logout-btn');

        if (enabled) {
            if (!logoutBtn) { 
                logoutBtn = document.createElement('button');
                logoutBtn.id = 'logout-btn';
                logoutBtn.className = 'auth-btn mt-auto mb-5'; 
                logoutBtn.textContent = 'Logout';
                sidebar.appendChild(logoutBtn);
                logoutBtn.addEventListener('click', handleLogout);
            }
        } else {
            if (logoutBtn) {
                logoutBtn.removeEventListener('click', handleLogout);
                logoutBtn.remove();
            }
        }
    }


    async function checkAuthAndLoadContent() {
        try {
            const response = await fetch('/api/check_login_status');
            const data = await response.json();
            isLoggedIn = data.logged_in;

            if (isLoggedIn) {
                authModal.style.display = 'none'; 
                setSidebarEnabled(true); 
                closeAuthModalBtn.style.pointerEvents = 'auto'; 
                closeAuthModalBtn.style.opacity = '1';
                if (appTitle) appTitle.style.display = 'none'; 
                checkUrlForRoom(); 
            } else {
                authModal.style.display = 'flex'; 
                setSidebarEnabled(false); 
                clearContent(); 
                closeAuthModalBtn.style.pointerEvents = 'none';
                closeAuthModalBtn.style.opacity = '0.3';
                if (appTitle) appTitle.style.display = 'block'; 
            }
        } catch (error) {
            console.error("Error checking login status:", error);
            showMessage("Could not check login status. Please try again.", 'error');
            authModal.style.display = 'flex'; 
            setSidebarEnabled(false); 
            clearContent(); 
            closeAuthModalBtn.style.pointerEvents = 'none';
            closeAuthModalBtn.style.opacity = '0.3';
            if (appTitle) appTitle.style.display = 'block'; 
        }
    }

    checkAuthAndLoadContent();


    closeAuthModalBtn.addEventListener('click', () => {
        if (isLoggedIn) {
            authModal.style.display = 'none';
        } else {
            showMessage("Please log in or sign up to access the platform.", 'info');
        }
    });

    showSignupLink.addEventListener('click', (e) => { 
        e.preventDefault(); 
        loginView.style.display = 'none'; 
        signupView.style.display = 'block'; 
    });
    showLoginLink.addEventListener('click', (e) => { 
        e.preventDefault(); 
        signupView.style.display = 'none'; 
        loginView.style.display = 'block'; 
    });

    signupSubmitBtn.addEventListener('click', async () => {
        const username = signupUsernameInput.value;
        const password = signupPasswordInput.value;
        const response = await fetch('/api/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        showMessage(data.message, response.ok ? 'success' : 'error'); 
        if (response.ok) {
            signupView.style.display = 'none';
            loginView.style.display = 'block';
        }
    });

    loginSubmitBtn.addEventListener('click', async () => {
        const username = loginUsernameInput.value;
        const password = loginPasswordInput.value;
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();
        showMessage(data.message, response.ok ? 'success' : 'error'); 
        if (response.ok) {
            await checkAuthAndLoadContent(); 
        }
    });

    async function handleLogout() {
        const response = await fetch('/api/logout');
        const data = await response.json();
        showMessage(data.message, response.ok ? 'success' : 'error');
        if (response.ok) {
            await checkAuthAndLoadContent(); 
        }
    }

    function protectFeatureLoad(loadFunction) {
        return function(e) {
            e.preventDefault();
            if (isLoggedIn) {
                loadFunction();
            } else {
                showMessage("Please log in to access this feature.", 'info');
                authModal.style.display = 'flex'; 
            }
        };
    }

    videoBtn.addEventListener('click', protectFeatureLoad(() => { 
        videoModal.style.display = 'flex'; 
    }));
    closeModalBtn.addEventListener('click', () => { videoModal.style.display = 'none'; });
    showJoinViewLink.addEventListener('click', (e) => { e.preventDefault(); createView.style.display = 'none'; joinView.style.display = 'block'; });
    showCreateViewLink.addEventListener('click', (e) => { e.preventDefault(); joinView.style.display = 'none'; createView.style.display = 'block'; });
    createRoomBtn.addEventListener('click', protectFeatureLoad(() => { 
        const roomName = createRoomInput.value.trim().replace(/\s+/g, '-');
        if (!roomName) { showMessage("Please enter a room name.", 'error'); return; } 
        videoModal.style.display = 'none';
        const link = `${window.location.origin}${window.location.pathname}?room=${roomName}`;
        showLinkPage(roomName, link);
    }));
    joinRoomBtn.addEventListener('click', protectFeatureLoad(() => { 
        const link = joinLinkInput.value.trim();
        if (!link) { showMessage("Please paste the invitation link.", 'error'); return; } 
        try {
            const url = new URL(link);
            const roomName = url.searchParams.get('room');
            if (roomName) {
                sessionStorage.setItem('VSR_roomName', roomName);
                window.location.href = url.href; 
            } else { showMessage("Invalid invitation link.", 'error'); } 
        } catch (error) { showMessage("Invalid URL format.", 'error'); } 
    }));

    homeBtn.addEventListener('click', protectFeatureLoad(loadHomePage));
    timerBtn.addEventListener('click', protectFeatureLoad(loadTimer));
    todoBtn.addEventListener('click', protectFeatureLoad(loadTodo));


    function clearContent() {
        contentDiv.innerHTML = '';
        document.querySelectorAll('.component-script, .component-style').forEach(el => el.remove());
    }

    function loadHomePage() {
        clearContent();
        contentDiv.innerHTML = `<div class="welcome-container"><h1>Welcome to Your Study Room</h1></div>`;
    }

    function loadTimer() {
        clearContent();
        fetch('/components/timer.html').then(res => {
            if (!res.ok) { 
                if (res.status === 401) { 
                    showMessage("You need to be logged in to access the timer.", 'error');
                    checkAuthAndLoadContent(); 
                    return Promise.reject('Unauthorized access');
                }
                showMessage(`Error loading timer: ${res.statusText}`, 'error');
                return Promise.reject(new Error(`HTTP error! status: ${res.status}`));
            }
            return res.text();
        }).then(html => {
            contentDiv.innerHTML = html;
            const script = document.createElement('script');
            script.src = '/static/timer/timer.js';
            script.className = 'component-script';
            document.body.appendChild(script);
        }).catch(error => console.error("Failed to load timer:", error));
    }

    function showLinkPage(roomName, link) {
        clearContent();
        contentDiv.innerHTML = `
            <div class="videocall-container">
                <h1 class="room-title">Study Room: <strong>${roomName}</strong></h1>
                <p>Your link is ready. Copy it, send it to your friends, then join the call!</p>
                <div class="share-link-container">
                    <input type="text" id="share-link-input" value="${link}" readonly>
                    <button id="copy-link-btn"><i data-lucide="copy"></i><span>Copy Link</span></button>
                </div>
                <button id="start-call-btn" class="auth-btn" style="margin-top: 20px;">Join Call Now</button>
            </div>
        `;
        if (window.lucide) window.lucide.createIcons();
        const copyBtn = document.getElementById('copy-link-btn');
        const shareLinkInput = document.getElementById('share-link-input');
        copyBtn.addEventListener('click', () => {
            shareLinkInput.select();
            document.execCommand('copy'); 
            copyBtn.querySelector('span').textContent = 'Copied!';
            setTimeout(() => { copyBtn.querySelector('span').textContent = 'Copy Link'; }, 2000);
        });
        const startCallBtn = document.getElementById('start-call-btn');
        startCallBtn.addEventListener('click', protectFeatureLoad(() => { 
            sessionStorage.setItem('VSR_roomName', roomName);
            loadVideoCall();
        }));
    }

    function loadVideoCall() {
        clearContent();
        fetch('/components/videocall.html').then(res => {
            if (!res.ok) {
                if (res.status === 401) {
                    showMessage("You need to be logged in to access video calls.", 'error');
                    checkAuthAndLoadContent();
                    return Promise.reject('Unauthorized access');
                }
                showMessage(`Error loading video call: ${res.statusText}`, 'error');
                return Promise.reject(new Error(`HTTP error! status: ${res.status}`));
            }
            return res.text();
        }).then(html => {
            contentDiv.innerHTML = html;
            if (window.lucide) window.lucide.createIcons();
            const script = document.createElement('script');
            script.src = '/static/videocall/videocall.js';
            script.className = 'component-script';
            document.body.appendChild(script);
        }).catch(error => console.error("Failed to load video call:", error));
    }

    function loadTodo() {
        clearContent();
        fetch('/components/todo.html').then(res => { 
            if (!res.ok) {
                if (res.status === 401) {
                    showMessage("You need to be logged in to access the todo list.", 'error');
                    checkAuthAndLoadContent();
                    return Promise.reject('Unauthorized access');
                }
                showMessage(`Error loading todo: ${res.statusText}`, 'error');
                return Promise.reject(new Error(`HTTP error! status: ${res.status}`));
            }
            contentDiv.innerHTML = `<div id="root"></div>`;

            const cssLink = document.createElement('link');
            cssLink.rel = 'stylesheet';
            cssLink.href = '/static/todo/build/static/css/main.2aa96ae7.css';
            cssLink.className = 'component-style';
            document.head.appendChild(cssLink);

            const script = document.createElement('script');
            script.src = '/static/todo/build/static/js/main.02aad3c1.js';
            script.className = 'component-script';
            document.body.appendChild(script);
            return null; 
        }).catch(error => console.error("Failed to load todo:", error));
    }

    function loadWhiteboard(roomId = null) {
        clearContent();
        fetch(`/components/whiteboard.html${roomId ? '?room_id=' + roomId : ''}`).then(res => {
            if (!res.ok) {
                if (res.status === 401) {
                    showMessage("You need to be logged in to access the whiteboard.", 'error');
                    checkAuthAndLoadContent();
                    return Promise.reject('Unauthorized access');
                }
                showMessage(`Error loading whiteboard: ${res.statusText}`, 'error');
                return Promise.reject(new Error(`HTTP error! status: ${res.status}`));
            }
            return res.text();
        }).then(html => {
            contentDiv.innerHTML = html;
            if (window.lucide) window.lucide.createIcons();
            const script = document.createElement('script');
            script.src = '/static/whiteboard/whiteboard.js'; 
            script.className = 'component-script';
            document.body.appendChild(script);
        }).catch(error => console.error("Failed to load whiteboard:", error));
    }

    function checkUrlForRoom() {
        const params = new URLSearchParams(window.location.search);
        const roomName = params.get('room');
        if (roomName) {
            sessionStorage.setItem('VSR_roomName', roomName);
            loadVideoCall(); 
        } else {
            loadHomePage(); 
        }
    }
});