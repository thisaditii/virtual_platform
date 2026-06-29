(function () {
    // Small delay to ensure the DOM elements have settled after single-page view changes
    setTimeout(() => {
        // Find the active container context (either the standalone view or the video call overlay wrapper)
        const container = document.querySelector('.videocall-wrapper') || document.getElementById('whiteboard-container') || document.body;
        
        // Scope elements to the active container to avoid duplicate ID conflicts
        const canvas = container.querySelector('canvas') || document.getElementById('whiteboard-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        let socket;
        if (typeof io !== 'undefined') {
            socket = io();
        } else {
            console.warn("Socket.IO client library not found. Running in offline fallback mode.");
            socket = { emit: () => {}, on: () => {} };
        }

        let drawing = false;
        let isEraser = false;
        const current = { color: 'black', size: 5 };
        const activeRoom = sessionStorage.getItem('VSR_roomName') || 'global';

        // Scope control buttons uniquely within the active container view
        const eraserBtn = container.querySelector('#eraser-btn');
        const downloadBtn = container.querySelector('#download-btn') || container.querySelector('#save-canvas-btn');
        const clearBtn = container.querySelector('#clear-whiteboard-btn');

        // --- Eraser Toggle Feature ---
        if (eraserBtn) {
            eraserBtn.addEventListener('click', (e) => {
                e.preventDefault();
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
        }

        // --- Snapshot & Download Feature ---
        if (downloadBtn) {
            downloadBtn.addEventListener('click', (e) => {
                e.preventDefault();
                
                // Create a separate off-screen canvas to capture a clean export snapshot
                const exportCanvas = document.createElement('canvas');
                exportCanvas.width = canvas.width;
                exportCanvas.height = canvas.height;
                const exportCtx = exportCanvas.getContext('2d');
                
                // Render a solid crisp white background layer (stops transparent image black-outs)
                exportCtx.fillStyle = '#FFFFFF';
                exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
                
                // Overlay the drawn strokes
                exportCtx.drawImage(canvas, 0, 0);

                // Convert payload stream and execute seamless local file system download
                const dataUrl = exportCanvas.toDataURL('image/png');
                const link = document.createElement('a');
                link.href = dataUrl;
                link.download = `study-whiteboard-${activeRoom}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        }

        // --- Palette Switching Interceptor ---
        container.querySelectorAll('.color-box').forEach(picker => {
            picker.addEventListener('click', (e) => {
                // If using the eraser, clicking a color automatically snaps back to pen mode smoothly
                if (isEraser && eraserBtn) {
                    eraserBtn.click(); 
                }
                current.color = e.target.getAttribute('data-color') || e.target.style.backgroundColor || 'black';
                
                container.querySelectorAll('.color-box').forEach(box => box.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // --- Core Multi-user Draw Rendering Core Pipeline ---
        function drawLine(x0, y0, x1, y1, color, size, emitting, mode) {
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.strokeStyle = color;
            ctx.lineWidth = size;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            // Alpha-mask composition handles clean local and broadcast canvas erasing
            if (mode === 'erase') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.lineWidth = size * 6; // Expanded width threshold for intuitive track erasing
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

        // Real-time peer drawing synchronizer hook
        socket.on('drawing', (data) => {
            const w = canvas.width;
            const h = canvas.height;
            drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color, data.size, false, data.mode);
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                socket.emit('clear_whiteboard', { room: activeRoom });
            });
        }

        socket.on('clear_whiteboard', () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        });

        // Dynamic Resizer maintaining existing canvas paths securely
        window.addEventListener('resize', onResize, false);
        function onResize() {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = canvas.width;
            tempCanvas.height = canvas.height;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(canvas, 0, 0);

            const isEmbedded = !!document.querySelector('.videocall-wrapper');
            if (isEmbedded) {
                canvas.width = canvas.parentElement ? canvas.parentElement.clientWidth : 600;
                canvas.height = 400;
            } else {
                const calculatedWidth = canvas.parentElement ? canvas.parentElement.clientWidth - 40 : 800;
                canvas.width = calculatedWidth > 100 ? calculatedWidth : 800;
                canvas.height = 500;
            }
            
            ctx.drawImage(tempCanvas, 0, 0);
        }
        onResize();
    }, 150);
})();