import { mouseDown, mouseMove, mouseUp } from "../../util/Util";
import "./Properties.css";
import { translate } from "../../Translations";
import { Modal } from "../../Modal";

const MOUSE_DOWN = mouseDown("MovableFloatingMode");
const MOUSE_MOVE = mouseMove("MovableFloatingMode");
const MOUSE_UP = mouseUp("MovableFloatingMode");

/**
 * Provides a button which shows modal window with image properties line
 * aligment and size.
 *
 * @param imagerInstance
 * @param options
 * @constructor
 */
export default class PropertiesPlugin {
  constructor(imagerInstance, options) {
    this.imager = imagerInstance;

    this.defaultOptions = {
      minWidth: 50,
      minHeight: 50,
    };

    options = options ? options : {};
    this.options = $.extend(true, this.defaultOptions, options);

    this.weight = 100;

    this.imager.log("[PropertiesPlugin]", "init");
  }

  getButtons() {
    return [
      {
        classes: "btn-properties",
        iconClasses: "icon-cog",
        tooltip: translate("Image properties"),
        enabledHandler: () => this.showPropertiesModal(),
      },
    ];
  }

  showPropertiesModal() {
    var modal = new Modal();
    modal.setTitle(translate("Image properties"));
    modal.addClass("canvas-properties imager-click-stop");

    var $template = $(
      '<div class="image-properties">' +
        '<form class="image-size-form"><div class="form-group">' +
        '<label for="image-properties-width">' +
        translate("Size:") +
        " " +
        "</label>" +
        '<input type="text" class="form-control" ' +
        'id="image-properties-width" ' +
        'placeholder="' +
        translate("width in px") +
        '">' +
        "<span>x</span>" +
        '<input type="email" class="form-control" ' +
        'id="image-properties-height" ' +
        'placeholder="' +
        translate("height in px") +
        '">' +
        "</div></form>" +
        "<br>" +
        '<form class="aligment"><div class="form-group">' +
        '<label for="image-properties-layout">Aligment:</label>' +
        '<select id="image-properties-layout" ' +
        'class="form-control layout-selector">' +
        '<option value="left">' +
        translate("Left") +
        "</option>" +
        '<option value="right">' +
        translate("Right") +
        "</option>" +
        '<option value="center">' +
        translate("Center") +
        "</option>" +
        '<option value="inline">' +
        translate("Inline") +
        "</option>" +
        '<option value="floating">' +
        translate("Floating") +
        "</option>" +
        "</select>" +
        "</div></form>" +
        '<form class="background-transparency"><div class="form-group">' +
        '<input id="image-properties-transparent-background" ' +
        'type="checkbox" checked>' +
        '<label for="image-properties-transparent-background">' +
        translate("Transparent background") +
        "</label>" +
        "</div></form>" +
        "</div>"
    );

    if (this.getAlign() == "floating") {
      $template.find(".background-transparency").show();
    } else {
      $template.find(".background-transparency").hide();
    }

    var backgroundColor = this.imager.$imageElement.css("background-color");

    if (
      backgroundColor == "transparent" ||
      backgroundColor == "rgba(0, 0, 0, 0)"
    ) {
      $template
        .find("#image-properties-transparent-background")
        .attr("checked", "checked");
    } else {
      $template
        .find("#image-properties-transparent-background")
        .removeAttr("checked");
    }

    var size = this.imager.getPreviewSize();
    var ratioWidth = size.height / size.width;
    var ratioHeight = size.width / size.height;

    var currentAlign = this.getAlign();

    $template.find("#image-properties-width").val(size.width);
    $template.find("#image-properties-width").on("change keyup", () =>  {
      var newWidth = $template.find("#image-properties-width").val();
      var newHeight = Math.floor(newWidth * ratioWidth);
      $template.find("#image-properties-height").val(newHeight);
    });

    $template.find("#image-properties-height").val(size.height);
    $template.find("#image-properties-height").on("change keyup", () =>  {
      var newHeight = $template.find("#image-properties-height").val();
      var newWidth = Math.floor(newHeight * ratioHeight);
      $template.find("#image-properties-width").val(newWidth);
    });

    $template.find("#image-properties-layout").val(currentAlign);

    $template.find("#image-properties-layout").change(() =>  {
      if ($("#image-properties-layout").val() == "floating") {
        $template.find(".background-transparency").show();
      } else {
        $template.find(".background-transparency").hide();
      }
    });

    modal.setTemplate($template);

    modal.addCancelButton(translate("Cancel"), () =>  {
      modal.remove();
    });

    modal.addActionButton(translate("Apply"), () =>  {
      var width = $("#image-properties-width").val();
      var height = $("#image-properties-height").val();
      var align = $("#image-properties-layout").val();
      var transparent = $("#image-properties-transparent-background").attr(
        "checked"
      );

      if (transparent) {
        this.imager.$editContainer.css("background", "transparent");
        this.imager.$imageElement.css("background", "transparent");
      } else {
        this.imager.$editContainer.css("background", "white");
        this.imager.$imageElement.css("background", "white");
      }

      this.imager.render();

      if (align != this.getAlign()) {
        this.setAlign(align);
      }

      this.imager.setPreviewSize(width, height);

      modal.remove();
    });

    modal.show();
  }

  setAlign(align) {
    var aligmentCss = {};

    if (align == "floating") {
      aligmentCss["position"] = "absolute";
      aligmentCss["display"] = "block";
      aligmentCss["float"] = "none";
      aligmentCss["left"] = "0px";
      aligmentCss["top"] = "0px";
    } else if (align == "center") {
      aligmentCss["float"] = "none";
      aligmentCss["margin-left"] = "auto";
      aligmentCss["margin-right"] = "auto";
      aligmentCss["display"] = "block";
      aligmentCss["position"] = "static";
    } else if (align == "inline") {
      aligmentCss["float"] = "none";
      aligmentCss["display"] = "inline-block";
      aligmentCss["position"] = "static";
    } else {
      aligmentCss["display"] = "block";
      aligmentCss["float"] = align;
      aligmentCss["position"] = "static";
    }

    this.imager.$imageElement.css(aligmentCss);

    this.onEditStart();

    this.imager.adjustEditContainer();
  }

  getAlign() {
    var aligmentCss = this.imager.$imageElement.css([
      "position",
      "float",
      "display",
      "margin-left",
      "margin-right",
    ]);

    var currentAlign = "inline";

    if (aligmentCss["position"] == "absolute") {
      currentAlign = "floating";
    } else if (aligmentCss["float"] == "left") {
      currentAlign = "left";
    } else if (aligmentCss["float"] == "right") {
      currentAlign = "right";
    } else if (
      aligmentCss["display"] == "block" &&
      aligmentCss["margin-left"] == "auto"
    ) {
      currentAlign = "center";
    }

    return currentAlign;
  }

  onEditStart() {
    var align = this.getAlign();

    if (align == "floating") {
      this.makeMoveButton();
    } else if (this.$moveButton) {
      this.$moveButton.remove();
      this.$moveButton = null;
    }
  }

  makeMoveButton() {
    var toolbar = this.imager.getPluginInstance("Toolbar").toolbar;

    var $body = $("body");

    this.$moveButton = toolbar.addButton(
      "btn-move",
      "icon-arrows-cw",
      translate("Move image"),
      () =>  {}
    );

    this.$moveButton.on(MOUSE_DOWN, (event) => {
      if (event.type.indexOf("touch") > -1) {
        event = event.originalEvent;
      }

      $(".tooltip-btn-move").css("display", "none");

      var startLeft =
        this.imager.$imageElement.css("left").replace("px", "") | 0;
      var startTop = this.imager.$imageElement.css("top").replace("px", "") | 0;

      var mouseStartLeft = event.pageX;
      var mouseStartTop = event.pageY;

      $body.on(MOUSE_MOVE, (moveEvent) => {
        if (moveEvent.type.indexOf("touch") > -1) {
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

        this.imager.$imageElement.css({
          left: newLeft,
          top: newTop,
        });

        this.imager.adjustEditContainer();

        moveEvent.preventDefault();
        moveEvent.stopPropagation();
        return false;
      });

      $body.on(MOUSE_UP, () =>  {
        $(".tooltip-btn-move").css("display", "block");
        $body.off(MOUSE_MOVE);
        $body.off(MOUSE_UP);
      });
    });
  }
}
