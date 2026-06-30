// MEMORY CLEANUP: Prevent duplicate background websocket connections from piling up
if (window.whiteboardSocketInstance) {
    window.whiteboardSocketInstance.disconnect();
    window.whiteboardSocketInstance = null;
}

window.initializeWhiteboardSystem = function () {
    const isEmbedded = !!document.querySelector('.videocall-wrapper');
    const container = isEmbedded ? document.querySelector('.videocall-wrapper') : document.getElementById('whiteboard-container');
    
    if (!container) return;

    const canvas = container.querySelector('canvas');
    const eraserBtn = container.querySelector('#eraser-btn');
    const downloadBtn = container.querySelector('#download-btn');
    const clearBtn = container.querySelector('#clear-whiteboard-btn');

    if (!canvas || !eraserBtn || !downloadBtn) return;

    const ctx = canvas.getContext('2d');
    
    // Safely instantiate or assign global instance socket connection
    if (!window.whiteboardSocketInstance && typeof io !== 'undefined') {
        window.whiteboardSocketInstance = io();
    }
    const socket = window.whiteboardSocketInstance || { emit: () => {}, on: () => {}, off: () => {} };

    // Flush all active historical socket listeners completely
    socket.off('drawing');
    socket.off('clear_whiteboard');

    let drawing = false;
    let isEraser = false;
    const current = { color: 'black', size: 5, x: 0, y: 0 };
    const activeRoom = sessionStorage.getItem('VSR_roomName') || 'global';

    socket.emit('join_whiteboard', { room: activeRoom });

    canvas.width = isEmbedded ? (container.clientWidth || 600) : (container.clientWidth - 40 || 800);
    canvas.height = isEmbedded ? 400 : 500;
    canvas.style.cursor = 'crosshair';

    // Establish white baseline backdrop on load so white ink rendering acts as a clean eraser mask
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // --- Eraser Toggle Controller ---
    const freshEraserBtn = eraserBtn.cloneNode(true);
    eraserBtn.parentNode.replaceChild(freshEraserBtn, eraserBtn);

    freshEraserBtn.addEventListener('click', (e) => {
        e.preventDefault();
        isEraser = !isEraser;
        if (isEraser) {
            freshEraserBtn.textContent = '✏️ Draw Mode';
            freshEraserBtn.style.background = '#CF6679'; 
            freshEraserBtn.style.color = 'white';
            canvas.style.cursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' style='font-size:24px'><text y='24'>🧽</text></svg>"), auto`;
        } else {
            freshEraserBtn.textContent = '🧽 Eraser Mode';
            freshEraserBtn.style.background = 'rgba(255,255,255,0.15)';
            freshEraserBtn.style.color = 'white';
            canvas.style.cursor = 'crosshair';
        }
    });

    // --- Snapshot Download System ---
    const freshDownloadBtn = downloadBtn.cloneNode(true);
    downloadBtn.parentNode.replaceChild(freshDownloadBtn, downloadBtn);

    freshDownloadBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const exportCanvas = document.createElement('canvas');
        exportCanvas.width = canvas.width;
        exportCanvas.height = canvas.height;
        const exportCtx = exportCanvas.getContext('2d');
        
        exportCtx.fillStyle = '#FFFFFF';
        exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        exportCtx.drawImage(canvas, 0, 0);

        const dataUrl = exportCanvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `whiteboard-${activeRoom}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // --- Palette Colors Monitor ---
    container.querySelectorAll('.color-box').forEach(picker => {
        picker.addEventListener('click', (e) => {
            if (isEraser) {
                freshEraserBtn.click(); 
            }
            current.color = e.target.getAttribute('data-color') || e.target.style.backgroundColor || 'black';
            container.querySelectorAll('.color-box').forEach(box => box.classList.remove('active'));
            e.target.classList.add('active');
        });
    });

    // --- Isolated Local Draw Engine ---
    function localDrawLine(x0, y0, x1, y1, color, size, mode) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'source-over';

        if (mode === 'erase') {
            ctx.strokeStyle = '#FFFFFF'; 
            ctx.lineWidth = size * 12;
        } else {
            ctx.strokeStyle = color;
            ctx.lineWidth = size;
        }
        ctx.stroke();
        ctx.restore();

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

    // --- Isolated Remote Sync Engine ---
    function remoteDrawLine(x0, y0, x1, y1, color, size, mode) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalCompositeOperation = 'source-over';

        if (mode === 'erase') {
            ctx.strokeStyle = '#FFFFFF'; 
            ctx.lineWidth = size * 12;
        } else {
            ctx.strokeStyle = color;
            ctx.lineWidth = size;
        }
        ctx.stroke();
        ctx.restore();
    }

    function onMouseDown(e) {
        drawing = true;
        const rect = canvas.getBoundingClientRect();
        current.x = (e.clientX - rect.left) * (canvas.width / rect.width);
        current.y = (e.clientY - rect.top) * (canvas.height / rect.height);
    }

    function onMouseMove(e) {
        if (!drawing) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);

        localDrawLine(current.x, current.y, x, y, current.color, current.size, isEraser ? 'erase' : 'draw');
        current.x = x;
        current.y = y;
    }

    canvas.addEventListener('mousedown', onMouseDown, false);
    canvas.addEventListener('mouseup', () => { drawing = false; }, false);
    canvas.addEventListener('mouseout', () => { drawing = false; }, false);
    canvas.addEventListener('mousemove', onMouseMove, false);

    socket.on('drawing', (data) => {
        const w = canvas.width;
        const h = canvas.height;
        remoteDrawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color, data.size, data.mode);
    });

    if (clearBtn) {
        const freshClearBtn = clearBtn.cloneNode(true);
        clearBtn.parentNode.replaceChild(freshClearBtn, clearBtn);
        freshClearBtn.addEventListener('click', () => {
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            socket.emit('clear_whiteboard', { room: activeRoom });
        });
    }

    socket.on('clear_whiteboard', () => {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    });
};

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    window.initializeWhiteboardSystem();
}