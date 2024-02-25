import "./Delete.css";
import { translate } from "../../Translations";

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
export default class DeletePlugin {
  constructor(imagerInstance, options) {
    /**
     *
     * @type {ImagerJs}
     */
    this.imager = imagerInstance;

    this.defaultOptions = {
      fullRemove: false,
    };

    options = options ? options : {};
    this.options = $.extend(true, this.defaultOptions, options);

    this.weight = 500;
  }

  getButtons() {
    return [
      {
        classes: "btn-delete",
        iconClasses: "icon-cancel",
        tooltip: translate("Delete image"),
        enabledHandler: (toolbar) => {
          var question = translate("Are you sure want to delete this image?");
          var response = confirm(question);
          if (response) {
            this.imager.setWaiting(true);

            setTimeout(() => {
              if (this.options.fullRemove) {
                this.imager.remove(true);
              } else {
                this.imager.stopEditing();
                this.imager.$imageElement.attr("src", "");

                this.imager.startSelector();
                this.imager.adjustEditContainer();
              }
            }, 1);
          }
        },
      },
    ];
  }
}
