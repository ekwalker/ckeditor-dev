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
 * @file copy/paste related fixes.
 */

(function() {
	CKEDITOR.plugins.add( 'mindtouch/clipboard', {
		init: function( editor ) {
			/**
			 * Paste as text in pre blocks
			 *
			 * @see #0007029
			 * @see #MT-9352
			 */
			editor.on( 'paste', function( evt ) {
				var sel = editor.getSelection();
				if ( sel && sel.getStartElement().hasAscendant( 'pre', true ) ) {
					evt.data.type = 'text';
					evt.data.preSniffing = 'html';
				}
			}, null, null, 3 );

			editor.on( 'paste', function( evt ) {
				var sel = editor.getSelection();
				if ( sel && sel.getStartElement().hasAscendant( 'pre', true ) ) {
					evt.data.dataValue = evt.data.dataValue.replace( /\n/g, '<br>' );
				}
			});

			if ( CKEDITOR.plugins.get( 'autogrow' ) ) {
				editor.on( 'afterPaste', function() {
					editor.getSelection().scrollIntoView();
				});
			}
	
			if ( CKEDITOR.env.gecko ) {
				// if list element contains only ul/ol element
				// move the last one to the previous list element
				// @see EDT-20
				var fixNestedList = function() {
					var sel = editor.getSelection(),
						startElement = sel && sel.getStartElement(),
						li = startElement && startElement.getAscendant( 'li', true );

					if ( li ) {
						var nextLi = li.getNext(),
							first = nextLi && nextLi.getFirst();
						if ( first && first.is && first.is( 'ul', 'ol' ) ) {
							first.move( li );
							nextLi.remove();
						}
					}
				};

				editor.on( 'insertHtml', fixNestedList, null, null, 100 );
			}
		}
	});
})();
