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
	var commentDelete = function(editor) {
		var button;

		function init() {
			button = CKEDITOR.document.createElement('a', {
				attributes : {
					id : 'cke_comment_delete',
					href : 'void("Delete comment")',
					title : editor.lang['mindtouch/commentdelete'].title
				},
				styles : {
					display : 'block',
					position : 'absolute',
					left : '1px',
					top : '1px',
					display : 'none',
					width : '16px',
					height : '16px',
					background : 'transparent url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAIhSURBVDjLlZPrThNRFIWJicmJz6BWiYbIkYDEG0JbBiitDQgm0PuFXqSAtKXtpE2hNuoPTXwSnwtExd6w0pl2OtPlrphKLSXhx07OZM769qy19wwAGLhM1ddC184+d18QMzoq3lfsD3LZ7Y3XbE5DL6Atzuyilc5Ciyd7IHVfgNcDYTQ2tvDr5crn6uLSvX+Av2Lk36FFpSVENDe3OxDZu8apO5rROJDLo30+Nlvj5RnTlVNAKs1aCVFr7b4BPn6Cls21AWgEQlz2+Dl1h7IdA+i97A/geP65WhbmrnZZ0GIJpr6OqZqYAd5/gJpKox4Mg7pD2YoC2b0/54rJQuJZdm6Izcgma4TW1WZ0h+y8BfbyJMwBmSxkjw+VObNanp5h/adwGhaTXF4NWbLj9gEONyCmUZmd10pGgf1/vwcgOT3tUQE0DdicwIod2EmSbwsKE1P8QoDkcHPJ5YESjgBJkYQpIEZ2KEB51Y6y3ojvY+P8XEDN7uKS0w0ltA7QGCWHCxSWWpwyaCeLy0BkA7UXyyg8fIzDoWHeBaDN4tQdSvAVdU1Aok+nsNTipIEVnkywo/FHatVkBoIhnFisOBoZxcGtQd4B0GYJNZsDSiAEadUBCkstPtN3Avs2Msa+Dt9XfxoFSNYF/Bh9gP0bOqHLAm2WUF1YQskwrVFYPWkf3h1iXwbvqGfFPSGW9Eah8HSS9fuZDnS32f71m8KFY7xs/QZyu6TH2+2+FAAAAABJRU5ErkJggg==) scroll no-repeat 0 0'
				}
			});

			button.on('click', function(ev) {
				ev.data.getTarget().hide();
				ev.data.preventDefault(true);

				if (button) {
					var comment = button.getCustomData('comment');
					if (comment) {
						this.detach();
						removeComment(comment);
					}
				}
			}, this);

			button.on('dragstart', function(ev) {
				ev.data.preventDefault(true);
			});

			CKEDITOR.document.getBody().append(button);

			editor.on('destroy', function() {
				button && button.remove();
			});
		}

		function removeComment(comment) {
			editor.focus();
			editor.fire('saveSnapshot');

			var selection = editor.getSelection(),
				startElement = selection.getStartElement(),
				currentElement = startElement && startElement.getAscendant('p', true);

			if (currentElement && currentElement.equals(comment)) {
				var range = selection.getRanges( 1 )[0],
					moveToElement = comment.getNext() || comment.getPrevious();

				if (moveToElement) {
					comment.remove();
				} else {
					moveToElement = editor.document.createElement(editor.config.enterMode == CKEDITOR.ENTER_P ? 'p' : 'div');
					moveToElement.replace(comment);
				}

				range.moveToElementEditStart(moveToElement);
				range.select();
			} else {
				comment.remove();
			}

			editor.fire('saveSnapshot');
		}

		this.attachTo = function(comment) {
			if (!button) {
				init.call(this);
			}

			var prevComment = button.getCustomData('comment');
			if (prevComment) {
				if (prevComment.equals(comment)) {
					return;
				} else {
					this.detach();
				}
			}

			var pos = comment.getDocumentPosition(CKEDITOR.document);
			button.setStyles({
				left : pos.x + 2 + 'px',
				top : pos.y + 2 + 'px'
			});

			comment.data('cke-comment-hover', 1);
			// IE8: force to redraw
			comment.$.className = comment.$.className;
			
			button.setCustomData('comment', comment);
			button.show();
		};

		this.detach = function() {
			var comment;

			if (button) {
				comment = button.getCustomData('comment');
				button.hide();
			}

			if (comment) {
				comment.data('cke-comment-hover', false);
				// IE8: force to redraw
				comment.$.className = comment.$.className;
				button.removeCustomData('comment');
				editor.selectionChange(1);
			}
		};
	};

	CKEDITOR.plugins.add('mindtouch/commentdelete', {
		lang: 'en', // %REMOVE_LINE_CORE%
		onLoad: function() {
			CKEDITOR.addCss('.comment[data-cke-comment-hover] { background-position: 0 -25px !important; }');
		},
		init : function(editor) {
			var commentDeleteButton = new commentDelete(editor),
				checkMouseTimer,
				checkMouse = function(target) {
					var comment = target && target.getAscendant('p', true);

					if (comment && comment.hasClass('comment')) {
						commentDeleteButton.attachTo(comment);
					} else {
						commentDeleteButton.detach();
					}

					window.clearTimeout(checkMouseTimer);
					checkMouseTimer = null;
				};

			editor.on('contentDom', function() {
				var editable = editor.editable(),
					doc = editor.document;

				editable.attachListener(editable.isInline() ? editable : doc, 'mousemove', function(ev) {
					if (editor.readOnly || checkMouseTimer) {
						return;
					}

					var target = ev.data.getTarget();

					checkMouseTimer = setTimeout(function() {
						checkMouse(target);
					}, 30);
				});
			});

			// remove data-cke-comment-hover attribute from the snapshot
			editor.on( 'getSnapshot', function( ev ) {
				if ( typeof ev.data == 'string' ) {
					ev.data = ev.data.replace( /\s+data-cke-comment-hover=".*?"/g, '' );
				}
			}, null, null, 1000 );

			editor.on('saveSnapshot', function() {
				commentDeleteButton.detach();
			}, null, null, 1);

			editor.on('beforeCommandExec', function() {
				commentDeleteButton.detach();
			});

			editor.on('key', function() {
				commentDeleteButton.detach();
			});
		}
	});
})();
