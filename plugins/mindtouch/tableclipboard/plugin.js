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
	function markCells( cells ) {
		cells = cells || [];
		for ( var i = 0; i < cells.length; i++ ) {
			cells[ i ].setCustomData( 'cell_selected', 1 );
		}
		return cells;
	}

	function getSelectedTableData( editor, removeCellContent ) {
		var selection = editor.getSelection(),
			cells = ( selection && CKEDITOR.plugins.tabletools.getSelectedCells( selection ) ) || [];

		if ( cells.length < 2 ) {
			return null;
		}

		// check if only table content is selected
		var range = selection.getRanges()[ 0 ];
		if ( !range.startContainer.hasAscendant( 'table', true ) ) {
			return null;
		}

		if ( !range.collapsed && !range.endContainer.hasAscendant( 'table', true ) ) {
			return null;
		}

		// check if content of single table is selected
		var sourceTable;
		for ( var i = 1 ; i < cells.length ; i++ ) {
			sourceTable = cells[ i ].getAscendant( 'table' );
			if ( !sourceTable || !sourceTable.equals( cells[ i - 1 ].getAscendant( 'table' ) ) ) {
				return null;
			}
		}

		var targetTable = sourceTable.clone(),
			map = CKEDITOR.tools.buildTableMap( sourceTable ),
			data = {};

		markCells( cells );

		// save the selected cells to the new table
		var i, j, row, cell;
		for ( i = 0 ; i < map.length ; i++ ) {
			row = new CKEDITOR.dom.element( map[ i ][ 0 ].parentNode );
			row = row.clone();
			for ( j = 0 ; j < map[ i ].length ; j++ ) {
				cell = new CKEDITOR.dom.element( map[ i ][ j ] );
				if ( cell.getCustomData( 'cell_selected' ) ) {
					var clone = cell.clone( !cell.getCustomData( 'cell_processed' ) );
					clone.removeAttribute( 'colSpan' );
					clone.removeAttribute( 'rowSpan' );
					row.append( clone );
					cell.setCustomData( 'cell_processed', 1 );
				}
			}
			row.getChildCount() && targetTable.append( row );
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

		// extract the plain text data
		map = CKEDITOR.tools.buildTableMap( targetTable );
		var text = [];
		for ( i = 0 ; i < map.length ; i++ ) {
			for ( j = 0 ; j < map[ i ].length ; j++ ) {
				cell = new CKEDITOR.dom.element( map[ i ][ j ] );
				text.push( cell.getText(), '\t' );
			}
			text.pop();
			text.push( '\n' );
		}
		text.pop();
		data.text = text.join( '' );
		
		data.html = targetTable.getOuterHtml();

		if ( editor.dataProcessor ) {
			data.html = editor.dataProcessor.toDataFormat( data.html );
		}

		return data;
	}

	function pasteCell( source, target ) {
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
	}

	function pasteTable( editor, sourceTable ) {
		var selection = editor.getSelection(),
			cells = selection && CKEDITOR.plugins.tabletools.getSelectedCells( selection ) || [];

		if ( !cells.length ) {
			return false;
		}

		var startCell = cells[ 0 ],
			startRow = startCell.getAscendant( 'tr' ),
			targetTable = startRow && startRow.getAscendant( 'table' );

		if ( !targetTable ) {
			return false;
		}

		editor.fire( 'saveSnapshot' );

		var targetMap = CKEDITOR.tools.buildTableMap( targetTable ),
			sourceMap = CKEDITOR.tools.buildTableMap( sourceTable ),
			startRowIndex = startRow.$.rowIndex,
			startCellIndex = -1,
			i, j;

		// looking for the start cell index
		for ( i = 0 ; i < targetMap[ startRowIndex ].length ; i++ ) {
			var cell = new CKEDITOR.dom.element( targetMap[ startRowIndex ][ i ] );
			if ( cell.equals( startCell ) ) {
				startCellIndex = i;
				break;
			}
		}

		// if there two and more cells are selected, paste data only into the selected cells
		if ( cells.length > 1 ) {
			markCells( cells );

			// find the source cell which should be pasted into the provided target position
			var getSourceCell = (function( sourceMap ) {
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
			})( sourceMap );

			for ( i = startRowIndex ; i < targetMap.length ; i++ ) {
				for ( j = startCellIndex ; j < targetMap[ i ].length ; j++ ) {
					var targetCell = new CKEDITOR.dom.element( targetMap[ i ][ j ] );
					if ( targetCell.getCustomData( 'cell_selected' ) ) {
						var targetRowIndex = i - startRowIndex,
							targetColIndex = j - startCellIndex,
							sourceCell = getSourceCell( { col: targetColIndex, row: targetRowIndex } );

						pasteCell( sourceCell, targetCell );
					}
				}
			}
		} else {
			var colsLack = sourceMap[ 0 ].length - ( targetMap[ 0 ].length - startCellIndex ),
				rowsLack = sourceMap.length - ( targetMap.length - startRowIndex );

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
				map = CKEDITOR.tools.buildTableMap( targetTable );					
			}

			for ( i = 0 ; i < sourceMap.length ; i++ ) {
				for ( j = 0 ; j < sourceMap[ i ].length ; j++ ) {
					var sourceCell = new CKEDITOR.dom.element( sourceMap[ i ][ j ] ),
						targetCell = new CKEDITOR.dom.element( targetMap[ startRowIndex + i ][ startCellIndex + j ] );

					pasteCell( sourceCell, targetCell );
				}
			}
		}

		for ( i = 0 ; i < targetMap.length ; i++ ) {
			for ( j = 0 ; j < targetMap[ i ].length ; j++) {
				var cell = new CKEDITOR.dom.element( targetMap[ i ][ j ] );
				cell.removeCustomData( 'cell_processed' );
				cell.removeCustomData( 'cell_selected' );
			}
		}

		editor.fire( 'saveSnapshot' );
		return true;
	}

	function cancelEvent( evt ) {
		if ( evt.data && evt.data.preventDefault ) {
			evt.data.preventDefault( true );
		} else {
			evt.cancel();
		}
	}

	function onCopyCut( evt ) {
		var editor = this,
			data = getSelectedTableData( editor, ( evt.name in { 'cut':1, 'beforecut':1, 'zcBeforeCut':1 } ) );

		if ( data && data.html && data.html.length ) {
			var clipboard = evt.data.zcClient || evt.data.$ && evt.data.$.clipboardData || null;
			setClipboardData.call( editor, clipboard, data );
			cancelEvent( evt );
		}
	}

	function setClipboardData( clipboard, data ) {
		var editor = this;

		editor.fire( 'tableClipboard', data );
		
		if ( clipboard ) {
			if ( typeof clipboard.setText == 'function' ) {
				// ZeroClipboard
				clipboard.setText( data.html );
			} else {
				// W3C clipboardData
				clipboard.setData( 'text/plain', data.text );
				clipboard.setData( 'text/html', data.html );
			}
		} else {
			var div = CKEDITOR.document.createElement( 'div' );
			div.setStyles({
				'position': 'absolute',
				'left': '-9999px',
				'top': CKEDITOR.document.getWindow().getScrollPosition().y + 'px',
				'width': '1px',
				'height': '1px'
			});
			div.setAttribute( 'contenteditable', 'true' );
			div.setAttribute( 'id', 'cke_tableclipboard' );
			div.data( 'cke-temp', 1 );
			div.setHtml( data.html );

			CKEDITOR.document.getBody().append( div );
			div.focus();

			var range = new CKEDITOR.dom.range( CKEDITOR.document );
			range.selectNodeContents( div );
			range.select();

			window.setTimeout(function() {
				div.remove();
				editor.focus();
			}, 0 );
		}
	}

	function onIECommandExec( evt ) {
		var editor = this,
			command = evt.listenerData.command,
			data = getSelectedTableData( editor, command === 'cut' );
		
		if ( data ) {
			setClipboardData.call( editor, null, data );
			CKEDITOR.document.$.execCommand( command );
			evt.cancel();
		}
	}

	CKEDITOR.plugins.add( 'mindtouch/tableclipboard', {
		requires: 'tabletools',
		init: function( editor ) {
			editor.on( 'contentDom', function() {
				var editable = editor.editable();
				editable.on( 'copy', onCopyCut, editor );
				editable.on( 'cut', onCopyCut, editor );

				if ( CKEDITOR.env.ie ) {
					editable.on( 'beforecopy', onCopyCut, editor );
					editable.on( 'beforecut', onCopyCut, editor );
				}
			});

			if ( CKEDITOR.env.ie ) {
				for ( var command in { 'copy': 1, 'cut': 1 } ) {
					var cmd = editor.getCommand( command );
					cmd && cmd.on( 'exec', onIECommandExec, editor, { command: command } );
				}
			}

			editor.on( 'paste', function( evt ) {
				if ( evt.data.type == 'html' ) {
					var html = evt.data.dataValue,
						wrapper = editor.document.createElement( 'div' );

					wrapper.setHtml( html );
					wrapper.trim();

					var first = wrapper.getFirst();
					if ( first && first.is && first.is( 'table' ) && wrapper.getChildCount() == 1 ) {
						pasteTable( editor, first ) && cancelEvent( evt );
					}
				}
			});

			// override ZeroClipboard behavior
			editor.on( 'zcBeforeCopy', onCopyCut, editor, null, 100 );
			editor.on( 'zcBeforeCut', onCopyCut, editor, null, 100 );
		}
	});
})();
