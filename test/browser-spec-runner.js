/* eslint-env browser, mocha */

mocha.setup({ ignoreLeaks: false, ui: 'bdd' });
addEventListener('load', () => mocha.run());
