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
 * @file Table handlers plugin.
 */

(function() {
	var handlersTpl = CKEDITOR.addTemplate( 'tableHandlers', '<div class="cke_table_handlers cke_table_handlers_{name}" data-cke-tablehandlers=1 style="display:none;">' +
		'<a title="{titleInsertBefore}" class="{scope}InsertBefore" onclick="return CKEDITOR.tools.callFunction({fn}, \'{scope}InsertBefore\')"></a>' +
		'<a title="{titleDelete}" class="{scope}Delete" onclick="return CKEDITOR.tools.callFunction({fn}, \'{scope}Delete\')"></a>' +
		'<a title="{titleInsertAfter}" class="{scope}InsertAfter" onclick="return CKEDITOR.tools.callFunction({fn}, \'{scope}InsertAfter\')"></a>' +
		'</div>' );

	function cancel( evt ) {
		( evt.data || evt ).preventDefault();
	}

	function tableHandlers( editor ) {
		this.editor = editor;

		var handlers = { row: null, col: null },
			cell = null,
			doc = CKEDITOR.document,
			win = doc.getWindow();

		var handlerFn = CKEDITOR.tools.addFunction( function( command ) {
			cell && this.execCommand( command );
			this.execCommand( 'autogrow' );
			return false;
		}, editor );

		function update( ev ) {
			if ( !cell ) {
				return;
			}

			if ( ev && ev.listenerData && ev.listenerData.async ) {
				setTimeout( update, 0 );
				return;
			}

			var table = cell.getAscendant( 'table' );
			if ( !table ) {
				return;
			}

			var cellPos = cell.getDocumentPosition( doc ),
				tablePos = table.getDocumentPosition( doc ),
				width = cell.$.offsetWidth,
				height = cell.$.offsetHeight,
				left, top;

			if ( height < 48 ) {
				top = cellPos.y - ( 24 - height / 2 );
			} else {
				top = cellPos.y + height / 2 - 24;
			}

			handlers.row.setStyles({
				left: tablePos.x - 16 - 3 + 'px',
				top: top + 'px'
			});

			if ( width < 30 ) {
				left = cellPos.x - ( 24 - width / 2 );
			} else {
				left = cellPos.x + width / 2 - 24;
			}

			handlers.col.setStyles({
				left: left + 'px',
				top: tablePos.y - 16 - 3 + 'px'
			});

			handlers.row.show();
			handlers.col.show();
		}

		this.attachTo = function( element ) {
			if ( cell && cell.equals( element ) ) {
				return;
			} else if ( cell ) {
				this.detach();
			}

			cell = element;

			win.on( 'resize', update );
			editor.on( 'afterCommandExec', update, null, { async: true } );
			editor.on( 'key', update, null, { async: true } );
			editor.on( 'change', update, null, { async: true } );

			update();
		};

		this.detach = function() {
			if ( !cell ) {
				return;
			}

			win.removeListener( 'resize', update );
			editor.removeListener( 'afterCommandExec', update );
			editor.removeListener( 'key', update );
			editor.removeListener( 'change', update );

			cell = null;

			handlers.row.hide();
			handlers.col.hide();
		};

		var addHandler = function( name ) {
			var scope = name == 'row' ? 'row' : 'column',
				lang = this.editor.lang.table[ scope ];

			handlers[ name ] = CKEDITOR.dom.element.createFromHtml( handlersTpl.output({
				name: name,
				scope: scope,
				fn: handlerFn,
				titleInsertBefore: CKEDITOR.tools.capitalize( lang.insertBefore ),
				titleInsertAfter: CKEDITOR.tools.capitalize( lang.insertAfter ),
				titleDelete: this.editor.lang[ 'mindtouch/table' ][ 'delete' + CKEDITOR.tools.capitalize( scope ) ]
			}));

			doc.getBody().append( handlers[ name ] );

			handlers[ name ].on( 'mousedown', function( evt ) {
				cancel( evt );
			});
		};

		addHandler.call( this, 'row' );
		addHandler.call( this, 'col' )

		editor.on( 'destroy', function() {
			CKEDITOR.tools.removeFunction( handlerFn );
			handlers.row.remove();
			handlers.col.remove();
		});
	}

	CKEDITOR.plugins.add( 'mindtouch/tablehandlers', {
		requires: 'mindtouch/table',
		init: function( editor ) {
			if ( CKEDITOR.env.gecko && !editor.config.disableNativeTableHandles ) {
				return;
			}

			var handlers;

			editor.on( 'selectionChange', function( evt ) {
				var cells = editor.plugins.tabletools.getSelectedCells( evt.data.selection ),
					cell = ( cells.length == 1 ) && cells[ 0 ];

				handlers = handlers || new tableHandlers( editor );

				if ( cell && !cell.getAscendant( 'table' ).isReadOnly() ) {
					handlers.attachTo( cell );
				} else {
					handlers.detach();
				}
			}, null, null, 1 );

			// ckeditor fires "selectionChange" with a delay when cursor is moved to the prev/next cell
			// we need to fire it immediately to move the handlers without the delay
			// @see EDT-666
			editor.on( 'key', function( evt ) {
				if ( evt.data.keyCode in { 37:1, 39:1 } ) {
					var selection = editor.getSelection(),
						range = selection && selection.getRanges()[ 0 ];

					if ( range && range.collapsed && range.startContainer.getAscendant( { th: 1, td: 1 }, true ) ) {
						window.setTimeout( function() {
							editor.forceNextSelectionCheck();
							editor.selectionChange( 1 );
						}, 0 );
					}
				}
			}, null, null, 1 );

			editor.on( 'contentDomUnload', function() {
				handlers && handlers.detach();
			});

			editor.on( 'destroy', function() {
				handlers = null;
			}, null, null, 100 );
		},
		onLoad: function() {
			var path = this.path,
				css = '.cke_table_handlers { \
					position: absolute; \
					z-index: 1; \
					overflow: hidden; \
					opacity: 0.6; \
				} \
				.cke_table_handlers:hover { \
					opacity: 1; \
				} \
				.cke_table_handlers a { \
					display: block; \
					width: 16px; \
					height: 16px; \
					cursor: default; \
					background: transparent scroll no-repeat; \
					background-image: url(data:image/png;base64,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); \
				} \
				.cke_table_handlers_col a { \
					float: left; \
				} \
				.cke_table_handlers_col { \
					margin-bottom: 3px; \
				} \
				.cke_table_handlers_row a { \
					margin-right: 3px; \
				} \
				.cke_table_handlers a.rowInsertAfter { \
					background-position: 0px 0px; \
				} \
				.cke_table_handlers a.rowInsertAfter:hover { \
					background-position: 0px -16px; \
				} \
				.cke_table_handlers a.columnInsertBefore { \
					background-position: 0px -32px; \
				} \
				.cke_table_handlers a.columnInsertBefore:hover { \
					background-position: 0px -48px; \
				} \
				.cke_table_handlers a.columnInsertAfter { \
					background-position: 0px -64px; \
				} \
				.cke_table_handlers a.columnInsertAfter:hover { \
					background-position: 0px -80px; \
				} \
				.cke_table_handlers a.rowInsertBefore { \
					background-position: 0px -96px; \
				} \
				.cke_table_handlers a.rowInsertBefore:hover { \
					background-position: 0px -112px; \
				} \
				.cke_table_handlers a.rowDelete { \
					margin: 3px 0; \
				} \
				.cke_table_handlers a.columnDelete { \
					margin: 0 3px; \
				} \
				.cke_table_handlers a.rowDelete, \
				.cke_table_handlers a.columnDelete { \
					background-position: 0px -128px; \
				} \
				.cke_table_handlers a.rowDelete:hover, \
				.cke_table_handlers a.columnDelete:hover { \
					background-position: 0px -144px; \
				}';

			CKEDITOR.document.appendStyleText( css );
		}
	});
})();