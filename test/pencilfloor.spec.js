/* eslint-env browser, mocha */
/* global chai */

import Pencilfloor from '../lib/pencilfloor.js';

const { assert } = chai;

function captureInstant(pencilfloor)
{
    const promise =
    new Promise
    (
        resolve =>
        {
            function callback()
            {
                if (animationFramesLeft--)
                    requestAnimationFrame(callback);
                else
                    resolve(null);
            }

            let animationFramesLeft = 4;
            pencilfloor.addEventListener
            (
                'instant',
                () =>
                {
                    const { instant, pencils } = pencilfloor;
                    resolve({ instant, pencils });
                },
                { once: true },
            );
            callback();
        },
    );
    return promise;
}

function createElement(tagName)
{
    const element = document.body.appendChild(document.createElement(tagName));
    const { style } = element;
    style.left = '-524288px';
    style.position = 'fixed';
    style.visibility = 'hidden';
    return element;
}

function createInteractiveIframe()
{
    const iframe = createElement('IFRAME');
    if (iframe.contentDocument.readyState !== 'uninitialized')
        return iframe;
    const executor = resolve => setTimeout(() => resolve(iframe));
    const promise = new Promise(executor);
    return promise;
}

const getBase = pencilfloor => pencilfloor.shadowRoot.querySelector('SPAN');

function getOverlayIcon(pencilfloor)
{
    const { lastChild } = getBase(pencilfloor);
    if (!(lastChild instanceof SVGElement))
        return null;
    const d = lastChild.querySelector('path').getAttributeNS(null, 'd');
    lastChild.type =
    {
        __proto__:                                              null,
        'M76,50L32,75V25Z':                                     'play',
        'M75,75H55V25H75ZM45,75H25V25H45Z':                     'pause',
        'M 76 50 L 32 75 V 25 Z':                               'play', // Edge
        'M 75 75 H 55 V 25 H 75 Z M 45 75 H 25 V 25 H 45 Z':    'pause', // Edge
    }
    [d];
    return lastChild;
}

function isOffsetParentSupported()
{
    const div = document.body.appendChild(document.createElement('DIV'));
    const supported = Boolean(div.offsetParent);
    div.remove();
    return supported;
}

const maybeDescribe = (condition, ...args) => (condition ? describe : describe.skip)(...args);

const maybeIt = (condition, ...args) => (condition ? it : it.skip)(...args);

const simulateKeydown =
pencilfloor => getBase(pencilfloor).dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));

const simulateMousedown =
pencilfloor => getBase(pencilfloor).dispatchEvent(new MouseEvent('mousedown'));

function withContainer(...args)
{
    const [createContainer, asyncFn] =
    args.length > 1 ? args : [() => createElement('DIV'), ...args];

    async function containerFn()
    {
        const container = await createContainer();
        try
        {
            const result = await asyncFn(container);
            return result;
        }
        finally
        {
            container.remove();
        }
    }

    return containerFn;
}

{
    const { Assertion, util: { eql, expectTypes, objDisplay } } = chai;

    function captureEvent(fn, pencilfloor, evtType)
    {
        let evt = null;
        pencilfloor.addEventListener
        (
            evtType,
            evtFired =>
            {
                evt = evtFired;
            },
            { once: true },
        );
        fn();
        return evt;
    }

    assert.doesNotFireEvent =
    (fn, pencilfloor, evtType, msg) =>
    {
        new Assertion(undefined, msg, assert.doesNotFireEvent, true)
        .assert(!captureEvent(fn, pencilfloor, evtType), `${evtType} event not expected but fired`);
    };

    assert.doesNotFireInstantEvent =
    async (pencilfloor, msg) =>
    {
        new Assertion(undefined, msg)
        .assert(!await captureInstant(pencilfloor), 'instant event not expected but fired');
    };

    assert.firesEvent =
    (fn, pencilfloor, evtType, msg) =>
    {
        new Assertion(undefined, msg, assert.firesEvent, true)
        .assert(captureEvent(fn, pencilfloor, evtType), `${evtType} event expected but not fired`);
    };

    assert.firesInstantEvent =
    async (pencilfloor, msg) =>
    {
        new Assertion(undefined, msg)
        .assert(await captureInstant(pencilfloor), 'instant event expected but not fired');
    };

    assert.isNotConstructible =
    (obj, msg) =>
    {
        const assertion = new Assertion(obj, msg, assert.isNotConstructible, true);
        expectTypes(assertion, ['function']);
        let error;
        try
        {
            new obj(); // eslint-disable-line new-cap
        }
        catch (errorCaught)
        {
            error = errorCaught;
        }
        assertion.assert(error instanceof TypeError, 'expected #{this} not to be a constructor');
    };

    assert.sameValue =
    (actual, expected, msg) =>
    {
        new Assertion(actual, msg, assert.sameValue, true)
        .assert
        (Object.is(actual, expected), 'expected #{act} to equal #{exp}', undefined, expected);
    };

    assert.setterSets =
    (obj, propName, value, expected = value, msg) =>
    {
        obj[propName] = value;
        const actual = obj[propName];
        new Assertion(undefined, msg, assert.setterSets, true)
        .assert
        (
            Object.is(actual, expected),
            `attempting to set property ${String(propName)} to ${objDisplay(value)} unexpectedly ` +
            'set its value to #{act} instead of #{exp}',
            undefined,
            expected,
            actual,
        );
    };

    assert.setterThrows =
    (obj, propName, value, errorType, msg) =>
    {
        let error;
        const oldValue = obj[propName];
        try
        {
            obj[propName] = value;
        }
        catch (errorCaught)
        {
            error = errorCaught;
        }
        const assertion = new Assertion(undefined, msg, assert.setterThrows, true);
        const subject = `attempting to set property ${String(propName)} to ${objDisplay(value)}`;
        const newValue = obj[propName];
        assertion
        .assert
        (
            eql(newValue, oldValue),
            `${subject} unexpectedly changed its value from #{exp} to #{act}`,
            undefined,
            oldValue,
            newValue,
        );
        if (error instanceof errorType)
            return;
        const actualMsg =
        error === undefined ? 'no error was thrown' : `${objDisplay(error)} was thrown`;
        assertion.assert
        (false, `${subject} was expected to throw a ${errorType.name}, but ${actualMsg}`);
    };
}

describe
(
    'Pencilfloor',
    () =>
    {
        it
        (
            'default value properties',
            () =>
            {
                function test(propName, value)
                {
                    const actual = Object.getOwnPropertyDescriptor(Pencilfloor, propName);
                    const expected =
                    { value, writable: false, enumerable: false, configurable: false };
                    assert.deepStrictEqual(actual, expected);
                }

                test('DEFAULT_HEIGHT', 150);
                test('DEFAULT_INSTANT_RATE', 0.5);
                test('DEFAULT_PENCIL_SIZE', 5);
                test('DEFAULT_QUICKNESS', 0.025);
                test('DEFAULT_WIDTH', 300);
            },
        );

        describe
        (
            'defaultArrangePencils',
            () =>
            {
                it
                (
                    'has expected properties',
                    () =>
                    {
                        const { defaultArrangePencils } = Pencilfloor;
                        assert.include
                        (defaultArrangePencils, { length: 1, name: 'defaultArrangePencils' });
                        assert.isNotConstructible(defaultArrangePencils);
                    },
                );
                it
                (
                    'returns an iterable of pencils',
                    () =>
                    {
                        const distance =
                        (pencil1, pencil2) =>
                        ((pencil1.x - pencil2.x) ** 2 + (pencil1.y - pencil2.y) ** 2) ** 0.5;
                        const rect = { minX: -4, maxX: 4, minY: -4, maxY: 4 };
                        const pencils = [...Pencilfloor.defaultArrangePencils(rect)];
                        assert.lengthOf(pencils, 3);
                        for (const pencil of pencils)
                        {
                            const { color, x, y } = pencil;
                            assert.isAtLeast(x, -4);
                            assert.isAtMost(x, 4);
                            assert.isAtLeast(y, -4);
                            assert.isAtMost(y, 4);
                            assert.isString(color);
                        }
                        assert.closeTo(distance(pencils[0], pencils[1]), 4 * 3 ** 0.5, 1e-14);
                        assert.closeTo(distance(pencils[1], pencils[2]), 4 * 3 ** 0.5, 1e-14);
                        assert.closeTo(distance(pencils[2], pencils[0]), 4 * 3 ** 0.5, 1e-14);
                    },
                );
                it
                (
                    'returns an empty iterable',
                    () =>
                    {
                        const testEmptyArrangement =
                        rect => assert.isEmpty([...Pencilfloor.defaultArrangePencils(rect)]);
                        testEmptyArrangement({ minX: -3.9, maxX: 10, minY: -10, maxY: 10 });
                        testEmptyArrangement({ minX: NaN, maxX: 10, minY: -10, maxY: 10 });
                        testEmptyArrangement({ minX: -10, maxX: 3.9, minY: -10, maxY: 10 });
                        testEmptyArrangement({ minX: -10, maxX: NaN, minY: -10, maxY: 10 });
                        testEmptyArrangement({ minX: -10, maxX: 10, minY: -3.9, maxY: 10 });
                        testEmptyArrangement({ minX: -10, maxX: 10, minY: NaN, maxY: 10 });
                        testEmptyArrangement({ minX: -10, maxX: 10, minY: -10, maxY: 3.9 });
                        testEmptyArrangement({ minX: -10, maxX: 10, minY: -10, maxY: NaN });
                    },
                );
            },
        );

        describe
        (
            'height',
            () =>
            {
                function testHeight(initParams, expected)
                {
                    const pencilfloor = document.createElement('HTML-PENCILFLOOR').init(initParams);
                    const message = `.init(${JSON.stringify(initParams)}).height`;
                    assert.sameValue(pencilfloor.height, expected, message);
                }

                it
                (
                    'is read-only',
                    () =>
                    assert.setterThrows
                    (document.createElement('HTML-PENCILFLOOR'), 'height', 0, TypeError),
                );
                it
                (
                    'is DEFAULT_HEIGHT by default',
                    () =>
                    {
                        const { DEFAULT_HEIGHT } = Pencilfloor;
                        testHeight(undefined, DEFAULT_HEIGHT);
                        testHeight({ height: -1 }, DEFAULT_HEIGHT);
                        testHeight({ height: 0x100000000 - 1 }, DEFAULT_HEIGHT);
                    },
                );
                it
                (
                    'is converted into a 32-bit positive integer',
                    () =>
                    {
                        testHeight({ height: '42.9' }, 42);
                        testHeight({ height: 0x100000000 + 43 }, 43);
                        testHeight({ height: NaN }, 0);
                        testHeight({ height: Infinity }, 0);
                    },
                );
            },
        );

        describe
        (
            'init',
            () =>
            {
                it
                (
                    'has expected properties',
                    () =>
                    {
                        const { init } = Pencilfloor.prototype;
                        assert.include(init, { length: 1, name: 'init' });
                        assert.isNotConstructible(init);
                    },
                );
                it
                (
                    'works',
                    () =>
                    {
                        const pencilfloor = document.createElement('HTML-PENCILFLOOR');
                        pencilfloor.play();
                        assert.doesNotFireEvent(() => pencilfloor.init(), pencilfloor, 'pause');
                        assert.isTrue(pencilfloor.paused);
                        assert.isNull(getOverlayIcon(pencilfloor));
                    },
                );

                describe
                (
                    'pencils',
                    () =>
                    {
                        it
                        (
                            'must lie within the allowed ranges',
                            () =>
                            {
                                function testPencilOutOfRange(x, y, coordinate)
                                {
                                    assert.throws
                                    (
                                        () =>
                                        document
                                        .createElement('HTML-PENCILFLOOR')
                                        .init({ pencils: [{ x, y }] }),
                                        `Pencil ${coordinate}-position `,
                                    );
                                }

                                testPencilOutOfRange(NaN, 0, 'X');
                                testPencilOutOfRange(100, 0, 'X');
                                testPencilOutOfRange(-100, 0, 'X');
                                testPencilOutOfRange(0, NaN, 'Y');
                                testPencilOutOfRange(0, 100, 'Y');
                                testPencilOutOfRange(0, -100, 'Y');
                            },
                        );
                        it
                        (
                            'cannot overlap',
                            () =>
                            {
                                assert.throws
                                (
                                    () =>
                                    document
                                    .createElement('HTML-PENCILFLOOR')
                                    .init({ pencils: [{ x: 0, y: 0 }, { x: 0.5, y: 0.5 }] }),
                                    /^Pencils .* and .* overlap/,
                                );
                            },
                        );
                        it
                        (
                            'cannot be a defined primitive',
                            () =>
                            {
                                assert.throws
                                (
                                    () =>
                                    document.createElement('HTML-PENCILFLOOR').init({ pencils: 4 }),
                                    TypeError,
                                    RegExp
                                    (
                                        '^Parameter "pencils" must be an iterable or a function ' +
                                        'returning an iterable$',
                                    ),
                                );
                            },
                        );
                    },
                );
            },
        );

        describe
        (
            'instant',
            () =>
            {
                it
                (
                    'is read-only',
                    () =>
                    assert.setterThrows
                    (document.createElement('HTML-PENCILFLOOR'), 'instant', 0, TypeError),
                );
                it
                (
                    'is updated every instant',
                    withContainer
                    (
                        async container =>
                        {
                            const pencilfloor =
                            container.appendChild(document.createElement('HTML-PENCILFLOOR'));
                            pencilfloor.play();
                            assert.strictEqual((await captureInstant(pencilfloor)).instant, 1);
                        },
                    ),
                );
            },
        );

        it
        (
            'instanceof',
            () => assert.instanceOf(document.createElement('HTML-PENCILFLOOR'), Pencilfloor),
        );

        it
        (
            'instantRate',
            () =>
            {
                const pencilfloor = document.createElement('HTML-PENCILFLOOR');
                assert.sameValue(pencilfloor.instantRate, Pencilfloor.DEFAULT_INSTANT_RATE);
                assert.setterThrows(pencilfloor, 'instantRate', -Number.MIN_VALUE, RangeError);
                assert.setterThrows(pencilfloor, 'instantRate', 1 + Number.EPSILON, RangeError);
                assert.setterThrows(pencilfloor, 'instantRate', Infinity, RangeError);
                assert.setterThrows(pencilfloor, 'instantRate', NaN, RangeError);
                assert.setterThrows(pencilfloor, 'instantRate', undefined, RangeError);
                assert.setterThrows(pencilfloor, 'instantRate', 'foo', RangeError);
                assert.setterThrows(pencilfloor, 'instantRate', { }, RangeError);
                assert.setterSets(pencilfloor, 'instantRate', 0);
                assert.setterSets(pencilfloor, 'instantRate', -0, 0);
                assert.setterSets(pencilfloor, 'instantRate', 1);
                assert.setterSets(pencilfloor, 'instantRate', Math.LOG10E);
                assert.setterSets(pencilfloor, 'instantRate', '.123', 0.123);
            },
        );

        describe
        (
            'interactive',
            () =>
            {
                it
                (
                    'is writable',
                    () =>
                    {
                        const pencilfloor = document.createElement('HTML-PENCILFLOOR');
                        assert.isFalse(pencilfloor.interactive);
                        assert.setterSets(pencilfloor, 'interactive', true);
                        assert.setterSets(pencilfloor, 'interactive', false);
                        assert.setterSets(pencilfloor, 'interactive', [], true);
                        assert.setterSets(pencilfloor, 'interactive', 0, false);
                        assert.setterSets(pencilfloor, 'interactive', Symbol(), true);
                        assert.setterSets(pencilfloor, 'interactive', undefined, false);
                    },
                );
                it
                (
                    'does not change on init',
                    () =>
                    {
                        const pencilfloor = document.createElement('HTML-PENCILFLOOR');
                        pencilfloor.interactive = true;
                        pencilfloor.init();
                        assert.isTrue(pencilfloor.interactive);
                    },
                );
            },
        );

        describe
        (
            'pause',
            () =>
            {
                it
                (
                    'has expected properties',
                    () =>
                    {
                        const { pause } = document.createElement('HTML-PENCILFLOOR');
                        assert.include(pause, { length: 0, name: 'pause' });
                        assert.isNotConstructible(pause);
                    },
                );
                it
                (
                    'works',
                    () =>
                    {
                        const pencilfloor = document.createElement('HTML-PENCILFLOOR');
                        pencilfloor.interactive = true;
                        simulateKeydown(pencilfloor);
                        assert.firesEvent(() => pencilfloor.pause(), pencilfloor, 'pause');
                        assert.isTrue(pencilfloor.paused);
                        assert.isNull(getOverlayIcon(pencilfloor));
                    },
                );
                it
                (
                    'does nothing if already paused',
                    () =>
                    {
                        const pencilfloor = document.createElement('HTML-PENCILFLOOR');
                        pencilfloor.interactive = true;
                        pencilfloor.play();
                        simulateKeydown(pencilfloor);
                        assert.doesNotFireEvent(() => pencilfloor.pause(), pencilfloor, 'pause');
                        assert.isTrue(pencilfloor.paused);
                        assert.isNotNull(getOverlayIcon(pencilfloor));
                    },
                );
            },
        );

        it
        (
            'paused',
            () =>
            {
                const pencilfloor = document.createElement('HTML-PENCILFLOOR');
                assert.setterThrows(pencilfloor, 'paused', false, TypeError);
            },
        );

        describe
        (
            'pencilSize',
            () =>
            {
                function testPencilSize(initParams, expected)
                {
                    const pencilfloor =
                    document.createElement('HTML-PENCILFLOOR').init(initParams);
                    const message = `.init(${JSON.stringify(initParams)}).pencilSize`;
                    assert.sameValue(pencilfloor.pencilSize, expected, message);
                }

                it
                (
                    'is read-only',
                    () =>
                    assert.setterThrows
                    (document.createElement('HTML-PENCILFLOOR'), 'pencilSize', 0, TypeError),
                );
                it
                (
                    'is DEFAULT_PENCIL_SIZE by default',
                    () =>
                    {
                        const { DEFAULT_PENCIL_SIZE } = Pencilfloor;
                        testPencilSize(undefined, DEFAULT_PENCIL_SIZE);
                        testPencilSize({ pencilSize: NaN }, DEFAULT_PENCIL_SIZE);
                        testPencilSize({ pencilSize: 'foo' }, DEFAULT_PENCIL_SIZE);
                    },
                );
                it
                (
                    'is not negative',
                    () =>
                    {
                        testPencilSize({ pencilSize: -42 }, 0);
                        testPencilSize({ pencilSize: -0 }, 0);
                        testPencilSize({ pencilSize: -Infinity }, 0);
                    },
                );
                it
                (
                    'is not larger than half the width',
                    () =>
                    {
                        testPencilSize({ pencilSize: Infinity, width: 99 }, 49.5);
                        testPencilSize({ width: 1 }, 0.5);
                        testPencilSize({ width: 0 }, 0);
                    },
                );
                it
                (
                    'is not larger than half the height',
                    () =>
                    {
                        testPencilSize({ pencilSize: Infinity, height: 99 }, 49.5);
                        testPencilSize({ height: 1 }, 0.5);
                        testPencilSize({ height: 0 }, 0);
                    },
                );
            },
        );

        describe
        (
            'pencils',
            () =>
            {
                it
                (
                    'is read-only',
                    () =>
                    assert.setterThrows
                    (document.createElement('HTML-PENCILFLOOR'), 'pencils', [], TypeError),
                );
                it
                (
                    'gets new objects on every access',
                    () =>
                    {
                        const pencilfloor = document.createElement('HTML-PENCILFLOOR');
                        const pencils1 = pencilfloor.pencils;
                        const pencils2 = pencilfloor.pencils;
                        assert
                        (
                            new Set([...pencils1, ...pencils2]).size ===
                            pencils1.length + pencils2.length,
                            'expected arrays to be disjoint',
                        );
                    },
                );
                it
                (
                    'position is updated every instant',
                    withContainer
                    (
                        async container =>
                        {
                            const initParams =
                            {
                                pencils:
                                [
                                    { x: 1 / 4 * (1 + Number.EPSILON), y: 3 ** 0.5 / 4 },
                                    { x: -1 / 4 * (1 + Number.EPSILON), y: -(3 ** 0.5) / 4 },
                                ],
                                width: 50,
                                height: 50,
                            };
                            const pencilfloor =
                            document.createElement('HTML-PENCILFLOOR').init(initParams);
                            container.appendChild(pencilfloor);
                            pencilfloor.quickness = 1;
                            pencilfloor.play();
                            {
                                const [pencil0, pencil1] =
                                (await captureInstant(pencilfloor)).pencils;
                                assert.closeTo(pencil0.x, 3 / 4, 1e-15);
                                assert.closeTo(pencil0.y, 3 / 4 * 3 ** 0.5, 1e-15);
                                assert.closeTo(pencil1.x, -3 / 4, 1e-15);
                                assert.closeTo(pencil1.y, -3 / 4 * 3 ** 0.5, 1e-15);
                            }
                            {
                                const [pencil0, pencil1] =
                                (await captureInstant(pencilfloor)).pencils;
                                assert.isBelow(pencil0.x, 5);
                                assert.isBelow(pencil0.y, 5);
                                assert.isAbove(pencil1.x, -5);
                                assert.isAbove(pencil1.y, -5);
                            }
                        },
                    ),
                );
                it
                (
                    'have default colors',
                    () =>
                    {
                        assert.deepEqual
                        (
                            document
                            .createElement('HTML-PENCILFLOOR')
                            .pencils.map(({ color }) => color),
                            ['rgb(255, 128, 0)', 'rgb(0, 255, 0)', 'rgb(128, 0, 255)'],
                        );
                    },
                );
                it
                (
                    'have no alpha channel',
                    () =>
                    {
                        const initParams =
                        {
                            pencils:
                            [
                                { color: 'rgba(255,0,0,0.5)', x: 0, y: 0 },
                                { color: 'transparent', x: 1, y: 0 },
                                { color: 'hsla(120,100%,50%,0.023529411)', x: 2, y: 0 },
                            ],
                        };
                        const { pencils } =
                        document.createElement('HTML-PENCILFLOOR').init(initParams);
                        assert.equal(pencils[0].color, 'rgb(255, 0, 0)');
                        assert.equal(pencils[1].color, 'rgb(0, 0, 0)');
                        assert.equal(pencils[2].color, 'rgb(0, 255, 0)');
                    },
                );
            },
        );

        describe
        (
            'play',
            () =>
            {
                it
                (
                    'has expected properties',
                    () =>
                    {
                        const { play } = document.createElement('HTML-PENCILFLOOR');
                        assert.include(play, { length: 0, name: 'play' });
                        assert.isNotConstructible(play);
                    },
                );
                it
                (
                    'works',
                    () =>
                    {
                        const pencilfloor = document.createElement('HTML-PENCILFLOOR');
                        pencilfloor.interactive = true;
                        pencilfloor.play();
                        simulateKeydown(pencilfloor);
                        assert.firesEvent(() => pencilfloor.play(), pencilfloor, 'play');
                        assert.isFalse(pencilfloor.paused);
                        assert.isNull(getOverlayIcon(pencilfloor));
                    },
                );
                it
                (
                    'does nothing if already playing',
                    () =>
                    {
                        const pencilfloor = document.createElement('HTML-PENCILFLOOR');
                        pencilfloor.interactive = true;
                        simulateKeydown(pencilfloor);
                        assert.doesNotFireEvent(() => pencilfloor.play(), pencilfloor, 'play');
                        assert.isFalse(pencilfloor.paused);
                        assert.isNotNull(getOverlayIcon(pencilfloor));
                    },
                );
                it
                (
                    'does nothing if there are no pecils',
                    () =>
                    {
                        const pencilfloor =
                        document.createElement('HTML-PENCILFLOOR').init({ pencils: [] });
                        assert.doesNotFireEvent(() => pencilfloor.play(), pencilfloor, 'play');
                        assert.isTrue(pencilfloor.paused);
                    },
                );
                it
                (
                    'does nothing if there is only one pencil',
                    () =>
                    {
                        const pencilfloor =
                        document
                        .createElement('HTML-PENCILFLOOR')
                        .init({ pencils: [{ x: 0, y: 0 }] });
                        assert.doesNotFireEvent(() => pencilfloor.play(), pencilfloor, 'play');
                        assert.isTrue(pencilfloor.paused);
                    },
                );
            },
        );

        it
        (
            'quickness',
            () =>
            {
                const pencilfloor = document.createElement('HTML-PENCILFLOOR');
                assert.sameValue(pencilfloor.quickness, Pencilfloor.DEFAULT_QUICKNESS);
                assert.setterThrows(pencilfloor, 'quickness', -Number.MIN_VALUE, RangeError);
                assert.setterThrows(pencilfloor, 'quickness', 1 + Number.EPSILON, RangeError);
                assert.setterThrows(pencilfloor, 'quickness', Infinity, RangeError);
                assert.setterThrows(pencilfloor, 'quickness', NaN, RangeError);
                assert.setterThrows(pencilfloor, 'quickness', undefined, RangeError);
                assert.setterThrows(pencilfloor, 'quickness', 'foo', RangeError);
                assert.setterThrows(pencilfloor, 'quickness', { }, RangeError);
                assert.setterSets(pencilfloor, 'quickness', 0);
                assert.setterSets(pencilfloor, 'quickness', 1);
                assert.setterSets(pencilfloor, 'quickness', Math.LOG10E);
                assert.setterSets(pencilfloor, 'quickness', -0, 0);
                assert.setterSets(pencilfloor, 'quickness', '.123', 0.123);
            },
        );

        describe
        (
            'width',
            () =>
            {
                function testWidth(initParams, expected)
                {
                    const pencilfloor = document.createElement('HTML-PENCILFLOOR').init(initParams);
                    const message = `.init(${JSON.stringify(initParams)}).width`;
                    assert.sameValue(pencilfloor.width, expected, message);
                }

                it
                (
                    'is read-only',
                    () =>
                    assert.setterThrows
                    (document.createElement('HTML-PENCILFLOOR'), 'width', 0, TypeError),
                );
                it
                (
                    'is DEFAULT_WIDTH by default',
                    () =>
                    {
                        const { DEFAULT_WIDTH } = Pencilfloor;
                        testWidth(undefined, DEFAULT_WIDTH);
                        testWidth({ width: -1 }, DEFAULT_WIDTH);
                        testWidth({ width: 0x100000000 - 1 }, DEFAULT_WIDTH);
                    },
                );
                it
                (
                    'is converted into a 32-bit positive integer',
                    () =>
                    {
                        testWidth({ width: '42.9' }, 42);
                        testWidth({ width: 0x100000000 + 43 }, 43);
                        testWidth({ width: NaN }, 0);
                        testWidth({ width: Infinity }, 0);
                    },
                );
            },
        );

        describe
        (
            'instant event',
            () =>
            {
                it
                (
                    'only fires when a pencilfloor is playing',
                    withContainer
                    (
                        async container =>
                        {
                            const pencilfloor =
                            container.appendChild(document.createElement('HTML-PENCILFLOOR'));
                            await assert.doesNotFireInstantEvent(pencilfloor, 'before play()');
                            pencilfloor.play();
                            await assert.firesInstantEvent(pencilfloor, 'after play()');
                            pencilfloor.pause();
                            await assert.doesNotFireInstantEvent(pencilfloor, 'after pause()');
                        },
                    ),
                );
                it
                (
                    'only fires when a pencilfloor is attached',
                    withContainer
                    (
                        async container =>
                        {
                            const pencilfloor = document.createElement('HTML-PENCILFLOOR');
                            pencilfloor.play();
                            await
                            assert.doesNotFireInstantEvent(pencilfloor, 'before attaching element');
                            container.appendChild(pencilfloor);
                            await assert.firesInstantEvent(pencilfloor, 'after attaching element');
                            pencilfloor.remove();
                            await
                            assert.doesNotFireInstantEvent(pencilfloor, 'after detaching element');
                        },
                    ),
                );
                it
                (
                    'only fires when a pencilfloor is displayed',
                    withContainer
                    (
                        async container =>
                        {
                            const pencilfloor =
                            container.appendChild(document.createElement('HTML-PENCILFLOOR'));
                            pencilfloor.hidden = true;
                            pencilfloor.play();
                            await assert.doesNotFireInstantEvent(pencilfloor, 'before displaying');
                            pencilfloor.hidden = false;
                            await assert.firesInstantEvent(pencilfloor, 'after displaying');
                            pencilfloor.hidden = true;
                            await assert.doesNotFireInstantEvent(pencilfloor, 'after undisplaying');
                        },
                    ),
                );
                it
                (
                    'only fires when DOM ancestors are displayed',
                    withContainer
                    (
                        async container =>
                        {
                            container.hidden = true;
                            const pencilfloor =
                            container.appendChild(document.createElement('HTML-PENCILFLOOR'));
                            pencilfloor.play();
                            await
                            assert.doesNotFireInstantEvent
                            (pencilfloor, 'before displaying ancestors');
                            container.hidden = false;
                            await
                            assert.firesInstantEvent(pencilfloor, 'after displaying ancestors');
                            container.hidden = true;
                            await
                            assert.doesNotFireInstantEvent
                            (pencilfloor, 'after undisplaying ancestors');
                        },
                    ),
                );
                it
                (
                    'is not fired when a pencilfloor is detached prematurely',
                    withContainer
                    (
                        async container =>
                        {
                            const pencilfloor = document.createElement('HTML-PENCILFLOOR');
                            pencilfloor.play();
                            container.appendChild(pencilfloor);
                            getBase(pencilfloor)
                            .addEventListener('animationstart', () => pencilfloor.remove(), true);
                            await assert.doesNotFireInstantEvent(pencilfloor);
                        },
                    ),
                );
                it
                (
                    'is not fired when instantRate is 0',
                    withContainer
                    (
                        async container =>
                        {
                            const pencilfloor =
                            container.appendChild(document.createElement('HTML-PENCILFLOOR'));
                            pencilfloor.instantRate = 0;
                            pencilfloor.play();
                            await assert.doesNotFireInstantEvent(pencilfloor);
                        },
                    ),
                );
                it
                (
                    'is fired inside an iframe',
                    withContainer
                    (
                        createInteractiveIframe,
                        async iframe =>
                        {
                            const pencilfloor = document.createElement('HTML-PENCILFLOOR');
                            iframe.contentDocument.body.appendChild(pencilfloor);
                            pencilfloor.play();
                            await assert.firesInstantEvent(pencilfloor);
                        },
                    ),
                );
                it
                (
                    'is not fired inside a detached iframe',
                    withContainer
                    (
                        createInteractiveIframe,
                        async iframe =>
                        {
                            const pencilfloor = document.createElement('HTML-PENCILFLOOR');
                            iframe.contentDocument.body.appendChild(pencilfloor);
                            iframe.remove();
                            pencilfloor.play();
                            await assert.doesNotFireInstantEvent(pencilfloor);
                        },
                    ),
                );
                maybeIt
                (
                    (() =>
                    {
                        const iframe = document.body.appendChild(document.createElement('IFRAME'));
                        iframe.hidden = true;
                        const undisplayed =
                        !iframe.contentDocument.documentElement.getClientRects().length;
                        iframe.remove();
                        return undisplayed;
                    }
                    )(),
                    'is not fired inside an undisplayed iframe',
                    withContainer
                    (
                        createInteractiveIframe,
                        async iframe =>
                        {
                            iframe.hidden = true;
                            const pencilfloor = document.createElement('HTML-PENCILFLOOR');
                            iframe.contentDocument.body.appendChild(pencilfloor);
                            pencilfloor.play();
                            await assert.doesNotFireInstantEvent(pencilfloor);
                        },
                    ),
                );
            },
        );

        maybeDescribe
        (
            isOffsetParentSupported(),
            'size',
            () =>
            {
                function testSize(pencilfloor, expectedWidth, expectedHeight)
                {
                    const canvas = getBase(pencilfloor).querySelector('CANVAS');
                    assert.strictEqual(pencilfloor.offsetWidth, expectedWidth, 'pencilfloor width');
                    assert.strictEqual(canvas.offsetWidth, expectedWidth, 'canvas width');
                    assert.strictEqual
                    (pencilfloor.offsetHeight, expectedHeight, 'pencilfloor height');
                    assert.strictEqual(canvas.offsetHeight, expectedHeight, 'canvas height');
                }

                it
                (
                    'default',
                    withContainer
                    (
                        container =>
                        testSize
                        (
                            container.appendChild(document.createElement('HTML-PENCILFLOOR')),
                            Pencilfloor.DEFAULT_WIDTH,
                            Pencilfloor.DEFAULT_HEIGHT,
                        ),
                    ),
                );
                it
                (
                    'zero',
                    withContainer
                    (
                        container =>
                        testSize
                        (
                            container.appendChild
                            (
                                document
                                .createElement('HTML-PENCILFLOOR')
                                .init({ width: 0, height: 0 }),
                            ),
                            0,
                            0,
                        ),
                    ),
                );
                it
                (
                    'horizontally shrinked',
                    withContainer
                    (
                        container =>
                        {
                            const EXPECTED_WIDTH = Pencilfloor.DEFAULT_WIDTH / 2;

                            const pencilfloor = document.createElement('HTML-PENCILFLOOR');
                            container.appendChild(pencilfloor);
                            pencilfloor.style.width = `${EXPECTED_WIDTH}px`;
                            testSize(pencilfloor, EXPECTED_WIDTH, Pencilfloor.DEFAULT_HEIGHT);
                        },
                    ),
                );
                it
                (
                    'horizontally stretched',
                    withContainer
                    (
                        container =>
                        {
                            const EXPECTED_WIDTH = Pencilfloor.DEFAULT_WIDTH * 2;

                            const pencilfloor = document.createElement('HTML-PENCILFLOOR');
                            container.appendChild(pencilfloor);
                            pencilfloor.style.width = `${EXPECTED_WIDTH}px`;
                            testSize(pencilfloor, EXPECTED_WIDTH, Pencilfloor.DEFAULT_HEIGHT);
                        },
                    ),
                );
                it
                (
                    'vertically shrinked',
                    withContainer
                    (
                        container =>
                        {
                            const EXPECTED_HEIGHT = Pencilfloor.DEFAULT_HEIGHT / 2;

                            const pencilfloor = document.createElement('HTML-PENCILFLOOR');
                            container.appendChild(pencilfloor);
                            pencilfloor.style.height = `${EXPECTED_HEIGHT}px`;
                            testSize(pencilfloor, Pencilfloor.DEFAULT_WIDTH, EXPECTED_HEIGHT);
                        },
                    ),
                );
                it
                (
                    'vertically stretched',
                    withContainer
                    (
                        container =>
                        {
                            const EXPECTED_HEIGHT = Pencilfloor.DEFAULT_HEIGHT * 2;

                            const pencilfloor = document.createElement('HTML-PENCILFLOOR');
                            container.appendChild(pencilfloor);
                            pencilfloor.style.height = `${EXPECTED_HEIGHT}px`;
                            testSize(pencilfloor, Pencilfloor.DEFAULT_WIDTH, EXPECTED_HEIGHT);
                        },
                    ),
                );
            },
        );

        describe
        (
            'left click',
            () =>
            {
                it
                (
                    'toggles from paused to playing',
                    () =>
                    {
                        const pencilfloor = document.createElement('HTML-PENCILFLOOR');
                        pencilfloor.interactive = true;
                        assert.firesEvent
                        (() => simulateMousedown(pencilfloor), pencilfloor, 'play');
                        assert.isFalse(pencilfloor.paused);
                        const icon = getOverlayIcon(pencilfloor);
                        assert.isNotNull(icon);
                        assert.equal(icon.type, 'play');
                    },
                );
                it
                (
                    'toggles from playing to paused',
                    () =>
                    {
                        const pencilfloor = document.createElement('HTML-PENCILFLOOR');
                        pencilfloor.interactive = true;
                        pencilfloor.play();
                        assert.firesEvent
                        (() => simulateMousedown(pencilfloor), pencilfloor, 'pause');
                        assert.isTrue(pencilfloor.paused);
                        const icon = getOverlayIcon(pencilfloor);
                        assert.isNotNull(icon);
                        assert.equal(icon.type, 'pause');
                    },
                );
                it
                (
                    'does not toggle play when not interactive',
                    () =>
                    {
                        const pencilfloor = document.createElement('HTML-PENCILFLOOR');
                        assert.doesNotFireEvent
                        (() => simulateMousedown(pencilfloor), pencilfloor, 'play');
                        assert.isTrue(pencilfloor.paused);
                        assert.isNull(getOverlayIcon(pencilfloor));
                    },
                );
            },
        );

        describe
        (
            'space key',
            () =>
            {
                it
                (
                    'toggles from paused to playing',
                    () =>
                    {
                        const pencilfloor = document.createElement('HTML-PENCILFLOOR');
                        pencilfloor.interactive = true;
                        assert.firesEvent(() => simulateKeydown(pencilfloor), pencilfloor, 'play');
                        assert.isFalse(pencilfloor.paused);
                        const icon = getOverlayIcon(pencilfloor);
                        assert.isNotNull(icon);
                        assert.equal(icon.type, 'play');
                    },
                );
                it
                (
                    'toggles from playing to paused',
                    () =>
                    {
                        const pencilfloor = document.createElement('HTML-PENCILFLOOR');
                        pencilfloor.interactive = true;
                        pencilfloor.play();
                        assert.firesEvent(() => simulateKeydown(pencilfloor), pencilfloor, 'pause');
                        assert.isTrue(pencilfloor.paused);
                        const icon = getOverlayIcon(pencilfloor);
                        assert.isNotNull(icon);
                        assert.equal(icon.type, 'pause');
                    },
                );
                it
                (
                    'does nothing if not interactive',
                    () =>
                    {
                        const pencilfloor = document.createElement('HTML-PENCILFLOOR');
                        assert.doesNotFireEvent
                        (() => simulateKeydown(pencilfloor), pencilfloor, 'play');
                        assert.isTrue(pencilfloor.paused);
                        assert.isNull(getOverlayIcon(pencilfloor));
                    },
                );
                it
                (
                    'does nothing if there are no pencils',
                    () =>
                    {
                        const pencilfloor =
                        document.createElement('HTML-PENCILFLOOR').init({ pencils: [] });
                        pencilfloor.interactive = true;
                        assert.doesNotFireEvent
                        (() => simulateKeydown(pencilfloor), pencilfloor, 'play');
                        assert.isTrue(pencilfloor.paused);
                        assert.isNull(getOverlayIcon(pencilfloor));
                    },
                );
                it
                (
                    'does nothing if there is only one pencil',
                    () =>
                    {
                        const pencilfloor =
                        document
                        .createElement('HTML-PENCILFLOOR')
                        .init({ pencils: [{ x: 0, y: 0 }] });
                        pencilfloor.interactive = true;
                        assert.doesNotFireEvent
                        (() => simulateKeydown(pencilfloor), pencilfloor, 'play');
                        assert.isTrue(pencilfloor.paused);
                        assert.isNull(getOverlayIcon(pencilfloor));
                    },
                );
            },
        );

        maybeDescribe
        (
            isOffsetParentSupported(),
            'overlay icon position',
            () =>
            {
                function testOverlayIconPosition(pencilfloor, expectedSize)
                {
                    simulateMousedown(pencilfloor);
                    const rect = pencilfloor.getBoundingClientRect();
                    assert.include
                    (
                        getOverlayIcon(pencilfloor).getBoundingClientRect(),
                        {
                            width:  expectedSize,
                            height: expectedSize,
                            left:   rect.left + (rect.width - expectedSize) / 2,
                            top:    rect.top + (rect.height - expectedSize) / 2,
                            right:  rect.right - (rect.width - expectedSize) / 2,
                            bottom: rect.bottom - (rect.height - expectedSize) / 2,
                        },
                    );
                }

                it
                (
                    'landscape',
                    withContainer
                    (
                        container =>
                        testOverlayIconPosition
                        (
                            container.appendChild
                            (
                                document
                                .createElement('HTML-PENCILFLOOR')
                                .init({ width: 256, height: 64 }),
                            ),
                            42,
                        ),
                    ),
                );
                it
                (
                    'portrait',
                    withContainer
                    (
                        container =>
                        testOverlayIconPosition
                        (
                            container.appendChild
                            (
                                document
                                .createElement('HTML-PENCILFLOOR')
                                .init({ width: 200, height: 400 }),
                            ),
                            66,
                        ),
                    ),
                );
                it
                (
                    'thin and long',
                    withContainer
                    (
                        container =>
                        testOverlayIconPosition
                        (
                            container.appendChild
                            (
                                document
                                .createElement('HTML-PENCILFLOOR')
                                .init({ width: 50, height: 400 }),
                            ),
                            50,
                        ),
                    ),
                );
                it
                (
                    'wide and short',
                    withContainer
                    (
                        container =>
                        testOverlayIconPosition
                        (
                            container.appendChild
                            (
                                document
                                .createElement('HTML-PENCILFLOOR')
                                .init({ width: 50, height: 400 }),
                            ),
                            50,
                        ),
                    ),
                );
            },
        );
    },
);
