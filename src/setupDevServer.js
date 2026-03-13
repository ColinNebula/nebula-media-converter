// Custom error overlay configuration to filter React DevTools errors
// This prevents annoying errors from showing up during development

module.exports = function setupDevServer(devServer) {
  if (!devServer) {
    return;
  }

  const original = devServer.addMiddleware;
  
  devServer.addMiddleware = function (middleware) {
    original.call(this, middleware);
  };

  // Filter errors before they reach the overlay
  const originalOnError = devServer.compiler.hooks.done;
  
  devServer.compiler.hooks.done.tap('FilterDevToolsErrors', (stats) => {
    if (stats.hasErrors()) {
      const errors = stats.compilation.errors;
      
      // Filter out React DevTools and extension-related errors
      stats.compilation.errors = errors.filter((error) => {
        const errorMessage = error.message || '';
        
        // Skip React DevTools errors
        if (
          errorMessage.includes('addObjectDiffToProperties') ||
          errorMessage.includes('logComponentRender') ||
          errorMessage.includes('Should not already be working') ||
          errorMessage.includes('commitPassiveMountOnFiber') ||
          errorMessage.includes('performWorkOnRoot') ||
          errorMessage.includes('toString')
        ) {
          return false;
        }
        
        return true;
      });
    }
    
    if (stats.hasWarnings()) {
      const warnings = stats.compilation.warnings;
      
      // Filter out React DevTools warnings
      stats.compilation.warnings = warnings.filter((warning) => {
        const warningMessage = warning.message || '';
        
        if (
          warningMessage.includes('addObjectDiffToProperties') ||
          warningMessage.includes('logComponentRender')
        ) {
          return false;
        }
        
        return true;
      });
    }
  });
  
  return devServer;
};
