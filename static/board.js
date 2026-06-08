window.addEventListener('load', () => {
    resize();
    canvas.addEventListener('mousedown', startPainting);
    canvas.addEventListener('mouseup', stopPainting);
    canvas.addEventListener('mousemove', sketch);
    window.addEventListener('resize', resize);
});

const canvas = document.getElementById("canvas");

const ctx = canvas.getContext("2d");

function resize()
{
    ctx.canvas.width = 800;
    ctx.canvas.height = 200;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

let coord = {x:0, y:0};

let paint = false;

function getPosition(event)
{
    coord.x = event.clientX - canvas.offsetLeft;
    coord.y = event.clientY - canvas.offsetTop;
}

function startPainting(event)
{
    paint = true;
    getPosition(event)
}

function stopPainting()
{
    paint = false;
}

function sketch(event)
{
    if(!paint)
    {
        return;
    }
    ctx.beginPath();
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'black';
    ctx.moveTo(coord.x, coord.y);;
    getPosition(event);
    ctx.lineTo(coord.x, coord.y);
    ctx.stroke();
}

function clearCanvas()
{
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

async function solve() {
    const imageData = canvas.toDataURL('image/png');
    const response = await fetch('/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData })
    });
    const result = await response.json()
    document.getElementById('result').innerText = result.expression + '=' + result.simplified;
}