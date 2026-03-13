// Development proxy to add required headers for FFmpeg.wasm
// FFmpeg.wasm requires SharedArrayBuffer which needs these headers
module.exports = function(app) {
  app.use(function(req, res, next) {
    // Skip WebSocket upgrade requests — setting COEP on an HTTP 101 upgrade
    // response causes browsers to reject the HMR WebSocket connection.
    if (req.headers.upgrade && req.headers.upgrade.toLowerCase() === 'websocket') {
      return next();
    }
    // Required for SharedArrayBuffer support (FFmpeg.wasm dependency)
    res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    next();
  });
};
