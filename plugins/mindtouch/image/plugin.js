/*
 * MindTouch
 * Copyright (c) 2006-2012 MindTouch Inc.
 * http://mindtouch.com
 *
 * This file and accompanying files are licensed under the
 * MindTouch Master Subscription Agreement (MSA).
 *
 * At any time, you shall not, directly or indirectly: (i) sublicense,
 * resell, rent, lease, distribute, market, commercialize or otherwise
 * transfer rights or usage to: (a) the Software, (b) any modified version
 * or derivative work of the Software created by you or for you, or (c)
 * MindTouch Open Source (which includes all non-supported versions of
 * MindTouch-developed software), for any purpose including timesharing or
 * service bureau purposes; (ii) remove or alter any copyright, trademark
 * or proprietary notice in the Software; (iii) transfer, use or export the
 * Software in violation of any applicable laws or regulations of any
 * government or governmental agency; (iv) use or run on any of your
 * hardware, or have deployed for use, any production version of MindTouch
 * Open Source; (v) use any of the Support Services, Error corrections,
 * Updates or Upgrades, for the MindTouch Open Source software or for any
 * Server for which Support Services are not then purchased as provided
 * hereunder; or (vi) reverse engineer, decompile or modify any encrypted
 * or encoded portion of the Software.
 *
 * A complete copy of the MSA is available at http://www.mindtouch.com/msa
 */

/**
 * @file Image plugin.
 */

(function() {
	var pluginName = 'mindtouch/image';

	var imageCmd = {
		canUndo: false,
		exec: function(editor) {
			this.editor = editor;

			var imageElement = getSelectedImage(editor);

			this.selectedImage = imageElement;
			this.link = null;

			var link = this.selectedImage && this.selectedImage.getAscendant('a');

			if (link && link.hasClass('thumb')) {
				this.link = link;
			}

			// build the params object to pass to the dialog
			var params = {};

			if (imageElement) {
				// determine the image wrapping
				var wrap = 'default',
					align = getImageAlignment(imageElement);

				if (align == 'left' || align == 'right') {
					wrap = align;
				}

				var width = parseInt(imageElement.getComputedStyle('width'), 10) ||
					parseInt(imageElement.getStyle('width'), 10) ||
					parseInt(imageElement.getAttribute('width'), 10) || 0;

				var height = parseInt(imageElement.getComputedStyle('height'), 10) ||
					parseInt(imageElement.getStyle('height'), 10) ||
					parseInt(imageElement.getAttribute('height'), 10) || 0;

				params = {
					'bInternal': imageElement.hasClass('internal'),
					'sSrc': imageElement.data('cke-saved-src') || imageElement.getAttribute('src'),
					'sAlt': imageElement.getAttribute('alt'),
					'sWrap': wrap,
					'nWidth': width,
					'nHeight': height
				};
			}

			// general params regardless of the image state
			params.nPageId = editor.config.mindtouch.pageId;
			params.sUserName = editor.config.mindtouch.userName;

			var url = editor.config.mindtouch.commonPath +
				'/popups/image_dialog.php?contextID=' + editor.config.mindtouch.pageId;

			if (imageElement) {
				url += "&update=true";
			}

			CKEDITOR.plugins.mindtouchdialog.open(pluginName, {
				url: url,
				width: '600px',
				height: 'auto',
				params: params,
				callback: this._.insertImage,
				scope: this
			});
		},

		_: {
			insertImage: function(params) {
				var editor = this.editor;

				var imageElement = editor.document.createElement('img');
				imageElement.setAttribute('alt', '');

				// try block for IE and bad images
				try {
					// set the image source
					imageElement.data('cke-saved-src', params.sSrc);
					imageElement.setAttribute('src', params.sSrc);

					// set the image attributes
					if (params.nWidth || params.nHeight) {
						imageElement.setStyle('width', params.nWidth + 'px');
						imageElement.setStyle('height', params.nHeight + 'px');
					}

					if (params.sAlt) {
						imageElement.setAttribute('alt', params.sAlt);
					}

					params.bInternal && imageElement.addClass('internal');
					// >MT: Bugfix: 0002630: left floating image is not aligned properly
					imageElement.addClass(params.sWrapClass);

					if (params.sWrap == 'left' || params.sWrap == 'right') {
						imageElement.setStyle('float', params.sWrap);
					}

					if (params.sFullSrc && params.sFullSrc.length) {
						var linkElement = this.link;

						if (!linkElement) {
							linkElement = editor.document.createElement('a');
							linkElement.addClass('thumb');
						}

						linkElement.setAttribute('title', params.sAlt || '');
						linkElement.setAttribute('href', params.sFullSrc);
						linkElement.data('cke-saved-href', params.sFullSrc);

						if (!this.link) {
							editor.insertElement(linkElement);
							linkElement.append(imageElement, false);
						} else {
							editor.insertElement(imageElement);
						}
					} else {
						if (this.link) {
							this.link.remove(true);
							this.selectedImage && editor.getSelection().selectElement(this.selectedImage);
						}

						editor.insertElement(imageElement);
					}

					this.selectedImage && editor.getSelection().selectElement(imageElement);
				} catch (e) {}
			}
		}
	};

	function getSelectedImage(editor, element) {
		if (!element) {
			var sel = editor.getSelection();
			element = (sel.getType() == CKEDITOR.SELECTION_ELEMENT) && sel.getSelectedElement();
		}

		if (element && element.is('img') && !element.data('cke-realelement') && !element.isReadOnly()) {
			return element;
		}

		return null;
	}

	function getImageAlignment(element) {
		var align = element.getStyle('float');

		if (align == 'inherit' || align == 'none') align = 0;

		if (!align) align = element.getAttribute('align');

		return align;
	}

	CKEDITOR.plugins.add(pluginName, {
		icons: 'mindtouchimage',
		requires: 'image,mindtouch/dialog',
		init: function(editor) {
			editor.addCommand(pluginName, imageCmd);

			editor.ui.addButton('MindTouchImage', {
				label: editor.lang.common.image,
				command: pluginName,
				toolbar: 'insert,10'
			});

			if (editor.addMenuItems) {
				editor.addMenuItems({
					image: {
						label: editor.lang.image.menu,
						command: pluginName,
						group: 'image'
					}
				});
			}

			editor.on('doubleclick', function(evt) {
				var element = evt.data.element;

				if (element.is('img') && !element.data('cke-realelement') && !element.isReadOnly()) {
					if (editor.execCommand(pluginName)) {
						evt.cancel();
					}
				}
			}, this, null, 1);
		},
		onLoad: function() {
			var css = [
				'.cke .cke_button__mindtouchimage .cke_button_label { display: inline; line-height: 16px; }'
			];
			CKEDITOR.document.appendStyleText(css.join(''));
		}
	});
})();
