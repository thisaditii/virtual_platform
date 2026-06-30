// Export a clean initializer function to the global scope to bypass single-page application race conditions
window.initializeWhiteboardSystem = function () {
    // Determine active container view context exactly
    const isEmbedded = !!document.querySelector('.videocall-wrapper');
    const container = isEmbedded ? document.querySelector('.videocall-wrapper') : document.getElementById('whiteboard-container');
    
    if (!container) {
        console.warn("Whiteboard container wrapper not ready yet.");
        return;
    }

    const canvas = container.querySelector('canvas');
    const eraserBtn = container.querySelector('#eraser-btn');
    const downloadBtn = container.querySelector('#download-btn');
    const clearBtn = container.querySelector('#clear-whiteboard-btn');

    if (!canvas || !eraserBtn || !downloadBtn) {
        console.warn("Whiteboard UI nodes missing inside current view wrapper.");
        return;
    }

    const ctx = canvas.getContext('2d');
    let socket = (typeof io !== 'undefined') ? io() : { emit: () => {}, on: () => {} };

    let drawing = false;
    let isEraser = false;
    const current = { color: 'black', size: 5 };
    const activeRoom = sessionStorage.getItem('VSR_roomName') || 'global';

    // Set fallback baseline dimensions if container is temporarily hidden
    canvas.width = isEmbedded ? (container.clientWidth || 600) : (container.clientWidth - 40 || 800);
    canvas.height = isEmbedded ? 400 : 500;

    canvas.style.cursor = 'crosshair';

    // --- Eraser Toggle Controller with Visual Cursor Update ---
    // Clone buttons to completely wipe out old event listeners from previous view tracking states
    const freshEraserBtn = eraserBtn.cloneNode(true);
    eraserBtn.parentNode.replaceChild(freshEraserBtn, eraserBtn);

    freshEraserBtn.addEventListener('click', (e) => {
        e.preventDefault();
        isEraser = !isEraser;
        if (isEraser) {
            freshEraserBtn.textContent = '✏️ Draw Mode';
            freshEraserBtn.style.background = '#CF6679'; 
            freshEraserBtn.style.color = 'white';
            
            // Inline SVG data-uri custom cursor element injection mapping
            canvas.style.cursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' style='font-size:24px'><text y='24'>🧽</text></svg>"), auto`;
        } else {
            freshEraserBtn.textContent = '🧽 Eraser Mode';
            freshEraserBtn.style.background = 'rgba(255,255,255,0.15)';
            freshEraserBtn.style.color = 'white';
            canvas.style.cursor = 'crosshair';
        }
    });

    // --- Snapshot / Save PNG Link System ---
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

    // --- Standard Stroke Core ---
    function drawLine(x0, y0, x1, y1, color, size, emitting, mode) {
        ctx.beginPath();
        ctx.moveTo(x0, y0);
        ctx.lineTo(x1, y1);
        ctx.strokeStyle = color;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        if (mode === 'erase') {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.lineWidth = size * 8; 
        } else {
            ctx.globalCompositeOperation = 'source-over';
        }

        ctx.stroke();
        ctx.closePath();

        if (!emitting) return;

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
        current.x = (e.clientX - rect.left) * (canvas.width / rect.width);
        current.y = (e.clientY - rect.top) * (canvas.height / rect.height);
    }

    function onMouseMove(e) {
        if (!drawing) return;
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);

        drawLine(current.x, current.y, x, y, current.color, current.size, true, isEraser ? 'erase' : 'draw');
        current.x = x;
        current.y = y;
    }

    function onMouseUp() {
        if (!drawing) return;
        drawing = false;
    }

    canvas.addEventListener('mousedown', onMouseDown, false);
    canvas.addEventListener('mouseup', onMouseUp, false);
    canvas.addEventListener('mouseout', onMouseUp, false);
    canvas.addEventListener('mousemove', onMouseMove, false);

    socket.off('drawing');
    socket.on('drawing', (data) => {
        const w = canvas.width;
        const h = canvas.height;
        drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color, data.size, false, data.mode);
    });

    if (clearBtn) {
        const freshClearBtn = clearBtn.cloneNode(true);
        clearBtn.parentNode.replaceChild(freshClearBtn, clearBtn);
        freshClearBtn.addEventListener('click', () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            socket.emit('clear_whiteboard', { room: activeRoom });
        });
    }

    socket.off('clear_whiteboard');
    socket.on('clear_whiteboard', () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
    });
};

// Auto-run if elements are already loaded natively
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    window.initializeWhiteboardSystem();
}