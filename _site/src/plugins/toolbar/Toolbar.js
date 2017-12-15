(function ($, pluginsCatalog, translations, Toolbar) {
  var ImagerToolbar = function ToolbarPlugin(imagerInstance, options) {
    var _this = this;
    _this.imager = imagerInstance;

    options = options || {};

    var defaultOptions = {
      tooltipEnabled: true,
      tooltipCss: null
    };

    if (_this.imager.touchDevice) {
      defaultOptions.tooltipEnabled = false;
    }

    _this.options = $.extend(defaultOptions, options);

    _this.activeButton = null;

    _this.weight = -100;
  };

  /**
   * This method will be invoked by Imager when edit mode is enabled.
   */
  ImagerToolbar.prototype.onEditStart = function () {
    var _this = this;

    _this.toolbar = new Toolbar(_this.options);
    _this.toolbar.getElement()
      .attr('data-sizeable', 'toolbar-button')
      .attr('data-cssrules', 'top:($v * -1)');

    var getButtonsResults = _this.imager.invokePluginsMethod('getButtons');

    for (var i = 0; i < getButtonsResults.length; i++) {
      var plugin = getButtonsResults[i].instance;
      var buttons = getButtonsResults[i].result;

      for (var b = 0; b < buttons.length; b++) {
        var btn = buttons[b];

        btn.plugin = plugin;

        var $button = null;
        if(btn.group === undefined) {
          $button = _this.toolbar.addButton(
            btn.classes, btn.iconClasses, btn.tooltip, _this.createHandler(btn)
          );
        } else {
          $button = _this.toolbar.addButtonToGroup(
            btn.classes, btn.iconClasses, btn.tooltip, btn.group, _this.createHandler(btn)
          );
        }

        if (btn.buttonCreatedHandler) {
          btn.buttonCreatedHandler($button);
        }
      }
    }

    _this.imager.$editContainer.append(_this.toolbar.getElement());
  };

  ImagerToolbar.prototype.onRemove = function () {
    if (this.toolbar) {
      this.toolbar.remove();
    }
  };

  ImagerToolbar.prototype.onEditStop = function () {
    if (this.toolbar) {
      this.toolbar.remove();
    }
  };

  ImagerToolbar.prototype.createHandler = function (btn) {
    var _this = this;

    return function () {
      if (_this.activeButton) {
        if (_this.activeButton.disabledHandler) {
          _this.activeButton.disabledHandler();
        }
      }

      _this.toolbar.clearActiveButton();

      btn.enabledHandler();

      if (btn.applyHandler && btn.rejectHandler) {
        _this.activeButton = btn;

        _this.imager.trigger('toolSelected', btn);

        _this.toolbar.setActiveButton(btn.classes);

        _this.toolbar.getElement().addClass('hidden');

        _this.createOperationToolbar(btn);
      }

      return false;
    };
  };

  ImagerToolbar.prototype.createOperationToolbar = function (btn) {
    var _this = this;

    _this.operationToolbar = new Toolbar(_this.options);

    _this.operationToolbar.addButton('btn-accept', 'fa-check',
      translations.t('Apply'),
      function applyOperationHandler() {
        btn.applyHandler();
        _this.operationButtonHandler();
        _this.imager.trigger('toolApply');
        return false;
      });

    _this.operationToolbar.addButton('btn-reject', 'fa-times',
      translations.t('Reject'),
      function rejectOperationHandler() {
        btn.rejectHandler();
        _this.operationButtonHandler();
        _this.imager.trigger('toolReject');
        return false;
      });

    _this.imager.$editContainer.append(_this.operationToolbar.getElement());
  };

  ImagerToolbar.prototype.operationButtonHandler = function () {
    this.activeButton = null;
    this.removeOperationToolbar();
    this.toolbar.getElement().removeClass('hidden');
    this.toolbar.clearActiveButton();
  };

  ImagerToolbar.prototype.removeOperationToolbar = function () {
    this.operationToolbar.remove();
    this.operationToolbar = null;
  };

  ImagerToolbar.prototype.getActiveButton = function () {
    return this.activeButton;
  };

  pluginsCatalog.Toolbar = ImagerToolbar;

})(jQuery, ImagerJs.plugins, ImagerJs.translations, window.Toolbar);