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

    signupSubmitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const username = signupUsernameInput.value;
        const password = signupPasswordInput.value;
        
        if (!username || !password) {
            showMessage("Please fill in all fields.", "error");
            return;
        }

        try {
            const response = await fetch('/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error(`Server returned status ${response.status} (Not JSON)`);
            }

            const data = await response.json();
            showMessage(data.message, response.ok ? 'success' : 'error'); 
            if (response.ok) {
                signupView.style.display = 'none';
                loginView.style.display = 'block';
            }
        } catch (error) {
            console.error("Signup error:", error);
            showMessage(`Signup Failed: ${error.message}`, 'error');
        }
    });

    loginSubmitBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        const username = loginUsernameInput.value;
        const password = loginPasswordInput.value;

        if (!username || !password) {
            showMessage("Please fill in all fields.", "error");
            return;
        }

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error(`Server returned status ${response.status} (Not JSON)`);
            }

            const data = await response.json();
            showMessage(data.message, response.ok ? 'success' : 'error'); 
            if (response.ok) {
                await checkAuthAndLoadContent(); 
            }
        } catch (error) {
            console.error("Login error:", error);
            showMessage(`Login Failed: ${error.message}`, 'error');
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
        contentDiv.innerHTML = `
            <div class="welcome-container" style="text-align: center; color: white; font-family: 'Inter', sans-serif;">
                <h1>Welcome to Your Study Room</h1>
                <div id="home-analytics" style="margin-top: 20px; padding: 15px; background: rgba(255,255,255,0.08); display: inline-block; border-radius: 8px; backdrop-filter: blur(5px);">
                    <p style="margin: 0; color: rgba(255,255,255,0.7);">Loading dashboard metrics...</p>
                </div>
            </div>
        `;

        fetch('/api/todos/analytics')
            .then(res => res.json())
            .then(data => {
                const analyticsDiv = document.getElementById('home-analytics');
                if (data.high_priority_pending > 0) {
                    analyticsDiv.innerHTML = `<p style="margin: 0; font-weight: 500; color: #CF6679;">⚠️ You have <strong>${data.high_priority_pending}</strong> High Priority tasks pending.</p>`;
                } else {
                    analyticsDiv.innerHTML = `<p style="margin: 0; color: #03DAC6;">✨ All clear! You have <strong>${data.total_pending}</strong> total tasks remaining.</p>`;
                }
            })
            .catch(err => console.error("Error updating metrics view:", err));
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
            
            const whiteboardNavBtn = document.getElementById('btn-whiteboard') || document.querySelector('.wb-trigger');
            if (whiteboardNavBtn) {
                whiteboardNavBtn.addEventListener('click', () => {
                    const activeRoom = sessionStorage.getItem('VSR_roomName') || 'global';
                    loadWhiteboard(activeRoom);
                });
            }

            if (window.lucide) window.lucide.createIcons();
            const script = document.createElement('script');
            script.src = '/static/videocall/videocall.js';
            script.className = 'component-script';
            document.body.appendChild(script);
        }).catch(error => console.error("Failed to load video call:", error));
    }

    function loadTodo() {
        clearContent();
        
        contentDiv.innerHTML = `
            <div class="todo-container" style="max-width: 550px; margin: 40px auto; padding: 20px; background: rgba(255,255,255,0.05); backdrop-filter: blur(10px); border-radius: 12px; color: white; font-family: 'Inter', sans-serif;">
                <h2 style="margin-bottom: 20px; text-align: center;">Your Tasks</h2>
                <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
                    <input type="text" id="todo-input" placeholder="Add a new task..." style="flex: 1; padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.3); color: white; outline: none; min-width: 200px;">
                    
                    <select id="todo-priority" style="padding: 10px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.5); color: white; outline: none; cursor: pointer;">
                        <option value="Low">Low</option>
                        <option value="Medium" selected>Medium</option>
                        <option value="High">High</option>
                    </select>
                    
                    <button id="add-todo-btn" style="padding: 10px 20px; background: #03DAC6; border: none; border-radius: 6px; color: black; font-weight: bold; cursor: pointer;">Add</button>
                </div>
                <ul id="todo-list-items" style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 10px;">
                    <li style="text-align: center; color: rgba(255,255,255,0.5);">Loading your tasks...</li>
                </ul>
            </div>
        `;

        const todoInput = document.getElementById('todo-input');
        const todoPriority = document.getElementById('todo-priority');
        const addTodoBtn = document.getElementById('add-todo-btn');
        const todoListItems = document.getElementById('todo-list-items');

        async function fetchTasks() {
            try {
                const response = await fetch('/api/todos');
                if (!response.ok) throw new Error("Could not load tasks.");
                const tasks = await response.json();
                renderTasks(tasks);
            } catch (err) {
                console.error(err);
                todoListItems.innerHTML = `<li style="color: #CF6679; text-align: center;">Error loading tasks.</li>`;
            }
        }

        function renderTasks(tasks) {
            todoListItems.innerHTML = '';
            if (tasks.length === 0) {
                todoListItems.innerHTML = `<li style="text-align: center; color: rgba(255,255,255,0.4);">No pending tasks. Great job!</li>`;
                return;
            }

            tasks.forEach(task => {
                const li = document.createElement('li');
                li.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 12px; background: rgba(255,255,255,0.08); border-radius: 6px;";
                
                const contentWrapper = document.createElement('div');
                contentWrapper.style.cssText = "display: flex; align-items: center; gap: 10px;";

                let badgeColor = '#BB86FC';
                if (task.priority === 'High') badgeColor = '#CF6679';
                if (task.priority === 'Low') badgeColor = '#03DAC6';

                const priorityBadge = document.createElement('span');
                priorityBadge.textContent = task.priority;
                priorityBadge.style.cssText = `font-size: 0.75rem; padding: 2px 6px; border-radius: 4px; font-weight: bold; background: ${badgeColor}; color: black;`;

                const taskSpan = document.createElement('span');
                taskSpan.textContent = task.task;
                if (task.completed) {
                    taskSpan.style.textDecoration = "line-through";
                    taskSpan.style.opacity = "0.5";
                    priorityBadge.style.opacity = "0.4";
                }

                contentWrapper.appendChild(priorityBadge);
                contentWrapper.appendChild(taskSpan);

                const actionsDiv = document.createElement('div');
                actionsDiv.style.display = "flex";
                actionsDiv.style.gap = "8px";

                const checkBtn = document.createElement('button');
                checkBtn.innerHTML = task.completed ? "↩" : "✓";
                checkBtn.style.cssText = "background: none; border: 1px solid rgba(255,255,255,0.3); color: white; border-radius: 4px; padding: 4px 8px; cursor: pointer;";
                checkBtn.onclick = async () => {
                    await fetch(`/api/todos/${task.id}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ completed: !task.completed })
                    });
                    fetchTasks();
                };

                const delBtn = document.createElement('button');
                delBtn.innerHTML = "✕";
                delBtn.style.cssText = "background: #CF6679; border: none; color: white; border-radius: 4px; padding: 4px 8px; cursor: pointer;";
                delBtn.onclick = async () => {
                    await fetch(`/api/todos/${task.id}`, { method: 'DELETE' });
                    fetchTasks();
                };

                actionsDiv.appendChild(checkBtn);
                actionsDiv.appendChild(delBtn);
                li.appendChild(contentWrapper);
                li.appendChild(actionsDiv);
                todoListItems.appendChild(li);
            });
        }

        addTodoBtn.addEventListener('click', async () => {
            const taskText = todoInput.value.trim();
            const selectedPriority = todoPriority.value;
            if (!taskText) return;

            try {
                const response = await fetch('/api/todos', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ task: taskText, priority: selectedPriority })
                });
                if (response.ok) {
                    todoInput.value = '';
                    fetchTasks();
                }
            } catch (err) {
                console.error(err);
            }
        });

        fetchTasks();
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
            
            // DYNAMICALLY INJECT COMPONENT SNAPSHOT BUTTON
            const controls = document.querySelector('.whiteboard-container, #whiteboard-controls, .controls-bar'); 
            if (controls) {
                const saveBtn = document.createElement('button');
                saveBtn.id = 'save-canvas-btn';
                saveBtn.textContent = '💾 Save Snapshot';
                saveBtn.style.cssText = "background: #03DAC6; color: black; border: none; border-radius: 4px; padding: 6px 12px; margin-left: 10px; font-weight: bold; cursor: pointer;";
                controls.appendChild(saveBtn);
                
                saveBtn.addEventListener('click', async () => {
                    const canvas = document.querySelector('canvas');
                    if (!canvas) return;
                    
                    const base64Data = canvas.toDataURL('image/png');
                    const activeRoom = sessionStorage.getItem('VSR_roomName') || 'global';
                    
                    try {
                        const response = await fetch('/api/whiteboard/save', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ image_data: base64Data, room_id: activeRoom })
                        });
                        const resData = await response.json();
                        if (response.ok) {
                            showMessage("Canvas snapshot saved!", "success");
                        } else {
                            showMessage(resData.message, "error");
                        }
                    } catch (err) {
                        console.error(err);
                        showMessage("Failed to save canvas state to server", "error");
                    }
                });
            }

            if (window.lucide) window.lucide.createIcons();
            
            const script = document.createElement('script');
            // INCREMENTED: Updated cache-busting token to guarantee delivery of fresh selector parameters
            script.src = '/static/whiteboard/whiteboard.js?v=1.4'; 
            script.className = 'component-script';
            document.body.appendChild(script);

            // AUTOMATIC SNAPSHOT RETRIEVAL INITIALIZATION HOOK
            script.onload = function() {
                const activeRoom = sessionStorage.getItem('VSR_roomName') || 'global';
                fetch(`/api/whiteboard/load?room_id=${activeRoom}`)
                    .then(r => r.json())
                    .then(data => {
                        if (data.image_data) {
                            const canvas = document.querySelector('canvas');
                            const ctx = canvas ? canvas.getContext('2d') : null;
                            if (ctx) {
                                const img = new Image();
                                img.onload = function() {
                                    ctx.drawImage(img, 0, 0);
                                };
                                img.src = data.image_data;
                            }
                        }
                    }).catch(e => console.error("Could not load whiteboard snapshot", e));
            };

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