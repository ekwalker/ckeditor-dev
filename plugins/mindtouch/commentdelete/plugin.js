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
	CKEDITOR.plugins.add('mindtouch/commentdelete', {
		lang: 'en',
		init: function(editor) {
			var commentDelete = CKEDITOR.document.createElement('a', {
				attributes: {
					id: 'cke_comment_delete',
					href: 'void("Delete comment")',
					title: editor.lang['mindtouch/commentdelete'].title
				},
				styles: {
					display: 'block',
					position: 'absolute',
					left: '0',
					top: '0',
					display: 'none',
					width: '16px',
					height: '16px',
					background: 'transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAIhSURBVDjLlZPrThNRFIWJicmJz6BWiYbIkYDEG0JbBiitDQgm0PuFXqSAtKXtpE2hNuoPTXwSnwtExd6w0pl2OtPlrphKLSXhx07OZM769qy19wwAGLhM1ddC184+d18QMzoq3lfsD3LZ7Y3XbE5DL6Atzuyilc5Ciyd7IHVfgNcDYTQ2tvDr5crn6uLSvX+Av2Lk36FFpSVENDe3OxDZu8apO5rROJDLo30+Nlvj5RnTlVNAKs1aCVFr7b4BPn6Cls21AWgEQlz2+Dl1h7IdA+i97A/geP65WhbmrnZZ0GIJpr6OqZqYAd5/gJpKox4Mg7pD2YoC2b0/54rJQuJZdm6Izcgma4TW1WZ0h+y8BfbyJMwBmSxkjw+VObNanp5h/adwGhaTXF4NWbLj9gEONyCmUZmd10pGgf1/vwcgOT3tUQE0DdicwIod2EmSbwsKE1P8QoDkcHPJ5YESjgBJkYQpIEZ2KEB51Y6y3ojvY+P8XEDN7uKS0w0ltA7QGCWHCxSWWpwyaCeLy0BkA7UXyyg8fIzDoWHeBaDN4tQdSvAVdU1Aok+nsNTipIEVnkywo/FHatVkBoIhnFisOBoZxcGtQd4B0GYJNZsDSiAEadUBCkstPtN3Avs2Msa+Dt9XfxoFSNYF/Bh9gP0bOqHLAm2WUF1YQskwrVFYPWkf3h1iXwbvqGfFPSGW9Eah8HSS9fuZDnS32f71m8KFY7xs/QZyu6TH2+2+FAAAAABJRU5ErkJggg==) scroll no-repeat 0 0'
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

			var checkMouseTimer,
				checkMouse = function( target ) {
					var comment = target && target.getAscendant('p', true);

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

					window.clearTimeout( checkMouseTimer );
					checkMouseTimer = null;
				};

			editor.on('contentDom', function() {
				var editable = editor.editable();
				editable.attachListener( editable.isInline() ? editable : editor.document, 'mousemove', function(ev) {			
					if ( editor.readOnly || checkMouseTimer ) {
						return;
					}

					var target = ev.data.getTarget();

					checkMouseTimer = setTimeout( function() {
						checkMouse( target );
					}, 30 );
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
