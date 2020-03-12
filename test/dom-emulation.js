/* eslint-env node */

import 'canvas';
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
            node = node.parentNode;
            node = node.host || node;
            if (!node)
                return false;
        }
        if (node.hidden)
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
    if (!candidate.hidden)
    {
        animatedElements.push(candidate);
        for (const child of candidate.children)
            traverseCandidate(child, animatedElements);
        if (candidate instanceof HTMLIFrameElement)
            traverseCandidate(candidate.contentDocument.documentElement, animatedElements);
        const { shadowRoot } = candidate;
        if (shadowRoot)
        {
            for (const child of shadowRoot.children)
                traverseCandidate(child, animatedElements);
        }
    }
}

const candidateSet = new Set();
let candidateAll = false;

const { window } = new jsdom.JSDOM('', { pretendToBeVisual: true });
{
    function setHiddentAndCandidateForAnimationstart(value)
    {
        value = Boolean(value);
        setHidden.call(this, value);
        if (!value)
            candidateAllForAnimationstart();
    }

    const { prototype } = window.HTMLElement;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, 'hidden');
    const setHidden = descriptor.set;
    descriptor.set = setHiddentAndCandidateForAnimationstart;
    Object.defineProperty(prototype, 'hidden', descriptor);
}
const { Element, Event, HTMLIFrameElement, Node, top } = window;
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
    const list = this.isConnected && areAncestorsDisplayed(this) && !this.hidden ? [{ }] : [];
    return list;
};
Object.setPrototypeOf(global, window);
