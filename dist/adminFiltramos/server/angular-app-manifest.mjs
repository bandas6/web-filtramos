
export default {
  bootstrap: () => import('./main.server.mjs').then(m => m.default),
  inlineCriticalCss: true,
  baseHref: '/',
  locale: undefined,
  routes: [
  {
    "renderMode": 2,
    "redirectTo": "/pages",
    "route": "/"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-B5M7FGXM.js"
    ],
    "route": "/pages"
  },
  {
    "renderMode": 2,
    "preload": [
      "chunk-B5M7FGXM.js"
    ],
    "route": "/pages/catalogo-admin"
  }
],
  entryPointToBrowserMapping: undefined,
  assets: {
    'index.csr.html': {size: 5083, hash: 'aa3a09ba0120c9ead0d38e36350366ac998ff8fb850be6c9d98205ef4a252890', text: () => import('./assets-chunks/index_csr_html.mjs').then(m => m.default)},
    'index.server.html': {size: 1055, hash: '92c078cbc6fd08418762bf4bc07f653e5d83f35e27c9f3f19f8aa6543895ac3c', text: () => import('./assets-chunks/index_server_html.mjs').then(m => m.default)},
    'pages/index.html': {size: 0, hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855', text: () => import('./assets-chunks/pages_index_html.mjs').then(m => m.default)},
    'pages/catalogo-admin/index.html': {size: 35726, hash: '165d2321286816cff156e779443dcceae4b073a7342dec1d26b4fb8eb953fc98', text: () => import('./assets-chunks/pages_catalogo-admin_index_html.mjs').then(m => m.default)},
    'styles-BVJQD57C.css': {size: 230873, hash: 'YU+im7r2LDs', text: () => import('./assets-chunks/styles-BVJQD57C_css.mjs').then(m => m.default)}
  },
};
