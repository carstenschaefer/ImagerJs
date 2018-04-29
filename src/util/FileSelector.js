(function ($, namespace, translations) {
  /**
   *
   * @param accept
   *
   * @constructor
   * @memberof ImagerJs.util
   */
  var FileSelector = function (accept) {
    var _this = this;

    _this.acceptTypes = accept;

    _this.$element = $('<div class="file-selector">' +
    '<input type="file" />' +
    '<div class="drop-area">' +
        translations.t('Or drop files here') +
    '</div>' +
    '<div class="error-container bg-danger"></div>' +
    '</div>');

    if (_this.acceptTypes) {
      _this.$element.find('input').attr('accept', _this.acceptTypes);
    }

    _this.$element.find('input').on('change', function (e) {
      if (e.target.files.length < 1) {
        _this.showError(translations.t('No file selected.'));
      }

      for (var i = 0; i < e.target.files.length; i++) {
        if(e.target.files[i].type.indexOf('image') < 0) {
          _this.showError(translations.t('Incorrect file type'));
          return;
        }
      }

      _this.parseFile(e.target.files[0]);
    });

    var $dropArea = _this.$element.find('.drop-area');
    $dropArea.on('dragover', function (e) {
      e.stopPropagation();
      e.preventDefault();
      $dropArea.addClass('hover');
    });
    $dropArea.on('dragleave', function (e) {
      e.stopPropagation();
      e.preventDefault();
      $dropArea.removeClass('hover');
    });
    $dropArea.on('drop', function (e) {
      e.stopPropagation();
      e.preventDefault();
      $dropArea.removeClass('hover');
      // fetch FileList object
      var files = e.originalEvent.dataTransfer.files;

      if (files.length < 1) {
        _this.showError(translations.t('No file selected.'));
        return;
      }

      for (var i = 0; i < files.length; i++) {
        if(files[i].type.indexOf('image') < 0) {
          _this.showError(translations.t('Incorrect file type.'));
          return;
        }
      }

      _this.parseFile(files[0]);
    });
  };

  FileSelector.prototype.parseFile = function (file) {
    var _this = this;

    var fileReader = new FileReader();

    fileReader.onload = function (onloadEvent) {
      _this.$element.trigger(
        'fileSelected.fileSelector', {
          info: file,
          data: fileReader.result
        }
      );
    };

    fileReader.readAsDataURL(file);
  };

  FileSelector.prototype.onFileSelected = function (handler) {
    var _this = this;
    _this.$element.on('fileSelected.fileSelector', function (event, file) {
      handler(file);
    });
  };

  FileSelector.prototype.showError = function (error) {
    var _this = this;

    _this.$element.find('.error-container').html(error);
    _this.$element.find('.error-container').slideDown(200);

    setTimeout(function () {
      _this.$element.find('.error-container').slideUp(200);
    }, 2000);
  };

  FileSelector.prototype.getElement = function () {
    return this.$element;
  };

  FileSelector.prototype.hide = function () {
    this.$element.hide();
  };

  FileSelector.prototype.show = function () {
    this.$element.show();
  };

  namespace.FileSelector = FileSelector;

})(jQuery, ImagerJs.util, ImagerJs.translations);