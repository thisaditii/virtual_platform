(function () {
    setTimeout(() => {
        const isEmbedded = !!document.querySelector('.videocall-wrapper');
        const container = isEmbedded ? document.querySelector('.videocall-wrapper') : document.getElementById('whiteboard-container');
        
        if (!container) {
            console.error("Whiteboard active container view not found.");
            return;
        }

        const canvas = container.querySelector('canvas');
        const eraserBtn = container.querySelector('#eraser-btn');
        const downloadBtn = container.querySelector('#download-btn');
        const clearBtn = container.querySelector('#clear-whiteboard-btn');

        if (!canvas) {
            console.error("Canvas element target missing.");
            return;
        }

        const ctx = canvas.getContext('2d');
        let socket = (typeof io !== 'undefined') ? io() : { emit: () => {}, on: () => {} };

        let drawing = false;
        let isEraser = false;
        const current = { color: 'black', size: 5 };
        const activeRoom = sessionStorage.getItem('VSR_roomName') || 'global';

        // Set initial cursor style to draw brush crosshair
        canvas.style.cursor = 'crosshair';

        // --- Eraser Toggle Controller with Visual Cursor Update ---
        if (eraserBtn) {
            eraserBtn.addEventListener('click', (e) => {
                e.preventDefault();
                isEraser = !isEraser;
                if (isEraser) {
                    eraserBtn.textContent = '✏️ Draw Mode';
                    eraserBtn.style.background = '#CF6679'; 
                    eraserBtn.style.color = 'white';
                    
                    // Visual Update: Changes mouse cursor to an eraser shape over the canvas layer
                    canvas.style.cursor = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='32' height='32' style='font-size:24px'><text y='24'>🧽</text></svg>"), auto`;
                } else {
                    eraserBtn.textContent = '🧽 Eraser Mode';
                    eraserBtn.style.background = 'rgba(255,255,255,0.15)';
                    eraserBtn.style.color = 'white';
                    
                    // Revert back to crosshair
                    canvas.style.cursor = 'crosshair';
                }
            });
        }

        // --- Snapshot / Save PNG Link System ---
        if (downloadBtn) {
            downloadBtn.addEventListener('click', (e) => {
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
                link.download = `whiteboard-${activeRoom}-${Date.now()}.png`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            });
        }

        // --- Palette Colors Monitor ---
        container.querySelectorAll('.color-box').forEach(picker => {
            picker.addEventListener('click', (e) => {
                if (isEraser && eraserBtn) {
                    eraserBtn.click(); // Reset eraser UI and cursor back to draw mode instantly
                }
                current.color = e.target.getAttribute('data-color') || e.target.style.backgroundColor || 'black';
                container.querySelectorAll('.color-box').forEach(box => box.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // --- Standard Stroke / Mask Compositor Core Drawing Core ---
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

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
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
    }, 200);
})();