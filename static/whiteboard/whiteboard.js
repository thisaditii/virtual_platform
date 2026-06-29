(function () {
    const canvas = document.querySelector('canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const socket = io(); // Connects to the server's running SocketIO instance

    let drawing = false;
    let isEraser = false; // Tracks whether the user is drawing or erasing
    const current = { color: 'black', size: 5 };
    const activeRoom = sessionStorage.getItem('VSR_roomName') || 'global';

    // UI Elements Setup
    const controlsBar = document.querySelector('.whiteboard-container, #whiteboard-controls, .controls-bar');
    
    if (controlsBar && !document.getElementById('eraser-btn')) {
        // 1. Create Eraser / Draw Toggle Button
        const eraserBtn = document.createElement('button');
        eraserBtn.id = 'eraser-btn';
        eraserBtn.textContent = '🧽 Eraser Mode';
        eraserBtn.style.cssText = "background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; padding: 6px 12px; margin-left: 10px; cursor: pointer; font-weight: bold;";
        controlsBar.appendChild(eraserBtn);

        // 2. Create local PNG Download Button
        const downloadBtn = document.createElement('button');
        downloadBtn.id = 'download-canvas-btn';
        downloadBtn.textContent = '📥 Download PNG';
        downloadBtn.style.cssText = "background: #BB86FC; color: black; border: none; border-radius: 4px; padding: 6px 12px; margin-left: 10px; cursor: pointer; font-weight: bold;";
        controlsBar.appendChild(downloadBtn);

        // Toggle Eraser Logic
        eraserBtn.addEventListener('click', () => {
            isEraser = !isEraser;
            if (isEraser) {
                eraserBtn.textContent = '✏️ Draw Mode';
                eraserBtn.style.background = '#CF6679'; // Highlight red when erasing
                eraserBtn.style.color = 'white';
            } else {
                eraserBtn.textContent = '🧽 Eraser Mode';
                eraserBtn.style.background = 'rgba(255,255,255,0.15)';
                eraserBtn.style.color = 'white';
            }
        });

        // Client-Side Local Download Tool
        downloadBtn.addEventListener('click', () => {
            // Convert current viewport matrix into a static downloadable URL string
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `study-room-whiteboard-${activeRoom}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });
    }

    // Color updates selector event mapping override
    document.querySelectorAll('.color-picker, [data-color]').forEach(picker => {
        picker.addEventListener('click', (e) => {
            if (isEraser) eraserBtn.click(); // Reset to draw mode if they choose a color
            current.color = e.target.getAttribute('data-color') || e.target.style.backgroundColor || 'black';
        });
    });

    // Core Drawing Logic
    function drawLine(x0, y0, x1, y1, color, size, emitting, mode) {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Advanced composite masking context rules
        if (mode === 'erase') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = size * 4; // Make the eraser slightly larger for better user experience
        } else {
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.stroke();
        ctx.closePath();

        if (!emitting) return;

        // Propagate across WebSockets layer containing the brush rendering configuration mode
        socket.emit('drawing', {
            x0: x0 / canvas.width,
            y0: y0 / canvas.height,
            x1: x1 / canvas.width,
            y1: y1 / canvas.height,
            color: color,
            size: size,
            room: activeRoom,
            mode: mode
        });
    }

    function onMouseDown(e) {
        drawing = true;
        const rect = canvas.getBoundingClientRect();
        current.x = e.clientX - rect.left;
        current.y = e.clientY - rect.top;
    }

    function onMouseMove(e) {
        if (!drawing) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        drawLine(current.x, current.y, x, y, current.color, current.size, true, isEraser ? 'erase' : 'draw');
        current.x = x;
        current.y = y;
    }

    function onMouseUp() {
        if (!drawing) return;
        drawing = false;
    }

    // Canvas Desktop Listener Attachments
    canvas.addEventListener('mousedown', onMouseDown, false);
    canvas.addEventListener('mouseup', onMouseUp, false);
    canvas.addEventListener('mouseout', onMouseUp, false);
    canvas.addEventListener('mousemove', onMouseMove, false);

    // Incoming Real-time WebSocket Broadcast handler synchronization logic
    socket.on('drawing', (data) => {
        const w = canvas.width;
        const h = canvas.height;
        drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color, data.size, false, data.mode);
    });

    // Handle global canvas clear events
    socket.on('clear_whiteboard', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    // Window configuration scaling metrics mapping
    window.addEventListener('resize', onResize, false);
    function onResize() {
        // Create an intermediate copy so window scaling adjustments don't instantly vaporize active states
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(canvas, 0, 0);

        canvas.width = canvas.parentElement.clientWidth || window.innerWidth * 0.8;
        canvas.height = canvas.parentElement.clientHeight || window.innerHeight * 0.6;
        
        ctx.drawImage(tempCanvas, 0, 0);
    }
    onResize();
})();