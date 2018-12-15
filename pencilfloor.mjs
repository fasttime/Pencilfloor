const DBL_PI                = 2 * Math.PI;
const DEFAULT_HEIGHT        = 150;
const DEFAULT_INSTANT_RATE  = 0.5;
const DEFAULT_PENCIL_SIZE   = 5;
const DEFAULT_QUICKNESS     = 0.025;
const DEFAULT_WIDTH         = 300;

let minDistance;

class Pencilfloor extends HTMLElement
{ }

const create =
createParams =>
{
    function animationFrameCallback(timeStamp)
    {
        const now = roundTimeStamp(timeStamp);
        time += min(now - before, 1000);
        triggerAnimation(now);
        const instantLimit = startInstant + time * instantRate - 1;
        while (animationFrameHandle)
        {
            if (!isAnimatable())
            {
                startWaitingToAnimate();
                cancelAnimation();
                break;
            }
            if (instant > instantLimit)
                break;
            ++instant;
            newInstant();
            drawStrokes();
            pencilfloor.dispatchEvent(new Event('instant'));
        }
    }

    function animationstartListener()
    {
        if (isAnimatable())
        {
            stopWaitingToAnimate();
            triggerAnimation();
        }
    }

    function cancelAnimation()
    {
        cancelAnimationFrame(animationFrameHandle);
        animationFrameHandle = 0;
    }

    function drawStrokes()
    {
        for (const pencil of pencils)
        {
            const x0 =
            movePencil(pencil, 'x', 'dx', pencilMinX, pencilMaxX, dblPencilMinX, dblPencilMaxX);
            const y0 =
            movePencil(pencil, 'y', 'dy', pencilMinY, pencilMaxY, dblPencilMinY, dblPencilMaxY);
            const { color, x, y } = pencil;
            ctx.beginPath();
            // Edge does not draw a line between two points whose Chebyshev distance is less than
            // 0.01. In Safari the minimum is lower but still nonzero, it's exactly 2 ** -150 * (1 +
            // Number.EPSILON) or 7.006492321624087e-46. A workaround in this case is to draw a
            // circle on the end point.
            if (abs(x - x0) < minDistance && abs(y - y0) < minDistance)
            {
                ctx.fillStyle = color;
                ctx.arc(x, y, 0.5, 0, DBL_PI);
                ctx.fill();
            }
            else
            {
                ctx.strokeStyle = color;
                ctx.moveTo(x0, y0);
                ctx.lineTo(x, y);
                ctx.stroke();
            }
        }
    }

    function getPencils()
    {
        const pencilCopies = pencils.map(({ color, x, y }) => ({ color, x, y }));
        return pencilCopies;
    }

    const isAnimatable = () => Boolean(base.getClientRects().length);

    const makeFocusable = () => base.setAttribute('tabindex', '0');

    function movePencil
    (
        pencil,
        posPropName,
        dPosPropName,
        pencilMinPos,
        pencilMaxPos,
        dblPencilMinPos,
        dblPencilMaxPos
    )
    {
        const pos0 = pencil[posPropName];
        let dPos = pencil[dPosPropName];
        let pos1 = pos0 + quickness * dPos;
        for (;;)
        {
            if (pos1 < pencilMinPos)
                pos1 = dblPencilMinPos - pos1;
            else if (pos1 > pencilMaxPos)
                pos1 = dblPencilMaxPos - pos1;
            else
                break;
            dPos = -dPos;
        }
        pencil[posPropName] = pos1;
        pencil[dPosPropName] = dPos;
        return pos0;
    }

    function newInstant()
    {
        for (let index1 = 0; index1 < pencilCount; ++index1)
        {
            const pencil1 = pencils[index1];
            for (let index2 = index1; ++index2 < pencilCount;)
            {
                const pencil2 = pencils[index2];
                const distX = pencil1.x - pencil2.x;
                const distY = pencil1.y - pencil2.y;
                const dByDist = quickness * squareOfDistance(distX, distY) ** -1.5;
                const dxIncr = dByDist * distX;
                const dyIncr = dByDist * distY;
                pencil1.dx += dxIncr;
                pencil1.dy += dyIncr;
                pencil2.dx -= dxIncr;
                pencil2.dy -= dyIncr;
            }
        }
    }

    const pause =
    () =>
    {
        if (!paused)
            togglePlay(false);
    };

    const play =
    () =>
    {
        if (paused)
            togglePlay(false);
    };

    function setInstantRate(value)
    {
        value = Number(value) + 0;
        if (!(value >= 0 && value <= 1))
            throw RangeError('Instant rate must be between 0 and 1');
        if (value !== instantRate)
        {
            instantRate = value;
            startInstant = instant;
            time = 0;
        }
    }

    function setInteractive(value)
    {
        interactive = Boolean(value);
        if (interactive)
            makeFocusable();
        else
        {
            base.blur();
            base.removeAttribute('tabindex');
        }
    }

    function setQuickness(value)
    {
        value = Number(value) + 0;
        if (!(value >= 0 && value <= 1))
            throw RangeError('Quickness must be between 0 and 1');
        quickness = value;
    }

    const startWaitingToAnimate =
    () => base.addEventListener('animationstart', animationstartListener);

    const stopWaitingToAnimate =
    () => base.removeEventListener('animationstart', animationstartListener);

    function togglePlay(showOverlayIcon)
    {
        if (pencilCount < 2)
            return;
        let icon;
        let evtType;
        if (paused)
        {
            if (isAnimatable())
                triggerAnimation();
            else
                startWaitingToAnimate();
            icon = playIcon;
            evtType = 'play';
            paused = false;
        }
        else
        {
            if (isAnimatable())
                cancelAnimation();
            else
                stopWaitingToAnimate();
            icon = pauseIcon;
            evtType = 'pause';
            paused = true;
        }
        {
            const { lastChild } = base;
            if (lastChild instanceof SVGElement)
                base.removeChild(lastChild);
        }
        if (showOverlayIcon)
        {
            const { offsetWidth, offsetHeight } = base;
            const iconSize =
            min(Math.max(offsetWidth, offsetHeight) / 6 | 0, offsetWidth, offsetHeight);
            icon.setAttributeNS(null, 'width', iconSize);
            base.appendChild(icon);
        }
        pencilfloor.dispatchEvent(new Event(evtType));
    }

    function triggerAnimation(now = roundTimeStamp(performance.now()))
    {
        before = now;
        animationFrameHandle = requestAnimationFrame(animationFrameCallback);
    }

    let animationFrameHandle = 0;
    let before;
    let time = 0;
    let startInstant = 0;
    let instant = 0;
    let instantRate = DEFAULT_INSTANT_RATE;
    let quickness = DEFAULT_QUICKNESS;
    let interactive = true;
    let paused = true;
    createParams = Object(createParams);
    const width = toSize(createParams.width, DEFAULT_WIDTH);
    const height = toSize(createParams.height, DEFAULT_HEIGHT);
    const pencilSize =
    (() =>
    {
        let pencilSize = Number(createParams.pencilSize);
        if (pencilSize <= 0)
            return 0;
        if (pencilSize !== pencilSize)
            pencilSize = DEFAULT_PENCIL_SIZE;
        pencilSize = min(pencilSize, width / 2, height / 2);
        return pencilSize;
    })();
    const dblPencilMaxX = (width - pencilSize) / pencilSize;
    const dblPencilMinX = -dblPencilMaxX;
    const pencilMinX = dblPencilMinX / 2;
    const pencilMaxX = dblPencilMaxX / 2;
    const dblPencilMaxY = (height - pencilSize) / pencilSize;
    const dblPencilMinY = -dblPencilMaxY;
    const pencilMaxY = dblPencilMaxY / 2;
    const pencilMinY = dblPencilMinY / 2;
    const pencils = [];
    {
        let pencilParams = createParams.pencils;
        if (pencilParams === undefined)
            pencilParams = defaultArrangePencils;
        if (typeof pencilParams === 'function')
        {
            const rect =
            {
                minX:   pencilMinX,
                maxX:   pencilMaxX,
                minY:   pencilMinY,
                maxY:   pencilMaxY,
                width:  dblPencilMaxX,
                height: dblPencilMaxY,
            };
            pencilParams = pencilParams(rect);
        }
        if (!(Symbol.iterator in pencilParams))
        {
            throw TypeError
            ('Parameter "pencils" must be an iterable or a function returning an iterable');
        }
        const tmpCanvas = createCanvas(1, 1);
        const tmpCtx = getContext2D(tmpCanvas);
        for (const pencilParam of pencilParams)
        {
            const x = Number(pencilParam.x);
            if (!(x >= pencilMinX && x <= pencilMaxX))
            {
                const message =
                `Pencil X-position ${x} out of range ${pencilMinX} to ${pencilMaxX}`;
                throw RangeError(message);
            }
            const y = Number(pencilParam.y);
            if (!(y >= pencilMinY && y <= pencilMaxY))
            {
                const message =
                `Pencil Y-position ${y} out of range ${pencilMinY} to ${pencilMaxY}`;
                throw RangeError(message);
            }
            for (const { x: x0, y: y0 } of pencils)
            {
                if (squareOfDistance(x - x0, y - y0) < 1)
                {
                    const message = `Pencils (${x}, ${y}) and (${x0}, ${y0}) overlap`;
                    throw Error(message);
                }
            }
            tmpCtx.fillStyle = pencilParam.color;
            tmpCtx.fillRect(0, 0, 1, 1);
            const { data } = tmpCtx.getImageData(0, 0, 1, 1);
            const color = `rgb(${data[0]}, ${data[1]}, ${data[2]})`;
            const pencil = { x, y, dx: 0, dy: 0, color };
            pencils.push(pencil);
            tmpCtx.clearRect(0, 0, 1, 1);
        }
        if (minDistance === undefined)
        {
            const tryDistance =
            () =>
            {
                tmpCtx.lineTo(minDistance, 0.5);
                tmpCtx.stroke();
                const [,,, alpha] = tmpCtx.getImageData(0, 0, 1, 1).data;
                return alpha;
            };
            tmpCtx.lineCap = 'round';
            tmpCtx.moveTo(0, 0.5);
            minDistance = 0;
            if (!tryDistance())
            {
                minDistance = 2 ** -150 * (1 + Number.EPSILON);
                if (!tryDistance())
                    minDistance = 0.01;
            }
        }
    }
    createParams = null;
    const pencilCount = pencils.length;
    const pencilfloor = document.createElement('PENCILFLOOR');
    Object.setPrototypeOf(pencilfloor, Pencilfloor.prototype);
    Object.defineProperties
    (
        pencilfloor,
        {
            height: defineValueProperty(height),
            instant: defineAccessorProperty(() => instant),
            instantRate: defineAccessorProperty(() => instantRate, setInstantRate),
            interactive: defineAccessorProperty(() => interactive, setInteractive),
            pause: defineValueProperty(pause, true),
            paused: defineAccessorProperty(() => paused),
            pencilSize: defineValueProperty(pencilSize),
            pencils: defineAccessorProperty(getPencils),
            play: defineValueProperty(play, true),
            quickness: defineAccessorProperty(() => quickness, setQuickness),
            width: defineValueProperty(width),
        }
    );
    const base = pencilfloor.appendChild(document.createElement('SPAN'));
    makeFocusable();
    base.addEventListener
    (
        'keydown',
        evt =>
        {
            if (interactive && evt.key === ' ')
            {
                togglePlay(true);
                evt.stopPropagation();
            }
        }
    );
    base.addEventListener
    (
        'mousedown',
        evt =>
        {
            if (interactive && evt.button === 0)
            {
                togglePlay(true);
                evt.stopPropagation();
            }
        }
    );
    base.appendChild(document.createElement('STYLE')).textContent =
    `
    pencilfloor { background: white; display: inline-flex; }
    pencilfloor canvas { flex: auto; min-height: 0; width: 100%; }
    pencilfloor span
    {
        -webkit-animation-duration: 5e-324s;
        -webkit-user-select: none;
        animation-name: pencilfloor-animation;
        display: flex;
        flex: auto;
        flex-direction: column;
        position: relative;
    }
    pencilfloor span:focus { box-shadow: 0 0 2px 3px #3B99FC; outline: none; }
    pencilfloor svg
    {
        animation: pencilfloor-fadeout 2s;
        pointer-events: none;
        position: absolute;
        transform: translate(-50%, -50%);
        visibility: hidden;
        left: 50%;
        top: 50%;
    }
    /*
    { visibility: visible; } makes the element actually visible for a short time in Blink, despite
    ancestors being invisible. Many other animatable properties don't work in all browsers.
    { z-index: auto; } seems to do the job.
    */
    @keyframes pencilfloor-animation { 0% { z-index: auto; } }
    @keyframes pencilfloor-fadeout
    { 0%, 50% { opacity: .9; visibility: visible; } 100% { opacity: 0; } }
    `;
    const ctx =
    (() =>
    {
        const canvas = base.appendChild(createCanvas(width, height));
        canvas.style.height = `${height}px`;
        const ctx = getContext2D(canvas);
        ctx.lineCap = 'round';
        ctx.setTransform(pencilSize, 0, 0, -pencilSize, width / 2, height / 2);
        return ctx;
    })();
    drawStrokes();
    const playIcon = createOverlayIcon('M76,50L32,75V25Z');
    const pauseIcon = createOverlayIcon('M75,75H55V25H75ZM45,75H25V25H45Z');
    return pencilfloor;
};

function createCanvas(width, height)
{
    const canvas = document.createElement('CANVAS');
    canvas.width = width;
    canvas.height = height;
    return canvas;
}

function createOverlayIcon(d)
{
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttributeNS(null, 'viewBox', '0 0 100 100');
    svg.innerHTML = `<circle cx='50' cy='50' r='50' fill='dimgray'/><path fill='white' d='${d}'/>`;
    return svg;
}

function * defaultArrangePencils({ minX, maxX, minY, maxY })
{
    const radius = 4;
    const negativeRadius = -radius;
    if (minX <= negativeRadius && maxX >= radius && minY <= negativeRadius && maxY >= radius)
    {
        const colors = ['#FF8000', '#0F0', '#8000FF'];
        let turns = Math.random();
        for (const color of colors)
        {
            const angle = DBL_PI * turns;
            const x = radius * Math.cos(angle);
            const y = radius * Math.sin(angle);
            const pencilParam = { x, y, color };
            yield pencilParam;
            turns += 1 / 3;
        }
    }
}

const defineAccessorProperty = (get, set) => ({ get, set, enumerable: true, configurable: true });

const defineValueProperty =
(value, writable) => ({ value, writable, enumerable: true, configurable: true });

const getContext2D = canvas => canvas.getContext('2d');

const roundTimeStamp = Math.round;

const squareOfDistance = (distX, distY) => distX * distX + distY * distY;

function toSize(value, defaultValue)
{
    if (value !== undefined)
    {
        value |= 0;
        if (value >= 0)
            return value;
    }
    return defaultValue;
}

const { abs, min } = Math;

export default
Object.defineProperties
(
    Pencilfloor,
    {
        DEFAULT_HEIGHT:         { value: DEFAULT_HEIGHT },
        DEFAULT_INSTANT_RATE:   { value: DEFAULT_INSTANT_RATE },
        DEFAULT_PENCIL_SIZE:    { value: DEFAULT_PENCIL_SIZE },
        DEFAULT_QUICKNESS:      { value: DEFAULT_QUICKNESS },
        DEFAULT_WIDTH:          { value: DEFAULT_WIDTH },
        create:                 { value: create, writable: true, configurable: true },
        defaultArrangePencils:  { value: defaultArrangePencils },
    }
);
