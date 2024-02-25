import { translate } from "../../Translations";
import * as util from "../../util/Util";
import './Crop.css';

const MOUSE_DOWN = util.mouseDown("imagerjsCrop");
const MOUSE_UP = util.mouseUp("imagerjsCrop");
const MOUSE_MOVE = util.mouseMove("imagerjsCrop");

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
export default class CropPlugin {
  constructor(imagerInstance, options) {
    this.weight = 0;

    this.imager = imagerInstance;

    this.defaultOptions = {
      aspectRatio: null,
      controlsCss: {},
      controlsTouchCss: {},
    };

    options = options ? options : {};
    this.options = $.extend(true, this.defaultOptions, options);

    this.originalWidth = null;
    this.originalHeight = null;

    this.croppedWidth = null;
    this.croppedHeight = null;
    this.croppedLeft = null;
    this.croppedTop = null;
  }

  getButtons() {
    return [
      {
        classes: "btn-crop",
        iconClasses: "icon-scissors",
        tooltip: translate("Crop"),
        enabledHandler: () =>  {
          if (this.sizeBeforeCrop) {
            this.imager.setPreviewSize(
              this.sizeBeforeCrop.width,
              this.sizeBeforeCrop.height
            );
          }

          this.enableRendering = false;

          this.imager.render();

          this.startCropping();
        },

        applyHandler: () =>  {
          this.sizeBeforeCrop = this.imager.getPreviewSize();

          this.stopCropping();
          this.enableRendering = true;

          this.imager.setPreviewSize(this.croppedWidth, this.croppedHeight);

          this.imager.setWaiting(true);

          setTimeout(() =>  {
            this.imager.commitChanges("Crop");
            this.reset();
            this.imager.render();

            this.imager.setWaiting(false);
          }, 50);
        },
        rejectHandler: () =>  {
          this.stopCropping();

          this.croppedWidth = null;
          this.croppedHeight = null;
          this.croppedLeft = null;
          this.croppedTop = null;

          this.imager.render();
        },
      },
    ];
  }

  startCropping() {
    // show original image to user when cropping mode is on
    this.renderCropped = false;
    this.imager.render();

    const $body = $("body");

    var previewSize = this.imager.getPreviewSize();
    this.originalWidth = previewSize.width;
    this.originalHeight = previewSize.height;

    this.makePreview();

    this.$cropControls = $(
      '<div class="imager-crop-container">' +
        '<div class="crop-corner crop-top-left"></div>' +
        '<div class="crop-corner crop-top-right"></div>' +
        '<div class="crop-corner crop-bottom-right"></div>' +
        '<div class="crop-corner crop-bottom-left"></div>' +
        '<div class="crop-border crop-border-top"></div>' +
        '<div class="crop-border crop-border-right"></div>' +
        '<div class="crop-border crop-border-bottom"></div>' +
        '<div class="crop-border crop-border-left"></div>' +
        "</div>"
    ).css({
      width: this.croppedWidth ? this.croppedWidth : this.originalWidth,
      height: this.croppedHeight ? this.croppedHeight : this.originalHeight,
      left: this.croppedLeft ? this.croppedLeft : 0,
      top: this.croppedTop ? this.croppedTop : 0,
    });

    this.imager.$editContainer.append(this.$cropControls);
    var $selection = this.$cropControls;
    var $corners = $selection.find(".crop-corner");

    if (this.imager.touchDevice) {
      $corners.css(this.options.controlsTouchCss);
    } else {
      $corners.css(this.options.controlsCss);
    }

    const handleCropSelectionChanges = () => {
      this.$cropControls.css({
        left: this.croppedLeft,
        top: this.croppedTop,
        width: this.croppedWidth,
        height: this.croppedHeight,
      });

      this.adjustPreview();
    }

    $corners.on(MOUSE_DOWN, (clickEvent) => {
      clickEvent.stopPropagation();
      var controlItem = util.getTarget(clickEvent);

      var startPos = util.getEventPosition(clickEvent);

      var startControlsLeft =
        this.$cropControls.css("left").replace("px", "") | 0;
      var startControlsTop =
        this.$cropControls.css("top").replace("px", "") | 0;

      var startControlsWidth =
        this.$cropControls.css("width").replace("px", "") | 0;
      var startControlsHeight =
        this.$cropControls.css("height").replace("px", "") | 0;

      $body.on(MOUSE_MOVE, (moveEvent) => {
        var movePos = util.getEventPosition(moveEvent);

        var diffLeft = movePos.left - startPos.left;
        var diffTop = movePos.top - startPos.top;

        // bounds validation
        const validateBounds = () => {
          if (this.croppedLeft < 0) {
            this.croppedLeft = 0;
          }

          if (this.croppedTop < 0) {
            this.croppedTop = 0;
          }

          if (this.croppedLeft + this.croppedWidth > this.originalWidth) {
            this.croppedWidth = this.originalWidth - this.croppedLeft;
          }

          if (this.croppedTop + this.croppedHeight > this.originalHeight) {
            this.croppedHeight = this.originalHeight - this.croppedTop;
          }
        }

        if ($(controlItem).hasClass("crop-top-left")) {
          this.croppedLeft = startControlsLeft + diffLeft;
          this.croppedTop = startControlsTop + diffTop;

          this.croppedWidth = startControlsWidth - diffLeft;
          this.croppedHeight = startControlsHeight - diffTop;

          if (moveEvent.shiftKey) {
            validateBounds();
            if (this.croppedHeight < this.croppedWidth) {
              this.croppedWidth = this.croppedHeight;
              this.croppedLeft =
                startControlsWidth - this.croppedHeight + startControlsLeft;
            } else {
              this.croppedHeight = this.croppedWidth;
              this.croppedTop =
                startControlsHeight - this.croppedWidth + startControlsTop;
            }
          }
        }

        if ($(controlItem).hasClass("crop-top-right")) {
          this.croppedLeft = startControlsLeft;
          this.croppedTop = startControlsTop + diffTop;

          this.croppedWidth = startControlsWidth - diffLeft * -1;
          this.croppedHeight = startControlsHeight - diffTop;

          if (moveEvent.shiftKey) {
            validateBounds();
            if (this.croppedHeight < this.croppedWidth) {
              this.croppedWidth = this.croppedHeight;
            } else {
              this.croppedHeight = this.croppedWidth;
              this.croppedTop =
                startControlsHeight - this.croppedHeight + startControlsTop;
            }
          }
        }

        if ($(controlItem).hasClass("crop-bottom-right")) {
          this.croppedLeft = startControlsLeft;
          this.croppedTop = startControlsTop;

          this.croppedWidth = startControlsWidth - diffLeft * -1;
          this.croppedHeight = startControlsHeight + diffTop;

          if (moveEvent.shiftKey) {
            validateBounds();
            if (this.croppedHeight < this.croppedWidth) {
              this.croppedWidth = this.croppedHeight;
            } else {
              this.croppedHeight = this.croppedWidth;
            }
          }
        }

        if ($(controlItem).hasClass("crop-bottom-left")) {
          this.croppedLeft = startControlsLeft + diffLeft;
          this.croppedTop = startControlsTop;

          this.croppedWidth = startControlsWidth - diffLeft;
          this.croppedHeight = startControlsHeight + diffTop;

          if (moveEvent.shiftKey) {
            validateBounds();
            if (this.croppedHeight < this.croppedWidth) {
              this.croppedWidth = this.croppedHeight;
              this.croppedLeft =
                startControlsLeft + (startControlsWidth - this.croppedWidth);
            } else {
              this.croppedHeight = this.croppedWidth;
            }
          }
        }

        validateBounds();

        handleCropSelectionChanges();

        moveEvent.preventDefault();
        moveEvent.stopPropagation();
        return false;
      });

      $body.on(MOUSE_UP, () =>  {
        $body.off(MOUSE_MOVE);
        $body.off(MOUSE_UP);
      });
    });

    $selection.on(MOUSE_DOWN,  (clickEvent) => {
      var startPos = util.getEventPosition(clickEvent);

      var startControlsLeft =
        this.$cropControls.css("left").replace("px", "") | 0;
      var startControlsTop =
        this.$cropControls.css("top").replace("px", "") | 0;

      $body.on(MOUSE_MOVE, (moveEvent) => {
        var movePos = util.getEventPosition(moveEvent);

        var diffLeft = movePos.left - startPos.left;
        var diffTop = movePos.top - startPos.top;

        this.croppedLeft = startControlsLeft + diffLeft;
        this.croppedTop = startControlsTop + diffTop;

        // bounds validation
        if (this.croppedLeft < 0) {
          this.croppedLeft = 0;
        }
        if (this.croppedTop < 0) {
          this.croppedTop = 0;
        }
        if (this.croppedLeft + this.croppedWidth > this.originalWidth) {
          this.croppedLeft = this.originalWidth - this.croppedWidth;
        }
        if (this.croppedTop + this.croppedHeight > this.originalHeight) {
          this.croppedTop = this.originalHeight - this.croppedHeight;
        }

        handleCropSelectionChanges();

        moveEvent.preventDefault();
        moveEvent.stopPropagation();
        return false;
      });

      $body.on(MOUSE_UP, () =>  {
        $body.off(MOUSE_MOVE);
        $body.off(MOUSE_UP);
      });
    });
  }

  stopCropping() {
    this.$preview.remove();
    this.$preview = null;

    this.$cropControls.remove();
    this.$cropControls = null;

    this.renderCropped = true;
  }

  makePreview() {
    var originalPreviewSize = this.imager.getPreviewSize();

    this.$preview = $(
      "" +
        '<div class="imager-crop-preview-container">' +
        '<canvas class="imager-crop-preview"></canvas>' +
        "</div>"
    )
      .css("position", "absolute")
      .css("top", "50px")
      .css({
        width: originalPreviewSize.width,
        height: originalPreviewSize.height,
        position: "absolute",
        right: "50px",
        top: "50px",
      });

    this.previewCanvas = this.$preview.find("canvas.imager-crop-preview")[0];
    this.previewCanvas.__previewCanvas = true;

    this.previewCanvas.width = originalPreviewSize.width * 1.5;
    this.previewCanvas.height = originalPreviewSize.height * 1.5;

    $(this.previewCanvas).css({
      height: "400px",
    });

    this.imager.$editContainer.after(this.$preview);
  }

  adjustPreview() {
    //this.$preview.find('canvas').css({
    //  width: this.croppedWidth,
    //  height: this.croppedHeight//,
    //  //left: this.croppedLeft,
    //  //top: this.croppedTop
    //});
    //
    //this.previewCanvas.width = this.croppedWidth * 1.5;
    //this.previewCanvas.height = this.croppedHeight * 1.5;
  }

  render(ctx) {
    if (this.croppedWidth === null || !this.enableRendering) {
      return;
    }

    let previewSize = this.imager.getPreviewSize();

    let previewWidth = previewSize.width;
    let previewHeight = previewSize.height;

    if (this.sizeBeforeCrop) {
      previewWidth = this.sizeBeforeCrop.width;
      previewHeight = this.sizeBeforeCrop.height;
    }

    var tempCtx = this.imager.tempCanvas.getContext("2d");

    // firstly find selection size in global coordinate syztem and scale
    var scaledWidth = this.imager.convertScale(
      this.croppedWidth,
      previewWidth,
      ctx.canvas.width
    );
    var scaledHeight = this.imager.convertScale(
      this.croppedHeight,
      previewHeight,
      ctx.canvas.height
    );

    var left = this.imager.convertScale(
      this.croppedLeft,
      previewWidth,
      ctx.canvas.width
    );
    var top = this.imager.convertScale(
      this.croppedTop,
      previewHeight,
      ctx.canvas.height
    );

    left *= -1;
    top *= -1;

    // then calculate the difference to know how to translate temporary canvas
    var widthDiff = ctx.canvas.width - scaledWidth;
    var heightDiff = ctx.canvas.height - scaledHeight;

    tempCtx.canvas.width = scaledWidth;
    tempCtx.canvas.height = scaledHeight;

    tempCtx.clearRect(0, 0, tempCtx.canvas.width, tempCtx.canvas.height);

    tempCtx.drawImage(
      ctx.canvas,
      0,
      0,
      ctx.canvas.width,
      ctx.canvas.height,
      left,
      top,
      tempCtx.canvas.width + widthDiff,
      tempCtx.canvas.height + heightDiff
    );

    ctx.canvas.width = scaledWidth;
    ctx.canvas.height = scaledHeight;

    this.imager.clearCanvas(ctx);
    ctx.drawImage(
      tempCtx.canvas,
      0,
      0,
      tempCtx.canvas.width,
      tempCtx.canvas.height,
      0,
      0,
      ctx.canvas.width,
      ctx.canvas.height
    );
  }

  onToolSelected(btn) {
    if (btn.plugin.constructor.name == "RotatePlugin") {
      this.croppedLeft = null;
      this.croppedTop = null;
      this.croppedWidth = null;
      this.croppedHeight = null;

      this.sizeBeforeCrop = null;
    }
  }

  deserialize(savedState) {
    if (savedState) {
      this.croppedLeft = croppedLeft;
      this.croppedTop = croppedTop;
      this.croppedWidth = croppedWidth;
      this.croppedHeight = croppedHeight;
      this.sizeBeforeCrop = sizeBeforeCrop;
    }
  }

  serialize() {
    return {
      croppedLeft: this.croppedLeft,
      croppedTop: this.croppedTop,
      croppedWidth: this.croppedWidth,
      croppedHeight: this.croppedHeight,
      sizeBeforeCrop: this.sizeBeforeCrop,
    };
  }

  reset() {
    this.croppedLeft = null;
    this.croppedTop = null;
    this.croppedWidth = null;
    this.croppedHeight = null;

    this.sizeBeforeCrop = null;
  }
}
