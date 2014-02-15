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
 * @file Table rectangle selection.
 */

(function() {
	function selectCells( startCell, endCell ) {
		if ( !startCell || !startCell.is || !startCell.is( 'td', 'th' ) ||
			 !endCell || !endCell.is || !endCell.is( 'td', 'th' ) ) {
			return false;
		}

		var editor = this,
			table = startCell.getAscendant( 'table' );

		if ( !endCell.getAscendant( 'table' ).equals( table ) ) {
			return false;
		}

		var startRow = startCell.getParent(),
			endRow = endCell.getParent(),
			fromCellIndex, fromRowIndex, toCellIndex, toRowIndex;

		fromCellIndex = Math.min( startCell.$.cellIndex, endCell.$.cellIndex );
		toCellIndex = Math.max( startCell.$.cellIndex, endCell.$.cellIndex );

		fromRowIndex = Math.min( startRow.$.rowIndex, endRow.$.rowIndex );
		toRowIndex = Math.max( startRow.$.rowIndex, endRow.$.rowIndex );

		var selectedCellsCount = 0;

		for ( var i = 0 ; i < table.$.rows.length ; i++ ) {
			for ( var j = 0 ; j < table.$.rows[ i ].cells.length ; j++ ) {
				var cell = new CKEDITOR.dom.element( table.$.rows[ i ].cells[ j ] );
				if ( i >= fromRowIndex && i <= toRowIndex && j >= fromCellIndex && j <= toCellIndex ) {
					cell.data( 'cke-cell-selected', 1 );
					selectedCellsCount++;
				} else {
					cell.data( 'cke-cell-selected', false );
				}
			}
		}

		return !!selectedCellsCount;
	}

	function removeCellsSelection() {
		var editor = this,
			tables = editor.document.getElementsByTag( 'table' ),
			removed = false;

		for ( var k = 0 ; k < tables.count(); k++ ) {
			var table = tables.getItem( k );
			for ( var i = 0 ; i < table.$.rows.length ; i++ ) {
				for ( var j = 0 ; j < table.$.rows[ i ].cells.length ; j++ ) {
					var cell = new CKEDITOR.dom.element( table.$.rows[ i ].cells[ j ] );
					if ( cell.data( 'cke-cell-selected' ) ) {
						cell.data( 'cke-cell-selected', false );
						removed = true;
					}
				}
			}
		}

		removed && editor.getSelection().reset();
	}

	CKEDITOR.plugins.add('mindtouch/tableselection', {
		init: function(editor) {
			editor.on( 'contentDom', function() {
				var editable = editor.editable(),
					cancelClickEvent = false,
					startCell = null
					startTable = null;

				// cancel mousemove event on table resizer element
				var cancelTableResizer = function( ev ) {
					if ( startCell ) {
						var temp = ev.data.getTarget().getAscendant( 'div', true );
						if ( temp && temp.data( 'cke-temp' ) ) {
							ev.data.preventDefault();
						}
					}
				};

				var release = function( removeSelection ) {
					CKEDITOR.env.webkit && editor.setReadOnly( false );

					removeSelection && removeCellsSelection.call( editor );

					startCell = null;
					startTable = null;

					editor.document.removeListener( 'mousemove', cancelTableResizer );
				};

				editable.on( 'mousedown', function( ev ) {
					var target = ev.data.getTarget();
					startCell = target.getAscendant( { td:1, th:1 }, true );
					startTable = startCell && startCell.getAscendant( 'table' );

					editor.document.on( 'mousemove', cancelTableResizer );
					cancelClickEvent = false;
				});

				editable.on( 'mouseup', function( ev ) {
					var target = ev.data.getTarget()
						table = target && target.getAscendant( 'table', true ),
						removeSelection = !table || !table.equals( startTable );

					release( removeSelection );
				});

				editable.on( 'click', function() {
					// IE fires click event right after user finishes select cells
					!cancelClickEvent && release( true );
				});

				editable.on( 'mouseover', function( ev ) {
					if ( startCell ) {
						var target = ev.data.getTarget(),
							endCell = target.getAscendant( { td:1, th:1 }, true );

						CKEDITOR.env.webkit && editor.setReadOnly( true );

						if ( selectCells.call( editor, startCell, endCell ) ) {
							editor.forceNextSelectionCheck();
							editor.selectionChange( true );
							cancelClickEvent = true;

							// reselect ranges to create ranges of selected cells
							var selection = editor.getSelection();
							if ( selection ) {
								selection.selectRanges( selection.getRanges() );
							}
						}
					}
				});
			});

			editor.on( 'insertElement', removeCellsSelection, editor );
			editor.on( 'afterPaste', removeCellsSelection, editor );
			editor.on( 'afterTablePaste', removeCellsSelection, editor );

			// cell selected class should be removed from the snapshot
			// to prevent saving selection in undo snapshots
			editor.on( 'getSnapshot', function( ev ) {
				if ( typeof ev.data == 'string' ) {
					ev.data = ev.data.replace( /\s+data-cke-cell-selected=".*?"/g, '' );
				}
			}, null, null, 1000 );
		}
	});

	CKEDITOR.dom.selection.prototype.getRanges = CKEDITOR.tools.override( CKEDITOR.dom.selection.prototype.getRanges, function( originalGetRanges ) {
		return function( onlyEditables ) {
			var td = this.document.getElementsByTag( 'td' ),
				th = this.document.getElementsByTag( 'th' );

			var getSelectedCells = function( cellList ) {
				var cells = [];
				for ( var i = 0 ; i < cellList.count() ; i++ ) {
					if ( cellList.getItem( i ).data( 'cke-cell-selected' ) ) {
						cells.push( cellList.getItem( i ) );
					}
				}
				return cells;
			};

			var selectedCells = getSelectedCells( td ).concat( getSelectedCells( th ) );

			if ( selectedCells.length ) {
				var ranges = [];
				for ( var i = 0 ; i < selectedCells.length ; i++ ) {
					var cell = selectedCells[ i ];

					if ( onlyEditables && !cell.isEditable() ) {
						continue;
					}

					var range = new CKEDITOR.dom.range( this.document );

					range.setStartAt( cell, CKEDITOR.POSITION_AFTER_START );
					range.setEndAt( cell, CKEDITOR.POSITION_BEFORE_END );

					ranges.push( range );
				}

				this.reset();
				this._.cache.ranges = new CKEDITOR.dom.rangeList( ranges );
				return this._.cache.ranges;
			}

			return originalGetRanges.call( this, onlyEditables );
		}
	});
})();
