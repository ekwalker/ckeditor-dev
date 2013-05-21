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

	var bubble;
	function attachBubble(videoElement, editor) {
		if (!bubble) {
			var commandFn = CKEDITOR.tools.addFunction(function(command) {
				this.execCommand(command);
				return false;
			}, editor);

			bubble = new CKEDITOR.ui.elementBubble({
				onUpdate: function() {
					var element = this.getElement(),
						video = editor.restoreRealElement(this.getAttachedElement()),
						url = video.getAttribute('media'),
						text = CKEDITOR.plugins.get('mindtouchlink').truncate(url);

					var html = '<a target="_blank" href="' + url + '">' + text + '</a> &ndash; ' +
						'<a href="javascript:void(\'Edit Video\')" onclick="return CKEDITOR.tools.callFunction(' + commandFn + ', \'video\')">' + editor.lang.video.edit +
						'</a> | <a href="javascript:void(\'Delete Video\')" onclick="return CKEDITOR.tools.callFunction(' + commandFn + ', \'videoDelete\')">' + editor.lang.video['delete'] + '</a>';

					element.setHtml(html);
					this.setElement(element);
				}
			}, CKEDITOR.document, editor);
		}

		bubble.attachTo(videoElement);
	}

	var pluginName = 'mt-video';

	CKEDITOR.plugins.add(pluginName, {
		icons: 'video',
		requires: 'dialog,mt-elementbubble,fakeobjects,mt-link',
		lang: 'en',
		onLoad: function() {
			var placeholderPath = Deki.PathCommon + '/images/icon-video.png';
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
					'width: 400px;' +
					'height: 300px;' +
				'}'
			);

			CKEDITOR.document.appendStyleText('.cke .cke_button__video .cke_button_label { display: inline; line-height: 16px; }');
		},
		beforeInit: function(editor) {
			CKEDITOR.tools.extend(editor.lang.fakeobjects, {
				video: editor.lang['mt-video'].video
			});
		},
		init: function(editor) {
			CKEDITOR.dialog.add(pluginName, this.path + 'dialogs/video.js');
			editor.addCommand(pluginName, new CKEDITOR.dialogCommand(pluginName));

			editor.ui.addButton('Video', {
				label: editor.lang['mt-video'].label,
				title: editor.lang['mt-video'].title,
				command: pluginName,
				toolbar: 'insert,40'
			});

			editor.addCommand('videoDelete', {
				exec: function(editor) {
					var selection = editor.getSelection(),
						element = selection && selection.getStartElement();

					if (!element || !element.is('img') || element.data('cke-real-element-type') != 'video' || element.isReadOnly()) return;

					var range = new CKEDITOR.dom.range(editor.document);
					range.moveToPosition(element, CKEDITOR.POSITION_BEFORE_START);
					element.remove();
					range.select();
				}
			});

			editor.on('doubleclick', function(evt) {
				var element = evt.data.element;
				if (element.is('img') && element.data('cke-real-element-type') == 'video') {
					evt.data.dialog = 'mt-video';
				}
			});

			editor.on('selectionChange', function(evt) {
				var element = evt.data.element;

				if (element && element.is('img') && element.data('cke-real-element-type') == 'video' && !element.isReadOnly()) {
					attachBubble(element, editor);
				} else {
					bubble && bubble.detach();
				}
			}, null, null, 1);
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
