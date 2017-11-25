(function ($, utilNamespace) {
  'use strict';

  /**
   * This function finds an url from which drawer file was loaded
   *
   * @function
   * @memberof DrawerJs.util
   * @returns {*}
   */
  utilNamespace.getDrawerFolderUrl = function () {
    // try to find a folder from which this script is included
    var scripts = document.getElementsByTagName("script");
    var drawerJsFilenamePattern = /dist\/(drawer.+\.js)+$/;

    for (var i = 0; i < scripts.length; i++) {
      var s = scripts.item(i);

      if (s.src) {
        var match = s.src.match(drawerJsFilenamePattern);
        if (match) {
          var pathToDrawerFolder = s.src.replace(match[1], '');
          return pathToDrawerFolder;
        }
      }
    }

    return null;
  };

  /**
   * Removes all click events with specified namespace bound to element.
   *
   * @param {jQuery} element
   * @param {String} namespace
   */
  utilNamespace.unbindClick = function (element, namespace) {
    var ns = namespace + 'drawerBindClick';

    $(element).off('click.' + ns);
    $(element).off('touchstart.' + ns);
    $(element).off('touchend.' + ns);
  };

  utilNamespace.bindClick = function (element, namespace, handler) {
    var ns = namespace + 'drawerBindClick';

    $(element).on('click.' + ns, function (event) {
      var elem = this;
      var result = null;

      if (elem.__lastClickTime) {
        var lastClickDiff = Date.now() - elem.__lastClickTime;
        if (lastClickDiff > 500) {
          result = handler.apply(elem, [event]);
          if (result === false) {
            event.stopPropagation();
            event.preventDefault();
            return false;
          }
        } else {
          // seems that we have already triggered this click on touchend event
        }
      } else {
        result = handler.apply(elem, [event]);
        if (result === false) {
          event.stopPropagation();
          event.preventDefault();
          return false;
        }
      }
    });
    $(element).on('touchstart.' + ns, function (event) {
      var elem = this;

      elem.__drawerTouchStartEvent = event;

      // disable click entirely since we do everything with touch events
      $(element).off('click.' + ns);
    });
    $(element).on('touchend.' + ns, function (event) {
      var elem = this;

      if (elem.__drawerTouchStartEvent) {
        var tsDiff = Math.abs(
          elem.__drawerTouchStartEvent.timeStamp - event.timeStamp
        );

        if (tsDiff < 300) {
          elem.__lastClickTime = Date.now();
          var result = handler.apply(elem, [event]);
          if (result === false) {
            event.stopPropagation();
            event.preventDefault();
            return false;
          }
        }
        delete elem.__drawerTouchStartEvent;
      }
    });
  };

  utilNamespace.bindDoubleTap = function (element, namespace,
                                          handler) {
    var timeWindow = 500;
    var positionWindow = 20;

    $(element).on('touchend.' + namespace, function (event) {
      var eventElem = this;
      if (eventElem.__touchEndTime) {
        var diff = Date.now() - eventElem.__touchEndTime;
        var xDiff = Math.abs(eventElem.__touchEndX - event.originalEvent.pageX);
        var yDiff = Math.abs(eventElem.__touchEndY - event.originalEvent.pageY);

        if (diff < timeWindow &&
          xDiff < positionWindow &&
          yDiff < positionWindow) {

          delete eventElem.__touchEndTime;
          delete eventElem.__touchEndX;
          delete eventElem.__touchEndY;
          var result = handler.apply(eventElem, [event]);
          if (result === false) {
            event.stopPropagation();
            event.preventDefault();
            return false;
          }
        } else {
          delete eventElem.__touchEndTime;
          delete eventElem.__touchEndX;
          delete eventElem.__touchEndY;
        }
      } else {
        eventElem.__touchEndTime = Date.now();
        eventElem.__touchEndX = event.originalEvent.pageX;
        eventElem.__touchEndY = event.originalEvent.pageY;
        setTimeout(function () {
          delete eventElem.__touchEndTime;
          delete eventElem.__touchEndX;
          delete eventElem.__touchEndY;
        }, timeWindow);
      }
    });
  };

  utilNamespace.bindLongPress = function (element, namespace,
                                          handler) {
    var logTag = 'drawerBindLongPress';
    var ns = namespace + logTag;

    $(element).on('touchstart.' + ns, function (event) {
      var elem = this;

      elem.__touchStartTime = Date.now();
      elem.__touchStartX = event.originalEvent.pageX;
      elem.__touchStartY = event.originalEvent.pageY;

      if (elem.__longPressCheckTimeout) {
        clearTimeout(elem.__longPressCheckTimeout);
      }

      var cleanHandlers = function () {

        delete elem.__touchStartTime;
        delete elem.__touchStartX;
        delete elem.__touchStartY;

        $(elem).off('touchmove.' + ns);
        $(elem).off('touchend.' + ns);
      };

      $(elem).on('touchmove.' + ns, function (moveEvent) {
        if (elem.__touchStartTime) {
          var xDiff = Math.abs(
            elem.__touchStartX - moveEvent.originalEvent.pageX
          );
          var yDiff = Math.abs(
            elem.__touchStartY - moveEvent.originalEvent.pageY
          );

          if (xDiff > 10 || yDiff > 10) {
            cleanHandlers();
          }
        }
      });

      $(elem).on('touchend.' + ns, function (endEvent) {
        cleanHandlers();
      });

      elem.__longPressCheckTimeout = setTimeout(function () {
        if (elem.__touchStartTime) {
          cleanHandlers();
          var result = handler.apply(elem, [event]);
        }
      }, 1000);

      return true;
    });
  };

  utilNamespace.unbindLongPress = function (element, namespace) {
    var logTag = 'drawerBindLongPress';
    var ns = namespace + logTag;

    $(element).off('touchstart.' + ns);
    $(element).off('touchmove.' + ns);
    $(element).off('touchend.' + ns);
  };

  utilNamespace.mouseDown = function (namespace) {
    return 'mousedown.' + namespace + ' touchstart.' + namespace;
  };

  utilNamespace.mouseMove = function (namespace) {
    return 'mousemove.' + namespace + ' touchmove.' + namespace;
  };

  utilNamespace.mouseUp = function (namespace) {
    return 'mouseup.' + namespace + ' touchend.' + namespace;
  };

  utilNamespace.getTransitionDuration = function (el, with_delay) {
    var style = window.getComputedStyle(el),
      duration = style.webkitTransitionDuration,
      delay = style.webkitTransitionDelay;

    // fix miliseconds vs seconds
    duration = (duration.indexOf("ms") > -1) ?
      parseFloat(duration) : parseFloat(duration) * 1000;
    delay = (delay.indexOf("ms") > -1) ?
      parseFloat(delay) : parseFloat(delay) * 1000;

    if (with_delay) return (duration + delay);

    else return duration;
  };

  utilNamespace.getEventPosition = function (event) {
    if (event.type.indexOf('touch') > -1) {
      event = event.originalEvent;

      if (
        (event.pageX === 0 && event.pageY === 0) ||
        (event.pageX === undefined && event.pageY === undefined) &&
        event.touches.length > 0
      ) {
        return {
          left: event.touches[0].pageX,
          top: event.touches[0].pageY
        };
      }
    }

    return {
      left: event.pageX,
      top: event.pageY
    };
  };

  utilNamespace.isShape = function (fabricObject) {
    var isShape = false;

    if (fabricObject.type &&
      (fabricObject.type == 'line' ||
      fabricObject.type == 'arrow')) {
      isShape = false;
    }
    else if (fabricObject.path) { // free drawing shape
      isShape = false;
    } else {
      isShape = true;
    }

    return isShape;
  };


  utilNamespace.__temporaryCanvas = null;
  utilNamespace.getTemporaryCanvas = function (originalCanvas) {
    if (!utilNamespace.__temporaryCanvas) {
      utilNamespace.__temporaryCanvas = document.createElement('canvas');
    }

    utilNamespace.__temporaryCanvas
      .setAttribute('width', originalCanvas.width);
    utilNamespace.__temporaryCanvas
      .setAttribute('height', originalCanvas.height);

    return utilNamespace.__temporaryCanvas;
  };

  utilNamespace.LastCoordsQueue = function () {
    this.coordsQueue = [];
    this.length = 10;

    this.pushCoords = function (x, y) {
      if (this.coordsQueue.length > this.length) {
        this.coordsQueue =
          this.coordsQueue.slice(this.coordsQueue.length - this.length);
      }

      this.coordsQueue.push({x: x, y: y});
    };

    this.getInterpolatedValues = function () {
      if (this.coordsQueue.length === 0) {
        return [];
      }

      if (this.coordsQueue.length === 1) {
        return [{x: this.coordsQueue[0].x, y: this.coordsQueue[0].y}];
      }

      var interpolatedCoords = [];

      var prevX = this.coordsQueue[this.coordsQueue.length - 2].x;
      var prevY = this.coordsQueue[this.coordsQueue.length - 2].y;

      var currX = this.coordsQueue[this.coordsQueue.length - 1].x;
      var currY = this.coordsQueue[this.coordsQueue.length - 1].y;

      var xDiff = currX - prevX;
      var yDiff = currY - prevY;

      var xDiffAbs = Math.abs(xDiff);
      var yDiffAbs = Math.abs(yDiff);

      var iterations = xDiffAbs > yDiffAbs ? xDiffAbs : yDiffAbs;

      for (var ii = 0; ii < iterations; ii++) {
        interpolatedCoords.push({
          x: prevX + ((xDiff / iterations) * ii),
          y: prevY + ((yDiff / iterations) * ii)
        });
      }

      return interpolatedCoords;
    };
  };

  utilNamespace.setWaiting = function (element, text, cursor) {
    if (!cursor) {
      cursor = 'wait';
    }

    utilNamespace.setOverlayMessage(element, text, cursor);
  };

  utilNamespace.stopWaiting = function (element) {
    utilNamespace.removeOverlayMessage(element);
  };

  /**
   * Adds overlay with a text message to container
   *
   * @param {HTMLElement} element
   * @param {string} text
   * @param {string} cursor
   * @param {string} [actionButtonText] If provided, a button will be shown
   * @param {Function} [actionButtonClickHandler]
   */
  utilNamespace.setOverlayMessage = function (element, text, cursor, actionButtonText,
                                              actionButtonClickHandler) {
    if (!cursor) {
      cursor = 'default';
    }

    var actionButton = actionButtonText ?
      '<div class="action-button">' + actionButtonText + '</div>' :
      '';

    $(element).append(
      '<div class="overlay-message-wrapper">' +
        '<div class="overlay-message">' +
          text +
          actionButton +
        '</div>' +
      '</div>');

    $(element).find('.overlay-message-wrapper').css('cursor', cursor);

    utilNamespace.bindClick(
      $(element).find('.action-button'),
      'overlay-message-click',
      actionButtonClickHandler
    );
  };

  utilNamespace.removeOverlayMessage = function (element) {
    $(element).find('.overlay-message-wrapper').remove();
  };

  /**
   * Performs image resize using Hermite filter.
   *
   * https://github.com/viliusle/Hermite-resize
   *
   * @param canvas
   * @param W width
   * @param H height
   * @param W2 resized width
   * @param H2 resized height
   */
  utilNamespace.resizeImage = function (canvas, W, H, W2, H2) {
    var time1 = Date.now();
    W2 = Math.round(W2);
    H2 = Math.round(H2);
    var img = canvas.getContext("2d").getImageData(0, 0, W, H);
    var img2 = canvas.getContext("2d").getImageData(0, 0, W2, H2);
    var data = img.data;
    var data2 = img2.data;
    var ratio_w = W / W2;
    var ratio_h = H / H2;
    var ratio_w_half = Math.ceil(ratio_w / 2);
    var ratio_h_half = Math.ceil(ratio_h / 2);

    for (var j = 0; j < H2; j++) {
      for (var i = 0; i < W2; i++) {
        var x2 = (i + j * W2) * 4;
        var weight = 0;
        var weights = 0;
        var weights_alpha = 0;
        
        var gx_r = 0, gx_g = 0, gx_b = 0, gx_a = 0;

        var center_y = (j + 0.5) * ratio_h;
        for (var yy = Math.floor(j * ratio_h); yy < (j + 1) * ratio_h; yy++) {
          var dy = Math.abs(center_y - (yy + 0.5)) / ratio_h_half;
          var center_x = (i + 0.5) * ratio_w;
          var w0 = dy * dy; //pre-calc part of w
          for (var xx = Math.floor(i * ratio_w); xx < (i + 1) * ratio_w; xx++) {
            var dx = Math.abs(center_x - (xx + 0.5)) / ratio_w_half;
            var w = Math.sqrt(w0 + dx * dx);
            if (w >= -1 && w <= 1) {
              //hermite filter
              weight = 2 * w * w * w - 3 * w * w + 1;
              if (weight > 0) {
                dx = 4 * (xx + yy * W);
                //alpha
                gx_a += weight * data[dx + 3];
                weights_alpha += weight;
                //colors
                if (data[dx + 3] < 255)
                  weight = weight * data[dx + 3] / 250;
                gx_r += weight * data[dx];
                gx_g += weight * data[dx + 1];
                gx_b += weight * data[dx + 2];
                weights += weight;
              }
            }
          }
        }
        data2[x2] = gx_r / weights;
        data2[x2 + 1] = gx_g / weights;
        data2[x2 + 2] = gx_b / weights;
        data2[x2 + 3] = gx_a / weights_alpha;
      }
    }
    //console.log("hermite = " + (Math.round(Date.now() - time1) / 1000) + " s");
    canvas.getContext("2d").clearRect(0, 0, Math.max(W, W2), Math.max(H, H2));
    canvas.width = W2;
    canvas.height = H2;
    canvas.getContext("2d").putImageData(img2, 0, 0);
  };

}(jQuery, ImagerJs.util));