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

(function() {
	var tableClipboard = function( editor ) {
		this.editor = editor;
		this.reset();
	};

	tableClipboard.prototype = {
		reset: function() {
			this.table = null;
		},

		isEmpty: function() {
			return !this.table;
		},

		_setClipboardData: function( selection, removeCellContent ) {
			this.reset();

			var cells = CKEDITOR.plugins.tabletools.getSelectedCells( selection ),
				table = cells.length && cells.length > 1 && cells[ 0 ].getAscendant( 'table' );

			if ( !table ) {
				return false;
			}

			table = table.clone();

			var prevRow;

			for ( var i = 0; i < cells.length; i++ ) {
				var cell = cells[ i ],
					row = cell.getAscendant( 'tr' );

				if ( !row ) {
					return false;
				}
					
				if ( !prevRow || !prevRow.equals( row ) ) {
					var tPart = row.getAscendant( { thead: 1, tfoot:1, tbody:1 } ),
						tPrevPart = prevRow && prevRow.getAscendant( { thead: 1, tfoot:1, tbody:1 } );

					if ( tPart && !tPart.equals( tPrevPart ) ) {
						table.append( tPart.clone() );
					}

					if ( tPart ) {
						table.getLast().append( row.clone() );
					} else {
						table.append( row.clone() );
					}
				}

				var lastRow = table.getLast();
				if ( !lastRow.is( 'tr' ) ) {
					lastRow = lastRow.getLast();
				}

				lastRow.append( cell.clone( true ) );
				prevRow = row;

				if ( removeCellContent ) {
					var children = cell.getChildren(),
						count = children.count(),
						j;

					for ( j = count - 1; j >= 0; j-- ) {
						children.getItem( j ).remove();
					}

					if ( !CKEDITOR.env.ie ) {
						cell.append( new CKEDITOR.dom.element( 'br', this.editor.document ) );
					}
				}
			}

			this.table = table;

			return true;
		},

		cutCells: function( selection ) {
			return this._setClipboardData( selection, true );
		},

		copyCells: function( selection ) {
			return this._setClipboardData( selection );
		},

		paste: function( selection ) {
			if ( this.isEmpty() ) {
				return false;
			}

			var editor = this.editor,
				cells = CKEDITOR.plugins.tabletools.getSelectedCells( selection ),
				table = this.table;

			// if we are not inside of the table, paste the saved table
			if ( !cells.length ) {
				editor.insertElement( table.clone( true ) );
				return true;
			}

			var startCell = cells[ 0 ],
				startRow = startCell.getAscendant( 'tr' ),
				currentTable = startRow && startRow.getAscendant( 'table' );

			if ( !currentTable ) {
				return false;
			}

			var pasteCell = function( source, target ) {
				var child;
				while ( child = target.$.lastChild ) {
					target.$.removeChild( child );
				}

				source.clone( true ).moveChildren( target );
			};

			editor.fire( 'saveSnapshot' );

			// if >1 cells are selected, paste them only into the selected cells
			if ( cells.length > 1 ) {
				var getSourceIndex = function( targetIndex, sourceSize ) {
					var index = targetIndex / sourceSize;
					// get the decimal part
					index = index - Math.floor( index );
					index = Math.round( index * sourceSize );
					return index;
				};

				var rowsCount = table.$.rows.length,
					colsCount = table.$.rows[ 0 ].cells.length;

				for ( var i = 0 ; i < cells.length ; i++ ) {
					var targetCell = cells[ i ],
						rowIndex = targetCell.getParent().$.rowIndex - startRow.$.rowIndex,
						colIndex = targetCell.$.cellIndex - startCell.$.cellIndex,
						sourceCell = new CKEDITOR.dom.element( table.$.rows[ getSourceIndex( rowIndex, rowsCount ) ].cells[ getSourceIndex( colIndex, colsCount ) ] );

					pasteCell( sourceCell, targetCell );
				}
			} else {
				var colsLack = table.$.rows[ 0 ].cells.length - ( startRow.$.cells.length - startCell.$.cellIndex ),
					rowsLack = table.$.rows.length - ( currentTable.$.rows.length - startRow.$.rowIndex );

				editor.fire( 'lockSnapshot' );

				if ( colsLack > 0 ) {
					for ( var i = 0 ; i < colsLack ; i++ ) {
						editor.execCommand( 'columnInsertAfter' );
					}
				}

				if ( rowsLack > 0 ) {
					for ( var i = 0 ; i < rowsLack ; i++ ) {
						editor.execCommand( 'rowInsertAfter' );
					}
				}

				editor.fire( 'unlockSnapshot' );

				for ( var i = 0 ; i < table.$.rows.length ; i ++ ) {
					var row =  new CKEDITOR.dom.element( table.$.rows[ i ] );
					for ( var j = 0 ; j < row.$.cells.length ; j++ ) {
						var sourceCell = new CKEDITOR.dom.element( row.$.cells[ j ] ),
							targetCell = new CKEDITOR.dom.element( currentTable.$.rows[ startRow.$.rowIndex + i ].cells[ startCell.$.cellIndex + j ] );

						pasteCell( sourceCell, targetCell );
					}
				}				
			}

			editor.fire( 'saveSnapshot' );
			return true;
		}
	};

	CKEDITOR.plugins.add( 'mindtouch/tableclipboard', {
		init: function( editor ) {
			var clipboard = new tableClipboard( editor );

			editor.addCommand( 'cellsCut', {
				exec: function( editor ) {
					var selection = editor.getSelection();
					selection && clipboard.cutCells( selection );
				}
			});

			editor.addCommand( 'cellsCopy', {
				exec: function( editor ) {
					var selection = editor.getSelection();
					selection && clipboard.copyCells( selection );
				}
			});

			editor.addCommand( 'cellsPaste', {
				exec: function( editor ) {
					var selection = editor.getSelection();
					selection && clipboard.paste( selection );
				}
			});

			var cancelEvent = function( evt ) {
				if ( evt.data && evt.data.preventDefault ) {
					evt.data.preventDefault( true );
				} else {
					evt.cancel();
				}
			};

			var onCopyCut = function( evt ) {
				clipboard.reset();

				// check if only table content
				// and content of only single table is selected
				var sel = editor.getSelection(),
					cells = ( sel && CKEDITOR.plugins.tabletools.getSelectedCells( sel ) ) || [],
					table = prevTable = null;

				for ( var i = 0 ; i < cells.length ; i++ ) {
					table = cells[ i ].getAscendant( 'table' );
					if ( i > 0 && !table.equals( prevTable ) ) {
						return;
					}
					prevTable = table;
				}

				// try to copy/cut selected cells
				var command = ( evt.name in { 'copy': 1, 'zcBeforeCopy': 1 } ) ? 'cellsCopy' : 'cellsCut';
				editor.execCommand( command );

				!clipboard.isEmpty() && cancelEvent( evt );
			};

			var onPasteEvent = function( evt ) {
				// if clipboard is not empty,
				// paste stored rows and cancel paste event
				if ( !clipboard.isEmpty() ) {
					editor.execCommand( 'cellsPaste' );
					cancelEvent( evt );
				}
			};

			editor.on( 'contentDom', function() {
				var editable = editor.editable();
				for ( var eventName in { 'copy': 1, 'cut': 1 } ) {
					editable.on( eventName, onCopyCut, null, null, 1 );
				}

				// IE does not fire cut event for selected table cells
				if ( CKEDITOR.env.ie ) {
					editable.on( 'beforecut', onCopyCut, null, null, 1 );
				}

				editable.on( CKEDITOR.env.ie ? 'beforepaste' : 'paste', onPasteEvent, null, null, 1 );
			});

			// override ZeroClipboard behavior
			editor.on( 'zcBeforeCopy', onCopyCut );
			editor.on( 'zcBeforeCut', onCopyCut );

			// @see EDT-637
			editor.on( 'blur', function() {
				clipboard.reset();
			});
		}
	});
})();
