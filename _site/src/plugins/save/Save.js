(function ($, pluginsCatalog, util, translations) {

  /**
   * Allows saving of the image.
   *
   * @param imagerInstance
   *
   * @constructor
   * @memberof ImagerJs.plugins
   */
  var Save = function SavePlugin(imagerInstance, options) {
    var _this = this;

    _this.imager = imagerInstance;

    _this.defaultOptions = {
      upload: false,
      uploadFunction: null
    };

    options = options ? options : {};
    _this.options = $.extend(true, _this.defaultOptions, options);
  };

  Save.prototype.getButtons = function () {
    var _this = this;

    return [{
      classes: 'btn-save',
      iconClasses: 'fa-save',
      tooltip: translations.t('Save'),
      enabledHandler: function (toolbar) {
        var contentConfig = _this.imager.options.contentConfig;
        var saveFunc = contentConfig ? contentConfig.saveImageData : null;

        if (_this.options.upload) {
          saveFunc = _this.options.uploadFunction;
        }

        if (!saveFunc) {
          console.error('No uploadFunction function provided in ' +
            'imager.options.contentConfig.saveImageData.');
        } else {
          saveFunc.call(
            _this.imager,
            _this.imager.$imageElement.attr('data-imager-id'),
            _this.imager.$imageElement.attr('src'),
            function (savedImageUrl) {
              _this.imager.stopEditing();
              // for uploaded images - change src to url returned from the server
              _this.imager.$imageElement.attr('src', savedImageUrl);
            }
          );
        }
      }
    }];
  };

  pluginsCatalog.Save = Save;

})(jQuery, ImagerJs.plugins, ImagerJs.util, ImagerJs.translations);
