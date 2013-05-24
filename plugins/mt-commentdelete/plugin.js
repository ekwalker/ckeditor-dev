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
 * @file Delete comment.
 */

(function() {
	CKEDITOR.plugins.add('mt-commentdelete', {
		lang: 'en',  // %REMOVE_LINE_CORE%
		init: function(editor) {
			var iconPath = CKEDITOR.getUrl('../images/icons.png'),
				commentDelete = CKEDITOR.document.createElement('a', {
				attributes: {
					id: 'cke_comment_delete',
					href: 'void("Delete comment")',
					title: editor.lang['mt-commentdelete'].title
				},
				styles: {
					display: 'block',
					position: 'absolute',
					left: '0',
					top: '0',
					display: 'none',
					width: '16px',
					height: '16px',
					background: 'transparent url(' + iconPath + ') scroll no-repeat 0 -64px'
				}
			});

			var commentElement;
			commentDelete.on('click', function(ev) {
				ev.data.getTarget().hide();
				ev.data.preventDefault(true);

				if (!commentElement) {
					return;
				}

				commentElement.data('cke-commentdelete', false);

				var selection = editor.getSelection(),
					startElement = selection && selection.getStartElement(),
					comment = startElement && startElement.getAscendant('p', true),
					range;

				if (comment && comment.equals(commentElement)) {
					range = new CKEDITOR.dom.range(editor.document);
					range.moveToPosition(commentElement, CKEDITOR.POSITION_BEFORE_START);
				}

				editor.fire('saveSnapshot');

				commentElement.remove();
				commentElement = null;

				range && range.select();
				editor.focus();

				editor.fire('saveSnapshot');
			});

			commentDelete.on('dragstart', function(ev) {
				ev.data.preventDefault(true);
			});

			CKEDITOR.document.getBody().append(commentDelete);

			var hideDeleteButton = function() {
				if (commentElement) {
					commentElement.data('cke-commentdelete', false);
					commentElement = null;
				}
				commentDelete && commentDelete.hide();
			};

			editor.on('contentDom', function() {
				editor.document.getBody().on('mousemove', function(ev) {
					var target = ev.data.getTarget(),
						comment = target && target.getAscendant('p', true);

					if (comment && comment.hasClass('comment')) {
						if (commentElement && !commentElement.equals(comment)) {
							commentElement.data('cke-commentdelete', false);
						}

						commentElement = comment;
						commentElement.data('cke-commentdelete', 1);

						var pos = commentElement.getDocumentPosition(CKEDITOR.document);
						commentDelete.setStyles({
							left: pos.x + 2 + 'px',
							top: pos.y + 2 + 'px'
						});
						commentDelete.show();
					} else {
						hideDeleteButton();
					}
				});
			});

			editor.on('selectionChange', hideDeleteButton);

			editor.on('destroy', function() {
				commentDelete && commentDelete.remove();
			});
		},
		onLoad: function() {
			var css = [
				'body.deki-content-edit p.comment[data-cke-commentdelete] {',
				'	background-position: 0 -25px;',
				'}'
			];
			CKEDITOR.addCss(css.join(''));
		}
	});
})();
