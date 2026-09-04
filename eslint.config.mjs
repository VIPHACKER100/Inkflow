/* ESLint flat config — focused on correctness classes (undefined
   identifiers, duplicate declarations, unreachable code) rather than
   style, matching the bug that shipped in v1.6.2. Run: `npm run lint` */

/* Minimal browser + service-worker global maps (kept inline so the
   config has no runtime dependencies). */
const browserGlobals = {
  window: 'readonly', document: 'readonly', navigator: 'readonly', location: 'readonly',
  history: 'readonly', console: 'readonly', localStorage: 'readonly', sessionStorage: 'readonly',
  indexedDB: 'readonly', fetch: 'readonly', Request: 'readonly', Response: 'readonly',
  Headers: 'readonly', URL: 'readonly', URLSearchParams: 'readonly', Blob: 'readonly',
  File: 'readonly', FileReader: 'readonly', FormData: 'readonly', Image: 'readonly',
  Canvas: 'readonly', HTMLCanvasElement: 'readonly', CanvasRenderingContext2D: 'readonly',
  OffscreenCanvas: 'readonly', AudioContext: 'readonly', webkitAudioContext: 'readonly',
  SpeechRecognition: 'readonly', webkitSpeechRecognition: 'readonly',
  requestAnimationFrame: 'readonly', cancelAnimationFrame: 'readonly',
  setTimeout: 'readonly', clearTimeout: 'readonly', setInterval: 'readonly', clearInterval: 'readonly',
  alert: 'readonly', confirm: 'readonly', prompt: 'readonly', atob: 'readonly', btoa: 'readonly',
  structuredClone: 'readonly', getComputedStyle: 'readonly', matchMedia: 'readonly',
  DOMParser: 'readonly', XMLSerializer: 'readonly', MutationObserver: 'readonly',
  ResizeObserver: 'readonly', IntersectionObserver: 'readonly', performance: 'readonly',
  crypto: 'readonly', CustomEvent: 'readonly', Event: 'readonly', EventTarget: 'readonly',
  KeyboardEvent: 'readonly', MouseEvent: 'readonly', PointerEvent: 'readonly',
  Path2D: 'readonly', ImageData: 'readonly', ImageBitmap: 'readonly',
  AbortController: 'readonly', TextEncoder: 'readonly', TextDecoder: 'readonly',
  FontFace: 'readonly', Node: 'readonly', ClipboardItem: 'readonly', screen: 'readonly',
  OpenType: 'readonly', html2canvas: 'readonly', jspdf: 'readonly',
};
/* Everything declared on `window` in classic scripts is also a global. */
browserGlobals.self = 'readonly';

const serviceWorkerGlobals = {
  self: 'readonly', caches: 'readonly', clients: 'readonly', registration: 'readonly',
  fetch: 'readonly', console: 'readonly', Promise: 'readonly', Request: 'readonly',
  Response: 'readonly', URL: 'readonly', skipWaiting: 'readonly', Event: 'readonly',
  ExtendableEvent: 'readonly', FetchEvent: 'readonly', MessageEvent: 'readonly',
};

const nodeGlobals = {
  process: 'readonly', console: 'readonly', Buffer: 'readonly',
  __dirname: 'readonly', __filename: 'readonly',
};

const correctnessRules = {
  'no-undef': 'error',
  'no-redeclare': 'error',
  'no-dupe-keys': 'error',
  'no-dupe-args': 'error',
  'no-dupe-else-if': 'error',
  'no-unreachable': 'error',
  'no-fallthrough': 'error',
  'no-self-assign': 'error',
  'no-constant-binary-expression': 'warn',
  'no-cond-assign': 'warn',
  'no-empty': 'warn',
  'no-unused-expressions': 'warn',
  'no-shadow-restricted-names': 'error',
  'no-var': 'warn',
  'prefer-const': 'warn',
};

export default [
  {
    ignores: ['node_modules/**'],
  },
  {
    files: ['index.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: browserGlobals,
    },
    rules: correctnessRules,
  },
  {
    files: ['sw.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'script',
      globals: serviceWorkerGlobals,
    },
    rules: correctnessRules,
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: nodeGlobals,
    },
    rules: correctnessRules,
  },
];
