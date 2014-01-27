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
 * @fileOverview Floating toolbar plugin.
 */

 (function () {
	var toolbarSpaceId = 'cke_floatingtoolbar';

	var dockToolbar = function (ev) {
		var editor = this,
			$toolbarContainer = $('#' + toolbarSpaceId),
			$toolbar = $toolbarContainer.children().first(),
			top;

		top = parseInt($toolbar.css('top'), 10);
		if (isNaN(top)) {
			top = editor.config.floating_toolbar_top || 0;
		}

		var scrollTop = $(CKEDITOR.document.$).scrollTop() + top,
			toolbarTop = Math.round($toolbarContainer.offset().top);

		$toolbarContainer.css('height', $toolbar.innerHeight() + 'px');

		if (scrollTop > toolbarTop) {
			var contents = editor.ui.space( 'contents' ),
				maxScrollPos = contents.getDocumentPosition().y + $(contents.$).height() - $toolbar.height();

			$toolbar.css('width', $toolbar.width() + 'px');

			if (scrollTop < maxScrollPos) {
				$toolbar.addClass('cke_floatingtoolbar');
			} else {
				$toolbar.removeClass('cke_floatingtoolbar');
			}
		} else if (Math.round($toolbar.offset().top) != toolbarTop) {
			$toolbar.removeClass('cke_floatingtoolbar');
		}

		// @see EDT-293
		CKEDITOR.env.webkit && $toolbarContainer.find('div.cke_inner').css('position', 'static').css('position', 'relative');
	};

	function scrollToTop(ev) {
		var editor = ev.editor;

		if (editor.config.floating_toolbar !== false) {
			var win = CKEDITOR.document.getWindow(),
				container = editor.container,
				position = container.getDocumentPosition(),
				scroll = win.getScrollPosition(),
				$toolbar = $('#' + toolbarSpaceId).children().first(),
				y = position.y - $toolbar.height();

			if ($toolbar.css('position') == 'fixed') {
				var top = parseInt($toolbar.css('top'), 10);
				if (!isNaN(top)) {
					y -= top;
				}
			}

			if (y < 0) {
				y = 0;
			}

			if (scroll.y > y) {
				win.$.scrollTo(0, y);
			}
		}
	}

	CKEDITOR.plugins.add('mindtouch/floatingtoolbar', {
		beforeInit: function (editor) {
			if (editor.config.floating_toolbar !== false && editor.elementMode !== CKEDITOR.ELEMENT_MODE_INLINE) {
				var top = editor.config.floating_toolbar_top || 0,
					css = [
						'#' + toolbarSpaceId + ' .cke_floatingtoolbar { position: fixed !important; top: ' + top + 'px; }',
						'#' + toolbarSpaceId + ' .cke_shared { display: block; position: relative; z-index: 99; border-bottom: none; }'
					];

				CKEDITOR.document.appendStyleText(css.join(''));

				// @see EDT-449
				if (CKEDITOR.ui.floatPanel) {
					CKEDITOR.ui.floatPanel = CKEDITOR.tools.override(CKEDITOR.ui.floatPanel, function(floatPanel) {
						return function() {
							var elementMode = editor.elementMode;
							// temporarily set inline mode to render panel as child of toolbar
							editor.elementMode = CKEDITOR.ELEMENT_MODE_INLINE;
							floatPanel.apply(this, arguments);
							// restore element mode
							editor.elementMode = elementMode;
						};
					});
				}
			}
		},

		init: function (editor) {
			if (editor.config.floating_toolbar !== false && editor.elementMode !== CKEDITOR.ELEMENT_MODE_INLINE) {
				editor.config.sharedSpaces = editor.config.sharedSpaces || {};
				editor.config.sharedSpaces.top = toolbarSpaceId;

				var toolbarContainer = CKEDITOR.dom.element.createFromHtml('<div></div>', CKEDITOR.document);
				toolbarContainer.setAttribute('id', toolbarSpaceId);
				toolbarContainer.insertBefore(editor.element);

				// @see EDT-293
				editor.on('resize', dockToolbar, editor);

				// on showing and hiding of the inforbar
				editor.on('infobar', dockToolbar, editor);

				var win = CKEDITOR.document.getWindow();

				editor.on('uiReady', function (ev) {
					win.on('scroll', dockToolbar, editor);
				});

				editor.on('destroy', function (ev) {
					win.removeListener('scroll', dockToolbar);
					toolbarContainer.remove();
				});

				editor.on('mode', scrollToTop, null, null, 1);
				editor.on('contentDom', scrollToTop, null, null, 1);
				editor.on('scrollToTop', scrollToTop, null, null, 1);

				editor.on('afterCommandExec', function (ev) {
					if (ev.data.name == 'toolbarCollapse') {
						dockToolbar.call(editor);
					}
				});
			}
		}
	});
})();

/**
 * Whether to enable the floating toolbar feature.
 *
 *		config.floating_toolbar = false;
 *
 * @cfg {Boolean} [floating_toolbar=true]
 * @member CKEDITOR.config
 */

/**
 * Toolbar top position on scrolling in pixels.
 *
 *		config.floating_toolbar_top = 30;
 *
 * @cfg {Number} [floating_toolbar_top=0]
 * @member CKEDITOR.config
 */
