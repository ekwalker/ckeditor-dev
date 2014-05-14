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
 * @file Video plugin
 */

(function() {

	var videoTpl = CKEDITOR.addTemplate('bubbleVideo', '<a target="_blank" href="{url}">{link}</a> &ndash; ' +
		'<a href="javascript:void(\'Edit Video\')" onclick="return CKEDITOR.tools.callFunction({fn}, \'mindtouch/video\')">{labelEdit}</a>&nbsp;|&nbsp;' +
		'<a href="javascript:void(\'Delete Video\')" onclick="return CKEDITOR.tools.callFunction({fn}, \'videoDelete\')">{labelDelete}</a>');

	var bubble;
	function attachBubble(videoElement, editor) {
		if (!bubble) {
			var commandFn = CKEDITOR.tools.addFunction(function(command) {
				this.execCommand(command);
				return false;
			}, editor);

			bubble = new CKEDITOR.ui.elementBubble({
				name: 'video',
				onUpdate: function() {
					var element = this.getElement(),
						video = editor.restoreRealElement(this.getAttachedElement()),
						url = video.getAttribute('media'),
						text = CKEDITOR.plugins.get('mindtouch/link').truncate(url),
						lang = editor.lang['mindtouch/video'],
						params = {
							url: url,
							link: text,
							fn: commandFn,
							labelEdit: lang.edit,
							labelDelete: lang['delete']
						};

					element.setHtml(videoTpl.output(params));
					this.setElement(element);
				}
			}, CKEDITOR.document, editor);
		}

		bubble.attach(videoElement);
	}

	var pluginName = 'mindtouch/video';

	CKEDITOR.plugins.add(pluginName, {
		lang: 'en', // %REMOVE_LINE_CORE%
		icons: 'video', // %REMOVE_LINE_CORE%
		requires: 'dialog,mindtouch/elementbubble,fakeobjects,mindtouch/link',
		onLoad: function() {
			var placeholderPath = Deki.PathCommon + '/images/icon-video-1280.png';
			CKEDITOR.addCss(
				'img.cke_video' +
				'{' +
					'background-image: url(' + placeholderPath + ');' +
					'background-color: transparent;' +
					'background-position: center center;' +
					'background-repeat: no-repeat;' +
					'-webkit-background-size: 100% 100%;' +
					'-moz-background-size: 100% 100%;' +
					'-o-background-size: 100% 100%;' +
					'background-size: 100% 100%;' +
					'filter: progid:DXImageTransform.Microsoft.AlphaImageLoader(src="' + placeholderPath + '", sizingMethod="scale");' +
					'-ms-filter: "progid:DXImageTransform.Microsoft.AlphaImageLoader(src="' + placeholderPath + '", sizingMethod="scale")";' +
					'width: 640px;' +
					'height: 360px;' +
				'}'
			);
		},
		beforeInit: function(editor) {
			CKEDITOR.tools.extend(editor.lang.fakeobjects, {
				video: editor.lang['mindtouch/video'].video
			});
		},
		init: function(editor) {
			CKEDITOR.dialog.add(pluginName, this.path + 'dialogs/video.js');
			editor.addCommand(pluginName, new CKEDITOR.dialogCommand(pluginName, {
				allowedContent: 'img[media,class,width,height,src,style]{*}(mt-media)',
				requiredContent: 'img[media]',
				contentTransformations: [
					[ 'img{width}: sizeToStyle', 'img[width]: sizeToAttribute' ]
				]
			}));

			editor.ui.addButton('Video', {
				label: editor.lang['mindtouch/video'].label,
				title: editor.lang['mindtouch/video'].title,
				command: pluginName,
				toolbar: 'insert,60'
			});

			editor.addCommand('videoDelete', {
				exec: function(editor) {
					var selection = editor.getSelection(),
						element = selection && selection.getStartElement();

					if (!element || !element.is('img') || element.data('cke-real-element-type') != 'video' || element.isReadOnly()) {
						return;
					}

					editor.fire('saveSnapshot');

					var range = new CKEDITOR.dom.range(editor.document);
					range.moveToPosition(element, CKEDITOR.POSITION_BEFORE_START);
					element.remove();
					range.select();

					editor.fire('saveSnapshot');
				}
			});

			editor.on('doubleclick', function(evt) {
				var element = evt.data.element;
				if (element.is('img') && element.data('cke-real-element-type') == 'video') {
					evt.data.dialog = 'mindtouch/video';
				}
			});

			editor.on('selectionChange', function(evt) {
				var element = evt.data.selection.getStartElement(),
					linkCmd = editor.getCommand('mindtouch/link');

				if (element && element.is('img') && element.data('cke-real-element-type') == 'video' && !element.isReadOnly()) {
					attachBubble(element, editor);
					// don't allow to add link to the video (EDT-476)
					linkCmd && linkCmd.state != CKEDITOR.TRISTATE_DISABLED && linkCmd.disable();
				} else {
					bubble && bubble.isAttached() && bubble.detach();
					linkCmd && linkCmd.enable();
				}
			}, null, null, 1);

			if (CKEDITOR.env.gecko) {
				// firefox changes only width/height attribute on resizing
				// so we have to update inline style when image is resized
				// @see EDT-595
				var observer = new MutationObserver(function(mutations) {
					mutations.forEach(function(mutation) {
						var target = new CKEDITOR.dom.element(mutation.target);
						if (target.$ && target.is('img') && target.hasClass('cke_video')) {
							var attrName = mutation.attributeName,
								attr = target.getAttribute(attrName),
								style = parseInt(target.getStyle(attrName), 10);

							if (!isNaN(attr) && attr !== style) {
								target.setStyle(attrName, attr + 'px');
							}
						}
					});
				});

				editor.on('contentDom', function() {
					setTimeout(function() {					
						observer.observe(editor.document.getBody().$, {attributes: true, subtree: true, attributeFilter: ['width', 'height']});
					}, 100);
				});
			}
		},

		afterInit: function(editor) {
			var dataProcessor = editor.dataProcessor,
				dataFilter = dataProcessor && dataProcessor.dataFilter;

			if (dataFilter) {
				dataFilter.addRules({
					elements: {
						img: function(element) {
							if ('media' in element.attributes) {
								return editor.createFakeParserElement(element, 'cke_video', 'video', true);
							}

							return null;
						}
					}
				});
			}
		}
	});
})();
