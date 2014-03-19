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
	var PASTE_ROW_BEFORE = 0,
		PASTE_ROW_AFTER = 1,
		COPY_CELLS = 0,
		COPY_ROWS = 1,
		CUT_CELLS = 2,
		CUT_ROWS = 3;

	var tableClipboard = function(editor) {
		this.editor = editor;
		this.reset();
	};

	tableClipboard.prototype = {
		reset: function() {
			this.clipboard = {
				table: null,
				rows: []
			};
		},

		/**
		 * @return Boolean - true if clipboard does not contain rows to paste
		 */
		isEmpty: function() {
			return !this.clipboard.rows.length;
		},

		_setClipboardData: function(selection, mode) {
			this.reset();

			var cells = CKEDITOR.plugins.tabletools.getSelectedCells(selection);

			if (!cells.length) {
				return false;
			}

			var doc = this.editor.document,
				remove = (mode & 2) >> 1,
				ignoreCells = mode & 1,
				rows = [],
				table, i, j, row;

			// don't process the single cell
			if (!ignoreCells && cells.length == 1) {
				return false;
			}

			// save the table structure in case if rows will be pasted outside of the table
			table = cells[0].getAscendant('table');

			// get selected rows
			for (i = 0; i < cells.length; i++) {
				var cell = cells[i];

				!ignoreCells && cell.setCustomData('cell_processed', 1);

				row = cell.getAscendant('tr');

				if (row && !row.getCustomData('row_processed')) {
					row.setCustomData('row_processed', 1);
					rows.push(row);
				}
			}

			// copy table to the clipboard
			this.clipboard.table = table.clone(true, true);

			// remove not selected rows and cells from the table in clipboard
			for (i = this.clipboard.table.$.rows.length - 1; i >= 0; i--) {
				var originalRow = CKEDITOR.dom.element.get(table.$.rows[i]),
					copiedRow = CKEDITOR.dom.element.get(this.clipboard.table.$.rows[i]);

				// if row (or cells into the row) is not selected
				if (!originalRow.getCustomData('row_processed')) {
					copiedRow.remove();
				} else if (!ignoreCells) {
					// if we are processing cells, remove not selected cells from the table in clipboard
					for (j = originalRow.$.cells.length - 1; j >= 0; j--) {
						var originalCell = CKEDITOR.dom.element.get(originalRow.$.cells[j]),
							copiedCell = CKEDITOR.dom.element.get(copiedRow.$.cells[j]);

						if (!originalCell.getCustomData('cell_processed')) {
							copiedCell.remove();

							if (!copiedRow.$.cells.length) {
								copiedRow.remove();
							}
						}
					}
				}
			}

			// if we'll remove cells, rows or table
			// we need to set the new range
			var moveCursorToNode;

			// remove/clone rows and cells for the cut/copy commands
			for (i = 0; i < rows.length; i++) {
				var originalRow = rows[i];
				row = originalRow.clone(true, true);

				originalRow.removeCustomData('row_processed');

				var cellProcessedCount = 0;

				// empty selected cells in the original table on cut
				// and remove not selected cells from the copied row
				for (j = originalRow.$.cells.length - 1; j >= 0; j--) {
					var cell = CKEDITOR.dom.element.get(originalRow.$.cells[j]);

					if (!ignoreCells) {
						if (!cell.getCustomData('cell_processed')) {
							// if cell is not selected, remove it from copied row
							CKEDITOR.dom.element.get(row.$.cells[j]).remove();
						} else if (remove) {
							// if cell is selected, empty it
							var children = cell.getChildren(),
								count = children.count(),
								k;

							for (k = count - 1; k >= 0; k--) {
								children.getItem(k).remove();
							}

							if (!CKEDITOR.env.ie) {
								cell.append(new CKEDITOR.dom.element('br', doc));
							}

							cellProcessedCount++;
						}
					}

					cell.removeCustomData('cell_processed');
				}

				var cloneId = false;

				if (remove) {
					// remove the row
					// and calculate the cell in which we'll set the cursor
					if (ignoreCells || cellProcessedCount == originalRow.$.cells.length) {
						var index = originalRow.$.rowIndex;

						// move cursor to the first cell of the next row
						if (originalRow.$.rowIndex < table.$.rows.length - 1) {
							index++;
						}
						// move cursor to the first cell of the previous row
						else if (originalRow.$.rowIndex) {
							index--;
						}

						if (index != originalRow.$.rowIndex) {
							moveCursorToNode = CKEDITOR.dom.element.get(table.$.rows[index]).getFirst();
						}

						!originalRow.isReadOnly() && originalRow.remove();

						// we can save the id in clipboard if the original row has been removed
						cloneId = true;
					}
				}

				rows[i] = row.clone(true, cloneId);
			}

			if (remove && rows.length && !table.$.rows.length && !table.isReadOnly()) {
				// remove the table if it's empty
				moveCursorToNode = table.getNext() || table.getPrevious() || doc.getBody();
				table.remove();
			} else {
				// remove id attributes
				this.clipboard.table = this.clipboard.table.clone(true);
			}

			this.clipboard.rows = rows;

			if (moveCursorToNode) {
				var range = new CKEDITOR.dom.range(doc);
				range.moveToElementEditStart(moveCursorToNode);
				range.collapse(1);
				range.select(1);
			}

			return !this.isEmpty();
		},

		cutRows: function(selection) {
			return this._setClipboardData(selection, CUT_ROWS);
		},

		copyRows: function(selection) {
			return this._setClipboardData(selection, COPY_ROWS);
		},

		cutCells: function(selection) {
			return this._setClipboardData(selection, CUT_CELLS);
		},

		copyCells: function(selection) {
			return this._setClipboardData(selection, COPY_CELLS);
		},

		_pasteRows: function(selection, mode) {
			if (this.isEmpty()) {
				return false;
			}

			var editor = this.editor,
				cells = CKEDITOR.plugins.tabletools.getSelectedCells(selection),
				table = this.clipboard.table;

			// if we are not into table, paste the saved table
			if (!cells.length && table) {
				editor.insertElement(table);

				CKEDITOR.tools.setTimeout(function() {
					var range = new CKEDITOR.dom.range(editor.document);
					range.moveToElementEditStart(table);
					range.select(1);
				});

				return true;
			}

			// counts max quantity of cells in the table
			var countCells = function(row) {
				var count = 0,
					length = row.getChildCount(),
					i;

				for (i = 0; i < length; i++) {
					count += row.getChild(i).$.colSpan;
				}

				return count;
			};

			// add or remove cells from the row to fit it to the table columns quantity
			var adjustCellsCount = function(row, currentRow) {
				var currentCount = countCells(currentRow),
					insertCount = countCells(row),
					length = row.getChildCount(),
					i;

				// revert cells merging
				for (i = length - 1; i >= 0; i--) {
					row.getChild(i).hasAttribute('rowSpan') && row.getChild(i).setAttribute('rowSpan', 1);
				}

				if (insertCount > currentCount) {
					for (i = 0; i < insertCount - currentCount; i++) {
						var cell = row.getLast(),
							colSpan = parseInt(cell.getAttribute('colSpan'), 10);

						if (colSpan && colSpan > 1) {
							cell.setAttribute('colSpan', colSpan - 1);
						} else {
							cell.remove();
						}

					}
				} else if (insertCount < currentCount) {
					var cell = row.getChild(length - 1);
					cell.removeAttribute('colSpan');

					for (i = 0; i < currentCount - insertCount; i++) {
						cell = cell.clone();
						cell.appendBogus();
						cell.appendTo(row);
					}
				}

				return row;
			};

			var currentRow = cells.length && cells[cells.length - 1].getAscendant('tr'),
				rowsToInsert = this.clipboard.rows,
				row, rowToInsert, i, j;

			// reverse rows
			// to insert the last copied row before the current
			(mode == PASTE_ROW_BEFORE) && rowsToInsert.reverse();

			editor.fire('saveSnapshot');

			for (i = 0; i < rowsToInsert.length; i++) {
				rowToInsert = rowsToInsert[i].clone(true, true);
				j = (mode == PASTE_ROW_BEFORE) ? this.clipboard.rows.length - 1 - i : i;

				// remove id attribute after pasting so we can paste rows again in the future
				this.clipboard.rows[j] = this.clipboard.rows[j].clone(true);

				// add/remove cells to keep table's columns quantity
				if (currentRow) {
					rowToInsert = adjustCellsCount(rowToInsert, currentRow);
				}

				// insert row and make it current for the next copied row
				rowToInsert[(mode == PASTE_ROW_BEFORE) ? 'insertBefore' : 'insertAfter'](currentRow);
				currentRow = rowToInsert;
			}

			editor.fire('afterTablePaste');
			editor.fire('saveSnapshot');

			return true;
		},

		pasteRowsBefore: function(selection) {
			return this._pasteRows(selection, PASTE_ROW_BEFORE);
		},

		pasteRowsAfter: function(selection) {
			return this._pasteRows(selection, PASTE_ROW_AFTER);
		}
	};

	CKEDITOR.plugins.add('mindtouch/tableclipboard', {
		init: function(editor) {
			var clipboard = new tableClipboard(editor);

			editor.addCommand('rowCut', {
				exec: function(editor) {
					var selection = editor.getSelection();
					selection && clipboard.cutRows(selection);
				}
			});

			editor.addCommand('rowCopy', {
				exec: function(editor) {
					var selection = editor.getSelection();
					selection && clipboard.copyRows(selection);
				}
			});

			editor.addCommand('cellsCut', {
				exec: function(editor) {
					var selection = editor.getSelection();
					selection && clipboard.cutCells(selection);
				}
			});

			editor.addCommand('cellsCopy', {
				exec: function(editor) {
					var selection = editor.getSelection();
					selection && clipboard.copyCells(selection);
				}
			});

			editor.addCommand('rowPasteBefore', {
				exec: function(editor) {
					var selection = editor.getSelection();
					selection && clipboard.pasteRowsBefore(selection);
				}
			});

			editor.addCommand('rowPasteAfter', {
				exec: function(editor) {
					var selection = editor.getSelection();
					selection && clipboard.pasteRowsAfter(selection);
				}
			});

			var cancelEvent = function(evt) {
				if (evt.data && evt.data.preventDefault) {
					evt.data.preventDefault(true);
				} else {
					evt.cancel();
				}
			};

			var onCopyCut = function(evt) {
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
				var command = (evt.name in {'copy': 1, 'zcBeforeCopy': 1}) ? 'cellsCopy' : 'cellsCut';
				editor.execCommand(command);

				!clipboard.isEmpty() && cancelEvent(evt);
			};

			var onPasteEvent = function(evt) {
				// if clipboard is not empty,
				// paste stored rows and cancel paste event
				if (!clipboard.isEmpty()) {
					editor.execCommand('rowPasteAfter');
					cancelEvent(evt);
				}
			};

			editor.on('contentDom', function() {
				var editable = editor.editable();
				for (var eventName in {'copy': 1, 'cut': 1}) {
					editable.on(eventName, onCopyCut, null, null, 1);
				}

				// IE does not fire cut event for selected table cells
				if (CKEDITOR.env.ie) {
					editable.on('beforecut', onCopyCut, null, null, 1);
				}

				editable.on(CKEDITOR.env.ie ? 'beforepaste' : 'paste', onPasteEvent, null, null, 1);
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
