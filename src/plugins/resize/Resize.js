import {
  getEventPosition,
  mouseDown,
  mouseMove,
  mouseUp,
} from "../../util/Util";
import "./Resize.css";
import { translate } from "../../Translations";

const MOUSE_DOWN = mouseDown("imagerjsResize");
const MOUSE_UP = mouseUp("imagerjsResize");
const MOUSE_MOVE = mouseMove("imagerjsResize");

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
export default class ResizePlugin {
  constructor(imagerInstance, options) {
    this.imager = imagerInstance;

    this.defaultOptions = {
      minWidth: 50,
      minHeight: 50,
      aspectRatio: null,
      controlsCss: {
        width: "-20px",
        height: "-20px",
      },
      controlsTouchCss: {},
      doubleDiff: false,
    };

    options = options ? options : {};
    this.options = $.extend(true, this.defaultOptions, options);

    this.weight = 99999;
  }

  onToolSelected() {
    if (this.$resizeSquare) {
      this.$resizeSquare.addClass("hidden");
    }
  }

  onToolApply() {
    if (this.$resizeSquare) {
      this.$resizeSquare.removeClass("hidden");
    }
  }

  onToolReject() {
    if (this.$resizeSquare) {
      this.$resizeSquare.removeClass("hidden");
    }
  }

  onEditStart() {
    var $resizeSquare = $('<div class="resize-square"></div>');

    if (this.imager.touchDevice) {
      $resizeSquare.css(this.options.controlsTouchCss);
    } else {
      const { height, width } = this.options.controlsCss;
      $resizeSquare.css({
        ...this.options.controlsCss,
        right: "-" + width,
        bottom: "-" + height,
      });
    }

    this.imager.$editContainer.append($resizeSquare);

    var $body = $("body");

    $resizeSquare.on(MOUSE_DOWN, (downEvent) => {
      var startPos = getEventPosition(downEvent);

      var startDimensions = this.imager.getPreviewSize();

      const ratioWidth = startDimensions.height / startDimensions.width;
      const ratioHeight = startDimensions.width / startDimensions.height;

      $body.on(MOUSE_MOVE, (moveEvent) => {
        console.log(moveEvent);
        var movePos = getEventPosition(moveEvent);

        var leftDiff = movePos.left - startPos.left;
        var topDiff = movePos.top - startPos.top;

        if (this.options.doubleDiff) {
          leftDiff *= 2;
          topDiff *= 2;
        }

        var newWidth = startDimensions.width + leftDiff;
        var newHeight = startDimensions.height + topDiff;

        var fitSize = this.calcAspectRatio(
          startDimensions.width,
          startDimensions.height,
          newWidth,
          newHeight
        );

        newWidth = fitSize.width;
        newHeight = fitSize.height;

        if (newWidth < this.options.minWidth) {
          newWidth = this.options.minWidth;
        }

        if (newHeight < this.options.minHeight) {
          newHeight = this.options.minHeight;
        }

        this.imager.setPreviewSize(newWidth, newHeight);
        $resizeSquare.css({
          right: null,
          bottom: null,
          left: newWidth,
          top: newHeight,
        });

        moveEvent.stopPropagation();
        moveEvent.preventDefault();
        return false;
      });

      $body.on(MOUSE_UP, (upEvent) => {
        $body.off(MOUSE_UP);
        $body.off(MOUSE_MOVE);
      });

      downEvent.stopPropagation();
      downEvent.preventDefault();
      return false;
    });

    this.$resizeSquare = $resizeSquare;
  }

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
  calcAspectRatio(srcWidth, srcHeight, maxWidth, maxHeight) {
    var ratio =
      this.options.aspectRatio ||
      Math.min(maxWidth / srcWidth, maxHeight / srcHeight);

    return { width: srcWidth * ratio, height: srcHeight * ratio };
  }
}
