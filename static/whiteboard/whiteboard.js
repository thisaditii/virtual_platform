(function () {
    // Force a minor delay to let the dynamic SPA view engine finish mounting the DOM nodes
    setTimeout(() => {
        const canvas = document.getElementById('whiteboard-canvas') || document.querySelector('canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        // SAFEGUARD: If io is not defined yet, fallback to a dummy object so the script NEVER crashes
        let socket;
        if (typeof io !== 'undefined') {
            socket = io();
        } else {
            console.warn("Socket.IO client library is not loaded yet. Running in offline/fallback mode.");
            socket = { emit: () => {}, on: () => {} };
        }

        let drawing = false;
        let isEraser = false;
        const current = { color: 'black', size: 5 };
        const activeRoom = sessionStorage.getItem('VSR_roomName') || 'global';

        // Targets your exact panel ID 'whiteboard-controls'
        let controlsBar = document.getElementById('whiteboard-controls') || document.querySelector('.controls-bar');
        if (!controlsBar) {
            const clearBtn = document.getElementById('clear-whiteboard-btn') || document.querySelector('.clear-btn');
            if (clearBtn) {
                controlsBar = clearBtn.parentElement;
            }
        }
        
        // This block will now guaranteed execute because the script can't crash above
        if (controlsBar && !document.getElementById('eraser-btn')) {
            // 1. Create Eraser / Draw Toggle Button
            const eraserBtn = document.createElement('button');
            eraserBtn.id = 'eraser-btn';
            eraserBtn.textContent = '🧽 Eraser Mode';
            eraserBtn.style.cssText = "background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.3); border-radius: 4px; padding: 10px 20px; margin-left: 10px; cursor: pointer; font-weight: 600; font-family: 'Inter', sans-serif; border-radius: 8px; transition: background-color 0.2s;";
            controlsBar.appendChild(eraserBtn);

            // 2. Create local PNG Download Button
            const downloadBtn = document.createElement('button');
            downloadBtn.id = 'download-canvas-btn';
            downloadBtn.textContent = '📥 Download PNG';
            downloadBtn.style.cssText = "background: #BB86FC; color: black; border: none; border-radius: 8px; padding: 10px 20px; margin-left: 10px; cursor: pointer; font-weight: 600; font-family: 'Inter', sans-serif; transition: background-color 0.2s;";
            controlsBar.appendChild(downloadBtn);

            // Toggle Eraser Logic
            eraserBtn.addEventListener('click', () => {
                isEraser = !isEraser;
                if (isEraser) {
                    eraserBtn.textContent = '✏️ Draw Mode';
                    eraserBtn.style.background = '#CF6679'; 
                    eraserBtn.style.color = 'white';
                } else {
                    eraserBtn.textContent = '🧽 Eraser Mode';
                    eraserBtn.style.background = 'rgba(255,255,255,0.15)';
                    eraserBtn.style.color = 'white';
                }
            });

            // Client-Side Local Download Tool
            downloadBtn.addEventListener('click', () => {
                const exportCanvas = document.createElement('canvas');
                exportCanvas.width = canvas.width;
                exportCanvas.height = canvas.height;
                const exportCtx = exportCanvas.getContext('2d');
                
                exportCtx.fillStyle = 'white';
                exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
                exportCtx.drawImage(canvas, 0, 0);

                const dataUrl = exportCanvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = `study-room-whiteboard-${activeRoom}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        }

        // Color box selection logic
        document.querySelectorAll('.color-box, .color-picker').forEach(picker => {
            picker.addEventListener('click', (e) => {
                if (isEraser && eraserBtn) eraserBtn.click(); 
                current.color = e.target.getAttribute('data-color') || e.target.style.backgroundColor || 'black';
                
                document.querySelectorAll('.color-box').forEach(box => box.classList.remove('active'));
                e.target.classList.add('active');
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

            if (mode === 'erase') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.lineWidth = size * 6; 
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

        canvas.addEventListener('mousedown', onMouseDown, false);
        canvas.addEventListener('mouseup', onMouseUp, false);
        canvas.addEventListener('mouseout', onMouseUp, false);
        canvas.addEventListener('mousemove', onMouseMove, false);

        socket.on('drawing', (data) => {
            const w = canvas.width;
            const h = canvas.height;
            drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color, data.size, false, data.mode);
        });

        const localClearBtn = document.getElementById('clear-whiteboard-btn');
        if (localClearBtn) {
            localClearBtn.addEventListener('click', () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                socket.emit('clear_whiteboard', { room: activeRoom });
            });
        }

        socket.on('clear_whiteboard', () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        });

        window.addEventListener('resize', onResize, false);
        function onResize() {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(canvas, 0, 0);

            const calculatedWidth = canvas.parentElement ? canvas.parentElement.clientWidth - 40 : 800;
            canvas.width = calculatedWidth > 100 ? calculatedWidth : 800;
            canvas.height = 500; 
            
            ctx.drawImage(tempCanvas, 0, 0);
        }
        onResize();
    }, 100);
})();