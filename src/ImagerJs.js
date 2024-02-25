import { nanoid } from "nanoid";
import piexif from "piexifjs";
import { translate } from "./Translations";
import CropPlugin from "./plugins/crop/Crop";
import DeletePlugin from "./plugins/delete/Delete";
import ResizePlugin from "./plugins/resize/Resize";
import RotatePlugin from "./plugins/rotate/Rotate";
import SavePlugin from "./plugins/save/Save";
import ToolbarPlugin from "./plugins/toolbar/Toolbar";
import { UndoPlugin } from "./plugins/undo/Undo";
import * as util from "./util/Util";
import "./imagerJs.css";
import './assets/fontello/css/fontello.css';

const imagerInstances = [];
const pluginsCatalog = {
  // Modal,
  Crop: CropPlugin,
  Delete: DeletePlugin,
  // Properties: PropertiesPlugin,
  Resize: ResizePlugin,
  Rotate: RotatePlugin,
  Save: SavePlugin,
  Toolbar: ToolbarPlugin,
  Undo: UndoPlugin,
};

/**
 *
 * @param $rootElement view to render editor inside
 *
 * @param options {Object} Options
 * @param options.editModeCss {Object} Css object for image edit box.
 * <br>
 * For example, to make background transparent like in photoshop, try this:
 * <br>
 * <code><pre>
 *   {
 *    "background": "url(assets/transparent.png)"
 *   }
 * </pre></code>
 * <br>
 *
 * Edit box border also could be set here like this:
 * <br>
 * <code><pre>
 *   {
 *    "border": "1px dashed green"
 *   }
 * </pre></code>
 *
 * @param {Function} options.detectTouch
 * A custom function that will be used by ImagerJs to determine whether it is
 * running on touch device or not.
 * <br><br>
 *
 * This function must return <code>true</code> or <code>false</code>.
 * <br><br>
 *
 * <code>true</code> means that touch device is detected and ImagerJs should
 * adjust its toolbar size, add touch events etc.
 * <br><br>
 *
 * Note that if this function is not specified, ImagerJs will use its own
 * detection mechanism.
 * <br><br>
 *
 * To disable any detection simply set this parameter to such function:
 * <code><pre>function() { return false; }</pre></code>
 *
 * @param {String} options.waitingCursor
 * Cursor that will be used for long-running operations.
 * <br><br>
 *
 * Example:
 * <code><pre>url(path/to/cursor.cur), default</pre></code>
 *
 * Note the word 'default' at the end: that is the name of cursor that will
 * be used when url is unavailable.
 *
 * More information about css cursor property could be found here:
 * {@link https://developer.mozilla.org/en-US/docs/Web/CSS/cursor}
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/CSS/cursor}
 *
 * @param {Number} options.imageSizeForPerformanceWarning Size in bytes.
 *
 * If image is bigger that provided number, an alert will be shown
 * saying that such big images could cause serious performance issues.
 *
 * @param {Number} options.maxImageWidth Maximum image width in pixels.
 *
 * If image is width is larger than this value it will be scaled down with .
 * This option allows avoiding bad performance with large images.
 *
 * @param {Number} options.maxImageHeight Maximum image height in pixels.
 *
 * If image is width is larger than this value it will be scaled down with .
 * This option allows avoiding bad performance with large images.
 *
 * @param {Number} options.canvasSizeLimit : Maximum canvas size, in pixels.
 * Canvas is scaled down, if it gets more then this value.
 * Default is 32 megapixels for desktop, and 5 megapixels for mobile.
 * Warning: if canvasSizeLimit is set larger, then browser restrictions, big images can fail to load.
 *
 * If image is height is larger than this value it will be scaled down.
 * This option allows avoiding bad performance with large images.
 *
 * @constructor
 * @memberof ImagerJs
 */
export default class Imager {
  constructor($rootElement, options) {
    this.$rootElement = $($rootElement);
    this.$imageElement = $(
      `<img id="${nanoid()}" src="" style="min-width: 300px; min-height: 200px; width: 300px; position: absolute">`
    );

    this.$imageElement.appendTo(this.$rootElement);

    this.defaultOptions = {
      saveData: undefined,
      loadData: undefined,
      quality: 1,
      targetScale: 1,
      format: undefined,
      toolbarButtonSize: 32,
      toolbarButtonSizeTouch: 50,
      editModeCss: {
        border: "1px solid white",
      },
      pluginsConfig: {},
      detectTouch: null,
      waitingCursor: "wait",
      imageSizeForPerformanceWarning: 1000000, // 1 MB
      maxImageWidth: 2048,
      maxImageHeight: 2048,
    };

    options = options ? options : {};
    this.options = $.extend(true, this.defaultOptions, options);

    this.debug = false;

    /**
     * Whether to show temporary canvases that are used to render some image states
     * before final rendering to the canvas that user sees.
     *
     * Use this for debugging with breakpoints.
     *
     * @type {boolean}
     */
    this.showTemporaryCanvas = false;

    this.targetScale = this.options.targetScale;
    this.quality = this.options.quality;

    this._eventEmitter = $({});
    this._isInEditMode = false;

    /**
     * Array containing operations history with images.
     * @type {Array}
     */
    this.history = [];

    imagerInstances.push(this);

    /**
     * Will be set only for jpeg images.
     * Stores exif info of the original image.
     * @type {null|Object}
     */
    this.originalExif = null;

    // 32 MP on desktop
    this.canvasSizeLimit = this.options.canvasSizeLimit || 32 * 1024 * 1024;

    // detect Platform
    this.detectPlatform();

    this.$originalImage = this.$imageElement.clone();

    // this.handleImageElementSrcChanged();

    /**
     * Imager will instantiate all plugins and store them here.
     * @type {Object|null}
     */
    this.pluginsInstances = null;
    this.instantiatePlugins(pluginsCatalog);
  }

  destroy() {
    this.remove();
  }

  on(event, handler) {
    this._eventEmitter.on(event, handler);
  }

  off(event) {
    this._eventEmitter.off(event);
  }

  trigger(event, args) {
    this._eventEmitter.trigger(event, args);

    const eventMethodName =
      "on" + event.substr(0, 1).toUpperCase() + event.substr(1);

    for (const p of this.pluginsInstances) {
      if (p[eventMethodName] !== undefined) {
        p[eventMethodName](args);
      }
    }
  }

  log() {
    if (this.debug) {
      var args = Array.prototype.slice.call(arguments);
      console.log.apply(console, args);
    }
  }

  invokePluginsMethod(methodName) {
    const results = [];
    const args = Array.prototype.slice.call(arguments).slice(1);

    for (const p of this.pluginsInstances) {
      if (p[methodName] !== undefined) {
        var result = p[methodName].apply(p, args);

        if (result) {
          results.push({
            name: p.__name,
            instance: p,
            result: result,
          });
        }
      }
    }

    return results;
  }

  /**
   * Sorts plugins based in their `weight`
   */
  pluginSort(p1, p2) {
    if (p1.weight === undefined || p2.weight === null) {
      p1.weight = Infinity;
    }

    if (p2.weight === undefined || p2.weight === null) {
      p2.weight = Infinity;
    }

    if (p1.weight < p2.weight) {
      return -1;
    }

    if (p1.weight > p2.weight) {
      return 1;
    }

    return 0;
  }

  /*
   * Iterates through plugins array from config and instantiates them.
   */
  instantiatePlugins(plugins) {
    this.pluginsInstances = Object.entries(plugins).map(([name, cls]) => {
      const instance = new cls(this, this.options.pluginsConfig[name] || {});
      instance.__name = name;
      return instance;
    });

    this.pluginsInstances.sort(this.pluginSort);
  }

  /**
   * This function should be called when image's `src` attribute is changed from outside of the imager.
   * It checks `src` attribute, detects image format, prepares image (rotates it according to EXIF for example)
   * and triggers `ready` event on imager.
   */
  handleImageElementSrcChanged() {
    if (!this.options.format) {
      this.options.format = this.getImageFormat(this.$imageElement.attr("src"));
    }

    if (this.$imageElement.attr("data-imager-id")) {
      // if image already has an id, then it has been edited using Imager.
      // and should contain original image data somewhere
      this.id = this.$imageElement.attr("data-imager-id");

      if (this.$imageElement.attr("src").length < 1) {
        throw new Error(
          "Imager was initialized on an empty image. Please check image's `src` attribute. " +
            "It should not be empty."
        );
      }
    } else {
      this.id = nanoid();
      this.$imageElement.attr("data-imager-id", this.id);
    }

    //region prepare image
    // Image needs some preparations before it could be used by imager.
    // Fix EXIF rotation data, make image smaller on slow devices etc.
    this.fixImageSizeAndRotation(this.$imageElement)
      .then((imageData) => {
        this.$imageElement.attr("src", imageData);
        this.$imageElement.attr("imager-attached", true);
      })
      .fail((err) => {
        console.error(err);
      });

    this.$imageElement.on("load.imagerInit", () => {
      this.$imageElement.off("load.imagerInit");
      this.trigger("ready");
    });
  }

  /**
   * Prepares image after first loading. It checks image EXIF data and fixes it's rotation,
   * scales image down if it's too large.
   *
   * @param {HTMLImageElement} $image
   * @returns {jQuery.Deferred.<string>} Image data base64 string
   */
  fixImageSizeAndRotation($image) {
    // first of all we need to avoid HUGE problems that safari has when displaying
    // images that have exif orientation other than 1.
    // So first step is to remove any exif data from image.
    // Since we can do that only on base64 string  - here we check whether our image is a base64
    // encoded string. If yes - we can start right away. If not, we need to download it as data first using
    // XMLHttpRequest.

    var deferred = $.Deferred();

    var imageSrc = $image.attr("src");

    if (imageSrc.length < 1) {
      return $.when("");
    } else if (imageSrc.indexOf("data:image") === 0) {
      return this._fixBase64ImageSizeAndRotation(imageSrc);
    } else if (imageSrc.indexOf("http") === 0) {
      var xhr = new XMLHttpRequest();
      xhr.responseType = "blob";
      xhr.onload = () => {
        var reader = new FileReader();
        reader.onloadend = () => {
          this._fixBase64ImageSizeAndRotation(reader.result).then((imageData) =>
            deferred.resolve(imageData)
          );
        };
        reader.onerror = (err) => {
          deferred.reject(err);
        };
        reader.readAsDataURL(xhr.response);
      };
      xhr.open("GET", imageSrc);
      xhr.send();
      return deferred.promise();
    } else {
      console.error("Unsupported image `src`!");
      return $.when("");
    }
  }

  /**
   * Base64 image data could contain EXIF data which causes
   * @param imageBase64Data
   * @returns {*}
   * @private
   */
  _fixBase64ImageSizeAndRotation(imageBase64Data) {
    var deferred = $.Deferred();

    var imageFormat = this.getImageFormat(this.$imageElement.attr("src"));

    if (imageFormat === "jpeg" || imageFormat === "jpg") {
      // first of all - get rid of any rotation in exif
      this.originalExif = piexif.load(imageBase64Data);
      var originalOrientation =
        this.originalExif["0th"][piexif.ImageIFD.Orientation];
      this.originalExif["0th"][piexif.ImageIFD.Orientation] = 1;
      imageBase64Data = piexif.insert(
        piexif.dump(this.originalExif),
        imageBase64Data
      );
    }

    var image = document.createElement("img");
    image.onload = () => {
      var canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      var ctx = canvas.getContext("2d");

      if (imageFormat === "jpeg" || imageFormat === "jpg") {
        switch (originalOrientation) {
          case 2:
            // horizontal flip
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            break;
          case 3:
            // 180° rotate left
            ctx.translate(canvas.width, canvas.height);
            ctx.rotate(Math.PI);
            break;
          case 4:
            // vertical flip
            ctx.translate(0, canvas.height);
            ctx.scale(1, -1);
            break;
          case 5:
            // vertical flip + 90 rotate right
            canvas.width = image.naturalHeight;
            canvas.height = image.naturalWidth;

            ctx.rotate(0.5 * Math.PI);
            ctx.scale(1, -1);
            break;
          case 6:
            // 90° rotate right and flip canvas width and height
            canvas.width = image.naturalHeight;
            canvas.height = image.naturalWidth;

            ctx.translate(canvas.width, 0);
            ctx.rotate(0.5 * Math.PI);
            break;
          case 7:
            // horizontal flip + 90 rotate right

            canvas.width = image.naturalHeight;
            canvas.height = image.naturalWidth;

            ctx.rotate(0.5 * Math.PI);
            ctx.translate(canvas.width, -canvas.height);
            ctx.scale(-1, 1);
            break;
          case 8:
            // 90° rotate left
            canvas.width = image.naturalHeight;
            canvas.height = image.naturalWidth;

            ctx.rotate(-0.5 * Math.PI);
            ctx.translate(-canvas.width, 0);
            break;
        }
      }

      ctx.drawImage(image, 0, 0);

      if (canvas.width > this.options.maxImageWidth) {
        var newWidth = this.options.maxImageWidth;

        var scalePercent = (this.options.maxImageWidth * 100) / canvas.width;

        var newHeight = (scalePercent * canvas.height) / 100;

        this.log(
          "Image is bigger than we could handle, resizing to",
          newWidth,
          newHeight
        );

        util.resizeImage(
          canvas,
          canvas.width,
          canvas.height,
          newWidth,
          newHeight
        );
      }

      deferred.resolve(canvas.toDataURL(this.options.format));
    };

    image.src = imageBase64Data;

    return deferred.promise();
  }

  async load(file) {
    if (!file) throw new Error("file is required");

    if (file instanceof File) {
      const orig = file;
      file = await new Promise((res, rej) => {
        const reader = new FileReader();

        reader.onerror = rej;
        reader.onload = () => res(reader.result);
        reader.readAsDataURL(orig);
      });
    }

    const onImagerReady = () => {
      this.off("ready", onImagerReady);

      this.startEditing();
    };

    var onImageLoad = () => {
      this.$imageElement.off("load", onImageLoad);

      this.handleImageElementSrcChanged();
      this.on("ready", onImagerReady);
    };

    setTimeout(() => {
      this.$imageElement.attr("src", file);
      this.$imageElement.css("height", "auto");
      this.$imageElement.css("min-height", "inherit");
      this.$imageElement.css("min-width", "inherit");

      this.$imageElement.on("load", onImageLoad);
    }, 200);
  }

  startEditing() {
    this.log("startEditing()");

    this.hideOriginalImage();

    if (!this.$imageElement[0].complete) {
      throw new Error(
        "Trying to start editing image that was not yet loaded. " +
          "Please add `ready` event listener to imager."
      );
    }

    this.originalPreviewWidth = this.$imageElement.width();
    this.originalPreviewHeight = this.$imageElement.height();

    const outerId = nanoid();
    const innerId = nanoid();

    this.$rootElement.append(`
    <div id="${outerId}" class="imager-edit-outer-container">
    <div id="${innerId}" class="imager-edit-container" tabindex="1"></div>
    </div>
    `);

    this.$editOuterContainer = $(`#${outerId}`);
    this.$editContainer = $(`#${innerId}`);

    if (this.options.editModeCss) {
      this.$editContainer.css(this.options.editModeCss);
    }

    this._createEditCanvas();

    this.adjustEditContainer();

    this.trigger("editStart");

    this.render();

    this._isInEditMode = true;

    this.$editContainer.focus();

    var sizeInBytes = this.getDataSize();
    if (sizeInBytes > this.options.imageSizeForPerformanceWarning) {
      util.setOverlayMessage(
        this.$editContainer,
        "Image is too big and could cause very poor performance.",
        "default",
        "Ok",
        () => util.removeOverlayMessage(this.$editContainer)
      );
    }

    this._adjustElementsSize(
      "toolbar-button",
      this.touchDevice
        ? this.options.toolbarButtonSizeTouch
        : this.options.toolbarButtonSize
    );

    // clean up the history
    if (this.history.length === 0) {
      this.commitChanges("Original");
    }

    this.trigger("historyChange");
  }

  stopEditing() {
    if (!this._isInEditMode) {
      return;
    }

    this.showOriginalImage();

    this.render();

    var pluginsDataRaw = this.invokePluginsMethod("serialize");
    var pluginsData = {};
    $(pluginsDataRaw).each((i, d) => {
      pluginsData[d.name] = d.result;
    });

    var imageData = null;

    try {
      imageData = this.canvas.toDataURL(
        "image/" + this.options.format,
        this.quality
      );
    } catch (err) {
      if (err.name && err.name === "SecurityError") {
        console.error(
          "Failed to get image data from canvas because of security error." +
            "Usually this happens when image drawed on canvas is located on separate domain without" +
            "proper access-control headers."
        );
      } else {
        console.error(err);
      }
    }

    if (!imageData) {
      console.error("Failed to get image data from canvas.");
    }

    // save current changes to image
    this.$imageElement.attr("src", imageData);

    this.$editContainer.remove();
    this.$editOuterContainer.remove();

    this.$editOuterContainer = null;
    this.$editContainer = null;

    this.canvas = null;
    this.tempCanvas = null;

    this.trigger("editStop", {
      imageData: imageData,
      pluginsData: pluginsData,
    });

    this._isInEditMode = false;
  }

  /**
   * Change the container's z-index property.
   *
   * @param zIndexValue
   */
  setZindex(zIndexValue) {
    if (this.$editContainer) {
      this.$editContainer.css("z-index", zIndexValue);
    }
  }

  /**
   * Stores current image to history, then renders current canvas into image.
   *
   * @param operationMessage
   */
  commitChanges(operationMessage, callback) {
    var originalQuality = this.quality;
    var originalTargetScale = this.targetScale;

    this.quality = 1;
    this.targetScale = 1;
    this.adjustCanvasSize();
    this.render();

    const imageLoadHandler = () => {
      this.$imageElement.off("load", imageLoadHandler);

      this.quality = originalQuality;
      this.targetScale = originalTargetScale;
      this.adjustCanvasSize();

      this.history.push({
        message: operationMessage,
        image: imageData,
        width: this.$imageElement.width(),
        height: this.$imageElement.height(),
      });

      this.originalPreviewWidth = this.$imageElement.width();
      this.originalPreviewHeight = this.$imageElement.height();

      this.render();
      this.trigger("historyChange");

      if (callback && callback instanceof Function) {
        callback();
      }
    };

    const onImageLoadError = (event) => {
      console.warn("commitChanges() : image failed to load :", event);
    };

    // save current canvas image to image element
    var imageData = this.canvas.toDataURL("image/" + this.options.format, 100);

    // set image loading handlers
    this.$imageElement.on("load", imageLoadHandler);
    this.$imageElement.on("error", onImageLoadError);

    // load image
    this.$imageElement.attr("src", imageData);
  }

  isInEditMode() {
    return this._isInEditMode;
  }

  /**
   * Creates canvas for showing temporary edited image.
   * Created temporary canvas for drawing temporary data by plugins etc.
   *
   * Those canvases could be accessed as this.canvas and this.tempCanvas.
   *
   * @private
   */
  _createEditCanvas() {
    var imageWidth = this.$imageElement.width();
    var imageHeight = this.$imageElement.height();

    var imageNaturalWidth = this.$imageElement[0].naturalWidth;
    var imageNaturalHeight = this.$imageElement[0].naturalHeight;

    var $canvas = $('<canvas class="imager-edit-canvas"/>');
    $canvas.css({
      width: imageWidth,
      height: imageHeight,
    });

    this.canvas = $canvas[0];

    this.adjustCanvasSize();

    this.$editContainer.append($canvas);

    this.tempCanvas = document.createElement("canvas");
    this.tempCanvas.classList.add("imager-temp-canvas");
    this.tempCanvas.width = imageNaturalWidth;
    this.tempCanvas.height = imageNaturalHeight;

    if (this.showTemporaryCanvas) {
      this.$rootElement.append(this.tempCanvas);
      $(this.tempCanvas).css({
        position: "absolute",
        left: "50px",
        top: "50px",
        width: imageWidth,
      });
    }
  }

  /**
   * Renders image on temporary canvas and then invokes plugin methods
   * that shoul modify image.
   *
   * @param [ctx] Context on which to draw image.
   */
  render(ctx) {
    ctx = ctx !== undefined ? ctx : this.canvas.getContext("2d");

    var realWidth = this.$imageElement[0].naturalWidth;
    var realHeight = this.$imageElement[0].naturalHeight;

    if (realWidth === 0 || realHeight === 0) {
      console.warn("Trying to render canvas with zero width or height");
      console.trace();
      return;
    }

    // reset canvas size to image natural size
    ctx.canvas.width = realWidth * this.targetScale;
    ctx.canvas.height = realHeight * this.targetScale;

    this.tempCanvas.width = realWidth;
    this.tempCanvas.height = realHeight;

    var destWidth = ctx.canvas.width;
    var destHeight = ctx.canvas.height;

    var viewPort = {
      sourceLeft: 0,
      sourceTop: 0,
      sourceWidth: realWidth,
      sourceHeight: realHeight,
      destLeft: 0,
      destTop: 0,
      destWidth: destWidth,
      destHeight: destHeight,
      paddingWidth: 0,
      paddingHeight: 0,
    };

    this.drawImage(this.$imageElement, ctx, viewPort);

    this.invokePluginsMethod("render", ctx);
  }

  clearCanvas(ctx) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    if (this.options.format == "jpeg") {
      ctx.fillStyle = "#FFFFFF"; // jpeg does not support transparency
      // so without this line all non painted areas will be black.
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  }

  drawImage($img, ctx, viewPort) {
    if (ctx.canvas.width === 0 || ctx.canvas.height === 0) {
      console.warn(
        "Imager.drawImage() : Trying to render canvas with either width or height equal to 0"
      );
      return;
    }

    this._drawWithScaling(
      $img,
      ctx,
      this.tempCanvas.getContext("2d"),
      viewPort.sourceLeft,
      viewPort.sourceTop,
      viewPort.sourceWidth,
      viewPort.sourceHeight,

      viewPort.destLeft,
      viewPort.destTop,
      viewPort.destWidth,
      viewPort.destHeight,

      viewPort.paddingWidth,
      viewPort.paddingHeight
    );
  }

  /**
   * Draws image on canvas with specified dimensions.
   * Drawing is performed in few steps to make image smooth.
   *
   * More information about interpolation here:
   * http://stackoverflow.com/questions/17861447/html5-canvas-drawimage-how-to-apply-antialiasing
   *
   * @param {HTMLImageElement} $img Image to draw
   * @param ctx           Canvas context to draw on
   * @param tempCtx       Temporary canvas context to draw on interpolation steps
   * @param sourceLeft    Source image x coordinate
   * @param sourceTop     Source image y coordinate
   * @param sourceWidth   Source image width
   * @param sourceHeight  Source image height
   * @param destLeft      Destination image x coordinate
   * @param destTop       Destination image y coordinate
   * @param destWidth     Destination image width
   * @param destHeight    Destination image height
   * @param paddingWidth  Width padding that will be applied to target image
   * @param paddingHeight Height padding that will be applied to target image
   * @private
   */
  _drawWithScaling(
    $img,
    ctx,
    tempCtx,
    sourceLeft,
    sourceTop,
    sourceWidth,
    sourceHeight,
    destLeft,
    destTop,
    destWidth,
    destHeight,
    paddingWidth,
    paddingHeight
  ) {
    paddingWidth = paddingWidth !== undefined ? paddingWidth : 0;
    paddingHeight = paddingHeight !== undefined ? paddingHeight : 0;

    sourceLeft = sourceLeft !== undefined ? sourceLeft : 0;
    sourceTop = sourceTop !== undefined ? sourceTop : 0;

    var paddingWidthHalf = paddingWidth / 2;
    var paddingHeightHalf = paddingHeight / 2;

    var tempCanvas = tempCtx.canvas;

    tempCtx.clearRect(0, 0, sourceWidth, sourceHeight);

    var img = $img[0];

    var steps = 3;

    var step = 0.5;

    var currentStepWidth = sourceWidth;
    var currentStepHeight = sourceHeight;

    var currentStepSourceLeft = sourceLeft;
    var currentStepSourceTop = sourceTop;

    tempCtx.drawImage(
      img,
      currentStepSourceLeft,
      currentStepSourceTop,
      sourceWidth,
      sourceHeight,
      0,
      0,
      currentStepWidth,
      currentStepHeight
    );

    for (var s = 0; s < steps; s++) {
      if (
        currentStepWidth <= destWidth * 2 ||
        currentStepHeight <= destHeight * 2
      ) {
        break;
      }

      var prevStepWidth = currentStepWidth;
      var prevStepHeight = currentStepHeight;

      currentStepWidth *= step;
      currentStepHeight *= step;

      currentStepSourceLeft *= step;
      currentStepSourceTop *= step;

      var stepTempCanvas = document.createElement("canvas");
      stepTempCanvas.width = tempCtx.canvas.width;
      stepTempCanvas.height = tempCtx.canvas.height;

      var stepTempCtx = stepTempCanvas.getContext("2d");
      stepTempCtx.clearRect(0, 0, stepTempCanvas.width, stepTempCanvas.height);

      stepTempCtx.drawImage(
        tempCanvas,
        currentStepSourceLeft,
        currentStepSourceTop,
        prevStepWidth,
        prevStepHeight,
        0,
        0,
        currentStepWidth,
        currentStepHeight
      );

      tempCtx.clearRect(0, 0, tempCtx.canvas.width, tempCtx.canvas.height);

      tempCtx.drawImage(
        stepTempCanvas,
        0,
        0,
        currentStepWidth,
        currentStepHeight,
        0,
        0,
        currentStepWidth,
        currentStepHeight
      );
    }

    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    ctx.drawImage(
      tempCanvas,
      0,
      0,
      currentStepWidth,
      currentStepHeight,
      destLeft + paddingWidthHalf,
      destTop + paddingHeightHalf,
      destWidth - paddingWidth,
      destHeight - paddingHeight
    );
  }

  /**
   * Sets preview area dimensions.
   * Note that this affects only the size of image that user sees.
   * Internal image size is not affected.
   *
   * @param {number} width
   * @param {number} height
   */
  setPreviewSize(width, height) {
    this.$editContainer.css({
      width: width,
      height: height,
    });

    this.$imageElement.css({
      width: width,
      height: height,
    });

    $(this.canvas).css({
      width: width,
      height: height,
    });

    $("body").trigger("imagerResize");
    this.log("resize trigger");

    this.originalPreviewWidth = this.$imageElement.width();
    this.originalPreviewHeight = this.$imageElement.height();
  }

  getPreviewSize() {
    return {
      width: this.$imageElement.width(),
      height: this.$imageElement.height(),
    };
  }

  getImageRealSize() {
    return {
      width: this.$imageElement[0].naturalWidth,
      height: this.$imageElement[0].naturalHeight,
    };
  }

  getCanvasSize() {
    return {
      width: this.canvas.width,
      height: this.canvas.height,
    };
  }

  convertScale(value, sourceMax, targetMax) {
    var valueInPercents = (value * 100) / sourceMax;

    return (valueInPercents * targetMax) / 100;
  }

  hideOriginalImage() {
    this.$imageElement.css("opacity", 0);
  }

  showOriginalImage() {
    this.$imageElement.css("opacity", 1);
  }

  /**
   * Takes image's real size (naturalWidth & naturalHeight)
   * and adjust canvas size to match that
   * but with respect to aspect ratio of preview viewport size.
   */
  adjustCanvasSize() {
    var imageRealSize = this.getImageRealSize();
    var previewSize = this.getPreviewSize();

    var newCanvasWidth = 0;
    var newCanvasHeight = 0;

    var aspectRatio = 0;

    if (previewSize.width > previewSize.height) {
      newCanvasWidth = imageRealSize.width;

      aspectRatio = (previewSize.height * 100) / previewSize.width;
      newCanvasHeight = (aspectRatio * newCanvasWidth) / 100;
    } else {
      newCanvasHeight = imageRealSize.height;

      aspectRatio = (previewSize.width * 100) / previewSize.height;
      newCanvasWidth = (aspectRatio * newCanvasHeight) / 100;
    }

    this.canvas.width = newCanvasWidth * this.targetScale;
    this.canvas.height = newCanvasHeight * this.targetScale;

    // if canvas size limit is set - check canvas size
    this.canvasSizeLimit = 1 * 1024 * 1024;
    if (this.canvasSizeLimit) {
      if (this.canvas.width * this.canvas.height > this.canvasSizeLimit) {
        console.warn(
          "adjustCanvasSize(): canvas size is too big : ",
          this.canvas.width,
          this.canvas.height
        );
        var ratio =
          (0.95 * this.canvasSizeLimit) /
          (this.canvas.width * this.canvas.height);

        this.canvas.width = this.canvas.width * ratio;
        this.canvas.height = this.canvas.height * ratio;
        console.warn(
          "adjustCanvasSize(): canvas was reduced to : ",
          this.canvas.width,
          this.canvas.height
        );
      }
    }
  }

  /**
   * Positions $editContained with absolute coordinates
   * to be on top of $imageElement.
   */
  adjustEditContainer() {
    var imageOffset = this.$imageElement.offset();

    if (this.$editContainer) {
      this.$editContainer.css({
        // left: imageOffset.left,
        // top: imageOffset.top,
        width: this.$imageElement.width(),
        height: this.$imageElement.height(),
      });
    }
  }

  restoreOriginal() {
    this.$imageElement.replaceWith(this.$originalImage);
  }

  historyUndo() {
    if (this.history.length < 2) {
      return;
    }

    var lastEntry = this.history[this.history.length - 2];

    const imageLoadHandler = () => {
      this.$imageElement.off("load", imageLoadHandler);

      this.originalPreviewWidth = this.$imageElement.width();
      this.originalPreviewHeight = this.$imageElement.height();

      this.setPreviewSize(lastEntry.width, lastEntry.height);

      this.render();
      this.history.splice(this.history.length - 1, 1);

      this.trigger("historyChange");
    };

    this.$imageElement.on("load", imageLoadHandler);
    this.$imageElement.attr("src", lastEntry.image);

    this.$imageElement.width(lastEntry.width);
    this.$imageElement.height(lastEntry.height);
  }

  remove(removeImage) {
    this.trigger("remove");

    this.$imageElement.removeAttr("imager-attached");
    this.stopEditing();
    this.showOriginalImage();
    var index = imagerInstances.indexOf(this);
    imagerInstances.splice(index, 1);

    this.$originalImage = null;
    this.pluginsInstances = null;

    if (removeImage) {
      this.$imageElement.remove();
    }
  }

  /**
   * Returns current image data in bytes.
   *
   * @returns {number} Bytes number
   */
  getDataSize() {
    var head = "data:" + "image/" + this.options.format + ";base64,";
    var data = this.canvas.toDataURL(
      "image/" + this.options.format,
      this.quality
    );

    var size = Math.round(((data.length - head.length) * 3) / 4);

    return size;
  }

  /**
   * Tries to find Imager instance associated with provided img element.
   *
   * @param $img {HTMLImageElement|jQuery}
   * @returns {Imager|undefined}
   */
  static getImagerFor($img) {
    for (var i = 0; i < imagerInstances.length; i++) {
      var imager = imagerInstances[i];

      if (imager.id == $($img).attr("data-imager-id")) {
        return imager;
      }
    }

    return undefined;
  }

  static isImagerAttached($elem) {
    return $($elem).attr("imager-attached") !== undefined;
  }

  /**
   * @param {boolean} waiting Waiting status. TRUE for adding 'waiting' text,
   * false to remove.
   */
  setWaiting(waiting) {
    if (waiting) {
      if (this.$editContainer) {
        util.setWaiting(
          this.$editContainer,
          translate("Please wait..."),
          this.options.waitingCursor
        );
      }
    } else {
      util.stopWaiting(this.$editContainer);
    }
  }

  /**
   * Detects image format for either base64 encoded string or http:// url.
   * @param {string} imageSrc
   */
  getImageFormat(imageSrc) {
    if (!imageSrc) {
      return;
    }

    var extension;

    if (imageSrc.indexOf("http") === 0) {
      extension = imageSrc.split(".").pop();

      if (extension == "jpeg") {
        extension = "jpeg";
      } else if (extension == "jpg") {
        extension = "jpeg";
      } else if (extension == "png") {
        extension = "png";
      }
    } else if (imageSrc.indexOf("data:image") === 0) {
      if (imageSrc[11] == "j") {
        extension = "jpeg";
      } else if (imageSrc[11] == "p") {
        extension = "png";
      }
    }

    return extension;
  }

  /**
   * This method allows dynamical size adjustment of elements.
   * Elements which needs to be resized should have two attributes:
   *
   * data-sizeable="someNamespace",
   * where someNamespace is unique id for the group of elements tht will be
   * resized together.
   *
   * data-cssrules=width,height,font-size:($v / 2.5)
   * which provides a list of css rules on which a new size will be applied.
   * If resulting size needs to be modififed in some way, the one could
   * specify a function like in font-size.
   *
   * @private
   */
  _adjustElementsSize(namespace, newSize) {
    var elementsToResize = $("[data-sizeable=" + namespace + "]");

    for (var i = 0; i < elementsToResize.length; i++) {
      var elem = elementsToResize[i];
      var attributesToChange = $(elem).attr("data-cssrules")?.split(",");
      if (!attributesToChange) return;

      for (var a = 0; a < attributesToChange.length; a++) {
        var attrName = attributesToChange[a];
        var attrVal = newSize;

        if (attrName[0] == "-") {
          attrName = attrName.substr(1);
          attrVal = "-" + newSize;
        }

        var matches = attrName.match(/:\((.+)\)/);
        if (matches) {
          attrName = attrName.replace(matches[0], "");
          var expression = matches[1];
          expression = expression.replace("$v", attrVal);
          var result = new Function("return " + expression)();
          attrVal = result;
        }

        $(elem).css(attrName, attrVal + "px");
      }
    }
  }

  /**
   * Crude detection of device and platform.
   * Sets this.platform and this.touchDevice.
   * @todo this is BAD. Use more precise methods or some lib
   */
  detectPlatform() {
    // crude check of platform
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      this.platform = PLATFORM.ios;
    } else if (/Android|BlackBerry/i.test(navigator.userAgent)) {
      this.platform = PLATFORM.android;
    } else if (/IEMobile/i.test(navigator.userAgent)) {
      this.platform = PLATFORM.windowsMobile;
    }

    // check if options.detectTouch is function
    if (
      this.options.detectTouch &&
      this.options.detectTouch.constructor.name !== "Function"
    ) {
      console.error(
        "detectTouch should be a function which will be " +
          "called when Imager needs to determine whether it is working " +
          "on touch device"
      );
      this.options.detectTouch = null;
    }

    // crude check of touch
    if (this.options.detectTouch) {
      this.touchDevice = this.options.detectTouch(this);
    } else {
      this.touchDevice = /(iPhone|iPod|iPad|BlackBerry|Android)/i.test(
        navigator.userAgent
      );
    }

    // one more touch check

    $("body").on("touchstart.DrawerTouchCheck", () => {
      this.touchDevice = true;
      $("body").off("touchstart.DrawerTouchCheck");
      this.log("Found touch screen.");
    });
  }
}
