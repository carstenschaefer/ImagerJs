import { Toolbar } from "../../Toolbar";
import { translate } from "../../Translations";
import './Toolbar.css';

export default class ToolbarPlugin {
  constructor(imagerInstance, options) {
    this.imager = imagerInstance;

    options = options || {};

    var defaultOptions = {
      tooltipEnabled: true,
      tooltipCss: null,
    };

    if (this.imager.touchDevice) {
      defaultOptions.tooltipEnabled = false;
    }

    this.options = $.extend(defaultOptions, options);

    this.activeButton = null;

    this.weight = -100;
  }

  /**
   * This method will be invoked by Imager when edit mode is enabled.
   */
  onEditStart() {
    this.toolbar = new Toolbar(this.options);
    this.toolbar
      .getElement()
      .attr("data-sizeable", "toolbar-button");

    var getButtonsResults = this.imager.invokePluginsMethod("getButtons");

    for (var i = 0; i < getButtonsResults.length; i++) {
      var plugin = getButtonsResults[i].instance;
      var buttons = getButtonsResults[i].result;

      for (var b = 0; b < buttons.length; b++) {
        var btn = buttons[b];

        btn.plugin = plugin;

        var $button = null;
        if (btn.group === undefined) {
          $button = this.toolbar.addButton(
            btn.classes,
            btn.iconClasses,
            btn.tooltip,
            this.createHandler(btn)
          );
        } else {
          $button = this.toolbar.addButtonToGroup(
            btn.classes,
            btn.iconClasses,
            btn.tooltip,
            btn.group,
            this.createHandler(btn)
          );
        }

        if (btn.buttonCreatedHandler) {
          btn.buttonCreatedHandler($button);
        }
      }
    }

    this.imager.$editOuterContainer.prepend(this.toolbar.getElement());
  }

  onRemove() {
    if (this.toolbar) {
      this.toolbar.remove();
    }
  }

  onEditStop() {
    if (this.toolbar) {
      this.toolbar.remove();
    }
  }

  createHandler(btn) {
    return () => {
      if (this.activeButton) {
        if (this.activeButton.disabledHandler) {
          this.activeButton.disabledHandler();
        }
      }

      this.toolbar.clearActiveButton();

      btn.enabledHandler();

      if (btn.applyHandler && btn.rejectHandler) {
        this.activeButton = btn;

        this.imager.trigger("toolSelected", btn);

        this.toolbar.setActiveButton(btn.classes);

        this.toolbar.getElement().addClass("hidden");

        this.createOperationToolbar(btn);
      }

      return false;
    };
  }

  createOperationToolbar(btn) {
    this.operationToolbar = new Toolbar(this.options);

    this.operationToolbar.addButton(
      "btn-accept",
      "icon-ok",
      translate("Apply"),
      () => {
        btn.applyHandler();
        this.operationButtonHandler();
        this.imager.trigger("toolApply");
        return false;
      }
    );

    this.operationToolbar.addButton(
      "btn-reject",
      "icon-cancel",
      translate("Reject"),
      () => {
        btn.rejectHandler();
        this.operationButtonHandler();
        this.imager.trigger("toolReject");
        return false;
      }
    );

    this.imager.$editOuterContainer.prepend(this.operationToolbar.getElement());
  }

  operationButtonHandler() {
    this.activeButton = null;
    this.removeOperationToolbar();
    this.toolbar.getElement().removeClass("hidden");
    this.toolbar.clearActiveButton();
  }

  removeOperationToolbar() {
    this.operationToolbar.remove();
    this.operationToolbar = null;
  }

  getActiveButton() {
    return this.activeButton;
  }
}
