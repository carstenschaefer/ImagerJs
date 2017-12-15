/**
 * Redactor plugins global namespace
 *
 * @namespace RedactorPlugins
 */
if (!RedactorPlugins) var RedactorPlugins = {};

(function ($, ImagerJs, QualitySelector, util, translations, Modal) {
  /**
   * Redactor plugin wrapper for ImagerJs that allows to use all ImagerJs
   * functionality inside redactor's editor.
   *
   * @constructor
   *
   * @memberof RedactorPlugins
   *
   * @param options {Object} ImagerJs Redactor options.
   * <br>
   * Options are splitted into two objects:
   * '<strong>preview</strong>' and '<strong>redactor</strong>'.
   * <br>
   * Those options are passed directly intp ImagerJs instance when its created.
   * <br>
   * '<strong>preview</strong>'
   * options will be passed only to ImagerJs on modal
   * window when selecting image.
   * <br>
   * '<strong>redactor</strong>' options will be
   * passed to ImagerJs when image is inside redactor editor.
   * <br>
   * Example options:
   * <br>
   * <code><pre>
   *  {
   *    preview: {
   *      quality: 0.9,
   *      targetScale: 0.5,
   *      plugins: ['Resize', 'Crop', 'Rotate', 'Toolbar']
   *    },
   *    redactor: {
   *      plugins: ['Resize', 'Crop', 'Rotate', 'Toolbar', 'Properties']
   *    }
   * }
   * </pre></code>
   *
   * @param options.hideFileSelection
   * If true, file selector will be hidden once file is selected.
   *
   * @returns {{init: Function, show: Function, insert: Function}}
   *
   */
  RedactorPlugins.ImagerJs = function (options) {
    var imagerInstance = null;

    var optionsInRedactor = {
      plugins: ['Toolbar'],
      pluginsConfig: {
        Resize: {
          doubleDiff: false
        },
        Delete: {
          fullRemove: true
        }
      }
    };

    var optionsPreview = {
      quality: 0.9,
      targetScale: 0.5,
      plugins: ['Toolbar'],
      pluginsConfig: {
        Resize: {
          doubleDiff: true
        }
      }
    };

    var updateImagersInRedactor = function (redactorInstance) {
      var $body = $('body');
      var $images = redactorInstance.$editor.find('.imager-preview-image');

      $images.each(function (k, img) {
        var imager = ImagerJs.Imager.getImagerFor(img);
        if (!imager) {
          imager = new ImagerJs.Imager(img, $.extend(optionsInRedactor, {}));
          imager.redactor = redactorInstance;

          imager.on('remove', function () {
            imager = null;
            redactorInstance.$editor.attr('contentEditable', 'true');
          });

          // observe historyChange event to know when something was changed in the image
          // and call redactor's sync function to persist those changes
          imager.on('historyChange', function () {
            redactorInstance.code.startSync();
          });

          var imagerId = imager.id;

          $(img).off('dragstart');

          $(img).off('click'); // disable redactor's default image handler
          $(img).off('click.imager' + imagerId);
          $(img).on('click.imager' + imagerId, function () {
            var imager = ImagerJs.Imager.getImagerFor(img);

            if (!imager) {
              return;
            }

            imager.startEditing();
            redactorInstance.$editor.attr('contentEditable', 'false');

            imager.$editContainer.on('keydown.imager', function (event) {
              if (event.which == 46 || event.which == 8) {
                event.preventDefault();
                event.stopPropagation();

                $body.off('mousedown.imager' + imagerId);

                imager.setWaiting(true);

                setTimeout(function () {
                  imager.remove(true);
                  imager = null;
                });

                redactorInstance.$editor.attr('contentEditable', 'true');

                return false;
              }
            });
          });

          $body.off('mousedown.imager' + imagerId);
          $body.on('mousedown.imager' + imagerId, function (event) {
            if (!imager) {
              // seems that imager was destroyed, destroy all event
              // handlers too
              $body.off('mousedown.imager' + imagerId);
              return;
            }

            if (!imager.isInEditMode()) {
              return;
            }

            if (img == event.target) {
              return;
            }

            if (!$(event.target).hasClass('imager-edit-container') &&
              $(event.target).parents('.imager-edit-container').length < 1 && !$(event.target).hasClass('.imager-click-stop') &&
              $(event.target).parents('.imager-click-stop').length < 1
            ) {

              var toolbarPlugin = imager.getPluginInstance('Toolbar');

              // do not cancel editing, user will be angry
              if (toolbarPlugin.getActiveButton() === null) {
                imager.$editContainer.off('keydown.imager');
                imager.stopEditing();
                redactorInstance.$editor.attr('contentEditable', 'true');
              }
            }
          });
        }

        // after drag&drop image is copied and replaced, we do not want that
        // new image, we want to restore original one
        if (!jQuery.contains(document.documentElement,
            imager.$imageElement[0])) {
          $(img).replaceWith(imager.$imageElement);
        }
      });
    };

    return {
      init: function () {
        var defaultOpts = {
          contentConfig: {}
        };

        this.opts.ImagerJs = $.extend(true, {}, defaultOpts, this.opts.ImagerJs);

        var _this = this;

        if (this.opts.ImagerJs && this.opts.ImagerJs.preview) {
          optionsPreview =
            $.extend(true, {}, optionsPreview, this.opts.ImagerJs.preview);
        }

        if (this.opts.ImagerJs && this.opts.ImagerJs.redactor) {
          optionsInRedactor =
            $.extend(true, {}, optionsInRedactor, this.opts.ImagerJs.redactor);
        }

        var button = this.button.addAfter('image', 'image-manager-pro',
          translations.t('Add image'));

        this.button.setAwesome('image-manager-pro', 'fa-picture-o');
        this.button.addCallback(button, this.ImagerJs.show);

        this.opts.syncBeforeCallback = function (html) {
          // clean image data from redactor's html here
          // this is needed because image data-urls are very long
          // and redactor fails to process it fast.
          // So on before sync callback we remove all images data from redactor,
          // and on aftersync we add it back. This is reasonably fast,
          // but can be slow for large images.
          var idAttr = 'data-imager-id="';
          var srcAttr = 'src="';

          var found = true;

          var iterationStartIndex = 0;

          var imgTagStartIndex = 0;
          var imgTagEndIndex = 0;

          var idStart = 0;
          var idEnd = 0;

          var dataAttrStartIndex = 0;
          var dataAttrEndIndex = 0;

          var imageString = '';
          var imageId = '';
          var imageData = '';

          var imageReplacement = '';
          var lastOffset = 0;

          var newHtmlWithoutDataUrls = '';

          while (found) {
            found = false;
            imageReplacement = '';

            imgTagStartIndex = html.indexOf('<img', lastOffset);

            if (imgTagStartIndex > -1) {
              imgTagEndIndex = html.indexOf('>', imgTagStartIndex);
              lastOffset = imgTagEndIndex;
              imageString = html.substr(imgTagStartIndex, (imgTagEndIndex - imgTagStartIndex) + 1);

              idStart = imageString.indexOf(idAttr);

              if (idStart > -1) {
                idStart += idAttr.length;
                idEnd = imageString.indexOf('"', idStart);
                imageId = imageString.substr(idStart, (idEnd - idStart));

                dataAttrStartIndex = imageString.indexOf(srcAttr);

                if (dataAttrStartIndex > -1) {
                  dataAttrStartIndex += srcAttr.length;
                  dataAttrEndIndex = imageString.indexOf('"', dataAttrStartIndex);

                  imageData = imageString.substr(dataAttrStartIndex, (dataAttrEndIndex - dataAttrStartIndex));

                  if (imageData.length > 0 &&
                    _this.opts.ImagerJs.contentConfig.saveImageData) {
                    var saveFunc =
                      _this.opts.ImagerJs.contentConfig.saveImageData;
                    if (saveFunc instanceof Function) {
                      saveFunc(imageId, imageData, function () {
                      });
                    } else {
                      console.log(
                        'contentConfig.saveImageData should be a Function'
                      );
                    }
                  }

                  imageReplacement = imageString.substr(0, dataAttrStartIndex) + imageString.substr(dataAttrEndIndex);
                }
                found = true;
              }

              imageId = '';
              imageData = '';

              // now add content between last iteration and image found in this iteration
              // and then add this iteration image after.
              newHtmlWithoutDataUrls += html
                  .substr(iterationStartIndex + 1, imgTagStartIndex - iterationStartIndex - 1)
                + imageReplacement;

              iterationStartIndex = lastOffset;
              //html = html.substr(0, imgTagStartIndex) + imageReplacement + html.substr(imgTagEndIndex + 1);
            } else {
              // if no image found - add all content beyond last index
              newHtmlWithoutDataUrls += html.substr(lastOffset + 1);
            }
          }

          return newHtmlWithoutDataUrls;
        };

        this.opts.syncCallback = function (html) {
          var $images = _this.$editor.find('.imager-preview-image');

          var imageData = '';

          for (var i = 0; i < $images.length; i++) {
            var imageId = $($images[i]).attr('data-imager-id');

            if (_this.opts.ImagerJs.contentConfig.loadImageData) {
              var loadFunc = _this.opts.ImagerJs.contentConfig.loadImageData;
              if (loadFunc instanceof Function) {
                imageData = loadFunc(imageId);
                $($images[i]).attr('src', imageData);
              } else {
                console.log('contentConfig.loadImageData should be a Function');
              }
            }
          }

          setTimeout(function () {
            updateImagersInRedactor(_this);
          }, 1);

          return html;
        };

        // setup drop handler
        this.$editor.on('drop.ImagerJs', function (e) {
          var files = e.originalEvent.dataTransfer.files;

          if (files.length < 1) {
            return;
          }

          var fileReader = new FileReader();

          fileReader.onload = function (onloadEvent) {
            _this.ImagerJs.show('image-manager-pro', fileReader.result);
          };

          fileReader.readAsDataURL(files[0]);
        });
      },
      show: function (name, imageData) {
        var _this = this;

        var modal = new Modal();
        var $modalView = $('<section id="imager-open"></section>');

        var fileSelectedHandler = function (file) {
          if (imagerInstance) {
            imagerInstance.restoreOriginal();
            imagerInstance.remove();
            imagerInstance = null;
          }

          var handleImageLoaded = function () {
            $preview.find('.imager-preview-image').off('load.Imager');

            qualitySelector.show();

            imagerInstance = new ImagerJs.Imager($preview.find('img'),
              optionsPreview);
            imagerInstance.redactor = _this;

            imagerInstance.on('ready', function () {
              imagerInstance.startEditing();
              imagerInstance.setZindex(2006);

              qualitySelector.imager = imagerInstance;

              qualitySelector.val(null);
              qualitySelector.update();

              util.stopWaiting($preview);
              modal.fixPosition();
            });
          };

          $preview.find('.imager-preview-image').on('load.Imager', handleImageLoaded);

          util.setWaiting($preview, translations.t('Please wait...'),
            _this.opts.ImagerJs.preview.waitingCursor);

          setTimeout(function () {
            if (_this.opts.ImagerJs.hideFileSelection) {
              fileSelector.hide();
            }

            $preview.find('.imager-preview-image')
              .attr('src', file.data)
              .css({
                'width': '400px',
                'height': 'auto',
                'left': '0',
                'top': '0'
              });
          }, 1);
        };

        // ---- File selector ----

        var fileSelector = new ImagerJs.util.FileSelector('image/*');
        $modalView.append(fileSelector.getElement());
        fileSelector.onFileSelected(fileSelectedHandler);
        // ---- /File selector ----

        // ---- Image preview ----
        var $preview = $('<div class="imager-preview">' +
          '<img class="imager-preview-image">' +
          '</div>');

        $modalView.append($preview);
        // ---- /Image preview ----

        var qualitySelector = new QualitySelector(imagerInstance, this.opts.ImagerJs.quality);
        $modalView.append(qualitySelector.getElement());

        modal.addClass('under-edit-box');
        modal.setTemplate($modalView);
        modal.setTitle(translations.t('Add image'));

        modal.addCancelButton(translations.t('Cancel'), function () {
          if (imagerInstance) {
            imagerInstance.remove();
            imagerInstance = undefined;
          }
        });

        modal.addActionButton(translations.t('Insert'), function () {
          if (!imagerInstance) {
            return false;
          }

          util.setWaiting(modal.$modal, translations.t('Please wait...'),
            _this.opts.ImagerJs.preview.waitingCursor);

          imagerInstance.setWaiting(true);

          setTimeout(function () {
            imagerInstance.remove();
            imagerInstance = undefined;

            var $img = $modalView.find('img.imager-preview-image').clone();

            $modalView.remove();
            $modalView = undefined;

            _this.ImagerJs.insert($img);

            modal.hide();
            setTimeout(function () {
              modal.remove();
              modal = null;
            }, 100);
          }, 0);

          return false;
        });

        modal.show();

        this.selection.save();

        if (imageData) {
          fileSelectedHandler({data: imageData});
        }
      },
      insert: function ($image) {

        var _this = this;

        _this.selection.restore();
        _this.insert.node($image[0]);

        // after image is inserted into
        _this.code.startSync();
      }
    };
  };
})(jQuery, ImagerJs, window.ImagerQualitySelector, ImagerJs.util, ImagerJs.translations, Modal);
