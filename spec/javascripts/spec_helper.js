import { Crypto } from '@peculiar/webcrypto';
import chai from 'chai';
import dirtyChai from 'dirty-chai';
import { createDOM, useCleanDOM } from './support/dom';
import { chaiConsoleSpy, useConsoleLogSpy } from './support/console';

chai.use(dirtyChai);
chai.use(chaiConsoleSpy);
global.expect = chai.expect;

// Emulate a DOM, since many modules will assume the presence of these globals exist as a side
// effect of their import (focus-trap, classList.js, etc). A URL is provided as a prerequisite to
// managing history API (pushState, etc).
const dom = createDOM();
global.window = dom.window;
global.window.fetch = () => Promise.reject(new Error('Fetch must be stubbed'));
global.window.crypto = new Crypto(); // In the future (Node >=15), use import('crypto').webcrypto
global.navigator = window.navigator;
global.document = window.document;
global.Document = window.Document;
global.Element = window.Element;
global.getComputedStyle = window.getComputedStyle;
global.self = window;

useCleanDOM();
useConsoleLogSpy();
