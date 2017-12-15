(function ($, pluginsCatalog, util) {
  var MOUSE_DOWN = util.mouseDown('imagerjsResize');
  var MOUSE_UP = util.mouseUp('imagerjsResize');
  var MOUSE_MOVE = util.mouseMove('imagerjsResize');

  /**
   * Resize plugin. Provides a control which allows to to resize an image.
   *
   * @param imagerInstance
   *
   * @param options {Object} Resize square control options.
   * @param options.controlsCss {Object} Css properties that will be applied to
   * resizing controls.
   *
   * @param options.controlsTouchCss {Object} Css properties that will
   * be applied to resizing controls when on touch device.
   *
   * @param options.doubleDiff {Boolean} Doubles mouse pointer distance.
   * This is needed when image is centered while resizing to make
   * resize corner be always under mouse cursor.
   *
   * @constructor
   * @memberof ImagerJs.plugins
   */
  var Resize = function ResizePlugin(imagerInstance, options) {
    var _this = this;

    _this.imager = imagerInstance;

    _this.defaultOptions = {
      minWidth: 50,
      minHeight: 50,
      controlsCss: {},
      controlsTouchCss: {},
      doubleDiff: false
    };

    options = options ? options : {};
    _this.options = $.extend(true, _this.defaultOptions, options);

    _this.weight = 99999;
  };

  Resize.prototype.onToolSelected = function () {
    if (this.$resizeSquare) {
      this.$resizeSquare.addClass('hidden');
    }
  };

  Resize.prototype.onToolApply = function () {
    if (this.$resizeSquare) {
      this.$resizeSquare.removeClass('hidden');
    }
  };

  Resize.prototype.onToolReject = function () {
    if (this.$resizeSquare) {
      this.$resizeSquare.removeClass('hidden');
    }
  };

  Resize.prototype.onEditStart = function () {
    var _this = this;

    var $resizeSquare = $('<div class="resize-square"></div>');

    if(_this.imager.touchDevice){
      $resizeSquare.css(_this.options.controlsTouchCss);
    } else {
      $resizeSquare.css(_this.options.controlsCss);
    }

    _this.imager.$editContainer.append($resizeSquare);

    var $body = $('body');

    $resizeSquare.on(MOUSE_DOWN, function (downEvent) {
      var startPos = util.getEventPosition(downEvent);

      var startDimensions = _this.imager.getPreviewSize();

      var ratioWidth = startDimensions.height / startDimensions.width;
      var ratioHeight = startDimensions.width / startDimensions.height;

      $body.on(MOUSE_MOVE, function (moveEvent) {
        var movePos = util.getEventPosition(moveEvent);

        var leftDiff = movePos.left - startPos.left;
        var topDiff = movePos.top - startPos.top;

        if(_this.options.doubleDiff){
          leftDiff *= 2;
          topDiff *= 2;
        }


        var newWidth = startDimensions.width + leftDiff;
        var newHeight = startDimensions.height + topDiff;

        var fitSize = _this.calcAspectRatio(
          startDimensions.width, startDimensions.height, newWidth, newHeight
        );

        newWidth = fitSize.width;
        newHeight = fitSize.height;

        if (newWidth < _this.options.minWidth) {
          newWidth = _this.options.minWidth;
        }

        if (newHeight < _this.options.minHeight) {
          newHeight = _this.options.minHeight;
        }

        _this.imager.setPreviewSize(newWidth, newHeight);

        moveEvent.stopPropagation();
        moveEvent.preventDefault();
        return false;
      });

      $body.on(MOUSE_UP, function (upEvent) {
        $body.off(MOUSE_UP);
        $body.off(MOUSE_MOVE);
      });

      downEvent.stopPropagation();
      downEvent.preventDefault();
      return false;
    });

    this.$resizeSquare = $resizeSquare;
  };

  /**
   * Conserve aspect ratio of the orignal region.
   * Useful when shrinking/enlarging
   * images to fit into a certain area.
   *
   * @param {Number} srcWidth Source area width
   * @param {Number} srcHeight Source area height
   * @param {Number} maxWidth Fittable area maximum available width
   * @param {Number} maxHeight Fittable area maximum available height
   * @return {Object} { width, heigth }
   */
  Resize.prototype.calcAspectRatio = function calculateAspectRatioFit(
    srcWidth, srcHeight, maxWidth, maxHeight) {

    var ratio = Math.min(maxWidth / srcWidth, maxHeight / srcHeight);

    return { width: srcWidth*ratio, height: srcHeight*ratio };
  };

  pluginsCatalog.Resize = Resize;
})(jQuery, ImagerJs.plugins, ImagerJs.util);