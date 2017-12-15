(function ($, pluginsCatalog, util, translations) {

  /**
   * Allows undoing actions on the image.
   *
   * @param imagerInstance
   *
   * @constructor
   * @memberof ImagerJs.plugins
   */
  var Undo = function UndoPlugin(imagerInstance, options) {
    var _this = this;

    _this.imager = imagerInstance;
    _this.$toolbarButton = null;

    options = options ? options : {};
    _this.options = $.extend(true, _this.defaultOptions, options);
  };

  Undo.prototype.getButtons = function () {
    var _this = this;

    return [{
      classes: 'btn-undo',
      iconClasses: 'fa-undo',
      tooltip: translations.t('Undo'),
      buttonCreatedHandler: function ($btn) {
        _this.$toolbarButton = $btn;
      },
      enabledHandler: function (toolbar) {
        _this.toolbar = toolbar;

        _this.imager.setWaiting(true);

        setTimeout(function () {
          _this.imager.historyUndo();
          _this.imager.setWaiting(false);
        }, 50);
      }
    }];
  };

  Undo.prototype.onHistoryChange = function () {
    if (this.imager.history.length > 1) {
      this.$toolbarButton.css({
        'pointer-events': 'all'
      });

      this.$toolbarButton.find('a').css('color', '#333');
    } else {
      this.$toolbarButton.css({
        'pointer-events': 'none'
      });

      this.$toolbarButton.find('a').css('color', '#C3C3C3');
    }
  };

  pluginsCatalog.Undo = Undo;

})(jQuery, ImagerJs.plugins, ImagerJs.util, ImagerJs.translations);
