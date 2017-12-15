(function ($, namespace) {
  var $body = null;
  var $overlay = $('<div class="modaljs-overlay hidden hidden-add-end noselect"></div>');
  var $wrapper = $('<div class="modaljs-wrapper hidden noselect">' +
    '<div class="modaljs-wrapper2 modaljs-modals-container noselect"></div>' +
    '</div>');

  $(document).ready(function () {
    $body = $('body');
    $body.append($overlay);
    $body.append($wrapper);
  });

  var Modal = function Modal() {
    var _this = this;
    var $modal = $('<div class="modaljs hidden noselect">' +
      '<header></header>' +
      '<div class="modaljs-template-container noselect"></div>' +
      '<footer>' +
      '</footer>');

    $wrapper.find('.modaljs-modals-container').append($modal);

    $wrapper.find('.modaljs').scroll(function () {
      $(window).trigger('resize');
    });

    this.$modal = $modal;
    this.classname = '';

    this.cancelHandler = null;

    $(window).resize(function () {
      _this.fixPosition();
    });

    $('body').on('imagerResize', function () {
      _this.fixPosition();
    });
  };

  Modal.prototype.setTitle = function (title) {
    this.$modal.find('header').html(title);
  };

  Modal.prototype.setTemplate = function (template) {
    this.$modal.find('.modaljs-template-container').append($(template));
  };

  Modal.prototype.fixPosition = function () {
    if ($wrapper.find('.modaljs').length < 1) {
      return;
    }

    var headerHeight = $wrapper.find('.modaljs > header')
      [0].getBoundingClientRect().height;
    var bodyHeight = $wrapper.find('.modaljs > .modaljs-template-container')
      [0].getBoundingClientRect().height;
    var footerHeight = $wrapper.find('.modaljs > footer')
      [0].getBoundingClientRect().height;

    var fullContentHeight = headerHeight + bodyHeight + footerHeight;

    if ($(window).height() <= fullContentHeight) {
      $wrapper.addClass('fullheight');
    } else {
      $wrapper.removeClass('fullheight');
    }
  };

  Modal.prototype.addCancelButton = function (buttonText, handler) {
    var _this = this;

    _this.cancelHandler = handler;

    var $button = $('<button></button>').text(buttonText);
    $button.on('click', function () {
      _this.hide();
      if (_this.cancelHandler) {
        _this.cancelHandler();
      }
    });

    _this.$modal.find('footer').append($button);

    _this._fixButtonsSize();
  };

  Modal.prototype.addClass = function (classname) {
    this.classname += ' ' + classname;
    this.$modal.addClass(classname);
  };

  Modal.prototype.addActionButton = function (buttonText, handler) {
    var _this = this;

    var $button = $('<button></button>')
      .addClass('modaljs-action-button')
      .text(buttonText);

    $button.on('click', function () {
      var handlerResponse = handler();
      if (handlerResponse === undefined && handlerResponse !== false) {
        _this.hide();
      }
    });

    _this.$modal.find('footer').append($button);

    _this._fixButtonsSize();
  };

  Modal.prototype._fixButtonsSize = function () {
    var $buttons = this.$modal.find('footer button');
    $buttons.css('width', (100 / $buttons.length) + '%');
  };

  Modal.prototype.show = function () {
    var _this = this;

    $overlay.addClass(this.classname);

    $overlay.removeClass('hidden-add-end');
    $overlay.removeClass('hidden');
    $overlay.css('height', $('body').height());
    $overlay.on('click', function () {
      _this.hide();
      if (_this.cancelHandler) {
        _this.cancelHandler();
      }
    });

    $wrapper.removeClass('hidden');

    this.$modal.removeClass('hidden');

    var bodyWidthBefore = $body.width();
    this.overflowBefore = $body.css('overflow');

    $body.css('overflow', 'hidden');
    this.widthDiff = $body.width() - bodyWidthBefore;
    this.paddingBefore = $body.css('padding-right');

    $body.css('padding-right', this.widthDiff + 'px');
  };

  Modal.prototype.hide = function () {
    $overlay.removeClass(this.classname);

    $overlay.addClass('hidden');
    setTimeout(function () {
      $overlay.addClass('hidden-add-end');
    }, 400);

    $overlay.off('click');

    $wrapper.addClass('hidden');
    this.$modal.addClass('hidden');

    $body.css('overflow', this.overflowBefore);
    $body.css('padding-right', this.paddingBefore);
  };

  Modal.prototype.remove = function () {
    this.$modal.remove();
    this.cancelHandler = false;
  };

  namespace.Modal = Modal;
})(jQuery, window);