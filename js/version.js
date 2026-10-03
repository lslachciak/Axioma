(function (exports) {
  'use strict';
  
  const APP_VERSION = 'v1.1.0';
  
  exports.APP_VERSION = APP_VERSION;
  if (typeof window !== 'undefined') {
    window.AXIOMA_VERSION = APP_VERSION;
  }
})(typeof exports !== 'undefined' ? exports : (window.AxiomaVersion = {}));
