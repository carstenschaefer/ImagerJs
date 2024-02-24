(() => {
  // live-reload.js
  try {
    if (!window.live_reload_enabled) {
      window.live_reload_enabled = true;
      const url = `http://localhost:8989/esbuild`;
      new EventSource(url).addEventListener("change", () => {
        document.body.innerHTML = "<h1>RELOADING<h1>";
        location.reload();
      });
      console.log("live reload enabled: ", url);
    }
  } catch (error) {
    console.error("live reload failed", error);
  }

  // src/ImagerJs.js
  var imagerInstances = [];
  var PLATFORM = {
    ios: "ios",
    android: "android",
    windowsMobile: "windowsMobile",
    genericMobile: "genericMobile"
  };
  var Imager = function($imageElement, options) {
    var _this = this;
    _this.$imageElement = $($imageElement);
    _this.defaultOptions = {
      saveData: void 0,
      loadData: void 0,
      quality: 1,
      targetScale: 1,
      plugins: [],
      format: void 0,
      toolbarButtonSize: 32,
      toolbarButtonSizeTouch: 50,
      editModeCss: {
        border: "1px solid white"
      },
      pluginsConfig: {},
      detectTouch: null,
      waitingCursor: "wait",
      imageSizeForPerformanceWarning: 1e6,
      // 1 MB
      maxImageWidth: 2048,
      maxImageHeight: 2048
    };
    options = options ? options : {};
    _this.options = $.extend(true, _this.defaultOptions, options);
    _this.debug = false;
    _this.showTemporaryCanvas = false;
    _this.targetScale = _this.options.targetScale;
    _this.quality = _this.options.quality;
    _this._eventEmitter = $({});
    _this._isInEditMode = false;
    _this.history = [];
    imagerInstances.push(_this);
    _this.originalExif = null;
    this.detectPlatform();
    if (!this.options.canvasSizeLimit) {
      if ([PLATFORM.ios, PLATFORM.android, PLATFORM.windowsMobile].indexOf(
        _this.platform
      ) !== -1) {
        this.canvasSizeLimit = 5 * 1024 * 1024;
      } else {
        this.canvasSizeLimit = 32 * 1024 * 1024;
      }
    }
    _this.$originalImage = _this.$imageElement.clone();
    _this.handleImageElementSrcChanged();
    _this.pluginsInstances = null;
    _this.instantiatePlugins(pluginsCatalog);
    $("body").on("imagerResize", function() {
      _this.adjustEditContainer();
    });
    $(window).on("resize", function() {
      _this.adjustEditContainer();
    });
  };
  Imager.prototype.on = function(event, handler) {
    this._eventEmitter.on(event, handler);
  };
  Imager.prototype.off = function(event) {
    this._eventEmitter.off(event);
  };
  Imager.prototype.trigger = function(event, args) {
    this._eventEmitter.trigger(event, args);
    var eventMethodName = "on" + event.substr(0, 1).toUpperCase() + event.substr(1);
    for (var i = 0; i < this.pluginsInstances.length; i++) {
      var p = this.pluginsInstances[i];
      if (p[eventMethodName] !== void 0) {
        p[eventMethodName](args);
      }
    }
  };
  Imager.prototype.log = function() {
    if (this.debug) {
      var args = Array.prototype.slice.call(arguments);
      console.log.apply(console, args);
    }
  };
  Imager.prototype.invokePluginsMethod = function(methodName) {
    var results = [];
    var args = Array.prototype.slice.call(arguments);
    args = args.slice(1);
    for (var i = 0; i < this.pluginsInstances.length; i++) {
      var p = this.pluginsInstances[i];
      if (p[methodName] !== void 0) {
        var result = p[methodName].apply(p, args);
        if (result) {
          results.push({
            name: p.__name,
            instance: p,
            result
          });
        }
      }
    }
    return results;
  };
  Imager.prototype.pluginSort = function(p1, p2) {
    if (p1.weight === void 0 || p2.weight === null) {
      p1.weight = Infinity;
    }
    if (p2.weight === void 0 || p2.weight === null) {
      p2.weight = Infinity;
    }
    if (p1.weight < p2.weight) {
      return -1;
    }
    if (p1.weight > p2.weight) {
      return 1;
    }
    return 0;
  };
  Imager.prototype.instantiatePlugins = function(plugins) {
    this.pluginsInstances = [];
    for (var pluginName in plugins) {
      if (this.options.plugins.indexOf(pluginName) > -1) {
        if (plugins.hasOwnProperty(pluginName)) {
          var pluginInstance = new plugins[pluginName](
            this,
            this.options.pluginsConfig[pluginName]
          );
          pluginInstance.__name = pluginName;
          this.pluginsInstances.push(pluginInstance);
        }
      }
    }
    this.pluginsInstances.sort(this.pluginSort);
  };
  Imager.prototype.getPluginInstance = function(pluginName) {
    for (var i = 0; i < this.pluginsInstances.length; i++) {
      var p = this.pluginsInstances[i];
      if (p.__name == pluginName) {
        return p;
      }
    }
    return void 0;
  };
  Imager.prototype.handleImageElementSrcChanged = function() {
    var _this = this;
    if (!_this.options.format) {
      _this.options.format = _this.getImageFormat(  
        _this.$imageElement.attr("src")
      );
    }
    if (_this.$imageElement.attr("data-imager-id")) {
      _this.id = _this.$imageElement.attr("data-imager-id");
      if (_this.$imageElement.attr("src").length < 1) {
        throw new Error(
          "Imager was initialized on an empty image. Please check image's `src` attribute. It should not be empty."
        );
      }
    } else {
      _this.id = util.uuid();
      _this.$imageElement.attr("data-imager-id", _this.id);
    }
    _this.fixImageSizeAndRotation(_this.$imageElement).then(function(imageData) {
      _this.$imageElement.attr("src", imageData);
      _this.$imageElement.attr("imager-attached", true);
    }).fail(function(err) {
      console.error(err);
    });
    _this.$imageElement.on("load.imagerInit", function() {
      _this.$imageElement.off("load.imagerInit");
      _this.trigger("ready");
    });
  };
  Imager.prototype.fixImageSizeAndRotation = function($image) {
    var _this = this;
    var deferred = $.Deferred();
    var imageSrc = $image.attr("src");
    if (imageSrc.length < 1) {
      return $.when("");
    } else if (imageSrc.indexOf("data:image") === 0) {
      return this._fixBase64ImageSizeAndRotation(imageSrc);
    } else if (imageSrc.indexOf("http") === 0) {
      var xhr = new XMLHttpRequest();
      xhr.responseType = "blob";
      xhr.onload = function() {
        var reader = new FileReader();
        reader.onloadend = function() {
          _this._fixBase64ImageSizeAndRotation(reader.result).then(function(imageData) {
            deferred.resolve(imageData);
          });
        };
        reader.onerror = function(err) {
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
  };
  Imager.prototype._fixBase64ImageSizeAndRotation = function(imageBase64Data) {
    var _this = this;
    var deferred = $.Deferred();
    var imageFormat = _this.getImageFormat(_this.$imageElement.attr("src"));
    if (imageFormat === "jpeg" || imageFormat === "jpg") {
      this.originalExif = piexif.load(imageBase64Data);
      var originalOrientation = this.originalExif["0th"][piexif.ImageIFD.Orientation];
      this.originalExif["0th"][piexif.ImageIFD.Orientation] = 1;
      imageBase64Data = piexif.insert(
        piexif.dump(this.originalExif),
        imageBase64Data
      );
    }
    var image = document.createElement("img");
    image.onload = imageLoaded;
    image.src = imageBase64Data;
    function imageLoaded() {
      var canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      var ctx = canvas.getContext("2d");
      if (imageFormat === "jpeg" || imageFormat === "jpg") {
        switch (originalOrientation) {
          case 2:
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
            break;
          case 3:
            ctx.translate(canvas.width, canvas.height);
            ctx.rotate(Math.PI);
            break;
          case 4:
            ctx.translate(0, canvas.height);
            ctx.scale(1, -1);
            break;
          case 5:
            canvas.width = image.naturalHeight;
            canvas.height = image.naturalWidth;
            ctx.rotate(0.5 * Math.PI);
            ctx.scale(1, -1);
            break;
          case 6:
            canvas.width = image.naturalHeight;
            canvas.height = image.naturalWidth;
            ctx.translate(canvas.width, 0);
            ctx.rotate(0.5 * Math.PI);
            break;
          case 7:
            canvas.width = image.naturalHeight;
            canvas.height = image.naturalWidth;
            ctx.rotate(0.5 * Math.PI);
            ctx.translate(canvas.width, -canvas.height);
            ctx.scale(-1, 1);
            break;
          case 8:
            canvas.width = image.naturalHeight;
            canvas.height = image.naturalWidth;
            ctx.rotate(-0.5 * Math.PI);
            ctx.translate(-canvas.width, 0);
            break;
        }
      }
      ctx.drawImage(image, 0, 0);
      if (canvas.width > _this.options.maxImageWidth) {
        var newWidth = _this.options.maxImageWidth;
        var scalePercent = _this.options.maxImageWidth * 100 / canvas.width;
        var newHeight = scalePercent * canvas.height / 100;
        _this.log(
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
      deferred.resolve(canvas.toDataURL(_this.options.format));
    }
    return deferred.promise();
  };
  Imager.prototype.startSelector = function() {
    var _this = this;
    this.$selectorContainer = $(
      '<div class="imager-selector-container" tabindex="1"></div>'
    );
    var onImagerReady = function() {
      _this.off("ready", onImagerReady);
      _this.startEditing();
      _this.$selectorContainer.remove();
      _this.$selectorContainer = null;
    };
    var onImageLoad = function() {
      _this.$imageElement.off("load", onImageLoad);
      _this.handleImageElementSrcChanged();
      _this.on("ready", onImagerReady);
    };
    var fileSelector = new util.FileSelector("image/*");
    fileSelector.onFileSelected(function(file) {
      util.setWaiting(_this.$selectorContainer, translations.t("Please wait..."));
      setTimeout(function() {
        _this.$imageElement.attr("src", file.data);
        _this.$imageElement.css("height", "auto");
        _this.$imageElement.css("min-height", "inherit");
        _this.$imageElement.css("min-width", "inherit");
        _this.$imageElement.on("load", onImageLoad);
      }, 200);
    });
    this.$selectorContainer.append(fileSelector.getElement());
    $("body").append(this.$selectorContainer);
    var imageOffset = this.$imageElement.offset();
    this.$selectorContainer.css({
      left: imageOffset.left,
      top: imageOffset.top,
      width: this.$imageElement.width(),
      height: this.$imageElement.height()
    });
  };
  Imager.prototype.startEditing = function() {
    this.log("startEditing()");
    this.hideOriginalImage();
    if (!this.$imageElement[0].complete) {
      throw new Error(
        "Trying to start editing image that was not yet loaded. Please add `ready` event listener to imager."
      );
    }
    this.originalPreviewWidth = this.$imageElement.width();
    this.originalPreviewHeight = this.$imageElement.height();
    this.$editContainer = $(
      '<div class="imager-edit-container" tabindex="1"></div>'
    );
    if (this.options.editModeCss) {
      this.$editContainer.css(this.options.editModeCss);
    }
    $("body").append(this.$editContainer);
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
        function() {
          util.removeOverlayMessage(this.$editContainer);
        }.bind(this)
      );
    }
    this._adjustElementsSize(
      "toolbar-button",
      this.touchDevice ? this.options.toolbarButtonSizeTouch : this.options.toolbarButtonSize
    );
    if (this.history.length === 0) {
      this.commitChanges("Original");
    }
    this.trigger("historyChange");
  };
  Imager.prototype.stopEditing = function() {
    if (!this._isInEditMode) {
      return;
    }
    this.showOriginalImage();
    this.render();
    var pluginsDataRaw = this.invokePluginsMethod("serialize");
    var pluginsData = {};
    $(pluginsDataRaw).each(function(i, d) {
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
          "Failed to get image data from canvas because of security error.Usually this happens when image drawed on canvas is located on separate domain withoutproper access-control headers."
        );
      } else {
        console.error(err);
      }
    }
    if (!imageData) {
      console.error("Failed to get image data from canvas.");
    }
    this.$imageElement.attr("src", imageData);
    this.$editContainer.remove();
    this.$editContainer = null;
    this.canvas = null;
    this.tempCanvas = null;
    this.trigger("editStop", { imageData, pluginsData });
    this._isInEditMode = false;
  };
  Imager.prototype.setZindex = function(zIndexValue) {
    if (this.$editContainer) {
      this.$editContainer.css("z-index", zIndexValue);
    }
  };
  Imager.prototype.commitChanges = function(operationMessage, callback) {
    var _this = this;
    var originalQuality = this.quality;
    var originalTargetScale = this.targetScale;
    this.quality = 1;
    this.targetScale = 1;
    this.adjustCanvasSize();
    this.render();
    var imageData = this.canvas.toDataURL("image/" + this.options.format, 100);
    this.$imageElement.on("load", imageLoadHandler);
    this.$imageElement.on("error", onImageLoadError);
    this.$imageElement.attr("src", imageData);
    function imageLoadHandler() {
      _this.$imageElement.off("load", imageLoadHandler);
      _this.quality = originalQuality;
      _this.targetScale = originalTargetScale;
      _this.adjustCanvasSize();
      _this.history.push({
        message: operationMessage,
        image: imageData,
        width: _this.$imageElement.width(),
        height: _this.$imageElement.height()
      });
      _this.originalPreviewWidth = _this.$imageElement.width();
      _this.originalPreviewHeight = _this.$imageElement.height();
      _this.render();
      _this.trigger("historyChange");
      if (callback && callback instanceof Function) {
        callback();
      }
    }
    function onImageLoadError(event) {
      console.warn("commitChanges() : image failed to load :", event);
      console.trace();
    }
  };
  Imager.prototype.isInEditMode = function() {
    return this._isInEditMode;
  };
  Imager.prototype._createEditCanvas = function() {
    var imageWidth = this.$imageElement.width();
    var imageHeight = this.$imageElement.height();
    var imageNaturalWidth = this.$imageElement[0].naturalWidth;
    var imageNaturalHeight = this.$imageElement[0].naturalHeight;
    var $canvas = $('<canvas class="imager-edit-canvas"/>');
    $canvas.css({
      width: imageWidth,
      height: imageHeight
    });
    this.canvas = $canvas[0];
    this.adjustCanvasSize();
    this.$editContainer.append($canvas);
    this.tempCanvas = document.createElement("canvas");
    this.tempCanvas.width = imageNaturalWidth;
    this.tempCanvas.height = imageNaturalHeight;
    if (this.showTemporaryCanvas) {
      $("body").append(this.tempCanvas);
      $(this.tempCanvas).css({
        position: "absolute",
        left: "50px",
        top: "50px",
        width: imageWidth
      });
    }
  };
  Imager.prototype.render = function(ctx) {
    ctx = ctx !== void 0 ? ctx : this.canvas.getContext("2d");
    var realWidth = this.$imageElement[0].naturalWidth;
    var realHeight = this.$imageElement[0].naturalHeight;
    if (realWidth === 0 || realHeight === 0) {
      console.warn("Trying to render canvas with zero width or height");
      console.trace();
      return;
    }
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
      destWidth,
      destHeight,
      paddingWidth: 0,
      paddingHeight: 0
    };
    this.drawImage(this.$imageElement, ctx, viewPort);
    this.invokePluginsMethod("render", ctx);
  };
  Imager.prototype.clearCanvas = function(ctx) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (this.options.format == "jpeg") {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    }
  };
  Imager.prototype.drawImage = function($img, ctx, viewPort) {
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
  };
  Imager.prototype._drawWithScaling = function($img, ctx, tempCtx, sourceLeft, sourceTop, sourceWidth, sourceHeight, destLeft, destTop, destWidth, destHeight, paddingWidth, paddingHeight) {
    paddingWidth = paddingWidth !== void 0 ? paddingWidth : 0;
    paddingHeight = paddingHeight !== void 0 ? paddingHeight : 0;
    sourceLeft = sourceLeft !== void 0 ? sourceLeft : 0;
    sourceTop = sourceTop !== void 0 ? sourceTop : 0;
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
      if (currentStepWidth <= destWidth * 2 || currentStepHeight <= destHeight * 2) {
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
  };
  Imager.prototype.setPreviewSize = function(width, height) {
    this.$imageElement.css({
      width,
      height
    });
    $(this.canvas).css({
      width,
      height
    });
    $("body").trigger("imagerResize");
    this.log("resize trigger");
    this.originalPreviewWidth = this.$imageElement.width();
    this.originalPreviewHeight = this.$imageElement.height();
  };
  Imager.prototype.getPreviewSize = function() {
    return {
      width: this.$imageElement.width(),
      height: this.$imageElement.height()
    };
  };
  Imager.prototype.getImageRealSize = function() {
    return {
      width: this.$imageElement[0].naturalWidth,
      height: this.$imageElement[0].naturalHeight
    };
  };
  Imager.prototype.getCanvasSize = function() {
    return {
      width: this.canvas.width,
      height: this.canvas.height
    };
  };
  Imager.prototype.convertScale = function(value, sourceMax, targetMax) {
    var valueInPercents = value * 100 / sourceMax;
    return valueInPercents * targetMax / 100;
  };
  Imager.prototype.hideOriginalImage = function() {
    this.$imageElement.css("opacity", 0);
  };
  Imager.prototype.showOriginalImage = function() {
    this.$imageElement.css("opacity", 1);
  };
  Imager.prototype.adjustCanvasSize = function() {
    var imageRealSize = this.getImageRealSize();
    var previewSize = this.getPreviewSize();
    var newCanvasWidth = 0;
    var newCanvasHeight = 0;
    var aspectRatio = 0;
    if (previewSize.width > previewSize.height) {
      newCanvasWidth = imageRealSize.width;
      aspectRatio = previewSize.height * 100 / previewSize.width;
      newCanvasHeight = aspectRatio * newCanvasWidth / 100;
    } else {
      newCanvasHeight = imageRealSize.height;
      aspectRatio = previewSize.width * 100 / previewSize.height;
      newCanvasWidth = aspectRatio * newCanvasHeight / 100;
    }
    this.canvas.width = newCanvasWidth * this.targetScale;
    this.canvas.height = newCanvasHeight * this.targetScale;
    this.canvasSizeLimit = 1 * 1024 * 1024;
    if (this.canvasSizeLimit) {
      if (this.canvas.width * this.canvas.height > this.canvasSizeLimit) {
        console.warn(
          "adjustCanvasSize(): canvas size is too big : ",
          this.canvas.width,
          this.canvas.height
        );
        var ratio = 0.95 * this.canvasSizeLimit / (this.canvas.width * this.canvas.height);
        this.canvas.width = this.canvas.width * ratio;
        this.canvas.height = this.canvas.height * ratio;
        console.warn(
          "adjustCanvasSize(): canvas was reduced to : ",
          this.canvas.width,
          this.canvas.height
        );
      }
    }
  };
  Imager.prototype.adjustEditContainer = function() {
    var _this = this;
    var imageOffset = _this.$imageElement.offset();
    if (_this.$editContainer) {
      _this.$editContainer.css({
        left: imageOffset.left,
        top: imageOffset.top,
        width: _this.$imageElement.width(),
        height: _this.$imageElement.height()
      });
    }
    if (_this.$selectorContainer) {
      _this.$selectorContainer.css({
        left: imageOffset.left,
        top: imageOffset.top,
        width: this.$imageElement.width(),
        height: this.$imageElement.attr("src") ? this.$imageElement.height() : "auto"
      });
    }
  };
  Imager.prototype.restoreOriginal = function() {
    this.$imageElement.replaceWith(this.$originalImage);
  };
  Imager.prototype.historyUndo = function() {
    if (this.history.length < 2) {
      return;
    }
    var _this = this;
    var lastEntry = this.history[this.history.length - 2];
    this.$imageElement.on("load", imageLoadHandler);
    this.$imageElement.attr("src", lastEntry.image);
    this.$imageElement.width(lastEntry.width);
    this.$imageElement.height(lastEntry.height);
    function imageLoadHandler() {
      _this.$imageElement.off("load", imageLoadHandler);
      _this.originalPreviewWidth = _this.$imageElement.width();
      _this.originalPreviewHeight = _this.$imageElement.height();
      _this.setPreviewSize(lastEntry.width, lastEntry.height);
      _this.render();
      _this.history.splice(_this.history.length - 1, 1);
      _this.trigger("historyChange");
    }
  };
  Imager.prototype.remove = function(removeImage) {
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
  };
  Imager.prototype.getDataSize = function() {
    var head = "data:image/" + this.options.format + ";base64,";
    var data = this.canvas.toDataURL(
      "image/" + this.options.format,
      this.quality
    );
    var size = Math.round((data.length - head.length) * 3 / 4);
    return size;
  };
  Imager.getImagerFor = function($img) {
    for (var i = 0; i < imagerInstances.length; i++) {
      var imager = imagerInstances[i];
      if (imager.id == $($img).attr("data-imager-id")) {
        return imager;
      }
    }
    return void 0;
  };
  Imager.isImagerAttached = function($elem) {
    return $($elem).attr("imager-attached") !== void 0;
  };
  Imager.prototype.setWaiting = function(waiting) {
    if (waiting) {
      if (this.$editContainer) {
        util.setWaiting(
          this.$editContainer,
          translations.t("Please wait..."),
          this.options.waitingCursor
        );
      }
    } else {
      util.stopWaiting(this.$editContainer);
    }
  };
  Imager.prototype.getImageFormat = function(imageSrc) {
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
  };
  Imager.prototype._adjustElementsSize = function(namespace, newSize) {
    var elementsToResize = $("[data-sizeable=" + namespace + "]");
    for (var i = 0; i < elementsToResize.length; i++) {
      var elem = elementsToResize[i];
      var attributesToChange = $(elem).attr("data-cssrules").split(",");
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
  };
  Imager.prototype.detectPlatform = function() {
    if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      this.platform = PLATFORM.ios;
    } else if (/Android|BlackBerry/i.test(navigator.userAgent)) {
      this.platform = PLATFORM.android;
    } else if (/IEMobile/i.test(navigator.userAgent)) {
      this.platform = PLATFORM.windowsMobile;
    }
    if (this.options.detectTouch && this.options.detectTouch.constructor.name !== "Function") {
      console.error(
        "detectTouch should be a function which will be called when Imager needs to determine whether it is working on touch device"
      );
      this.options.detectTouch = null;
    }
    if (this.options.detectTouch) {
      this.touchDevice = this.options.detectTouch(this);
    } else {
      this.touchDevice = /(iPhone|iPod|iPad|BlackBerry|Android)/i.test(
        navigator.userAgent
      );
    }
    var _this = this;
    $("body").on("touchstart.DrawerTouchCheck", function() {
      _this.touchDevice = true;
      $("body").off("touchstart.DrawerTouchCheck");
      _this.log("Found touch screen.");
    });
  };
  var ImagerJs_default = Imager;
})();
