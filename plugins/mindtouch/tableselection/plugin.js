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
	var mouseStartCell = null,
		keyStartCell = null,
		keyEndCell = null;

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

		if ( selectedCellsCount > 0 ) {
			reselectRanges.call( editor );
		}

		return !!selectedCellsCount;
	}

	function removeCellsSelection( selectFirst ) {
		var editor = this,
			editable = editor.editable(),
			tables = editable.getElementsByTag( 'table' );

		for ( var k = 0 ; k < tables.count(); k++ ) {
			var table = tables.getItem( k ),
				firstCell = null;
			for ( var i = 0 ; i < table.$.rows.length ; i++ ) {
				for ( var j = 0 ; j < table.$.rows[ i ].cells.length ; j++ ) {
					var cell = new CKEDITOR.dom.element( table.$.rows[ i ].cells[ j ] );
					if ( cell.data( 'cke-cell-selected' ) ) {
						cell.data( 'cke-cell-selected', false );
						firstCell = firstCell || cell;
					}
				}
			}

			if ( firstCell ) {
				var selection = editor.getSelection();
				if ( selection ) {
					selection.removeAllRanges();

					if ( selectFirst ) {
						var range = new CKEDITOR.dom.range( editor.document );
						range.setStartAt( firstCell, CKEDITOR.POSITION_AFTER_START );
						range.collapse( true );

						selection.selectRanges( [ range  ] );
					}
				}
			}
		}

		editor.selectionChange( 1 );
	}

	// reselect ranges to create ranges of selected cells
	function reselectRanges() {
		var selection = this.getSelection();
		if ( selection ) {
			selection.removeAllRanges();
			!CKEDITOR.env.gecko && selection.selectRanges( selection.getRanges() );
			this.forceNextSelectionCheck();
			this.selectionChange( 1 );
		}
	}

	// cancel mousemove event on table resizer element
	function cancelTableResizer( ev ) {
		if ( mouseStartCell ) {
			var temp = ev.data.getTarget().getAscendant( 'div', true );
			if ( temp && temp.data( 'cke-temp' ) ) {
				ev.data.preventDefault();
			}
		}
	}

	function release( removeSelection, selectFirst ) {
		var editor = this,
			editable = editor.editable();

		CKEDITOR.env.webkit && editor.setReadOnly( false );
		mouseStartCell = keyStartCell = keyEndCell = null;
		removeSelection && removeCellsSelection.call( editor, selectFirst );		
		editable.removeListener( 'mousemove', cancelTableResizer );
		editable.$.style.webkitUserSelect = '';
		editor.focusManager.unlock();
	}

	CKEDITOR.plugins.add( 'mindtouch/tableselection', {
		init: function( editor ) {
			editor.on( 'contentDom', function() {
				var target = editor.editable(),
					forceReselectRange = false;

				if ( !target.isInline() ) {
					target = target.getDocument().getDocumentElement();
				}


				target.on( 'mousedown', function( ev ) {
					if ( ev.data.$.button === 2 ) {
						return;
					}

					release.call( editor, true );

					var target = ev.data.getTarget();
					mouseStartCell = target.getAscendant( { td:1, th:1 }, true );

					if ( mouseStartCell ) {
						var editable = editor.editable();
						editable.$.style.webkitUserSelect = 'none';
						editable.on( 'mousemove', cancelTableResizer );
						editor.focusManager.lock();
					}
				});

				target.on( 'mouseup', function( ev ) {
					release.call( editor );
					if ( forceReselectRange ) {
						reselectRanges.call( editor );
						forceReselectRange = false;
					}
				});

				target.on( 'dragstart', function() {
					release.call( editor );
				});

				target.on( 'mouseover', function( ev ) {
					if ( mouseStartCell ) {
						var target = ev.data.getTarget(),
							endCell = target && target.getAscendant( { td:1, th:1 }, true );

						CKEDITOR.env.webkit && editor.setReadOnly( true );

						if ( selectCells.call( editor, mouseStartCell, endCell ) ) {
							forceReselectRange = true;
							ev.data.preventDefault( 1 );
						}
					}
				});

				target.on( 'keydown', function( ev ) {
					var keyCode = ev.data.getKeystroke();
					switch ( keyCode ) {
						case CKEDITOR.SHIFT + 37: /* LEFT */
						case CKEDITOR.SHIFT + 38: /* UP */
						case CKEDITOR.SHIFT + 39: /* RIGHT */
						case CKEDITOR.SHIFT + 40: /* DOWN */
							if ( !keyStartCell ) {
								var selection = editor.getSelection(),
									range = selection && selection.getRanges()[ 0 ],
									cell = range && range.startContainer.getAscendant( { td:1, th:1 }, true );

								if ( cell && cell.equals( range.endContainer.getAscendant( { td:1, th:1 }, true ) ) ) {
									var isFirstLine = false,
										isLastLine = false;

									var bookmark = range.createBookmark( true ),
										node = cell.clone( true );

									range.moveToBookmark( bookmark );

									var lines = [],
										index = 0,
										bookmarks = [],
										block
										prevBlock = null;

									while ( node = node.getNextSourceNode() ) {
										// make sure the current line is string
										lines[ index ] = lines[ index ] || '';

										if ( !node.getName || !( node.getName() in CKEDITOR.dtd.$block ) ) {
											block = node.getAscendant( CKEDITOR.dtd.$block );
											if ( block && prevBlock && !block.equals( prevBlock ) ) {
												index++;
												lines[ index ] = '';
											}

											prevBlock = block;
										}

										if ( node.type == CKEDITOR.NODE_TEXT ) {
											lines[ index ] += node.getText();
										} else if ( node.is && node.is( 'br' ) ) {
											index++;
										} else if ( node.data && node.data( 'cke-bookmark' ) ) {
											bookmarks.push( index );
										}
									}

									if ( typeof bookmarks[ 0 ] !== 'undefined' ) {
										isFirstLine = ( bookmarks[ 0 ] === 0 );
										isLastLine = ( bookmarks[ 0 ] === lines.length - 1 );
									}

									if ( typeof bookmarks[ 1 ] !== 'undefined' ) {
										isLastLine = ( bookmarks[ 1 ] === lines.length - 1 );
									}

									if ( isFirstLine || isLastLine ) {
										var canSelect = false;

										switch ( keyCode ) {
											case CKEDITOR.SHIFT + 37:
												if ( isFirstLine && range.checkStartOfBlock() ) {
													canSelect = true;
												}
												break;
											case CKEDITOR.SHIFT + 38:
												if ( isFirstLine ) {
													canSelect = true;
												}
												break;
											case CKEDITOR.SHIFT + 39:
												if ( isLastLine && range.checkEndOfBlock() ) {
													canSelect = true;
												}
												break;
											case CKEDITOR.SHIFT + 40:
												if ( isLastLine ) {
													canSelect = true;
												}
												break;
										}

										if ( canSelect ) {
											keyStartCell = keyEndCell = cell;
										}
									}
								}
							} else {
								var table = keyStartCell.getAscendant( 'table', true ),
									endRow = keyEndCell.getParent(),
									rowIndex = endRow.$.rowIndex,
									cellIndex = keyEndCell.$.cellIndex;

								switch ( keyCode ) {
									case CKEDITOR.SHIFT + 37: cellIndex--; break;
									case CKEDITOR.SHIFT + 38: rowIndex--; break;
									case CKEDITOR.SHIFT + 39: cellIndex++; break;
									case CKEDITOR.SHIFT + 40: rowIndex++; break;
								}

								rowIndex = Math.max( rowIndex, 0 );
								rowIndex = Math.min( rowIndex, table.$.rows.length - 1 );
								cellIndex = Math.max( cellIndex, 0 );
								cellIndex = Math.min( cellIndex, endRow.$.cells.length - 1 );

								keyEndCell = new CKEDITOR.dom.element( table.$.rows[ rowIndex ].cells[ cellIndex ] );
							}

							if ( CKEDITOR.env.webkit && keyStartCell ) {
								editor.editable().$.style.webkitUserSelect = 'none';
								editor.setReadOnly( true );
							}

							if ( selectCells.call( editor, keyStartCell, keyEndCell ) ) {
								forceReselectRange = true;
								editor.focusManager.lock();
								ev.data.preventDefault( 1 );
								ev.cancel();
							}
							break;
						default:
							var key = ev.data.getKey(),
								domEvent = ev.data.$;

							// don't release the selection on pressing some keys and shortcuts:
							// - if only shift is pressed
							// - SHIFT + DEL
							// - any shortcut with CTRL/COMMAND or ALT keys
							if ( !( key === 16 || keyCode === CKEDITOR.SHIFT + 46 || domEvent.ctrlKey || domEvent.metaKey || domEvent.altKey ) ) {
								release.call( editor, true, true );
							}

							// delete and backspace should remove cells' content
							if ( keyCode in { 8: 1, 46: 1 } ) {
								var selection = editor.getSelection(),
									cells = ( selection && CKEDITOR.plugins.tabletools.getSelectedCells( selection ) ) || [],
									cell;

								if ( cells.length > 1 ) {
									editor.fire( 'saveSnapshot' );

									for ( var i = 0 ; i < cells.length ; i++ ) {
										cell = cells[ i ];
										while ( cell.getChildCount() ) {
											cell.getLast().remove();
										}

										if ( !CKEDITOR.env.ie ) {
											cell.append( cell.getDocument().createElement( 'br' ) );
										}
									}

									editor.fire( 'saveSnapshot' );
								}
							}

							break;
					}
				});

				target.on( 'keyup', function( evt ) {
					if ( evt.data.getKeystroke() === 16 ) {
						editor.editable().$.style.webkitUserSelect = '';
						CKEDITOR.env.webkit && editor.setReadOnly( false );

						if ( forceReselectRange ) {
							reselectRanges.call( editor );
							forceReselectRange = false;
						}
					}
				});
			});

			editor.on( 'insertElement', removeCellsSelection, editor, null, 50 );
			editor.on( 'afterPaste', removeCellsSelection, editor, null, 50 );

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
})();
