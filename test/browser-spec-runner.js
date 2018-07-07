/* eslint-env browser, mocha */

mocha.setup({ globals: ['$0', '$1', '$2', '$3', '$4'], ignoreLeaks: false, ui: 'bdd' });
addEventListener('load', () => mocha.run());
