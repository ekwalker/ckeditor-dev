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

		var table = startCell.getAscendant( 'table' );
		table.removeClass( 'cke_table_selected' );

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

		for ( var i = 0 ; i < table.$.rows.length ; i++ ) {
			for ( var j = 0 ; j < table.$.rows[ i ].cells.length ; j++ ) {
				var cell = new CKEDITOR.dom.element( table.$.rows[ i ].cells[ j ] );
				if ( i >= fromRowIndex && i <= toRowIndex && j >= fromCellIndex && j <= toCellIndex ) {
					cell.addClass( 'cke_cell_selected' );
				} else {
					cell.removeClass( 'cke_cell_selected' );
				}
			}
		}

		return true;
	}

	function removeCellsSelection( editor ) {
		var tables = editor.document.getElementsByTag( 'table' );

		for ( var k = 0 ; k < tables.count(); k++ ) {
			var table = tables.getItem( k );
			
			for ( var i = 0 ; i < table.$.rows.length ; i++ ) {
				for ( var j = 0 ; j < table.$.rows[ i ].cells.length ; j++ ) {
					var cell = new CKEDITOR.dom.element( table.$.rows[ i ].cells[ j ] );
					cell.removeClass( 'cke_cell_selected' );
				}
			}

			table.removeClass( 'cke_table_selected' );
		}
	}

	CKEDITOR.plugins.add('mindtouch/tableselection', {
		init: function(editor) {
			editor.on( 'contentDom', function() {
				var editable = editor.editable(),
					startCell = null
					startTable = null;

				var release = function( removeSelection ) {
					editor.setReadOnly( false );
					startTable && startTable.selectable();

					removeSelection && removeCellsSelection( editor );

					startCell = null;
					startTable = null;
				};

				editable.on( 'mousedown', function( ev ) {
					var target = ev.data.getTarget();
					startCell = target.getAscendant( { td:1, th:1 }, true );
					startTable = startCell && startCell.getAscendant( 'table' );
					startTable && startTable.unselectable();
				});

				editable.on( 'mouseup', function( ev ) {
					var target = ev.data.getTarget()
						table = target && target.getAscendant( 'table', true ),
						removeSelection = !table || !table.equals( startTable );

					release( removeSelection );
				});

				editable.on( 'click', function() {
					release( true );
				});

				editable.on( 'mouseover', function( ev ) {
					if ( startCell && startTable ) {
						var target = ev.data.getTarget(),
							endCell = target.getAscendant( { td:1, th:1 }, true );
						if ( !selectCells( startCell, endCell ) ) {
							startTable.addClass( 'cke_table_selected' );
						}
						editor.setReadOnly( true );
					}
				});
			});
		}
	});

	CKEDITOR.dom.selection.prototype.getRanges = CKEDITOR.tools.override( CKEDITOR.dom.selection.prototype.getRanges, function( originalGetRanges ) {
		return function( onlyEditables ) {
			var td = this.document.getElementsByTag( 'td' ),
				th = this.document.getElementsByTag( 'th' );

			var getSelectedCells = function( cellList ) {
				var cells = [];
				for ( var i = 0 ; i < cellList.count() ; i++ ) {
					if ( cellList.getItem( i ).hasClass( 'cke_cell_selected' ) ) {
						cells.push( cellList.getItem( i ) );
					}
				}
				return cells;
			};

			var selectCells = getSelectedCells( td ).concat( getSelectedCells( th ) );

			if ( selectCells.length ) {
				var ranges = [];
				for ( var i = 0 ; i < selectCells.length ; i++ ) {
					var cell = selectCells[ i ];

					if ( onlyEditables && !cell.isEditable() ) {
						continue;
					}

					var range = new CKEDITOR.dom.range( this.document );

					range.setStartBefore( cell );
					range.setEndAfter( cell );

					ranges.push( range );
				}

				this.reset();
				this._.cache.ranges = new CKEDITOR.dom.rangeList( ranges );
				return this._.cache.ranges;
			}

			return originalGetRanges.call( this, onlyEditables );
		}
	});

	CKEDITOR.dom.element.prototype.selectable = function() {
		this.setStyles( CKEDITOR.tools.cssVendorPrefix( 'user-select', '' ) );
		if ( CKEDITOR.env.ie || CKEDITOR.env.opera ) {
			this.removeAttribute( 'unselectable' );

			var element,
				elements = this.getElementsByTag( "*" );

			for ( var i = 0, count = elements.count() ; i < count ; i++ ) {
				element = elements.getItem( i );
				element.removeAttribute( 'unselectable' );
			}
		}
	};
})();
