import { translate } from "../../Translations";

/**
 * Allows undoing actions on the image.
 *
 * @param imagerInstance
 *
 * @constructor
 * @memberof ImagerJs.plugins
 */
export class UndoPlugin {
  constructor(imagerInstance, options) {
    this.imager = imagerInstance;
    this.$toolbarButton = null;

    options = options ? options : {};
    this.options = $.extend(true, this.defaultOptions, options);
  }

  getButtons() {
    return [
      {
        classes: "btn-undo",
        iconClasses: "icon-ccw",
        tooltip: translate("Undo"),
        buttonCreatedHandler: ($btn) => {
          this.$toolbarButton = $btn;
        },
        enabledHandler: (toolbar) => {
          this.toolbar = toolbar;

          this.imager.setWaiting(true);

          setTimeout(() => {
            this.imager.historyUndo();
            this.imager.setWaiting(false);
          }, 50);
        },
      },
    ];
  }

  onHistoryChange() {
    if (this.imager.history.length > 1) {
      this.$toolbarButton.css({
        "pointer-events": "all",
      });

      this.$toolbarButton.find("a").css("color", "#333");
    } else {
      this.$toolbarButton.css({
        "pointer-events": "none",
      });

      this.$toolbarButton.find("a").css("color", "#C3C3C3");
    }
  }
}
