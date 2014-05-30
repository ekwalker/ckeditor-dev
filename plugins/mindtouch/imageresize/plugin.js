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
 * @file Image resize plugin.
 * @see EDT-203
 * @link {https://bugs.webkit.org/show_bug.cgi?id=7154}
 */

(function() {
	var resizerCornerTpl = CKEDITOR.addTemplate('imageResizerCorner', '<div data-cke-temp=1 contenteditable=false unselectable=on style="position:absolute;padding:0;background-color:#fff;background-image:none;border:1px solid #000;z-index:11;width:5px;height:5px;pointer-events:auto;{style}" data-cke-corner-pos="{pos}"></div>'),
		resizerInfoTpl = CKEDITOR.addTemplate('imageResizerInfo', '<div id="cke_image_resizer_info" unselectable=on data-cke-image-resize-info=1 style="position:absolute;display:none;cursor:default;font-size:11px;padding:3px;background-color:#ffff88;background-image:none;border:1px solid #000;z-index:99"></div>'),
		resizerTpl = CKEDITOR.addTemplate('imageResizer', '<div data-cke-temp=1 contenteditable=false unselectable=on data-cke-image-resizer=1 style="position:absolute;display:none;cursor:default;padding:0;background-color:transparent;background-image:none;border:1px solid #000;z-index:10;pointer-events:none;"></div>');

	function cancel(evt) {
		(evt.data || evt).preventDefault();
	}

	function imageResizer(editor) {
		var isResizing,
			currentCorner, // active resize corner
			startBox, // params of resizer element on resizing is started
			editorPos, // editor position in document
			rtl = false,
			doc = editor.document,
			resizer = null, // resizer box element
			image = null, // current image to resize
			resizeInfo = null, // tooltip with new image size
			pxUnit = CKEDITOR.tools.cssLength;

		function resizeStart(resizeCorner) {
			if (!resizeCorner) {
				return;
			}

			startBox = {
				left: parseInt(resizer.getComputedStyle('left'), 10),
				top: parseInt(resizer.getComputedStyle('top'), 10),
				width: parseInt(resizer.getComputedStyle('width'), 10),
				height: parseInt(resizer.getComputedStyle('height'), 10)
			};

			editorPos = (new CKEDITOR.dom.element(doc.getWindow().$.frameElement)).getDocumentPosition(CKEDITOR.document);

			isResizing = 1;
			currentCorner = resizeCorner;

			doc.on('mousemove', onMouseMove);
			CKEDITOR.document.on('mousemove', onMouseMove);

			// Prevent the native drag behavior otherwise 'mousemove' won't fire.
			doc.on('dragstart', cancel);
		}

		function resizeEnd() {
			isResizing = 0;
			resizeInfo.hide();
			resizeImage();
			doc.removeListener('dragstart', cancel);
		}

		function resizeImage() {
			var newSize = {
				width: resizer.getComputedStyle('width'),
				height: resizer.getComputedStyle('height')
			}

			editor.fire('saveSnapshot');

			image.setStyles(newSize);

			var left = startBox.left;

			if (rtl) {
				left -= parseInt(newSize.width, 10) - startBox.width;
			}

			resizer.setStyles({
				left: pxUnit(left),
				top: pxUnit(startBox.top)
			});

			editor.execCommand('autogrow');
			editor.fire('saveSnapshot');
		}

		function onMouseDown(evt) {
			cancel(evt);
			resizeStart(evt.sender);
			doc.getWindow().on('mouseup', onMouseUp, this);
			CKEDITOR.document.on('mouseup', onMouseUp, this);
		}

		function onMouseUp(evt) {
			evt.removeListener();
			resizeEnd();
		}

		function onMouseMove(evt) {
			var x = evt.data.$.pageX,
				y = evt.data.$.pageY,
				newStyles = {},
				infoStyles = {},
				left, top;

			if (!currentCorner || !isResizing) {
				return 0;
			}

			// tooltip position
			infoStyles.left = x + 10;
			infoStyles.top = y + 10;

			if (evt.sender.equals(CKEDITOR.document)) {
				// if cursor is moved out of editor
				x = x - editorPos.x;
				y = y - editorPos.y;
			} else {
				// tooltip is appended to the main document, so if cursor into editor we need to correct position
				infoStyles.left += editorPos.x;
				infoStyles.top += editorPos.y;
			}

			var cornerPos = currentCorner.data('cke-corner-pos');

			// calculate new resizer position and dimensions
			switch (cornerPos) {
				case 'top':
					newStyles.top = y;
					newStyles.height = startBox.height + (startBox.top - y);
					break;
				case 'bottom':
					newStyles.height = y - startBox.top;
					break;
				case 'right':
				case 'top-right':
				case 'bottom-right':
					newStyles.width = x - startBox.left;
					break;
				case 'left':
				case 'top-left':
				case 'bottom-left':
					newStyles.left = x;
					newStyles.width = startBox.width + (startBox.left - x);
					break;
				default:
					break;
			}

			// for top-left/right and bottom-left/right
			// keep image ratio
			if (cornerPos.indexOf('-') > 0) {
				var ratio = startBox.width / startBox.height;

				newStyles.height = Math.round(newStyles.width / ratio);

				if (cornerPos.indexOf('top') == 0) {
					newStyles.top = startBox.top - (newStyles.height - startBox.height);
				}
			}

			var pxStyles = function(styles) {
				for (style in styles) {
					styles[style] = pxUnit(styles[style]);
				}

				return styles;
			};

			// show tooltip with new size
			var info = '';
			info += newStyles.width ? newStyles.width : startBox.width;
			info += ' x ';
			info += newStyles.height ? newStyles.height : startBox.height;
			resizeInfo.setHtml(info);
			resizeInfo.setStyles(pxStyles(infoStyles));
			resizeInfo.show();

			resizer.setStyles(pxStyles(newStyles));

			return 1;
		}

		this.update = function() {
			if (!image) {
				return;
			}

			var imagePos = image.getDocumentPosition(doc),
				left = imagePos.x - 1,
				top = imagePos.y - 1,
				paddingLeft = parseInt(image.getComputedStyle('padding-left'), 10),
				paddingTop = parseInt(image.getComputedStyle('padding-top'), 10);

			if (paddingLeft) {
				left += paddingLeft;
			}

			if (paddingTop) {
				top += paddingTop;
			}

			resizer.setStyles({
				width: image.getComputedStyle('width'),
				height: image.getComputedStyle('height'),
				left: pxUnit(left),
				top: pxUnit(top)
			});
		}

		this.attachTo = function(img) {
			if (image && image.equals(img)) {
				return;
			} else if (image) {
				this.detach();
			}

			image = img;
			this.image = image;

			rtl = image.getComputedStyle('direction') == 'rtl';

			this.update();
			resizer.show();

			var corners = resizer.getChildren(),
				i;

			for (i = 0; i < corners.count(); i++) {
				corners.getItem(i).on('mousedown', onMouseDown, this);
			}
		};

		this.detach = function() {
			if (!image) {
				return;
			}

			image = null;
			this.image = null;
			currentCorner = null;
			startBox = null;
			editorPos = null;
			isResizing = 0;

			doc.removeListener('mouseup', onMouseUp);
			doc.removeListener('mousemove', onMouseMove);
			CKEDITOR.document.removeListener('mouseup', onMouseUp);
			CKEDITOR.document.removeListener('mousemove', onMouseMove);

			var corners = resizer.getChildren(),
				i;

			for (i = 0; i < corners.count(); i++) {
				corners.getItem(i).removeListener('mousedown', onMouseDown);
			}

			resizeInfo.hide();
			resizer.hide();
		};

		var createResizeCorner = function(cornerPos) {
			var style;

			switch (cornerPos) {
				case 'top-left':
					style = 'cursor:nw-resize;left:-3px;top:-3px;';
					break;
				case 'top':
					style = 'cursor:n-resize;left:50%;top:-3px;';
					break;
				case 'top-right':
					style = 'cursor:ne-resize;right:-3px;top:-3px;';
					break;
				case 'right':
					style = 'cursor:e-resize;right:-3px;top:50%;';
					break;
				case 'bottom-right':
					style = 'cursor:se-resize;right:-3px;bottom:-3px;';
					break;
				case 'bottom':
					style = 'cursor:s-resize;left:50%;bottom:-3px;';
					break;
				case 'bottom-left':
					style = 'cursor:sw-resize;left:-3px;bottom:-3px;';
					break;
				case 'left':
					style = 'cursor:w-resize;left:-3px;top:50%;';
					break;
				default:
					break;
			}

			var resizeCorner = CKEDITOR.dom.element.createFromHtml(resizerCornerTpl.output({style: style, pos: cornerPos}), doc);

			resizeCorner.on('mouseover', function() {
				this.setStyle('background-color', '#000');
			});

			resizeCorner.on('mouseout', function() {
				this.setStyle('background-color', '#fff');
			});

			return resizeCorner;
		};

		resizer = CKEDITOR.dom.element.createFromHtml(resizerTpl.output({}), doc);

		resizer.append(createResizeCorner('top-left'));
		resizer.append(createResizeCorner('top'));
		resizer.append(createResizeCorner('top-right'));
		resizer.append(createResizeCorner('right'));
		resizer.append(createResizeCorner('bottom-right'));
		resizer.append(createResizeCorner('bottom'));
		resizer.append(createResizeCorner('bottom-left'));
		resizer.append(createResizeCorner('left'));

		doc.getDocumentElement().append(resizer);

		resizeInfo = CKEDITOR.document.getById('cke_image_resizer_info');

		if (!resizeInfo) {
			resizeInfo = CKEDITOR.dom.element.createFromHtml(resizerInfoTpl.output({}), CKEDITOR.document);
			CKEDITOR.document.getDocumentElement().append(resizeInfo);
		}
	}

	CKEDITOR.plugins.add('mindtouch/imageresize', {
		onLoad: function() {
			CKEDITOR.addCss('img::selection { background-color: transparent; }');
		},
		init: function(editor) {

			// keep image ratio on resizing in IE
			// @see EDT-233
			if (CKEDITOR.env.ie) {
				editor.on('contentDom', function() {
					var image, originalSize,
						body = editor.document.getBody();

					body.on('resizestart', function(evt) {
						var img = evt.data.getTarget();

						image = null;
						originalSize = null;

						if (img && img.is && img.is('img')) {
							var width, height;
							width = parseInt(img.getStyle('width'), 10);
							width = width || img.getSize('width', true);

							height = parseInt(img.getStyle('height'), 10);
							height = height || img.getSize('height', true);

							var nativeEv = evt.data.$,
								pos = img.getDocumentPosition();

							var handles = {
								left: Math.abs(pos.x - nativeEv.clientX) <= 10,
								right: Math.abs(pos.x + width - nativeEv.clientX) <= 10,
								top: Math.abs(pos.y - nativeEv.clientY) <= 10,
								bottom: Math.abs(pos.y + height - nativeEv.clientY) <= 10
							};

							// keep ratio only for corner handles
							if ((handles.left && (handles.top || handles.bottom)) || (handles.right && (handles.top || handles.bottom))) {
								originalSize = {
									'width': width,
									'height': height
								};
								image = img;
							}
						}
					});

					body.on('resizeend', function(evt) {
						if (image) {
							var ratio = originalSize.width / originalSize.height,
								width = parseInt(image.getStyle('width'), 10) || image.getSize('width', true),
								height = Math.round(width / ratio);

							setTimeout(function() {
								image.setStyle('height', height + 'px');
								image = null;
								originalSize = null;
							}, 0);
						}
					});
				});
			}

			if (!CKEDITOR.env.webkit) {
				return;
			}

			var resizer, timeout;
			editor.on('selectionChange', function(ev) {
				var selection = ev.data.selection,
					element = selection && selection.getStartElement();

				if (!element || !element.is('img') || element.isReadOnly()) {
					window.clearTimeout(timeout);
					resizer && resizer.detach();
					return;
				}

				if (!resizer) {
					resizer = new imageResizer(editor);
				}

				if (element.$.width === 0 && element.$.height === 0) {
					element.on('load', function(evt) {
						evt.removeListener();
						resizer.attachTo(element);
					});
				} else {
					resizer.attachTo(element);
				}
			}, null, null, 1);

			var onCommandExec = function() {
				if (resizer && resizer.image) {
					var selection = editor.getSelection(),
						element = selection && selection.getSelectedElement();

					if (element && element.equals(resizer.image)) {
						resizer.update();
					}
				}
			};

			editor.on('beforeCommandExec', onCommandExec);
			editor.on('afterCommandExec', onCommandExec);

			var removeResizer = function() {
				resizer && resizer.detach();
				resizer = null;
			}

			editor.on('readOnly', removeResizer);
			editor.on('contentDom', removeResizer);
			editor.on('contentDomUnload', removeResizer);
		}
	});
})();
