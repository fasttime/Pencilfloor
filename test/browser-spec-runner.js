/* eslint-env browser, mocha */

mocha.setup({ checkLeaks: true, globals: ['$0', '$1', '$2', '$3', '$4'], ui: 'bdd' });
addEventListener('load', () => mocha.run());
