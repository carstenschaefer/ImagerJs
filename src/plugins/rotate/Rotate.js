import { translate } from "../../Translations";
import {
  getEventPosition,
  mouseDown,
  mouseMove,
  mouseUp,
} from "../../util/Util";
import "./Rotate.css";

const MOUSE_DOWN = mouseDown("imagerjsRotate");
const MOUSE_UP = mouseUp("imagerjsRotate");
const MOUSE_MOVE = mouseMove("imagerjsRotate");

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
export default class RotatePlugin {
  constructor(imagerInstance, options) {
    this.imager = imagerInstance;

    this.defaultOptions = {
      controlsCss: {},
      controlsTouchCss: {},
    };

    options = options ? options : {};
    this.options = $.extend(true, this.defaultOptions, options);

    this.weight = -100;

    this.angle = 0;

    var previewSize = this.imager.getPreviewSize();

    this.controlsStartWidth = previewSize.width;
    this.controlsStartHeight = previewSize.height;

    this.widthDiff = 0;
    this.heightDiff = 0;
  }

  getButtons() {
    var group = {
      name: "Rotate",
      tooltip: translate("Rotate"),
    };

    return [
      {
        classes: "btn-rotate",
        iconClasses: "icon-cw",
        tooltip: translate("Rotate manually"),
        group: group,
        enabledHandler: (toolbar) => {
          this.startRotate();
          this.imager.render();
        },
        applyHandler: () => {
          this.imager.setWaiting(true);

          setTimeout(() => {
            this.applyHandler();
            this.imager.commitChanges("Rotate");
            this.reset();

            this.imager.setWaiting(false);
          }, 50);
        },
        rejectHandler: () => {
          this.setAngle(0);
          this.stopRotate();
        },
      },
      {
        group: group,
        classes: "btn-rotate btn-rotate-90",
        iconClasses: "icon-ccw",
        tooltip: translate("Rotate 90 left"),
        enabledHandler: (toolbar) => {
          this.imager.setWaiting(true);

          setTimeout(() => {
            this.rotateByAngle((-90 * Math.PI) / 180);
            this.imager.setWaiting(false);
          }, 50);
        },
      },
      {
        group: group,
        classes: "btn-rotate",
        iconClasses: "icon-cw",
        tooltip: translate("Rotate 90 right"),
        enabledHandler: (toolbar) => {
          this.imager.setWaiting(true);

          setTimeout(() => {
            this.rotateByAngle((90 * Math.PI) / 180);
            this.imager.setWaiting(false);
          }, 50);
        },
      },
    ];
  }

  applyHandler() {
    this.stopRotate();
  }

  rotateByAngle(angle) {
    var prevQuality = this.imager.quality;
    var prevTargetScale = this.imager.targetScale;

    this.imager.quality = 1;
    this.imager.targetScale = 1;

    this.startRotate();
    this.imager.render();
    this.setAngle(angle);
    this.imager.render();
    this.stopRotate();
    this.imager.commitChanges(translate("Rotate"));
    this.reset();
    this.imager.render();

    this.imager.quality = prevQuality;
    this.imager.targetScale = prevTargetScale;
  }

  startRotate() {
    var previewDimensions = this.imager.getPreviewSize();

    this.controlsStartWidth = this.imager.originalPreviewWidth;
    this.controlsStartHeight = this.imager.originalPreviewHeight;

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
        "</div>"
    ).css({
      width: this.controlsStartWidth,
      height: this.controlsStartHeight,
    });

    this.$rotateControls = $rotateControls;
    this.imager.$editOuterContainer.append($rotateControls);

    var $corners = $rotateControls.find(".rotate-corner");

    if (this.imager.touchDevice) {
      $corners.css(this.options.controlsTouchCss);
    } else {
      $corners.css(this.options.controlsCss);
    }

    var $body = $("body");

    var imageOffset = $(this.imager.canvas).offset();

    this.centerX = imageOffset.left + this.controlsStartWidth / 2;
    this.centerY = imageOffset.top + this.controlsStartHeight / 2;

    this.setAngle(this.angle);

    $corners.on(MOUSE_DOWN, (startEvent) => {
      this.prevAngle = this.angle * -1;

      var startPos = getEventPosition(startEvent);

      var startAngle = this.getAngle(
        this.centerX,
        this.centerY,
        startPos.left,
        startPos.top
      );

      $body.on(MOUSE_MOVE, (moveEvent) => {
        var movePos = getEventPosition(moveEvent);

        var currentAngle = this.getAngle(
          this.centerX,
          this.centerY,
          movePos.left,
          movePos.top
        );

        var newAngle = startAngle - currentAngle;
        this.angle = this.prevAngle + newAngle;
        this.angle *= -1;

        this.setAngle(this.angle);

        moveEvent.preventDefault();
        moveEvent.stopPropagation();
        return false;
      });

      $body.on(MOUSE_UP, (endEvent) => {
        $body.off(MOUSE_UP);
        $body.off(MOUSE_MOVE);

        this.lastAngle = this.angle;
      });

      startEvent.preventDefault();
      startEvent.stopPropagation();
      return false;
    });
  }

  stopRotate() {
    this.$rotateControls.remove();
    this.$rotateControls = null;
  }

  setAngle(angle) {
    this.angle = angle;
    this.$rotateControls.css("-webkit-transform", "rotate(" + angle + "rad)");

    var rotatedDimensions = this.getRotatedDimensions(
      this.controlsStartWidth,
      this.controlsStartHeight,
      angle
    );

    this.widthDiff = rotatedDimensions.width - this.controlsStartWidth;
    this.heightDiff = rotatedDimensions.height - this.controlsStartHeight;

    this.$rotateControls.css({
      top: this.heightDiff / 2,
      left: this.widthDiff / 2,
    });

    this.imager.setPreviewSize(
      rotatedDimensions.width,
      rotatedDimensions.height
    );

    this.imager.render();
  }

  render(ctx) {
    // create temp canvas
    const tempCtx = this.imager.tempCanvas.getContext("2d");
    tempCtx.clearRect(0, 0, tempCtx.canvas.width, tempCtx.canvas.height);

    // convert local coordinates from preview to
    // global coordinates of image original size
    var scaledWidthDiff = this.imager.convertScale(
      this.widthDiff,
      this.controlsStartWidth,
      ctx.canvas.width
    );
    var scaledHeightDiff = this.imager.convertScale(
      this.heightDiff,
      this.controlsStartHeight,
      ctx.canvas.height
    );

    // temporary canvas should be bigger because rotated image takes
    // more space
    tempCtx.canvas.width = ctx.canvas.width + scaledWidthDiff;
    tempCtx.canvas.height = ctx.canvas.height + scaledHeightDiff;

    // rotate temp context
    this.rotateCanvas(tempCtx, this.angle);
    tempCtx.translate(scaledWidthDiff / 2, scaledHeightDiff / 2);

    // draw main canvas into temp canvas
    tempCtx.drawImage(
      ctx.canvas,
      0,
      0,
      ctx.canvas.width,
      ctx.canvas.height,
      0,
      0,
      ctx.canvas.width,
      ctx.canvas.height
    );

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
        10,
        this.controlsStartWidth,
        ctx.canvas.width
      );
      paddingHeight = this.imager.convertScale(
        10,
        this.controlsStartHeight,
        ctx.canvas.height
      );
    }

    // draw temp canvas into main canvas
    ctx.drawImage(
      tempCtx.canvas,
      0, // srcX
      0, // srcY
      tempCtx.canvas.width, // srcWidth
      tempCtx.canvas.height, // srcHeight
      paddingWidth, // destX
      paddingHeight, // destY
      ctx.canvas.width - paddingWidth * 2, // destWidth
      ctx.canvas.height - paddingHeight * 2 // destHeight
    );
  }

  rotateCanvas(context, angle) {
    context.translate(context.canvas.width / 2, context.canvas.height / 2);
    context.rotate(angle);
    context.translate(-context.canvas.width / 2, -context.canvas.height / 2);
  }

  restoreCanvasRotation(context, angle) {
    context.translate(context.canvas.width / 2, context.canvas.height / 2);
    context.rotate(angle * -1);
    context.translate(-context.canvas.width / 2, -context.canvas.height / 2);
  }

  getRotatedDimensions(width, height, angle) {
    if (angle < 0) {
      angle *= -1;
    }

    if (angle > Math.PI * 2) {
      angle = angle - Math.PI * 2;
      angle = Math.PI * 2 - angle;
    }

    if (angle > Math.PI) {
      angle = angle - Math.PI;
      angle = Math.PI - angle;
    }

    if (angle > Math.PI / 2) {
      angle = angle - Math.PI / 2;
      angle = Math.PI / 2 - angle;
    }

    var a = width * Math.cos(angle);
    var b = height * Math.sin(angle);
    var c = a + b;

    var p = width * Math.sin(angle);
    var q = height * Math.cos(angle);
    var r = p + q;

    return {
      width: c,
      height: r,
    };
  }

  getAngle(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1);
  }

  deserialize(savedState) {
    if (savedState && savedState.angle) {
      this.angle = savedState.angle;
    }
  }

  serialize() {
    return {
      angle: this.angle,
    };
  }

  /**
   * Reset all rotation related variables, so on the next rotation start
   * it will start from zeroed rotation.
   */
  reset() {
    this.widthDiff = 0;
    this.heightDiff = 0;
    this.angle = 0;
  }
}
