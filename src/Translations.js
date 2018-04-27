(function ($, namespace) {
  namespace.set = function(strings){
    strings = strings ? strings : {};
    namespace.translations = $.extend(true, namespace.translations, strings);
  };

  namespace.translations = {
    'Incorrect file type': 'Incorrect file type',
    'Insert': 'Insert',
    'Cancel': 'Cancel',
    'Add image': 'Add image',
    'Quality': 'Quality',

    'Rotate': 'Rotate',
    'Crop': 'Crop',

    'Original': 'Original',
    'KB': 'KB',
    'Large': 'Large',
    'Medium': 'Medium',
    'Small': 'Small',
    'Custom quality percent': 'Custom quality percent',
    'Custom': 'Custom',

    'Image properties': 'Image properties',
    'Size:': 'Size:',
    'width in px': 'width in px',
    'height in px': 'height in px',
    'Left': 'Left',
    'Right': 'Right',
    'Center': 'Center',
    'Inline': 'Inline',
    'Floating': 'Floating',
    'Transparent background': 'Transparent background',
    'Apply': 'Apply',
    'Reject': 'Reject',
    'Delete image': 'Delete image',
    'Move image': 'Move image',
    'Are you sure want to delete this image?': 'Are you sure want to delete this image?',
    'Or drop files here': 'Or drop files here',
    'No file selected.': 'No file selected.',
    'Please wait...': 'Please wait...',
    'Save': 'Save',
    'Undo': 'Undo',
    'Rotate manually': 'Rotate manually',
    'Rotate 90 left': 'Rotate 90° left',
    'Rotate 90 right': 'Rotate 90° left',

    'Image is too big and could cause very poor performance.': 'Image is too big and could cause very poor performance.'
  };

  namespace.t = function (textString) {
    if (namespace.translations[textString]) {
      return namespace.translations[textString];
    } else {
      console.warn('String not found in texts:' + textString);
      return textString;
    }
  };
})(jQuery, ImagerJs.translations);