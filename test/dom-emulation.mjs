/* eslint-env node */

import 'canvas-prebuilt';
import jsdom from 'jsdom';

function areAncestorsDisplayed(node)
{
    let { ownerDocument } = node;
    let { documentElement } = ownerDocument;
    for (;;)
    {
        if (node === documentElement)
        {
            node = getDocumentFrame(ownerDocument);
            if (!node)
                return true;
            ({ ownerDocument } = node);
            ({ documentElement } = ownerDocument);
        }
        else
        {
            node = node.parentElement;
            if (!node)
                return false;
        }
        if (getComputedStyle(node).display === 'none')
            return false;
    }
}

function candidateAllForAnimationstart()
{
    if (!candidateAll)
    {
        if (!candidateSet.size)
            setTimeout(processCandidates);
        candidateSet.clear();
        candidateAll = true;
    }
}

function candidateElementForAnimationstart(element)
{
    if (!candidateAll)
    {
        if (!candidateSet.size)
            setTimeout(processCandidates);
        candidateSet.add(element);
    }
}

function getDocumentFrame(document)
{
    const { frameElement } = document.defaultView;
    return frameElement;
}

function isCandidateDescendant(node)
{
    do
    {
        for (const candidate of candidateSet)
        {
            if (candidate !== node && candidate.contains(node))
                return true;
        }
        node = getDocumentFrame(node.ownerDocument);
    }
    while (node);
    return false;
}

function processCandidates()
{
    const animatedElements = [];
    if (candidateAll)
    {
        traverseCandidate(top.document.documentElement, animatedElements);
        candidateAll = false;
    }
    else
    {
        for (const candidate of candidateSet)
        {
            if
            (
                !candidate.isConnected ||
                isCandidateDescendant(candidate) ||
                !areAncestorsDisplayed(candidate)
            )
                candidateSet.delete(candidate);
            else
                traverseCandidate(candidate, animatedElements);
        }
        candidateSet.clear();
    }
    for (const element of animatedElements)
        element.dispatchEvent(new Event('animationstart', { bubbles: true }));
}

function traverseCandidate(candidate, animatedElements)
{
    const computedStyle = getComputedStyle(candidate);
    if (computedStyle.display !== 'none')
    {
        animatedElements.push(candidate);
        for (const child of candidate.children)
            traverseCandidate(child, animatedElements);
        if (candidate instanceof HTMLIFrameElement)
            traverseCandidate(candidate.contentDocument.documentElement, animatedElements);
    }
}

const candidateSet = new Set();
let candidateAll = false;

const { window } = new jsdom.JSDOM('', { pretendToBeVisual: true });
{
    function setDisplayAndCandidateForAnimationstart(value)
    {
        setDisplay.call(this, value);
        if (value !== 'none')
            candidateAllForAnimationstart();
    }

    function setDisplaySetter(set)
    {
        descriptor.set = set;
        Object.defineProperty(prototype, 'display', descriptor);
    }

    const { prototype } = window.CSSStyleDeclaration;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'display');
    const setDisplay = descriptor.set;
    setDisplaySetter(setDisplayAndCandidateForAnimationstart);
    const { getComputedStyle } = window;
    window.getComputedStyle =
    function (...args)
    {
        setDisplaySetter(setDisplay);
        try
        {
            const computedStyle = getComputedStyle.apply(this, args);
            return computedStyle;
        }
        finally
        {
            setDisplaySetter(setDisplayAndCandidateForAnimationstart);
        }
    };
}
const { Element, Event, HTMLIFrameElement, Node, getComputedStyle, top } = window;
{
    const { prototype } = Node;
    const { appendChild } = prototype;
    prototype.appendChild =
    function (child)
    {
        const result = appendChild.call(this, child);
        if (child instanceof Element)
            candidateElementForAnimationstart(child);
        return result;
    };
}
Element.prototype.getClientRects =
function ()
{
    const list =
    this.isConnected && areAncestorsDisplayed(this) && getComputedStyle(this).display !== 'none' ?
    [{ }] :
    [];
    return list;
};
Object.setPrototypeOf(global, window);
