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
	var dockId, toolbarId,
		$toolbar, $dock, $inner, prevPosition, prevHeight,
		editorPosition;

	var fixToolbar = function() {
		var editor = this,
			cssLength = CKEDITOR.tools.cssLength;

		if ( !$toolbar ) {
			$dock = $( '#' + dockId );
			$toolbar = $( '#' + toolbarId ).css( 'width', cssLength( $dock.width() ) );
		}

		var position = $dock.offset();
		if ( !prevPosition || prevPosition.left !== position.left ) {
			$toolbar.css( 'left', cssLength( position.left ) );
			prevPosition = position;
		}

		// toolbar height may vary
		var height = $toolbar.innerHeight();
		if ( height !== prevHeight ) {
			$dock.css( 'height', cssLength( height ) );
			prevHeight = height;
		}

		var top = editor.config.floating_toolbar_top || 0,
			scrollTop = $( CKEDITOR.document.$ ).scrollTop() + top,
			toolbarPosition = 'fixed';

		if ( scrollTop > Math.round( position.top ) ) {
			var contents = editor.ui.space( 'contents' ),
				maxScrollPos = contents.getDocumentPosition().y + $( contents.$ ).height() - $toolbar.height();

			if ( scrollTop > maxScrollPos ) {
				toolbarPosition = 'absolute';
				top = position.top;
			}
		} else if ( $toolbar.offset().top != position.top ) {
			toolbarPosition = 'absolute';
			top = position.top;
		} else {
			return;
		}

		$toolbar.css( { position: toolbarPosition, top: cssLength( top ) } );

		// @see EDT-293
		if ( CKEDITOR.env.webkit ) {
			if ( !$inner ) {
				$inner = $toolbar.find( 'div.cke_inner' );
			}
			$inner.css( 'position', 'static' ).css( 'position', 'relative' );
		}
	};

	var scrollToTop = function() {
		var editor = this,
			win = CKEDITOR.document.getWindow(),
			container = editor.container,
			scroll = win.getScrollPosition();

		if ( !editorPosition ) {
			editorPosition = container.getDocumentPosition();

			if ( CKEDITOR.env.ie && CKEDITOR.env.version < 9 ) {
				editorPosition.y -= $( '#' + toolbarId ).height();
			}
		}

		if ( scroll.y > editorPosition.y ) {
			win.$.scrollTo( 0, editorPosition.y );
		}
	};

	CKEDITOR.plugins.add( 'mindtouch/floatingtoolbar', {
		requires: 'sharedspace',
		beforeInit: function ( editor ) {
			// @see EDT-449
			if ( CKEDITOR.ui.floatPanel && editor.config.floating_toolbar !== false && editor.elementMode !== CKEDITOR.ELEMENT_MODE_INLINE ) {
				CKEDITOR.ui.floatPanel = CKEDITOR.tools.override( CKEDITOR.ui.floatPanel, function( floatPanel ) {
					return function( editor, parentElement, definition, level ) {
						if ( definition.toolbarRelated ) {
							parentElement = CKEDITOR.document.getById( 'cke_' + editor.name + '_shared_top' );
						}

						floatPanel.call( this, editor, parentElement, definition, level );
					};
				});
			}
		},
		init: function ( editor ) {
			if ( editor.config.floating_toolbar !== false && editor.elementMode !== CKEDITOR.ELEMENT_MODE_INLINE ) {
				dockId = CKEDITOR.tools.getNextId();
				toolbarId = CKEDITOR.tools.getNextId();

				editor.config.sharedSpaces = editor.config.sharedSpaces || {};
				editor.config.sharedSpaces.top = toolbarId;

				// this container will reserve the space for the toolbar
				var toolbarDock = CKEDITOR.dom.element.createFromHtml( '<div></div>', CKEDITOR.document );
				toolbarDock.setAttribute( 'id', dockId );
				toolbarDock.insertBefore( editor.element );

				// the toolbar will be rendered into this container
				var toolbarContainer = CKEDITOR.dom.element.createFromHtml( '<div></div>', CKEDITOR.document );
				toolbarContainer.setAttribute( 'id', toolbarId );
				toolbarContainer.addClass( 'cke_floatingtoolbar' );
				toolbarContainer.appendTo( CKEDITOR.document.getBody() );

				// @see EDT-293
				editor.on( 'resize', fixToolbar, editor );

				// on showing and hiding of the inforbar
				editor.on( 'infobar', fixToolbar, editor );

				var win = CKEDITOR.document.getWindow();

				editor.on( 'uiReady', function ( ev ) {
					win.on( 'scroll', fixToolbar, editor );
					win.on( 'resize', fixToolbar, editor );
				});

				editor.on( 'destroy', function ( ev ) {
					win.removeListener( 'scroll', fixToolbar );
					win.removeListener( 'resize', fixToolbar );
					toolbarContainer.remove();
					toolbarDock.remove();
					$toolbar = $dock = $inner = prevPosition = prevHeight = editorPosition = null;
				});

				editor.on( 'mode', scrollToTop, editor, null, 1 );
				editor.on( 'contentDom', scrollToTop, editor, null, 1 );
				editor.on( 'scrollToTop', scrollToTop, editor, null, 1 );

				editor.on( 'afterCommandExec', function ( ev ) {
					if ( ev.data.name == 'toolbarCollapse' ) {
						fixToolbar.call( editor );
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
