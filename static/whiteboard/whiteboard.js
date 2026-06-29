(function () {
    setTimeout(() => {
        const canvas = document.getElementById('whiteboard-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        let socket;
        if (typeof io !== 'undefined') {
            socket = io();
        } else {
            socket = { emit: () => {}, on: () => {} };
        }

        let drawing = false;
        let isEraser = false;
        const current = { color: 'black', size: 5 };
        const activeRoom = sessionStorage.getItem('VSR_roomName') || 'global';

        // --- Eraser & Download Logic ---
        const eraserBtn = document.getElementById('eraser-btn');
        const downloadBtn = document.getElementById('download-btn');

        if (eraserBtn) {
            eraserBtn.addEventListener('click', () => {
                isEraser = !isEraser;
                eraserBtn.textContent = isEraser ? '✏️ Draw Mode' : '🧽 Eraser Mode';
                eraserBtn.style.background = isEraser ? '#CF6679' : 'rgba(255,255,255,0.15)';
            });
        }

        if (downloadBtn) {
            downloadBtn.addEventListener('click', () => {
                const exportCanvas = document.createElement('canvas');
                exportCanvas.width = canvas.width;
                exportCanvas.height = canvas.height;
                const exportCtx = exportCanvas.getContext('2d');
                
                // Fill white background so the saved image isn't transparent
                exportCtx.fillStyle = 'white';
                exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
                exportCtx.drawImage(canvas, 0, 0);

                const dataUrl = exportCanvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = `whiteboard-${activeRoom}.png`;
                link.click();
            });
        }

        // --- Drawing Logic ---
        function drawLine(x0, y0, x1, y1, color, size, emitting, mode) {
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.strokeStyle = (mode === 'erase') ? '#FFFFFF' : color;
            ctx.lineWidth = (mode === 'erase') ? size * 5 : size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Use 'destination-out' for transparent erasing, or 'source-over' for normal
            ctx.globalCompositeOperation = (mode === 'erase') ? 'destination-out' : 'source-over';

            ctx.stroke();
            ctx.closePath();

            if (!emitting) return;

            socket.emit('drawing', {
                x0: x0 / canvas.width, y0: y0 / canvas.height,
                x1: x1 / canvas.width, y1: y1 / canvas.height,
                color: color, size: size,
                room: activeRoom, mode: mode
            });
        }

        canvas.addEventListener('mousedown', (e) => {
            drawing = true;
            const rect = canvas.getBoundingClientRect();
            current.x = e.clientX - rect.left;
            current.y = e.clientY - rect.top;
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!drawing) return;
            const rect = canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            drawLine(current.x, current.y, x, y, current.color, current.size, true, isEraser ? 'erase' : 'draw');
            current.x = x; current.y = y;
        });

        canvas.addEventListener('mouseup', () => drawing = false);
        canvas.addEventListener('mouseout', () => drawing = false);

        socket.on('drawing', (data) => {
            drawLine(data.x0 * canvas.width, data.y0 * canvas.height, 
                     data.x1 * canvas.width, data.y1 * canvas.height, 
                     data.color, data.size, false, data.mode);
        });

        // Resize handler
        window.addEventListener('resize', () => {
            const temp = ctx.getImageData(0, 0, canvas.width, canvas.height);
            canvas.width = canvas.parentElement.clientWidth;
            ctx.putImageData(temp, 0, 0);
        });
    }, 100);
})();