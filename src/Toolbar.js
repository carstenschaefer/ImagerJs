(function ($, namespace, util) {
  var Toolbar = function ToolbarPlugin(options) {
    var _this = this;

    options = options || {};

    var defaultOptions = {
      tooltipEnabled: true,
      tooltipCss: null
    };

    _this.options = $.extend(defaultOptions, options);

    _this.$toolbar = $('<ul class="toolbar"></ul>')
      .attr('contenteditable', 'false')
      .addClass('noselect')
      .addClass('toolbar-topLeft');

    _this.tooltips = [];
    _this.buttonsGroups = {};
  };

  Toolbar.prototype.getElement = function () {
    return this.$toolbar;
  };

  Toolbar.prototype.addButton = function (className, iconClass,
                                          tooltipText, clickHandler) {
    var $button = this.createButton(className, iconClass, clickHandler);

    this.$toolbar.append($button);
    this.createTooltip($button.find('a'), className, tooltipText, 'bottom');

    return $button;
  };

  Toolbar.prototype.createButton = function (className, iconClass,
                                             clickHandler) {
    var _this = this;

    var $button = $(
      '<li data-sizeable="toolbar-button" ' +
      'data-cssrules="width,height">' +
      '<a href="#" ' +
      'data-sizeable="toolbar-button" ' +
      'data-cssrules="line-height,font-size:($v / 2.5)" tabindex="-1">' +
      '<i class="fa ' + iconClass + '"></i>' +
      '</a>' +
      '</li>').addClass(className);

    util.bindClick($button.find('a'), 'imager-button', function () {
      return clickHandler(_this);
    });

    return $button;
  };

  /**
   * Add a button to this toolbar. Button will be appended to group.
   * Group is a one button which will show dropdown with its buttons on click.
   *
   * @param className {String}    Add specified class to button's <li> element.
   * @param iconClass {String}    Add specified class to button's <i> element.
   * @param tooltipText {String} Tooltip text that will be shown on mouse over.
   * @param group {Object} Group object with group class name and tooltip text
   * @param group.name {String} Group unique id
   * @param group.tooltip {String} A tooltip text that will be shown on mouse over
   * @param clickHandler {Function} function that will be invoked
   *                                when user clicks on this button.
   */
  Toolbar.prototype.addButtonToGroup = function (className, iconClass,
                                                 tooltipText, group,
                                                 clickHandler) {
    var $groupContainer = null;
    if (!this.buttonsGroups[group.name]) {
      $groupContainer = $(
        '<li class="btn-group" ' +
        'data-editable-canvas-sizeable="toolbar-button" ' +
        'data-editable-canvas-cssrules="width,height">' +
        '<a href="#" ' +
        'data-editable-canvas-sizeable="toolbar-button" ' +
        'data-editable-canvas-cssrules="line-height,font-size:($v / 2.5)" ' +
        'tabindex="-1">' +
        '<i class="fa ' + iconClass + '"></i>' +
        '</a>' +
        '<ul class="group-items-container hidden">' +
        '</ul>' +
        '</li>');

      this.buttonsGroups[group.name] = $groupContainer;
      this.$toolbar.append($groupContainer);

      util.bindClick($groupContainer.children('a'),
        'drawer-toolbar-group-button', function () {
          $groupContainer.find('ul.group-items-container').toggleClass('hidden');
        }
      );

      this.createTooltip(
        $groupContainer.children('a'), group.name, group.tooltip, 'bottom'
      );
    }

    $groupContainer = this.buttonsGroups[group.name];

    var $button = this.createButton(className, iconClass,
      function (clickEvent) {
        $groupContainer.find('ul.group-items-container').toggleClass('hidden');

        clickHandler(clickEvent);

        $groupContainer.attr('class', $button.attr('class'))
          .addClass('btn-group');
        $groupContainer.children('a')
          .attr('class', $button.children('a').attr('class'));
        $groupContainer.children('a')
          .html($button.children('a').html());
      });

    $groupContainer.find('.group-items-container').append($button);

    this.createTooltip($button.find('a'),
      className + ' group-item', tooltipText, 'right');

    return $button;
  };


  Toolbar.prototype.createTooltip = function ($button, className, title,
                                              align) {
    if (!this.options.tooltipEnabled) {
      return;
    }

    var $tooltip = $('<span>')
      .addClass('toolbar-tooltip tooltip-' + className)
      .html(title);

    $tooltip.appendTo('body');
    this.tooltips.push($tooltip);

    if (this.options.tooltipCss) {
      $tooltip.css(this.options.tooltipCss);
    }

    $button.on('mouseenter', function () {
      if ($(this).hasClass('disabled')) return;

      var btnPos = $button.offset();
      var btnHeight = $button.innerHeight();
      var btnWidth = $button.innerWidth();

      $tooltip.addClass('active');

      var top = 0;
      var left = 0;

      switch (align) {
        case 'right':
          top = btnPos.top + (($button.height() - $tooltip.outerHeight()) / 2);
          left = btnPos.left + btnWidth;
          break;
        default:
          top = (btnPos.top + btnHeight);
          left = (btnPos.left + btnWidth / 2 - $tooltip.innerWidth() / 2);
          break;
      }
      $tooltip.css({
        top: top + 'px',
        left: left + 'px'
      });
    });

    $button.on('mouseout', function () {
      $tooltip.removeClass('active');
    });
  };

  Toolbar.prototype.setActiveButton = function (buttonClassName) {
    this.$toolbar.find('li.' + buttonClassName).children('a').addClass('active');
  };

  Toolbar.prototype.clearActiveButton = function () {
    this.$toolbar.find('li').children('a').removeClass('active');
  };

  Toolbar.prototype.remove = function () {
    if (this.$toolbar) {
      this.$toolbar.remove();
      this.$toolbar = null;
    }

    if (this.tooltips) {
      this.tooltips.map(function ($tooltip) {
        $tooltip.remove();
        $tooltip = null;
        return null;
      });
      this.tooltips = null;
    }
  };

  namespace.Toolbar = Toolbar;

})(jQuery, window, ImagerJs.util);