import './Modal.css';

let $body = null;
let $overlay = $(
  '<div class="modaljs-overlay hidden hidden-add-end noselect"></div>'
);
let $wrapper = $(
  '<div class="modaljs-wrapper hidden noselect">' +
    '<div class="modaljs-wrapper2 modaljs-modals-container noselect"></div>' +
    "</div>"
);

$(document).ready(() => {
  $body = $("body");
  $body.append($overlay);
  $body.append($wrapper);
});

export class Modal {
  constructor() {
    var $modal = $(
      '<div class="modaljs hidden noselect">' +
        "<header></header>" +
        '<div class="modaljs-template-container noselect"></div>' +
        "<footer>" +
        "</footer>"
    );

    $wrapper.find(".modaljs-modals-container").append($modal);

    $wrapper.find(".modaljs").scroll(() => {
      $(window).trigger("resize");
    });

    this.$modal = $modal;
    this.classname = "";

    this.cancelHandler = null;

    $(window).resize(() => {
      this.fixPosition();
    });

    $("body").on("imagerResize", () => {
      this.fixPosition();
    });
  }

  setTitle(title) {
    this.$modal.find("header").html(title);
  }

  setTemplate(template) {
    this.$modal.find(".modaljs-template-container").append($(template));
  }

  fixPosition() {
    if ($wrapper.find(".modaljs").length < 1) {
      return;
    }

    var headerHeight = $wrapper
      .find(".modaljs > header")[0]
      .getBoundingClientRect().height;
    var bodyHeight = $wrapper
      .find(".modaljs > .modaljs-template-container")[0]
      .getBoundingClientRect().height;
    var footerHeight = $wrapper
      .find(".modaljs > footer")[0]
      .getBoundingClientRect().height;

    var fullContentHeight = headerHeight + bodyHeight + footerHeight;

    if ($(window).height() <= fullContentHeight) {
      $wrapper.addClass("fullheight");
    } else {
      $wrapper.removeClass("fullheight");
    }
  }

  addCancelButton(buttonText, handler) {
    this.cancelHandler = handler;

    var $button = $("<button></button>").text(buttonText);
    $button.on("click", () => {
      this.hide();
      if (this.cancelHandler) {
        this.cancelHandler();
      }
    });

    this.$modal.find("footer").append($button);

    this._fixButtonsSize();
  }

  addClass(classname) {
    this.classname += " " + classname;
    this.$modal.addClass(classname);
  }

  addActionButton(buttonText, handler) {
    var $button = $("<button></button>")
      .addClass("modaljs-action-button")
      .text(buttonText);

    $button.on("click", () => {
      var handlerResponse = handler();
      if (handlerResponse === undefined && handlerResponse !== false) {
        this.hide();
      }
    });

    this.$modal.find("footer").append($button);

    this._fixButtonsSize();
  }

  _fixButtonsSize() {
    var $buttons = this.$modal.find("footer button");
    $buttons.css("width", 100 / $buttons.length + "%");
  }

  show() {
    $overlay.addClass(this.classname);

    $overlay.removeClass("hidden-add-end");
    $overlay.removeClass("hidden");
    $overlay.css("height", $("body").height());
    $overlay.on("click", () => {
      this.hide();
      if (this.cancelHandler) {
        this.cancelHandler();
      }
    });

    $wrapper.removeClass("hidden");

    this.$modal.removeClass("hidden");

    var bodyWidthBefore = $body.width();
    this.overflowBefore = $body.css("overflow");

    $body.css("overflow", "hidden");
    this.widthDiff = $body.width() - bodyWidthBefore;
    this.paddingBefore = $body.css("padding-right");

    $body.css("padding-right", this.widthDiff + "px");
  }

  hide() {
    $overlay.removeClass(this.classname);

    $overlay.addClass("hidden");
    setTimeout(() => {
      $overlay.addClass("hidden-add-end");
    }, 400);

    $overlay.off("click");

    $wrapper.addClass("hidden");
    this.$modal.addClass("hidden");

    $body.css("overflow", this.overflowBefore);
    $body.css("padding-right", this.paddingBefore);
  }

  remove() {
    this.$modal.remove();
    this.cancelHandler = false;
  }
}
