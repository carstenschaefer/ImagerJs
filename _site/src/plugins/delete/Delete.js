(function ($, pluginsCatalog, translations, util) {
  /**
   * This plugin provides a button that will remove image & editing controls
   * from it.
   *
   * @param {ImagerJs} imagerInstance
   * @param {Object} options
   * @param {boolean} [options.fullRemove=false] Whether to fully remove imager.
   * If true, everything will be removed from DOM.
   * If false, a selector for new image will be left
   *
   * @constructor
   *
   * @memberof ImagerJs.progins
   */
  var Delete = function DeletePlugin(imagerInstance, options) {
    var _this = this;

    /**
     *
     * @type {ImagerJs}
     */
    _this.imager = imagerInstance;

    _this.defaultOptions = {
      fullRemove: false
    };

    options = options ? options : {};
    _this.options = $.extend(true, _this.defaultOptions, options);

    _this.weight = 500;
  };

  Delete.prototype.getButtons = function () {
    var _this = this;

    return [{
      classes: 'btn-delete',
      iconClasses: 'fa-times',
      tooltip: translations.t('Delete image'),
      enabledHandler: function (toolbar) {
        var question =
          translations.t('Are you sure want to delete this image?');
        var response = confirm(question);
        if (response) {
          _this.imager.setWaiting(true);

          setTimeout(function () {
            if (_this.options.fullRemove) {
              _this.imager.remove(true);
            } else {
              _this.imager.stopEditing();
              _this.imager.$imageElement.attr('src', '');

              _this.imager.startSelector();
              _this.imager.adjustEditContainer();
            }
          }, 1);
        }
      }
    }];
  };

  pluginsCatalog.Delete = Delete;
})(jQuery, ImagerJs.plugins, ImagerJs.translations, ImagerJs.util);