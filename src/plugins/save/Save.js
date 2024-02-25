import "./Save.css";
import { translate } from "../../Translations";

/**
 * Allows saving of the image.
 *
 * @param imagerInstance
 *
 * @constructor
 * @memberof ImagerJs.plugins
 */
export default class SavePlugin {
  constructor(imagerInstance, options) {
    this.imager = imagerInstance;

    this.defaultOptions = {
      upload: false,
      uploadFunction: null,
    };

    options = options ? options : {};
    this.options = $.extend(true, this.defaultOptions, options);
  }

  getButtons() {
    return [
      {
        classes: "btn-save",
        iconClasses: "icon-floppy",
        tooltip: translate("Save"),
        enabledHandler: (toolbar) => {
          var contentConfig = this.imager.options.contentConfig;
          var saveFunc = contentConfig ? contentConfig.saveImageData : null;

          if (this.options.upload) {
            saveFunc = this.options.uploadFunction;
          }

          if (!saveFunc) {
            console.error(
              "No uploadFunction function provided in " +
                "imager.options.contentConfig.saveImageData."
            );
          } else {
            saveFunc.call(
              this.imager,
              this.imager.$imageElement.attr("data-imager-id"),
              this.imager.$imageElement.attr("src"),
              (savedImageUrl) => {
                this.imager.stopEditing();
                // for uploaded images - change src to url returned from the server
                this.imager.$imageElement.attr("src", savedImageUrl);
              }
            );
          }
        },
      },
    ];
  }
}
