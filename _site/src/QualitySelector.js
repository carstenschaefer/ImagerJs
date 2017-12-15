(function ($, translations, namespace) {
  /**
   *
   * Provides a select that could be used to change imager quality.
   *
   * @param imagerInstance
   * @constructor
   *
   */
  var QualitySelector = function (imagerInstance, options) {
    var _this = this;

    _this.defaultOptions = {
      sizes: [
        {label: 'Original', scale: 1, quality: 1.0, percentage: 100},
        {label: 'Large', scale: 0.5, quality: 0.5, percentage: 50},
        {label: 'Medium', scale: 0.2, quality: 0.2, percentage: 20},
        {label: 'Small', scale: 0.05, quality: 0.05, percentage: 5}
      ],
      allowCustomSetting: true
    };

    options = options ? options : {};
    _this.options = $.extend(true, _this.defaultOptions, options);
        
    if (_this.options.allowCustomSetting) {
        _this.options.sizes.push(
            { label: 'Custom' }
        );  
    }
    
    _this.imager = imagerInstance;

    _this.$qualitySelector = $(
      '<div class="imager-quality-wrapper">' +
      '<form>' +
      '<div class="imager-quality-container form-group">' +
      '<label for="imager-quality">' + translations.t('Quality') + '</label>' +
      '<select id="imager-quality" class="form-control">' +
      '</select>' +
      '</div>' +
      '</form>' +
      '<form class="form-inline custom-quality hidden">' +
      '<div class="form-group">' +
      '<label for="imager-quality-custom" ' +
      'class="imager-quality-custom">' +
      translations.t('Custom quality percent') +
      '</label>' +
      '<div class="input-group">' +
      '<input id="imager-quality-custom" type="number" min="1" max="100"' +
      'class="form-control imager-quality-custom" value="100"/>' +
      '<div class="input-group-addon">%</div>' +
      '<div class="size-in-kb"></div>' +
      '</div>' +
      '</div>' +
      '</form>' +
      '</div>'
    )
      .addClass('hidden');

    _this.$qualitySelector.find('input.imager-quality-custom')
      .change(function () {
        var customQuality = parseInt($(this).val());

        _this.imager.quality = customQuality / 100;
        _this.imager.targetScale = customQuality / 100;
        _this.imager.render();

        var size = _this.imager.getDataSize() / 1024;
        var sizeText = Math.round(size) + ' ' + translations.t('KB');
        _this.$qualitySelector.find('.size-in-kb').text(sizeText);
      });

    _this.$qualitySelector.find('select').on('change', function () {
      var value = parseInt($(this).val());

      var selectedQuality = _this.options.sizes[value];

      if (selectedQuality === null || selectedQuality === undefined) {
        selectedQuality = _this.options.sizes[0];
      }

      if (selectedQuality.label == 'Custom') {
        _this.$qualitySelector.find('form.custom-quality').removeClass('hidden');
        _this.$qualitySelector.addClass('custom-quality-visible');
        _this.imager.$imageElement.addClass('custom-quality-visible');
      } else {
        _this.$qualitySelector.find('form.custom-quality').addClass('hidden');
        _this.$qualitySelector.removeClass('custom-quality-visible');
        _this.imager.$imageElement.removeClass('custom-quality-visible');
      }

      $('body').trigger('imagerResize');

      _this.imager.adjustEditContainer();

      _this.imager.quality = selectedQuality.quality ? selectedQuality.quality : 0.5;
      _this.imager.targetScale = selectedQuality.scale ? selectedQuality.scale : 0.5;
      _this.imager.render();
    });
  };

  QualitySelector.prototype.getElement = function () {
    return this.$qualitySelector;
  };

  QualitySelector.prototype.update = function () {
    var selected = this.$qualitySelector.find('option:selected').val();
    this.$qualitySelector.find('option').remove();

    for (var i = 0; i < this.options.sizes.length; i++) {
      var s = this.options.sizes[i];

      var label = translations.t(s.label);

      if (s.percentage !== undefined) {
        this.imager.quality = s.quality;
        this.imager.targetScale = s.scale;
        this.imager.render();

        var size = this.imager.getDataSize() / 1024;

        label += ' - ' + Math.round(size) + ' ' + translations.t('KB') +
          ' (' + s.percentage + '%)';
      }

      var $swatch = $(
        '<option value="' + i + '">' +
        label +
        '</option>');

      this.$qualitySelector.find('select').append($swatch);
    }

    if (selected) {
      this.$qualitySelector.find('select').val(selected);
    } else {
      this.$qualitySelector.find('select').val(0);
    }

    this.$qualitySelector.find('select').trigger('change');
  };

  QualitySelector.prototype.val = function () {
    this.$qualitySelector.find('select')
      .val.apply(this.$qualitySelector, arguments);
  };

  QualitySelector.prototype.show = function () {
    this.$qualitySelector.removeClass('hidden');
  };

  QualitySelector.prototype.hide = function () {
    this.$qualitySelector.addClass('hidden');
  };

  namespace.ImagerQualitySelector = QualitySelector;

})(jQuery, ImagerJs.translations, window);