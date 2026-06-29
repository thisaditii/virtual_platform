(function () {
    let checkAttempts = 0;

    function initWhiteboardEngine() {
        // Look contextually inside the open wrapper view first to prevent duplicate ID mismatch conflicts
        const container = document.querySelector('.videocall-wrapper') || document.getElementById('whiteboard-container') || document.body;
        const canvas = container.querySelector('canvas') || document.getElementById('whiteboard-canvas');
        const eraserBtn = container.querySelector('#eraser-btn');
        const downloadBtn = container.querySelector('#download-btn');
        const clearBtn = container.querySelector('#clear-whiteboard-btn');

        // Polling guard: wait up to 5 seconds for single-page structural templates to finish async rendering
        if (!canvas || !eraserBtn || !downloadBtn) {
            if (checkAttempts < 50) {
                checkAttempts++;
                setTimeout(initWhiteboardEngine, 100);
            } else {
                console.warn("Whiteboard DOM elements not yet fully rendered.");
            }
            return;
        }

        const ctx = canvas.getContext('2d');
        let socket;
        if (typeof io !== 'undefined') {
            socket = io();
        } else {
            socket = { emit: () => {}, on: () => {}, off: () => {} };
        }

        let drawing = false;
        let isEraser = false;
        const current = { color: 'black', size: 5 };
        const activeRoom = sessionStorage.getItem('VSR_roomName') || 'global';

        // --- Clean Button Listeners (Flush stale cloned events) ---
        const freshEraserBtn = eraserBtn.cloneNode(true);
        eraserBtn.parentNode.replaceChild(freshEraserBtn, eraserBtn);

        const freshDownloadBtn = downloadBtn.cloneNode(true);
        downloadBtn.parentNode.replaceChild(freshDownloadBtn, downloadBtn);

        const freshClearBtn = clearBtn ? clearBtn.cloneNode(true) : null;
        if (clearBtn && freshClearBtn) {
            clearBtn.parentNode.replaceChild(freshClearBtn, clearBtn);
        }

        // --- Eraser Toggle Feature ---
        freshEraserBtn.addEventListener('click', (e) => {
            e.preventDefault();
            isEraser = !isEraser;
            if (isEraser) {
                freshEraserBtn.textContent = '✏️ Draw Mode';
                freshEraserBtn.style.background = '#CF6679'; 
                freshEraserBtn.style.color = 'white';
            } else {
                freshEraserBtn.textContent = '🧽 Eraser Mode';
                freshEraserBtn.style.background = 'rgba(255,255,255,0.15)';
                freshEraserBtn.style.color = 'white';
            }
        });

        // --- Snapshot & PNG File Download System ---
        freshDownloadBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            const exportCanvas = document.createElement('canvas');
            exportCanvas.width = canvas.width;
            exportCanvas.height = canvas.height;
            const exportCtx = exportCanvas.getContext('2d');
            
            // Draw a solid background so transparent pixels don't export as black
            exportCtx.fillStyle = '#FFFFFF';
            exportCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
            exportCtx.drawImage(canvas, 0, 0);

            const dataUrl = exportCanvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = dataUrl;
            link.download = `whiteboard-snapshot-${activeRoom}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        });

        // --- Color Changing Palette Sync ---
        container.querySelectorAll('.color-box').forEach(picker => {
            picker.addEventListener('click', (e) => {
                if (isEraser) {
                    freshEraserBtn.click(); // Turn off eraser mode when selecting a color
                }
                current.color = e.target.getAttribute('data-color') || e.target.style.backgroundColor || 'black';
                container.querySelectorAll('.color-box').forEach(box => box.classList.remove('active'));
                e.target.classList.add('active');
            });
        });

        // --- Render Drawing and Erasing Lines ---
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
                ctx.lineWidth = size * 8; // Slightly thicker stroke for an intuitive feel
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

        // --- Canvas Coordinates Normalizer ---
        function getCanvasMouseCoordinates(e) {
            const rect = canvas.getBoundingClientRect();
            return {
                x: (e.clientX - rect.left) * (canvas.width / rect.width),
                y: (e.clientY - rect.top) * (canvas.height / rect.height)
            };
        }

        canvas.addEventListener('mousedown', (e) => {
            drawing = true;
            const coordinates = getCanvasMouseCoordinates(e);
            current.x = coordinates.x;
            current.y = coordinates.y;
        }, false);

        canvas.addEventListener('mousemove', (e) => {
            if (!drawing) return;
            const coordinates = getCanvasMouseCoordinates(e);
            drawLine(current.x, current.y, coordinates.x, coordinates.y, current.color, current.size, true, isEraser ? 'erase' : 'draw');
            current.x = coordinates.x;
            current.y = coordinates.y;
        }, false);

        const stopDrawingSequence = () => { drawing = false; };
        canvas.addEventListener('mouseup', stopDrawingSequence, false);
        canvas.addEventListener('mouseout', stopDrawingSequence, false);

        // --- Synchronize incoming WebSockets cleanly ---
        socket.off('drawing');
        socket.on('drawing', (data) => {
            const w = canvas.width;
            const h = canvas.height;
            drawLine(data.x0 * w, data.y0 * h, data.x1 * w, data.y1 * h, data.color, data.size, false, data.mode);
        });

        if (freshClearBtn) {
            freshClearBtn.addEventListener('click', () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                socket.emit('clear_whiteboard', { room: activeRoom });
            });
        }

        socket.off('clear_whiteboard');
        socket.on('clear_whiteboard', () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        });

        // --- Precise Canvas Resize Redraw Handler ---
        function handleCanvasResize() {
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
        window.addEventListener('resize', handleCanvasResize, false);
        handleCanvasResize();
    }

    initWhiteboardEngine();
})();