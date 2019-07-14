import Pencilfloor from '../lib/pencilfloor.js';

document.addEventListener
(
    'DOMContentLoaded',
    () =>
    {
        document.body.appendChild(Pencilfloor.create({ width: 1125, height: 525, pencilSize: 25 }))
        .play();
    },
);
