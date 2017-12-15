(function ($, pluginsCatalog, util, translations, Modal) {
  'use strict';

  var MOUSE_DOWN = util.mouseDown('MovableFloatingMode');
  var MOUSE_MOVE = util.mouseMove('MovableFloatingMode');
  var MOUSE_UP = util.mouseUp('MovableFloatingMode');

  /**
   * Provides a button which shows modal window with image properties line
   * aligment and size.
   *
   * @param imagerInstance
   * @param options
   * @constructor
   */
  var Properties = function PropertiesPlugin(imagerInstance, options) {
    var _this = this;

    _this.imager = imagerInstance;

    _this.defaultOptions = {
      minWidth: 50,
      minHeight: 50
    };

    options = options ? options : {};
    _this.options = $.extend(true, _this.defaultOptions, options);

    _this.weight = 100;

    _this.imager.log('[PropertiesPlugin]', 'init');
  };

  Properties.prototype.getButtons = function () {
    var _this = this;

    return [{
      classes: 'btn-properties',
      iconClasses: 'fa-cog',
      tooltip: translations.t('Image properties'),
      enabledHandler: function (toolbar) {
        _this.showPropertiesModal();
      }
    }];
  };

  Properties.prototype.showPropertiesModal = function () {
    var _this = this;

    var modal = new Modal();
    modal.setTitle(translations.t('Image properties'));
    modal.addClass('canvas-properties imager-click-stop');

    var $template = $('<div class="image-properties">' +
    '<form class="image-size-form"><div class="form-group">' +
        '<label for="image-properties-width">' +
          translations.t('Size:') + ' ' +
        '</label>' +
        '<input type="text" class="form-control" ' +
               'id="image-properties-width" ' +
               'placeholder="' + translations.t('width in px') + '">' +
        '<span>x</span>' +
        '<input type="email" class="form-control" ' +
               'id="image-properties-height" ' +
               'placeholder="' + translations.t('height in px') + '">' +
    '</div></form>' +
    '<br>' +
    '<form class="aligment"><div class="form-group">' +
      '<label for="image-properties-layout">Aligment:</label>' +
      '<select id="image-properties-layout" ' +
              'class="form-control layout-selector">' +
      '<option value="left">' + translations.t('Left') + '</option>' +
      '<option value="right">' + translations.t('Right') + '</option>' +
      '<option value="center">' + translations.t('Center') + '</option>' +
      '<option value="inline">' + translations.t('Inline') + '</option>' +
      '<option value="floating">' + translations.t('Floating') + '</option>'+
      '</select>' +
    '</div></form>' +
    '<form class="background-transparency"><div class="form-group">' +
      '<input id="image-properties-transparent-background" ' +
             'type="checkbox" checked>' +
      '<label for="image-properties-transparent-background">' +
        translations.t('Transparent background') +
      '</label>' +
    '</div></form>' +
    '</div>');

    if(this.getAlign() == 'floating') {
      $template.find('.background-transparency').show();
    } else {
      $template.find('.background-transparency').hide();
    }

    var backgroundColor = _this.imager.$imageElement.css('background-color');

    if(backgroundColor == 'transparent' ||
      backgroundColor == 'rgba(0, 0, 0, 0)'){
      $template.find('#image-properties-transparent-background')
        .attr('checked', 'checked');
    } else {
      $template.find('#image-properties-transparent-background')
        .removeAttr('checked');
    }

    var size = this.imager.getPreviewSize();
    var ratioWidth = size.height / size.width;
    var ratioHeight = size.width / size.height;

    var currentAlign = this.getAlign();

    $template.find('#image-properties-width').val(size.width);
    $template.find('#image-properties-width').on('change keyup', function(){
      var newWidth = $template.find('#image-properties-width').val();
      var newHeight = Math.floor(newWidth * ratioWidth);
      $template.find('#image-properties-height').val(newHeight);
    });

    $template.find('#image-properties-height').val(size.height);
    $template.find('#image-properties-height').on('change keyup', function(){
      var newHeight = $template.find('#image-properties-height').val();
      var newWidth = Math.floor(newHeight * ratioHeight);
      $template.find('#image-properties-width').val(newWidth);
    });

    $template.find('#image-properties-layout').val(currentAlign);

    $template.find('#image-properties-layout').change(function () {
      if ($('#image-properties-layout').val() == 'floating') {
        $template.find('.background-transparency').show();
      } else {
        $template.find('.background-transparency').hide();
      }
    });

    modal.setTemplate($template);

    modal.addCancelButton(translations.t('Cancel'), function(){
      modal.remove();
    });

    modal.addActionButton(translations.t('Apply'), function(){
      var width = $('#image-properties-width').val();
      var height = $('#image-properties-height').val();
      var align = $('#image-properties-layout').val();
      var transparent = $('#image-properties-transparent-background')
        .attr('checked');

      if(transparent){
        _this.imager.$editContainer.css('background', 'transparent');
        _this.imager.$imageElement.css('background', 'transparent');
      } else {
        _this.imager.$editContainer.css('background', 'white');
        _this.imager.$imageElement.css('background', 'white');
      }

      _this.imager.render();

      if(align != _this.getAlign()){
        _this.setAlign(align);
      }

      _this.imager.setPreviewSize(width, height);

      modal.remove();
    });

    modal.show();
  };

  Properties.prototype.setAlign = function (align) {
    var aligmentCss = {};

    if (align == 'floating') {
      aligmentCss['position'] = 'absolute';
      aligmentCss['display'] = 'block';
      aligmentCss['float'] = 'none';
      aligmentCss['left'] = '0px';
      aligmentCss['top'] = '0px';
    }
    else if (align == 'center') {
      aligmentCss['float'] = 'none';
      aligmentCss['margin-left'] = 'auto';
      aligmentCss['margin-right'] = 'auto';
      aligmentCss['display'] = 'block';
      aligmentCss['position'] = 'static';
    } else if (align == 'inline') {
      aligmentCss['float'] = 'none';
      aligmentCss['display'] = 'inline-block';
      aligmentCss['position'] = 'static';
    } else {
      aligmentCss['display'] = 'block';
      aligmentCss['float'] = align;
      aligmentCss['position'] = 'static';
    }

    this.imager.$imageElement.css(aligmentCss);

    this.onEditStart();

    this.imager.adjustEditContainer();
  };

  Properties.prototype.getAlign = function () {
    var aligmentCss = this.imager.$imageElement.css(
      ['position', 'float', 'display', 'margin-left', 'margin-right']
    );

    var currentAlign = 'inline';

    if (aligmentCss['position'] == 'absolute') {
      currentAlign = 'floating';
    }
    else if (aligmentCss['float'] == 'left') {
      currentAlign = 'left';
    } else if (aligmentCss['float'] == 'right') {
      currentAlign = 'right';
    } else if (aligmentCss['display'] == 'block' &&
      aligmentCss['margin-left'] == 'auto') {
      currentAlign = 'center';
    }

    return currentAlign;
  };

  Properties.prototype.onEditStart = function () {
    var align = this.getAlign();

    if(align == 'floating') {
      this.makeMoveButton();
    } else if(this.$moveButton){
      this.$moveButton.remove();
      this.$moveButton = null;
    }
  };

  Properties.prototype.makeMoveButton = function () {
    var _this = this;
    var toolbar = _this.imager.getPluginInstance('Toolbar').toolbar;

    var $body = $('body');

    this.$moveButton = toolbar.addButton('btn-move', 'fa-arrows',
      translations.t('Move image'), function () {
      });

    this.$moveButton.on(MOUSE_DOWN, function (event) {
      if (event.type.indexOf('touch') > -1) {
        event = event.originalEvent;
      }

      $('.tooltip-btn-move').css('display', 'none');

      var startLeft = _this.imager.$imageElement
          .css('left').replace('px', '') | 0;
      var startTop = _this.imager.$imageElement
          .css('top').replace('px', '') | 0;

      var mouseStartLeft = event.pageX;
      var mouseStartTop = event.pageY;

      $body.on(MOUSE_MOVE, function (moveEvent) {
        if (moveEvent.type.indexOf('touch') > -1) {
          moveEvent = moveEvent.originalEvent;
        }

        var diffLeft = moveEvent.pageX - mouseStartLeft;
        var diffTop = moveEvent.pageY - mouseStartTop;

        var newLeft = startLeft + diffLeft;
        var newTop = startTop + diffTop;

        if (newLeft < 0) {
          newLeft = 0;
        }
        if (newTop < 0) {
          newTop = 0;
        }

        _this.imager.$imageElement.css({
          left: newLeft,
          top: newTop
        });

        _this.imager.adjustEditContainer();

        moveEvent.preventDefault();
        moveEvent.stopPropagation();
        return false;
      });

      $body.on(MOUSE_UP, function () {
        $('.tooltip-btn-move').css('display', 'block');
        $body.off(MOUSE_MOVE);
        $body.off(MOUSE_UP);
      });
    });
  };

  pluginsCatalog.Properties = Properties;
})(jQuery, ImagerJs.plugins, ImagerJs.util, ImagerJs.translations,
  window.Modal);