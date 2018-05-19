(function ($, pluginsCatalog, util, translations) {
  var MOUSE_DOWN = util.mouseDown('imagerjsCrop');
  var MOUSE_UP = util.mouseUp('imagerjsCrop');
  var MOUSE_MOVE = util.mouseMove('imagerjsCrop');

  /**
   * Cropping plugin. Provides a button which allows to enter in
   * cropping mode and select image area to crop.
   *
   * @param imagerInstance
   *
   * @param options {Object} Cropping controls options.
   * @param options.controlsCss {Object} Css properties that will be applied to
   * cropping controls.
   *
   * @param options.controlsTouchCss {Object} Css properties that will
   * be applied to cropping controls when on touch device.
   *
   * @constructor
   * @memberof ImagerJs.plugins
   */
  var Crop = function CropPlugin(imagerInstance, options) {
    var _this = this;

    _this.weight = 0;

    _this.imager = imagerInstance;

    _this.defaultOptions = {
      controlsCss: {},
      controlsTouchCss: {}
    };

    options = options ? options : {};
    _this.options = $.extend(true, _this.defaultOptions, options);

    _this.originalWidth = null;
    _this.originalHeight = null;

    _this.croppedWidth = null;
    _this.croppedHeight = null;
    _this.croppedLeft = null;
    _this.croppedTop = null;
  };

  Crop.prototype.getButtons = function () {
    var _this = this;

    return [{
      classes: 'btn-crop',
      iconClasses: 'fa-scissors',
      tooltip: translations.t('Crop'),
      enabledHandler: function () {
        if (_this.sizeBeforeCrop) {
          _this.imager.setPreviewSize(
            _this.sizeBeforeCrop.width,
            _this.sizeBeforeCrop.height
          );
        }

        _this.enableRendering = false;

        _this.imager.render();

        _this.startCropping();
      },

      applyHandler: function () {
        _this.sizeBeforeCrop = _this.imager.getPreviewSize();

        _this.stopCropping();
        _this.enableRendering = true;

        _this.imager.setPreviewSize(_this.croppedWidth, _this.croppedHeight);

        _this.imager.setWaiting(true);

        setTimeout(function () {
          _this.imager.commitChanges('Crop');
          _this.reset();
          _this.imager.render();

          _this.imager.setWaiting(false);
        }, 50);
      },
      rejectHandler: function () {
        _this.stopCropping();

        _this.croppedWidth = null;
        _this.croppedHeight = null;
        _this.croppedLeft = null;
        _this.croppedTop = null;

        _this.imager.render();
      }
    }];
  };

  Crop.prototype.startCropping = function () {
    var _this = this;

    // show original image to user when cropping mode is on
    _this.renderCropped = false;
    _this.imager.render();

    $body = $('body');

    var previewSize = this.imager.getPreviewSize();
    _this.originalWidth = previewSize.width;
    _this.originalHeight = previewSize.height;

    _this.makePreview();

    _this.$cropControls = $(
      '<div class="imager-crop-container">' +
      '<div class="crop-corner crop-top-left"></div>' +
      '<div class="crop-corner crop-top-right"></div>' +
      '<div class="crop-corner crop-bottom-right"></div>' +
      '<div class="crop-corner crop-bottom-left"></div>' +

      '<div class="crop-border crop-border-top"></div>' +
      '<div class="crop-border crop-border-right"></div>' +
      '<div class="crop-border crop-border-bottom"></div>' +
      '<div class="crop-border crop-border-left"></div>' +
      '</div>').css({
      width: _this.croppedWidth ? _this.croppedWidth : _this.originalWidth,
      height: _this.croppedHeight ? _this.croppedHeight : _this.originalHeight,
      left: _this.croppedLeft ? _this.croppedLeft : 0,
      top: _this.croppedTop ? _this.croppedTop : 0
    });

    _this.imager.$editContainer.append(_this.$cropControls);
    var $selection = _this.$cropControls;
    var $corners = $selection.find('.crop-corner');

    if (_this.imager.touchDevice) {
      $corners.css(_this.options.controlsTouchCss);
    } else {
      $corners.css(_this.options.controlsCss);
    }

    function handleCropSelectionChanges(){
      _this.$cropControls.css({
        left: _this.croppedLeft,
        top: _this.croppedTop,
        width: _this.croppedWidth,
        height: _this.croppedHeight
      });

      _this.adjustPreview();
    }

    $corners.on(MOUSE_DOWN, function (clickEvent) {
      clickEvent.stopPropagation();
      var controlItem = this;

      var startPos = util.getEventPosition(clickEvent);

      var startControlsLeft = _this.$cropControls.css('left').replace('px', '') | 0;
      var startControlsTop = _this.$cropControls.css('top').replace('px', '') | 0;

      var startControlsWidth = _this.$cropControls.css('width').replace('px', '') | 0;
      var startControlsHeight = _this.$cropControls.css('height').replace('px', '') | 0;

      $body.on(MOUSE_MOVE, function (moveEvent) {
        var movePos = util.getEventPosition(moveEvent);

        var diffLeft = movePos.left - startPos.left;
        var diffTop = movePos.top - startPos.top;

        // bounds validation
        function validateBounds(){
          if (_this.croppedLeft < 0) {
            _this.croppedLeft = 0;
          }

          if (_this.croppedTop < 0) {
            _this.croppedTop = 0;
          }

          if (_this.croppedLeft + _this.croppedWidth > _this.originalWidth) {
            _this.croppedWidth = _this.originalWidth - _this.croppedLeft;
          }

          if (_this.croppedTop + _this.croppedHeight > _this.originalHeight) {
            _this.croppedHeight = _this.originalHeight - _this.croppedTop;
          }
        }

        if ($(controlItem).hasClass("crop-top-left")) {
          _this.croppedLeft = startControlsLeft + diffLeft;
          _this.croppedTop = startControlsTop + diffTop;

          _this.croppedWidth = startControlsWidth - diffLeft;
          _this.croppedHeight = startControlsHeight - diffTop;

          if (moveEvent.shiftKey) {
            validateBounds();
            if (_this.croppedHeight < _this.croppedWidth){
              _this.croppedWidth = _this.croppedHeight;
              _this.croppedLeft = (startControlsWidth - _this.croppedHeight) + startControlsLeft;
            } else {
              _this.croppedHeight = _this.croppedWidth;
              _this.croppedTop = (startControlsHeight - _this.croppedWidth) + startControlsTop;
            }
          }
        }

        if ($(controlItem).hasClass("crop-top-right")) {
          _this.croppedLeft = startControlsLeft;
          _this.croppedTop = startControlsTop + diffTop;

          _this.croppedWidth = startControlsWidth - diffLeft * -1;
          _this.croppedHeight = startControlsHeight - diffTop;

          if (moveEvent.shiftKey) {
            validateBounds();
            if (_this.croppedHeight < _this.croppedWidth){
              _this.croppedWidth = _this.croppedHeight;
            } else {
              _this.croppedHeight = _this.croppedWidth;
              _this.croppedTop = (startControlsHeight - _this.croppedHeight) + startControlsTop;
            }
          }
        }

        if ($(controlItem).hasClass("crop-bottom-right")) {
          _this.croppedLeft = startControlsLeft;
          _this.croppedTop = startControlsTop;

          _this.croppedWidth = startControlsWidth - diffLeft * -1;
          _this.croppedHeight = startControlsHeight + diffTop;

          if (moveEvent.shiftKey) {
            validateBounds();
            if (_this.croppedHeight < _this.croppedWidth){
              _this.croppedWidth = _this.croppedHeight;
            } else {
              _this.croppedHeight = _this.croppedWidth;
            }
          }
        }

        if ($(controlItem).hasClass("crop-bottom-left")) {
          _this.croppedLeft = startControlsLeft + diffLeft;
          _this.croppedTop = startControlsTop;

          _this.croppedWidth = startControlsWidth - diffLeft;
          _this.croppedHeight = startControlsHeight + diffTop;

          if (moveEvent.shiftKey){
            validateBounds();
            if (_this.croppedHeight < _this.croppedWidth){
              _this.croppedWidth = _this.croppedHeight;
              _this.croppedLeft = startControlsLeft + (startControlsWidth - _this.croppedWidth);
            } else {
              _this.croppedHeight = _this.croppedWidth;
            }
          }
        }

        validateBounds();

        handleCropSelectionChanges();

        moveEvent.preventDefault();
        moveEvent.stopPropagation();
        return false;
      });

      $body.on(MOUSE_UP, function () {
        $body.off(MOUSE_MOVE);
        $body.off(MOUSE_UP);
      });
    });

    $selection.on(MOUSE_DOWN, function(clickEvent) {
      var controlItem = this;

      var startPos = util.getEventPosition(clickEvent);

      var startControlsLeft =
        _this.$cropControls.css("left").replace("px", "") | 0;
      var startControlsTop =
        _this.$cropControls.css("top").replace("px", "") | 0;

      $body.on(MOUSE_MOVE, function(moveEvent) {
        var movePos = util.getEventPosition(moveEvent);

        var diffLeft = movePos.left - startPos.left;
        var diffTop = movePos.top - startPos.top;

        _this.croppedLeft = startControlsLeft + diffLeft;
        _this.croppedTop = startControlsTop + diffTop;

        // bounds validation
        if (_this.croppedLeft < 0) {
          _this.croppedLeft = 0;
        }
        if (_this.croppedTop < 0) {
          _this.croppedTop = 0;
        }
        if (_this.croppedLeft + _this.croppedWidth > _this.originalWidth) {
          _this.croppedLeft = _this.originalWidth - _this.croppedWidth;
        }
        if (_this.croppedTop + _this.croppedHeight > _this.originalHeight) {
          _this.croppedTop = _this.originalHeight - _this.croppedHeight;
        }

        handleCropSelectionChanges();

        moveEvent.preventDefault();
        moveEvent.stopPropagation();
        return false;
      });

      $body.on(MOUSE_UP, function() {
        $body.off(MOUSE_MOVE);
        $body.off(MOUSE_UP);
      });
    });
  };

  Crop.prototype.stopCropping = function () {
    var _this = this;

    this.$preview.remove();
    this.$preview = null;

    this.$cropControls.remove();
    this.$cropControls = null;

    this.renderCropped = true;
  };

  Crop.prototype.makePreview = function () {
    var _this = this;

    var originalPreviewSize = this.imager.getPreviewSize();

    _this.$preview = $('' +
      '<div class="imager-crop-preview-container">' +
      '<canvas class="imager-crop-preview"></canvas>' +
      '</div>').css('position', 'absolute').css('top', '50px').css({
      width: originalPreviewSize.width,
      height: originalPreviewSize.height,
      position: 'absolute',
      right: '50px',
      top: '50px'
    });

    _this.previewCanvas = _this.$preview.find('canvas.imager-crop-preview')[0];
    _this.previewCanvas.__previewCanvas = true;

    _this.previewCanvas.width = originalPreviewSize.width * 1.5;
    _this.previewCanvas.height = originalPreviewSize.height * 1.5;

    $(_this.previewCanvas).css({
      height: '400px'
    });

    _this.imager.$editContainer.after(this.$preview);
  };

  Crop.prototype.adjustPreview = function () {
    var _this = this;

    //_this.$preview.find('canvas').css({
    //  width: _this.croppedWidth,
    //  height: _this.croppedHeight//,
    //  //left: _this.croppedLeft,
    //  //top: _this.croppedTop
    //});
    //
    //_this.previewCanvas.width = _this.croppedWidth * 1.5;
    //_this.previewCanvas.height = _this.croppedHeight * 1.5;
  };

  Crop.prototype.render = function (ctx) {
    if (this.croppedWidth === null || !this.enableRendering) {
      return;
    }

    var previewSize = this.imager.getPreviewSize();

    var previewWidth = previewSize.width;
    var previewHeight = previewSize.height;

    if (this.sizeBeforeCrop) {
      previewWidth = this.sizeBeforeCrop.width;
      previewHeight = this.sizeBeforeCrop.height;
    }

    var tempCtx = this.imager.tempCanvas.getContext('2d');

    // firstly find selection size in global coordinate syztem and scale
    var scaledWidth = this.imager.convertScale(
      this.croppedWidth, previewWidth, ctx.canvas.width
    );
    var scaledHeight = this.imager.convertScale(
      this.croppedHeight, previewHeight, ctx.canvas.height
    );

    var left = this.imager.convertScale(
      this.croppedLeft, previewWidth, ctx.canvas.width
    );
    var top = this.imager.convertScale(
      this.croppedTop, previewHeight, ctx.canvas.height
    );

    left *= -1;
    top *= -1;

    // then calculate the difference to know how to translate temporary canvas
    var widthDiff = ctx.canvas.width - scaledWidth;
    var heightDiff = ctx.canvas.height - scaledHeight;

    tempCtx.canvas.width = scaledWidth;
    tempCtx.canvas.height = scaledHeight;

    tempCtx.clearRect(0, 0, tempCtx.canvas.width, tempCtx.canvas.height);

    tempCtx.drawImage(ctx.canvas,
      0, 0, ctx.canvas.width, ctx.canvas.height,
      left, top, tempCtx.canvas.width + widthDiff, tempCtx.canvas.height + heightDiff);

    ctx.canvas.width = scaledWidth;
    ctx.canvas.height = scaledHeight;

    this.imager.clearCanvas(ctx);
    ctx.drawImage(tempCtx.canvas,
      0, 0, tempCtx.canvas.width, tempCtx.canvas.height,
      0, 0, ctx.canvas.width, ctx.canvas.height);
  };

  Crop.prototype.onToolSelected = function (btn) {
    if (btn.plugin.constructor.name == 'RotatePlugin') {
      this.croppedLeft = null;
      this.croppedTop = null;
      this.croppedWidth = null;
      this.croppedHeight = null;

      this.sizeBeforeCrop = null;
    }
  };

  Crop.prototype.deserialize = function (savedState) {
    if (savedState) {
      this.croppedLeft = croppedLeft;
      this.croppedTop = croppedTop;
      this.croppedWidth = croppedWidth;
      this.croppedHeight = croppedHeight;
      this.sizeBeforeCrop = sizeBeforeCrop;
    }
  };

  Crop.prototype.serialize = function () {
    return {
      croppedLeft: this.croppedLeft,
      croppedTop: this.croppedTop,
      croppedWidth: this.croppedWidth,
      croppedHeight: this.croppedHeight,
      sizeBeforeCrop: this.sizeBeforeCrop
    };
  };

  Crop.prototype.reset = function () {
    this.croppedLeft = null;
    this.croppedTop = null;
    this.croppedWidth = null;
    this.croppedHeight = null;

    this.sizeBeforeCrop = null;
  };

  pluginsCatalog.Crop = Crop;

})(jQuery, ImagerJs.plugins, ImagerJs.util, ImagerJs.translations);