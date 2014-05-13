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
	function getMousePosition(ev) {
		var posx = 0,
			posy = 0,
			domEvent = ev.data.$;

		if (domEvent.pageX || domEvent.pageY) {
			posx = domEvent.pageX;
			posy = domEvent.pageY;
		} else if (domEvent.clientX || domEvent.clientY) {
			var target = ev.data.getTarget(),
				doc = target && target.getDocument();

			posx = domEvent.clientX;
			posy = domEvent.clientY;

			if (doc) {
				var scrollPosition = doc.getWindow().getScrollPosition();

				posx += scrollPosition.x;
				posy += scrollPosition.y;
			}
		}

		return {
			x: posx,
			y: posy
		};
	}

	var dimensionPicker = CKEDITOR.tools.createClass({
		$: function(container, panel, onPick) {
			this._.minCols = 5;
			this._.minRows = 5;
			this._.lastCols = 0;
			this._.lastRows = 0;

			this._.container = container;
			this._.panel = panel;

			this.onPick = onPick;

			this._.init();
		},

		_: {
			setDimensions: function(element, cols, rows) {
				element.setStyle('width', (18 * cols) + 'px');
				element.setStyle('height', (18 * rows) + 'px');
			},

			init: function() {
				var editor = this._.panel._.editor,
					doc = this._.container.getDocument();

				this._.mouseDiv = new CKEDITOR.dom.element('div', doc);
				this._.mouseDiv.addClass('dimension-picker-mouse');

				this._.uhDiv = new CKEDITOR.dom.element('div', doc);
				this._.uhDiv.addClass('dimension-picker-unhighlighted');

				this._.hDiv = new CKEDITOR.dom.element('div', doc);
				this._.hDiv.addClass('dimension-picker-highlighted');

				this._.statusDiv = new CKEDITOR.dom.element('div', doc);
				this._.statusDiv.addClass('dimension-picker-status');

				this._.picker = new CKEDITOR.dom.element('div', doc);
				this._.picker.setAttribute('id', 'dimension-picker');

				this._.container.append(this._.picker);
				this._.container.append(this._.statusDiv);

				this._.picker.append(this._.mouseDiv);
				this._.picker.append(this._.uhDiv);
				this._.picker.append(this._.hDiv);

				this._.mouseDiv.on('mousemove', function(ev) {
					var dimensions = this._.getDimensions(ev);

					if (this._.isChanged(dimensions.cols, dimensions.rows)) {
						this._.pick(dimensions.cols, dimensions.rows);
					}
				}, this);

				this._.picker.on('click', function(ev) {
					var dimensions = this._.getDimensions(ev);

					if (typeof this.onPick == 'function') {
						this.onPick(dimensions);
					}
				}, this);
			},

			pick: function(cols, rows) {
				var uhCols = Math.max(this._.minCols, cols),
					uhRows = Math.max(this._.minRows, rows);

				// highlighted cells
				this._.setDimensions(this._.hDiv, cols, rows);
				// not highlighted cells
				this._.setDimensions(this._.uhDiv, uhCols, uhRows);

				this._.statusDiv.setHtml(rows + 'x' + cols);

				if (CKEDITOR.env.ie && CKEDITOR.env.version < 8) {
					this._.mouseDiv.setStyle('width', (this._.picker.$.offsetWidth + 18) + 'px');
					this._.mouseDiv.setStyle('height', this._.picker.$.offsetHeight + 'px');
				}

				var pickerWidth = this._.uhDiv.$.offsetWidth,
					pickerHeight = this._.uhDiv.$.offsetHeight + this._.statusDiv.$.offsetHeight;

				pickerWidth += 8;
				pickerHeight += 14;

				if (CKEDITOR.env.ie && CKEDITOR.env.version < 8) {
					this._.panel._.iframe.setStyle('width', pickerWidth + 'px');
					this._.panel._.iframe.setStyle('height', (pickerHeight + 18) + 'px');
				}

				var panelHolderElement = CKEDITOR.document.getById(this._.panel._.panel.id);

				// block.autoSize = true adds 4px
				// remove them on panel opening
				if (!panelHolderElement.getStyle('width').length) {
					pickerWidth -= 4;
				}

				panelHolderElement.setStyle('width', pickerWidth + 'px');
				panelHolderElement.setStyle('height', pickerHeight + 'px');

				this._.container.setStyle('width', pickerWidth + 'px');
				this._.container.setStyle('height', pickerHeight + 'px');
			},

			getDimensions: function(ev) {
				var mousePos = getMousePosition(ev),
					x = mousePos.x,
					y = mousePos.y,
					cols = Math.ceil(x / 18.0),
					rows = Math.ceil(y / 18.0);

				if (cols == 0 || rows == 0) {
					cols = rows = 0;
				}

				return {
					'cols': cols,
					'rows': rows
				};
			},

			isChanged: function(cols, rows) {
				if (cols != this._.lastCols || rows != this._.lastRows) {
					this._.lastCols = cols;
					this._.lastRows = rows;
					return true;
				}

				return false;
			}
		},

		proto: {
			show: function() {
				this._.minCols = Math.ceil((this._.container.$.offsetWidth - 8) / 18) || this._.minCols;
				this._.pick(0, 0);
			},

			hide: function() {
				// reset panel width to default
				this._.pick(0, 0);
			}
		}
	});

	function getVerticalAlign( cells ) {
		var vAlign = '',
			vAlignValues = { top:1, middle:1, bottom:1 };
		for ( var i = 0 ; i < cells.length ; i++ ) {
			var cell = cells[ i ],
				vAlignAttr = cell.getAttribute( 'vAlign' ),
				vAlignStyle = cell.getStyle( 'vertical-align' ),
				align;

			if ( !(vAlignAttr in vAlignValues) ) {
				vAlignAttr = '';
			}
			if ( !(vAlignStyle in vAlignValues) ) {
				vAlignStyle = '';
			}

			align = vAlignStyle || vAlignAttr || '';

			if ( i > 0 && vAlign !== align ) {
				vAlign = '';
				break;
			}

			vAlign = align;
		}

		return vAlign;
	}

	function addVerticalAlignCommands( editor ) {
		function createDef( vAlign ) {
			return {
				contextSensitive: 1,
				allowedContent: 'td th{vertical-align}',
				requiredContent: 'td th{vertical-align}',
				refresh: function( editor, path ) {
					this.setState( path.contains( { td:1,th:1 }, 1 ) ? CKEDITOR.TRISTATE_OFF : CKEDITOR.TRISTATE_DISABLED );
				},
				exec: function() {
					var cells = CKEDITOR.plugins.tabletools.getSelectedCells( editor.getSelection() ),
						currentVAlign = getVerticalAlign( cells );

					editor.fire( 'saveSnapshot' );

					for ( var i = 0 ; i < cells.length ; i++ ) {
						var cell = cells[ i ];
						if ( currentVAlign !== vAlign ) {
							cell.setStyle( 'vertical-align', vAlign );
						} else {
							cell.removeStyle( 'vertical-align' );
						}

						cell.removeAttribute( 'vAlign' );
					}

					editor.fire( 'saveSnapshot' );
				}
			};
		}

		function addCmd( name, def ) {
			var cmd = editor.addCommand( name, def );
			editor.addFeature( cmd );
		}

		addCmd( 'cellAlignmentTop', createDef( 'top' ) );
		addCmd( 'cellAlignmentMiddle', createDef( 'middle' ) );
		addCmd( 'cellAlignmentBottom', createDef( 'bottom' ) );
	}

	function placeCursorInCell( cell ) {
		var range = new CKEDITOR.dom.range( cell.getDocument() );
		if ( !range.moveToElementEditStart( cell ) ) {
			range.selectNodeContents( cell );
			range.collapse( true );
		}
		range.select( true );
	}

	function unmergeCell( selection, isDetect ) {
		var editor = this,
			cells = CKEDITOR.plugins.tabletools.getSelectedCells( selection );
		
		if ( cells.length > 1 ) {
			return false;
		}

		var cell = cells[ 0 ],
			rowSpan = parseInt( cell.getAttribute( 'rowSpan' ), 10 ) || 1,
			colSpan = parseInt( cell.getAttribute( 'colSpan' ), 10 ) || 1;

		if ( rowSpan == 1 && colSpan == 1 ) {
			return false;
		} else if ( isDetect ) {
			return true;
		}

		while ( cell.getAttribute( 'rowSpan' ) > 1 ) {
			editor.execCommand( 'cellVerticalSplit' );
			editor.execCommand( 'cellUnmerge', true );
			placeCursorInCell( cell );
		}

		while ( cell.getAttribute( 'colSpan' ) > 1 ) {
			editor.execCommand( 'cellHorizontalSplit' );
			editor.execCommand( 'cellUnmerge', true );
			placeCursorInCell( cell );
		}
	}

	var unmergeCellCmd = {
		allowedContent: 'td[colspan,rowspan]',
		requiredContent: 'td[colspan,rowspan]',
		contextSensitive: 1,
		refresh: function( editor, path ) {
			var selection = editor.getSelection(),
				cells = ( selection && CKEDITOR.plugins.tabletools.getSelectedCells( selection ) ) || [];
			this.setState( cells.length === 1 ? CKEDITOR.TRISTATE_OFF : CKEDITOR.TRISTATE_DISABLED );
		},
		exec: function( editor, isRecursive ) {
			// lock snapshot once right after the first split command is executed
			if ( isRecursive && !this.snapshotLocked ) {
				editor.fire( 'lockSnapshot' );
				this.snapshotLocked = true;
			}

			var selection = editor.getSelection();
			unmergeCell.call( editor, selection );

			// unlock snapshot after all commands are executed
			if ( !isRecursive ) {
				this.snapshotLocked = false;
				editor.fire( 'unlockSnapshot' );
			}
		}
	};

	/**
	 * @see EDT-628
	 */
	CKEDITOR.plugins.add('mindtouch/table', {
		lang: 'en', // %REMOVE_LINE_CORE%
		icons: 'tableoneclick', // %REMOVE_LINE_CORE%
		requires: 'table,tabletools',
		init: function(editor) {
			var plugin = this,
				lang = editor.lang,
				tableLang = lang['mindtouch/table'],
				picker;

			// update allowedContent for table
			editor.getCommand( 'table' ).allowedContent += ';table(*)';

			editor.addCommand( 'mindtouchTableProperties', new CKEDITOR.dialogCommand( 'mindtouchTableProperties', {
				contextSensitive: 1,
				refresh: function( editor, path ) {
					this.setState( path.contains( 'table', 1 ) ? CKEDITOR.TRISTATE_OFF : CKEDITOR.TRISTATE_DISABLED );
				}
			}));

			CKEDITOR.dialog.add( 'mindtouchTableProperties', this.path + 'dialogs/table.js' );

			var cmd = editor.addCommand( 'cellUnmerge', unmergeCellCmd );
			editor.addFeature( cmd );

			cmd = editor.getCommand( 'cellMerge' );
			cmd && cmd.on( 'refresh', function( ev ) {
				var selection = editor.getSelection(),
					cells = ( selection && CKEDITOR.plugins.tabletools.getSelectedCells( selection ) ) || [];
				if ( cells.length < 2 ) {
					this.disable();
					ev.cancel();
				}
			}, cmd );

			// keep reference to tablecell menu item before we remove it:
			// we need tablecell_merge item from it to get its state in context menu listener
			// @see EDT-668
			var tablecellMenuItem = editor.getMenuItem( 'tablecell' );
			if ( tablecellMenuItem ) {
				var def = {};
				for ( var name in tablecellMenuItem ) {
					if ( Object.prototype.hasOwnProperty.call( tablecellMenuItem, name ) ) {
						def[ name ] = tablecellMenuItem[ name ];
					}
				}
				tablecellMenuItem = new CKEDITOR.menuItem( editor, 'tablecell', def );
			}

			editor.removeMenuItem( 'tablecell' );
			editor.removeMenuItem( 'tablerow' );
			editor.removeMenuItem( 'tablecolumn' );
			editor.removeMenuItem( 'table' );

			addVerticalAlignCommands( editor );

			if ( editor.addMenuItems ) {
				editor.addMenuItems({
					cellalign: {
						label: tableLang.vertAlign,
						group: 'tablecellalignment',
						order: 1,
						getItems: function() {
							var cells = CKEDITOR.plugins.tabletools.getSelectedCells( editor.getSelection() ),
								vAlign = getVerticalAlign( cells );

							return {
								tablecell_alignTop: vAlign === 'top' ? CKEDITOR.TRISTATE_ON : CKEDITOR.TRISTATE_OFF,
								tablecell_alignMiddle: vAlign === 'middle' ? CKEDITOR.TRISTATE_ON : CKEDITOR.TRISTATE_OFF,
								tablecell_alignBottom: vAlign === 'bottom' ? CKEDITOR.TRISTATE_ON : CKEDITOR.TRISTATE_OFF
							};
						}
					},
					tablecell_alignTop: {
						label: lang.common.alignTop,
						command: 'cellAlignmentTop',
						group: 'tablecellalignment',
						order: 5
					},
					tablecell_alignMiddle: {
						label: lang.common.alignMiddle,
						command: 'cellAlignmentMiddle',
						group: 'tablecellalignment',
						order: 10
					},
					tablecell_alignBottom: {
						label: lang.common.alignBottom,
						command: 'cellAlignmentBottom',
						group: 'tablecellalignment',
						order: 15
					},
					tablecell_mergeSelected: {
						label: tableLang.mergeSelected,
						group: 'tablecell',
						command: 'cellMerge',
						order: 5
					},
					tablecell_unmerge: {
						label: tableLang.unmergeCell,
						group: 'tablecell',
						command: 'cellUnmerge',
						order: 10
					},
					tablerow_insertBefore: {
						label: tableLang.insertRowAbove,
						command: 'rowInsertBefore',
						group: 'tableinsert',
						order: 5
					},
					tablerow_insertAfter: {
						label: tableLang.insertRowBelow,
						command: 'rowInsertAfter',
						group: 'tableinsert',
						order: 10
					},
					tablecolumn_insertBefore: {
						label: tableLang.insertColumnLeft,
						command: 'columnInsertBefore',
						group: 'tableinsert',
						order: 15
					},
					tablecolumn_insertAfter: {
						label: tableLang.insertColumnRight,
						command: 'columnInsertAfter',
						group: 'tableinsert',
						order: 20
					},
					tablerow_delete: {
						label: tableLang.deleteRow,
						command: 'rowDelete',
						group: 'tabledelete',
						order: 5
					},
					tablecolumn_delete: {
						label: tableLang.deleteColumn,
						command: 'columnDelete',
						group: 'tabledelete',
						order: 10
					},
					tabledelete: {
						label: CKEDITOR.tools.capitalize( lang.table.deleteTable ),
						command: 'tableDelete',
						group: 'tabledelete',
						order: 15
					},
					table: {
						label: CKEDITOR.tools.capitalize( lang.table.menu ),
						command: 'mindtouchTableProperties',
						group: 'table',
						order: 5
					}
				});
			}

			editor.on( 'doubleclick', function( evt ) {
				var element = evt.data.element;

				if ( element.is( 'table' ) )
					evt.data.dialog = 'mindtouchTableProperties';
			});

			if ( editor.contextMenu ) {
				editor.contextMenu.addListener( function( element, selection, path ) {
					var cell = path.contains( { 'td':1,'th':1 }, 1 );
					if ( cell && !cell.isReadOnly() ) {
						return {
							cellalign: CKEDITOR.TRISTATE_OFF,
							tablecell_mergeSelected: tablecellMenuItem ? tablecellMenuItem.getItems().tablecell_merge : CKEDITOR.TRISTATE_DISABLED,
							tablecell_unmerge: unmergeCell.call( editor, selection, true ) ? CKEDITOR.TRISTATE_OFF : CKEDITOR.TRISTATE_DISABLED,
							tablerow_insertBefore: CKEDITOR.TRISTATE_OFF,
							tablerow_insertAfter: CKEDITOR.TRISTATE_OFF,
							tablecolumn_insertBefore: CKEDITOR.TRISTATE_OFF,
							tablecolumn_insertAfter: CKEDITOR.TRISTATE_OFF,
							tablerow_delete: CKEDITOR.TRISTATE_OFF,
							tablecolumn_delete: CKEDITOR.TRISTATE_OFF
						};
					}

					return null;
				});
			}

			// @see EDT-554
			editor.addRemoveFormatFilter && editor.addRemoveFormatFilter( function( element ) {
				if ( element.is( 'table' ) && editor._.removeAttributes && CKEDITOR.tools.indexOf( editor._.removeAttributes, 'style' ) > -1 ) {
					// set the default table style
					element.setAttribute( 'style', 'width: 100%; table-layout: fixed;' );
					return false;
				}
				return true;
			});

			editor.ui.add('TableOneClick', CKEDITOR.UI_PANELBUTTON, {
				label: lang.table.toolbar,
				title: lang.table.toolbar,
				toolbar: 'insert,40',
				modes: {wysiwyg: 1},

				panel: {
					css: [ CKEDITOR.skin.getPath( 'editor' ) ].concat([editor.config.contentsCss, plugin.path + 'css/style.css']),
					attributes: {
						role: 'listbox',
						'aria-label': lang.table.toolbar
					}
				},

				onBlock: function(panel, block) {
					block.autoSize = true;
					block.element.addClass('cke_tableoneclickblock');
					block.element.addClass(editor.skinClass);

					var pickerContainer = new CKEDITOR.dom.element('div', block.element.getDocument());
					pickerContainer.addClass(CKEDITOR.env.cssClass);
					block.element.append(pickerContainer);

					// The block should not have scrollbars (#5933, #6056)
					block.element.getDocument().getBody().setStyle('overflow', 'hidden');

					CKEDITOR.ui.fire('ready', this);

					picker = new dimensionPicker(pickerContainer, panel, function(dimensions) {
						editor.focus();
						panel.hide();

						if (dimensions.cols > 0 && dimensions.rows > 0) {
							var table = new CKEDITOR.dom.element('table', editor.document);

							table.setStyle('width', '100%');
							table.setStyle('table-layout', 'fixed');

							table.setAttributes({
								'cellPadding': 1,
								'cellSpacing': 1,
								'border': 1
							});

							var tbody = new CKEDITOR.dom.element('tbody', editor.document);
							table.append(tbody);

							var firstCell;

							for (var i = 0; i < dimensions.rows; i++) {
								var row = new CKEDITOR.dom.element('tr', editor.document);
								tbody.append(row);

								for (var j = 0; j < dimensions.cols; j++) {
									var cell = new CKEDITOR.dom.element('td', editor.document);
									row.append(cell);

									if (!CKEDITOR.env.ie) {
										cell.append('br');
									}

									if (i == 0 && j == 0) {
										firstCell = cell;
									}
								}
							}

							editor.insertElement(table);

							var sel = editor.getSelection(),
								ranges = sel && sel.getRanges(),
								range = ranges && ranges[0];

							if (range) {
								range.moveToElementEditStart(firstCell);
								range.collapse(true);
								range.select();
							}
						}
					});
				},

				onOpen: function() {
					picker.show();
				},

				onClose: function() {
					picker.hide();
				}
			});
		}
	});
})();
