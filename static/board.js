const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

function initCanvas() {
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
}

window.addEventListener('load', initCanvas);
window.addEventListener('resize', () => {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    initCanvas();
    ctx.putImageData(imageData, 0, 0);
});

let painting = false;
let lastX = 0, lastY = 0;

function getPos(e) {
    const rect = canvas.getBoundingClientRect();
    if (e.touches) {
        return {
            x: e.touches[0].clientX - rect.left,
            y: e.touches[0].clientY - rect.top
        };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

canvas.addEventListener('mousedown', e => {
    painting = true;
    const pos = getPos(e);
    lastX = pos.x; lastY = pos.y;
});

canvas.addEventListener('mousemove', e => {
    if (!painting) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111';
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastX = pos.x; lastY = pos.y;
});

canvas.addEventListener('mouseup', () => painting = false);
canvas.addEventListener('mouseleave', () => painting = false);

canvas.addEventListener('touchstart', e => {
    e.preventDefault();
    painting = true;
    const pos = getPos(e);
    lastX = pos.x; lastY = pos.y;
}, { passive: false });

canvas.addEventListener('touchmove', e => {
    e.preventDefault();
    if (!painting) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111';
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastX = pos.x; lastY = pos.y;
}, { passive: false });

canvas.addEventListener('touchend', () => painting = false);

function clearCanvas() {
    const rect = canvas.getBoundingClientRect();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    document.getElementById('resultCard').classList.remove('visible');
}

async function solve() {
    const btn = document.getElementById('solveBtn');
    btn.classList.add('loading');
    btn.disabled = true;

    try {
        const imageData = canvas.toDataURL('image/png');
        const response = await fetch('/solve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: imageData })
        });
        const result = await response.json();
        showResult(result);
    } catch (err) {
        showResult({ error: 'Connection failed' });
    } finally {
        btn.classList.remove('loading');
        btn.disabled = false;
    }
}

function showResult(result) {
    const card = document.getElementById('resultCard');
    const inner = document.getElementById('resultInner');
    card.classList.add('visible');

    if (result.simplified && !result.simplified.startsWith('Could not')) {
        inner.innerHTML = `
            <div class="result-row">
                <span class="result-key">Recognised</span>
                <span class="result-value">${result.expression}</span>
            </div>
            <div class="divider"></div>
            <div class="result-row">
                <span class="result-key">Simplified</span>
                <span class="result-value accent">${result.simplified}</span>
            </div>
        `;
    } else {
        inner.innerHTML = `
            <div class="result-row">
                <span class="result-key">Recognised</span>
                <span class="result-value">${result.expression || '—'}</span>
            </div>
            <div class="divider"></div>
            <p class="error-text">Could not simplify. Try writing more clearly.</p>
        `;
    }
}