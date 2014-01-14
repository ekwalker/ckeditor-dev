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
 * @file Autogrow source plugin.
 */

(function() {
	var interval = null,
		onResize;

	function resizeTextarea(editor) {
		var win = CKEDITOR.document.getWindow(),
			textarea = editor.editable(),
			pre = textarea.getPrevious(),
			span = pre.getFirst();

		pre.setStyles({
			'padding-top': textarea.getComputedStyle('padding-top') || 0,
			'padding-right': textarea.getComputedStyle('padding-right') || 0,
			'padding-bottom': textarea.getComputedStyle('padding-bottom') || 0,
			'padding-left': textarea.getComputedStyle('padding-left') || 0,
			'margin-top': textarea.getComputedStyle('margin-top') || 0,
			'margin-right': textarea.getComputedStyle('margin-right') || 0,
			'margin-bottom': textarea.getComputedStyle('margin-bottom') || 0,
			'margin-left': textarea.getComputedStyle('margin-left') || 0,
			'border-top': textarea.getComputedStyle('border-top') || '',
			'border-right': textarea.getComputedStyle('border-right') || '',
			'border-bottom': textarea.getComputedStyle('border-bottom') || '',
			'border-left': textarea.getComputedStyle('border-left') || '',
			'font-size': textarea.getComputedStyle('font-size') || 'medium',
			'font-family': textarea.getComputedStyle('font-family') || '',
			'line-height': textarea.getComputedStyle('line-height') || 'normal',
			'letter-spacing': textarea.getComputedStyle('letter-spacing') || 'normal',
			'tab-size': textarea.getComputedStyle('tab-size') || '8',
			// @see EDT-607
			'outline': ((!(CKEDITOR.env.ie && CKEDITOR.env.version < 9)) && textarea.getComputedStyle('outline')) || 'inherit'
		});

		if (CKEDITOR.env.ie) {
			onResize = function(evt) {
				textarea.setStyle('width', '100%');
				textarea.setStyle('height', '100%');
				evt && evt.cancel();
			};

			editor.on('resize', onResize, null, null, 1);
			win.on('resize', onResize, null, null, 1);
			setTimeout(onResize, 0);
		}

		var update = function(ev) {
			span.setText(textarea.getValue());
		};

		textarea.on('input', update);
		textarea.on('propertychange', update);
		update();

		// buggy support of propertychange in ie9
		if (CKEDITOR.env.ie9Compat) {
			interval = setInterval(update, 400);
		}
	}

	CKEDITOR.plugins.add('mindtouch/autogrow', {
		init: function(editor) {
			if ( editor.elementMode == CKEDITOR.ELEMENT_MODE_INLINE ) {
				return;
			}

			editor.on('infobar', function() {
				setTimeout( function() {
					editor.execCommand('autogrow');
				}, 100 );
			});

			editor.on('mode', function() {
				if (editor.mode == 'source') {
					resizeTextarea(editor);
				} else {
					window.clearInterval(interval);
					interval = null;

					if (typeof onResize == 'function') {
						editor.removeListener('resize', onResize);
						CKEDITOR.document.getWindow().removeListener('resize', onResize);
					}

					var inner = editor.ui.space('contents').getParent();
					inner.removeStyle('display');
					inner.removeStyle('table-layout');
					inner.removeStyle('width');
				}
			});

			// prepare the markup
			// @link {http://www.alistapart.com/articles/expanding-text-areas-made-elegant/}
			editor.on('ariaWidget', function(ev) {
				var data = ev.data,
					editable = editor.editable();

				if (!(data.source && editable.hasClass('cke_source'))) {
					return;
				}

				var autogrowArea = CKEDITOR.dom.element.createFromHtml('<div class="cke_autogrow_source"><pre><span></span><br></pre></div>');
				autogrowArea.insertBefore(editable);
				editable.move(autogrowArea);
				editable = autogrowArea.getLast();

				var contents = editor.ui.space('contents'),
					inner = contents.getParent();

				contents.setStyle('height', 'auto');

				inner.setStyles({
					'display': 'table',
					'table-layout': 'fixed',
					'width': '100%'
				});

				if (CKEDITOR.env.webkit) {
					inner.setStyle('display', '');
					inner.setStyle('display', 'table');
				}
			});
		},

		beforeInit: function(editor) {
			var css = "\
				.cke_autogrow_source			\
				{								\
					position: relative;			\
					background-color: #fff		\
				}								\
				.cke_autogrow_source textarea.cke_source,	\
				.cke_autogrow_source pre		\
				{								\
					padding: 20px 10px;			\
					background: transparent;	\
					white-space: pre-wrap;		\
					word-wrap: break-word;		\
				}								\
				.cke_autogrow_source textarea	\
				{								\
					-webkit-box-sizing: border-box;	\
					 -moz-box-sizing: border-box;	\
					  -ms-box-sizing: border-box;	\
					      box-sizing: border-box;	\
					overflow: hidden;				\
					position: absolute;				\
					top: 0;							\
					left: 0;						\
				}									\
				.cke_autogrow_source pre			\
				{									\
					display: block;					\
					visibility: hidden;				\
				}									\
			";

			CKEDITOR.document.appendStyleText(css);
		}
	});
})();
