(function ($, pluginsCatalog, util, translations) {
  var MOUSE_DOWN = util.mouseDown('imagerjsRotate');
  var MOUSE_UP = util.mouseUp('imagerjsRotate');
  var MOUSE_MOVE = util.mouseMove('imagerjsRotate');

  /**
   * Rotate plugins. Allows image rotation.
   *
   * @param imagerInstance
   *
   * @param options {Object} Rotating controls options.
   * @param options.controlsCss {Object} Css properties that will be applied to
   * rotating controls.
   *
   * @param options.controlsTouchCss {Object} Css properties that will
   * be applied to rotating controls when on touch device.
   *
   * @constructor
   * @memberof ImagerJs.plugins
   */
  var Rotate = function RotatePlugin(imagerInstance, options) {
    var _this = this;

    _this.imager = imagerInstance;

    _this.defaultOptions = {
      controlsCss: {},
      controlsTouchCss: {}
    };

    options = options ? options : {};
    _this.options = $.extend(true, _this.defaultOptions, options);

    _this.weight = -100;

    _this.angle = 0;

    var previewSize = this.imager.getPreviewSize();

    _this.controlsStartWidth = previewSize.width;
    _this.controlsStartHeight = previewSize.height;

    _this.widthDiff = 0;
    _this.heightDiff = 0;
  };

  Rotate.prototype.getButtons = function () {
    var _this = this;

    var group = {
      name: 'Rotate',
      tooltip: translations.t('Rotate')
    };

    return [{
      classes: 'btn-rotate',
      iconClasses: 'fa-repeat',
      tooltip: translations.t('Rotate manually'),
      group: group,
      enabledHandler: function (toolbar) {
        _this.startRotate();
        _this.imager.render();
      },
      applyHandler: function () {
        _this.imager.setWaiting(true);

        setTimeout(function () {
          _this.applyHandler();
          _this.imager.commitChanges('Rotate');
          _this.reset();

          _this.imager.setWaiting(false);
        }, 50);
      },
      rejectHandler: function () {
        _this.setAngle(0);
        _this.stopRotate();
      }
    }, {
      group: group,
      classes: 'btn-rotate btn-rotate-90',
      iconClasses: 'fa-undo',
      tooltip: translations.t('Rotate 90 left'),
      enabledHandler: function (toolbar) {
        _this.imager.setWaiting(true);

        setTimeout(function () {
          _this.rotateByAngle(-90 * Math.PI / 180);
          _this.imager.setWaiting(false);
        }, 50);
      }
    }, {
      group: group,
      classes: 'btn-rotate',
      iconClasses: 'fa-repeat',
      tooltip: translations.t('Rotate 90 right'),
      enabledHandler: function (toolbar) {
        _this.imager.setWaiting(true);

        setTimeout(function () {
          _this.rotateByAngle(90 * Math.PI / 180);
          _this.imager.setWaiting(false);
        }, 50);
      }
    }];
  };

  Rotate.prototype.applyHandler = function () {
    this.stopRotate();
  };

  Rotate.prototype.rotateByAngle = function (angle) {
    var prevQuality = this.imager.quality;
    var prevTargetScale = this.imager.targetScale;

    this.imager.quality = 1;
    this.imager.targetScale = 1;

    this.startRotate();
    this.imager.render();
    this.setAngle(angle);
    this.imager.render();
    this.stopRotate();
    this.imager.commitChanges(translations.t('Rotate'));
    this.reset();
    this.imager.render();

    this.imager.quality = prevQuality;
    this.imager.targetScale = prevTargetScale;
  };

  Rotate.prototype.startRotate = function () {
    var _this = this;

    var previewDimensions = this.imager.getPreviewSize();

    _this.controlsStartWidth = _this.imager.originalPreviewWidth;
    _this.controlsStartHeight = _this.imager.originalPreviewHeight;

    var $rotateControls = $(
      '<div class="imager-rotate-container">' +
      '<div class="rotate-corner rotate-top-left"></div>' +
      '<div class="rotate-corner rotate-top-right"></div>' +
      '<div class="rotate-corner rotate-bottom-right"></div>' +
      '<div class="rotate-corner rotate-bottom-left"></div>' +

      '<div class="rotate-border rotate-border-top"></div>' +
      '<div class="rotate-border rotate-border-right"></div>' +
      '<div class="rotate-border rotate-border-bottom"></div>' +
      '<div class="rotate-border rotate-border-left"></div>' +
      '</div>').css({
      width: _this.controlsStartWidth,
      height: _this.controlsStartHeight
    });

    this.$rotateControls = $rotateControls;
    this.imager.$editContainer.append($rotateControls);

    var $corners = $rotateControls.find('.rotate-corner');

    if (_this.imager.touchDevice) {
      $corners.css(_this.options.controlsTouchCss);
    } else {
      $corners.css(_this.options.controlsCss);
    }

    var $body = $('body');

    var imageOffset = $(this.imager.canvas).offset();

    _this.centerX = imageOffset.left + (this.controlsStartWidth / 2);
    _this.centerY = imageOffset.top + (this.controlsStartHeight / 2);

    _this.setAngle(_this.angle);

    $corners.on(MOUSE_DOWN, function (startEvent) {
      _this.prevAngle = _this.angle * -1;

      var startPos = util.getEventPosition(startEvent);

      var startAngle = _this.getAngle(
        _this.centerX, _this.centerY, startPos.left, startPos.top
      );

      $body.on(MOUSE_MOVE, function (moveEvent) {
        var movePos = util.getEventPosition(moveEvent);

        var currentAngle = _this.getAngle(_this.centerX, _this.centerY,
          movePos.left, movePos.top);

        var newAngle = startAngle - currentAngle;
        _this.angle = _this.prevAngle + newAngle;
        _this.angle *= -1;

        _this.setAngle(_this.angle);

        moveEvent.preventDefault();
        moveEvent.stopPropagation();
        return false;
      });

      $body.on(MOUSE_UP, function (endEvent) {
        $body.off(MOUSE_UP);
        $body.off(MOUSE_MOVE);

        _this.lastAngle = _this.angle;
      });

      startEvent.preventDefault();
      startEvent.stopPropagation();
      return false;
    });
  };

  Rotate.prototype.stopRotate = function () {
    this.$rotateControls.remove();
    this.$rotateControls = null;
  };

  Rotate.prototype.setAngle = function (angle) {
    this.angle = angle;
    this.$rotateControls.css('-webkit-transform', 'rotate(' + angle + 'rad)');

    var rotatedDimensions = this.getRotatedDimensions(
      this.controlsStartWidth, this.controlsStartHeight, angle
    );

    this.widthDiff = rotatedDimensions.width - this.controlsStartWidth;
    this.heightDiff = rotatedDimensions.height - this.controlsStartHeight;

    this.$rotateControls.css({
      top: this.heightDiff / 2,
      left: this.widthDiff / 2
    });

    this.imager.setPreviewSize(
      rotatedDimensions.width, rotatedDimensions.height
    );

    this.imager.render();
  };

  Rotate.prototype.render = function (ctx) {
    // create temp canvas
    var tempCtx = this.imager.tempCanvas.getContext('2d');
    tempCtx.clearRect(0, 0, tempCtx.canvas.width, tempCtx.canvas.height);

    // convert local coordinates from preview to
    // global coordinates of image original size
    var scaledWidthDiff = this.imager.convertScale(
      this.widthDiff, this.controlsStartWidth, ctx.canvas.width
    );
    var scaledHeightDiff = this.imager.convertScale(
      this.heightDiff, this.controlsStartHeight, ctx.canvas.height
    );

    // temporary canvas should be bigger because rotated image takes
    // more space
    tempCtx.canvas.width = ctx.canvas.width + scaledWidthDiff;
    tempCtx.canvas.height = ctx.canvas.height + scaledHeightDiff;

    // rotate temp context
    this.rotateCanvas(tempCtx, this.angle);
    tempCtx.translate(scaledWidthDiff / 2, scaledHeightDiff / 2);

    // draw main canvas into temp canvas
    tempCtx.drawImage(ctx.canvas,
      0, 0, ctx.canvas.width, ctx.canvas.height,
      0, 0, ctx.canvas.width, ctx.canvas.height);

    // then restore rotation and offset of temp context
    tempCtx.translate(-scaledWidthDiff / 2, -scaledHeightDiff / 2);
    this.restoreCanvasRotation(tempCtx, this.angle);

    // now it's time to make original canvas bigger so rotated image will fit
    ctx.canvas.width += scaledWidthDiff;
    ctx.canvas.height += scaledHeightDiff;

    // clear main canvas
    this.imager.clearCanvas(ctx);

    var paddingWidth = 0;
    var paddingHeight = 0;
    if (this.$rotateControls) {
      paddingWidth = this.imager.convertScale(
        10, this.controlsStartWidth, ctx.canvas.width
      );
      paddingHeight = this.imager.convertScale(
        10, this.controlsStartHeight, ctx.canvas.height
      );
    }

    // draw temp canvas into main canvas
    ctx.drawImage(tempCtx.canvas,
      0,                        // srcX
      0,                        // srcY
      tempCtx.canvas.width,     // srcWidth
      tempCtx.canvas.height,    // srcHeight
      paddingWidth,             // destX
      paddingHeight,            // destY
      ctx.canvas.width - (paddingWidth * 2),  // destWidth
      ctx.canvas.height - (paddingHeight * 2) // destHeight
    );

  };

  Rotate.prototype.rotateCanvas = function (context, angle) {
    context.translate(context.canvas.width / 2, context.canvas.height / 2);
    context.rotate(angle);
    context.translate(-context.canvas.width / 2, -context.canvas.height / 2);
  };

  Rotate.prototype.restoreCanvasRotation = function (context, angle) {
    context.translate(context.canvas.width / 2, context.canvas.height / 2);
    context.rotate(angle * -1);
    context.translate(-context.canvas.width / 2, -context.canvas.height / 2);
  };

  Rotate.prototype.getRotatedDimensions = function (width, height, angle) {
    if (angle < 0) {
      angle *= -1;
    }

    if (angle > Math.PI * 2) {
      angle = angle - (Math.PI * 2);
      angle = (Math.PI * 2) - angle;
    }

    if (angle > Math.PI) {
      angle = angle - Math.PI;
      angle = Math.PI - angle;
    }

    if (angle > Math.PI / 2) {
      angle = angle - Math.PI / 2;
      angle = (Math.PI / 2) - angle;
    }

    var a = width * Math.cos(angle);
    var b = height * Math.sin(angle);
    var c = a + b;

    var p = width * Math.sin(angle);
    var q = height * Math.cos(angle);
    var r = p + q;

    return {
      width: c,
      height: r
    };
  };

  Rotate.prototype.getAngle = function (x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
  };

  Rotate.prototype.deserialize = function (savedState) {
    if (savedState && savedState.angle) {
      this.angle = savedState.angle;
    }
  };

  Rotate.prototype.serialize = function () {
    return {
      angle: this.angle
    };
  };

  /**
   * Reset all rotation related variables, so on the next rotation start
   * it will start from zeroed rotation.
   */
  Rotate.prototype.reset = function () {
    this.widthDiff = 0;
    this.heightDiff = 0;
    this.angle = 0;
  };

  pluginsCatalog.Rotate = Rotate;

})(jQuery, ImagerJs.plugins, ImagerJs.util, ImagerJs.translations);