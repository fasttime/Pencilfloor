import '../lib/pencilfloor.js';

document.addEventListener
(
    'DOMContentLoaded',
    () =>
    {
        const pencilfloor = document.querySelector('html-pencilfloor');
        pencilfloor.init({ width: 1125, height: 525, pencilSize: 25 }).play();
    },
);
