import { translate } from "./Translations";

/**
 *
 * Provides a select that could be used to change imager quality.
 *
 * @param imagerInstance
 * @constructor
 *
 */
export default class QualitySelector {
  constructor(imagerInstance, options) {
    this.defaultOptions = {
      sizes: [
        { label: "Original", scale: 1, quality: 1.0, percentage: 100 },
        { label: "Large", scale: 0.5, quality: 0.5, percentage: 50 },
        { label: "Medium", scale: 0.2, quality: 0.2, percentage: 20 },
        { label: "Small", scale: 0.05, quality: 0.05, percentage: 5 },
      ],
      allowCustomSetting: true,
    };

    options = options ? options : {};
    this.options = $.extend(true, this.defaultOptions, options);

    if (this.options.allowCustomSetting) {
      this.options.sizes.push({ label: "Custom" });
    }

    this.imager = imagerInstance;

    this.$qualitySelector = $(
      '<div class="imager-quality-wrapper">' +
        "<form>" +
        '<div class="imager-quality-container form-group">' +
        '<label for="imager-quality">' +
        translate("Quality") +
        "</label>" +
        '<select id="imager-quality" class="form-control">' +
        "</select>" +
        "</div>" +
        "</form>" +
        '<form class="form-inline custom-quality hidden">' +
        '<div class="form-group">' +
        '<label for="imager-quality-custom" ' +
        'class="imager-quality-custom">' +
        translate("Custom quality percent") +
        "</label>" +
        '<div class="input-group">' +
        '<input id="imager-quality-custom" type="number" min="1" max="100"' +
        'class="form-control imager-quality-custom" value="100"/>' +
        '<div class="input-group-addon">%</div>' +
        '<div class="size-in-kb"></div>' +
        "</div>" +
        "</div>" +
        "</form>" +
        "</div>"
    ).addClass("hidden");

    this.$qualitySelector
      .find("input.imager-quality-custom")
      .change((e) => {
        var customQuality = +e.target.value;

        this.imager.quality = customQuality / 100;
        this.imager.targetScale = customQuality / 100;
        this.imager.render();

        var size = this.imager.getDataSize() / 1024;
        var sizeText = Math.round(size) + " " + translate("KB");
        this.$qualitySelector.find(".size-in-kb").text(sizeText);
      });

    this.$qualitySelector.find("select").on("change", (e) => {
      var value = +e.target.value;

      var selectedQuality = this.options.sizes[value];

      if (selectedQuality === null || selectedQuality === undefined) {
        selectedQuality = _this.options.sizes[0];
      }

      if (selectedQuality.label == "Custom") {
        this.$qualitySelector
          .find("form.custom-quality")
          .removeClass("hidden");
        this.$qualitySelector.addClass("custom-quality-visible");
        this.imager.$imageElement.addClass("custom-quality-visible");
      } else {
        this.$qualitySelector.find("form.custom-quality").addClass("hidden");
        this.$qualitySelector.removeClass("custom-quality-visible");
        this.imager.$imageElement.removeClass("custom-quality-visible");
      }

      $("body").trigger("imagerResize");

      this.imager.adjustEditContainer();

      this.imager.quality = selectedQuality.quality
        ? selectedQuality.quality
        : 0.5;
      this.imager.targetScale = selectedQuality.scale
        ? selectedQuality.scale
        : 0.5;
      this.imager.render();
    });
  }

  hide() {
    return this.$qualitySelector;
  }

  hide() {
    var selected = this.$qualitySelector.find("option:selected").val();
    this.$qualitySelector.find("option").remove();

    for (var i = 0; i < this.options.sizes.length; i++) {
      var s = this.options.sizes[i];

      var label = translate(s.label);

      if (s.percentage !== undefined) {
        this.imager.quality = s.quality;
        this.imager.targetScale = s.scale;
        this.imager.render();

        var size = this.imager.getDataSize() / 1024;

        label +=
          " - " +
          Math.round(size) +
          " " +
          translate("KB") +
          " (" +
          s.percentage +
          "%)";
      }

      var $swatch = $('<option value="' + i + '">' + label + "</option>");

      this.$qualitySelector.find("select").append($swatch);
    }

    if (selected) {
      this.$qualitySelector.find("select").val(selected);
    } else {
      this.$qualitySelector.find("select").val(0);
    }

    this.$qualitySelector.find("select").trigger("change");
  }

  hide() {
    this.$qualitySelector
      .find("select")
      .val.apply(this.$qualitySelector, arguments);
  }

  hide() {
    this.$qualitySelector.removeClass("hidden");
  }

  hide() {
    this.$qualitySelector.addClass("hidden");
  }
}
