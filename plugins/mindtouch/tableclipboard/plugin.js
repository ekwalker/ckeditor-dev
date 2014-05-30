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
			this.map = [];
		},

		isEmpty: function() {
			return !this.table || !this.map.length;
		},

		_markCells: function( cells ) {
			cells = cells || [];
			for ( var i = 0; i < cells.length; i++ ) {
				cells[ i ].setCustomData( 'cell_selected', 1 );
			}
			return cells;
		},

		_setClipboardData: function( selection, removeCellContent ) {
			this.reset();

			var cells = CKEDITOR.plugins.tabletools.getSelectedCells( selection ),
				table = cells.length && cells.length > 1 && cells[ 0 ].getAscendant( 'table' );

			if ( !table ) {
				return false;
			}

			this.table = table.clone();
			this._markCells( cells );

			var map = CKEDITOR.tools.buildTableMap( table ),
				i, j, row, cell;

			// save the map of the selected cells
			for ( i = 0 ; i < map.length ; i++ ) {
				row = [];
				for ( j = 0 ; j < map[ i ].length ; j++ ) {
					cell = new CKEDITOR.dom.element( map[ i ][ j ] );
					if ( cell.getCustomData( 'cell_selected' ) ) {
						var clone = cell.clone( !cell.getCustomData( 'cell_processed' ) );
						clone.removeAttribute( 'colSpan' );
						clone.removeAttribute( 'rowSpan' );
						row.push( clone.$ );
						cell.setCustomData( 'cell_processed', 1 );
					}
				}
				row.length && this.map.push( row );
			}

			// remove custom markers and content if necessary
			for ( i = 0 ; i < cells.length ; i++ ) {
				cell = cells[ i ];
				cell.removeCustomData( 'cell_selected' );
				cell.removeCustomData( 'cell_processed' );

				if ( removeCellContent ) {
					var children = cell.getChildren(),
						count = children.count();

					for ( j = count - 1; j >= 0; j-- ) {
						children.getItem( j ).remove();
					}

					if ( !CKEDITOR.env.ie ) {
						cell.append( cell.getDocument().createElement( 'br' ) );
					}
				}
			}

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
				doc = editor.document,
				cells = CKEDITOR.plugins.tabletools.getSelectedCells( selection ),
				i, j;

			// if we are not inside of the table, create the new one
			if ( !cells.length ) {
				var table = this.table.clone(),
					tbody = doc.createElement( 'tbody' );
				table.append( tbody );
				for ( i = 0 ; i < this.map.length ; i++ ) {
					var row = doc.createElement( 'tr' );
					tbody.append( row );
					for ( j = 0 ; j < this.map[ i ].length ; j++ ) {
						var cell = new CKEDITOR.dom.element( this.map[ i ][ j ] );
						row.append( cell.clone( true ) );
					}
				}
				editor.insertElement( table );
				return true;
			}

			var startCell = cells[ 0 ],
				startRow = startCell.getAscendant( 'tr' ),
				table = startRow && startRow.getAscendant( 'table' );

			if ( !table ) {
				return false;
			}

			var pasteCell = function( source, target ) {
				// if target was already processed, just append the data
				// and clear it otherwise
				if ( !target.getCustomData( 'cell_processed' ) ) {
					var child;
					while ( child = target.$.lastChild ) {
						target.$.removeChild( child );
					}
				}
				source.clone( true ).moveChildren( target );
				target.setCustomData( 'cell_processed', 1 );
			};

			editor.fire( 'saveSnapshot' );

			var map = CKEDITOR.tools.buildTableMap( table ),
				startRowIndex = startRow.$.rowIndex,
				startCellIndex = -1;

			// look for the start cell index
			for ( var i = 0 ; i < map[ startRowIndex ].length ; i++ ) {
				var cell = new CKEDITOR.dom.element( map[ startRowIndex ][ i ] );
				if ( cell.equals( startCell ) ) {
					startCellIndex = i;
					break;
				}
			}

			// if there two and more cells are selected, paste data only into the selected cells
			if ( cells.length > 1 ) {
				this._markCells( cells );

				// find the source cell which should be pasted into the provided target position
				var getSourceCell = ( function( sourceMap ) {
					var sourceDimensions = { cols: sourceMap[ 0 ].length, rows: sourceMap.length },
						getSourceIndex = function( targetIndex, sourceSize ) {
							var index = targetIndex / sourceSize;
							// get the decimal part
							index = index - Math.floor( index );
							index = Math.round( index * sourceSize );
							return index;
						};
					return function( targetPosition ) {
						return new CKEDITOR.dom.element( sourceMap[ getSourceIndex( targetPosition.row, sourceDimensions.rows ) ][ getSourceIndex( targetPosition.col, sourceDimensions.cols ) ] );
					};
				})( this.map );

				for ( i = startRowIndex ; i < map.length ; i++ ) {
					for ( j = startCellIndex ; j < map[ i ].length ; j++ ) {
						var targetCell = new CKEDITOR.dom.element( map[ i ][ j ] );
						if ( targetCell.getCustomData( 'cell_selected' ) ) {
							var targetRowIndex = i - startRowIndex,
								targetColIndex = j - startCellIndex,
								sourceCell = getSourceCell( { col: targetColIndex, row: targetRowIndex } );

							pasteCell( sourceCell, targetCell );
						}
					}
				}
			} else {
				var colsLack = this.map[ 0 ].length - ( map[ 0 ].length - startCellIndex ),
					rowsLack = this.map.length - ( map.length - startRowIndex );

				if ( colsLack > 0 || rowsLack > 0 ) {
					editor.fire( 'lockSnapshot' );

					for ( i = 0 ; i < colsLack ; i++ ) {
						editor.execCommand( 'columnInsertAfter' );
					}

					for ( i = 0 ; i < rowsLack ; i++ ) {
						editor.execCommand( 'rowInsertAfter' );
					}

					editor.fire( 'unlockSnapshot' );

					// rebuild the map after rows/cols insertion
					map = CKEDITOR.tools.buildTableMap( table );					
				}

				for ( i = 0 ; i < this.map.length ; i++ ) {
					for ( j = 0 ; j < this.map[ i ].length ; j++ ) {
						var sourceCell = new CKEDITOR.dom.element( this.map[ i ][ j ] ),
							targetCell = new CKEDITOR.dom.element( map[ startRowIndex + i ][ startCellIndex + j ] );

						pasteCell( sourceCell, targetCell );
					}
				}
			}

			for ( i = 0 ; i < map.length ; i++ ) {
				for ( j = 0 ; j < map[ i ].length ; j++) {
					var cell = new CKEDITOR.dom.element( map[ i ][ j ] );
					cell.removeCustomData( 'cell_processed' );
					cell.removeCustomData( 'cell_selected' );
				}
			}

			editor.fire( 'saveSnapshot' );
			return true;
		}
	};

	CKEDITOR.plugins.add( 'mindtouch/tableclipboard', {
		requires: 'tabletools',
		init: function( editor ) {
			var clipboard = new tableClipboard( editor );

			editor.addCommand( 'cellsCut', {
				exec: function( editor ) {
					var selection = editor.getSelection();
					selection && clipboard.cutCells( selection );
				}
			});

			editor.addCommand( 'cellsCopy', {
				canUndo: false,
				exec: function( editor ) {
					var selection = editor.getSelection();
					selection && clipboard.copyCells( selection );
				}
			});

			editor.addCommand( 'cellsPaste', {
				canUndo: false,
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

				var sel = editor.getSelection(),
					cells = ( sel && CKEDITOR.plugins.tabletools.getSelectedCells( sel ) ) || [];

				if ( !cells.length ) {
					return;
				}

				// check if only table content is selected
				var range = sel.getRanges()[ 0 ];
				if ( !range.startContainer.hasAscendant( 'table' ) ) {
					return;
				}

				if ( !range.collapsed && !range.endContainer.hasAscendant( 'table' ) ) {
					return;
				}

				// check if content of single table is selected
				var table = prevTable = null,
					i;
				for ( i = 0 ; i < cells.length ; i++ ) {
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

			editor.on( 'contentDom', function() {
				var editable = editor.editable();
				for ( var eventName in { 'copy': 1, 'cut': 1 } ) {
					editable.on( eventName, onCopyCut, null, null, 1 );
				}

				// IE does not fire cut event for selected table cells
				if ( CKEDITOR.env.ie ) {
					editable.on( 'beforecut', onCopyCut, null, null, 1 );
				}
			});

			editor.on( 'beforePaste', function( evt ) {
				// if clipboard is not empty,
				// paste stored cells and cancel event
				if ( !clipboard.isEmpty() ) {
					editor.execCommand( 'cellsPaste' );
					evt.cancel();
				}
			});

			// when we cancel beforePaste event
			// ckeditor still calls getClipboardDataByPastebin()
			// it causes saving of pastebin in snapshot (because of insertElement in pasteCells)
			editor.on( 'getSnapshot', function( ev ) {
				if ( typeof ev.data == 'string' ) {
					ev.data = ev.data.replace( /<(?:body|div)\s+.*?id="cke_pastebin"[^>]*>.*?<\/(?:body|div)>/g, '' );
				}
			}, null, null, 1000 );

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
