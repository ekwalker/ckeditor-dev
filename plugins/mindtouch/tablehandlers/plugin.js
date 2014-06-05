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
		}
	});
})();