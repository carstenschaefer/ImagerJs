import { translate } from "../Translations";
import "./FileSelector.css";

export default class FileSelector {
  constructor(accept) {
    this.acceptTypes = accept;

    this.$element = $(
      '<div class="file-selector">' +
        '<input type="file" />' +
        '<div class="drop-area">' +
        translate("Or drop files here") +
        "</div>" +
        '<div class="error-container bg-danger"></div>' +
        "</div>"
    );

    if (this.acceptTypes) {
      this.$element.find("input").attr("accept", this.acceptTypes);
    }

    this.$element.find("input").on("change", (e) => {
      if (e.target.files.length < 1) {
        this.showError(translate("No file selected."));
      }

      for (var i = 0; i < e.target.files.length; i++) {
        if (e.target.files[i].type.indexOf("image") < 0) {
          this.showError(translate("Incorrect file type"));
          return;
        }
      }

      this.parseFile(e.target.files[0]);
    });

    var $dropArea = this.$element.find(".drop-area");
    $dropArea.on("dragover", (e) => {
      e.stopPropagation();
      e.preventDefault();
      $dropArea.addClass("hover");
    });
    $dropArea.on("dragleave", (e) => {
      e.stopPropagation();
      e.preventDefault();
      $dropArea.removeClass("hover");
    });
    $dropArea.on("drop", (e) => {
      e.stopPropagation();
      e.preventDefault();
      $dropArea.removeClass("hover");
      // fetch FileList object
      var files = e.originalEvent.dataTransfer.files;

      if (files.length < 1) {
        this.showError(translate("No file selected."));
        return;
      }

      for (var i = 0; i < files.length; i++) {
        if (files[i].type.indexOf("image") < 0) {
          this.showError(translate("Incorrect file type."));
          return;
        }
      }

      this.parseFile(files[0]);
    });
  }

  parseFile(file) {
    var fileReader = new FileReader();

    fileReader.onload = (onloadEvent) => {
      this.$element.trigger("fileSelected.fileSelector", {
        info: file,
        data: fileReader.result,
      });
    };

    fileReader.readAsDataURL(file);
  }

  onFileSelected(handler) {
    this.$element.on("fileSelected.fileSelector", (event, file) =>
      handler(file)
    );
  }

  showError(error) {
    this.$element.find(".error-container").html(error);
    this.$element.find(".error-container").slideDown(200);

    setTimeout(() => this.$element.find(".error-container").slideUp(200), 2000);
  }

  getElement() {
    return this.$element;
  }

  hide() {
    this.$element.hide();
  }

  show() {
    this.$element.show();
  }
}
