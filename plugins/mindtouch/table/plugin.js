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
		$: function(container, panel, tableButton, onPick) {
			this._.minCols = 5;
			this._.minRows = 5;
			this._.lastCols = 0;
			this._.lastRows = 0;

			this._.container = container;
			this._.panel = panel;

			this._.tableButtonUi = tableButton;

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

				this._.tableButton = new CKEDITOR.dom.element('div', doc);
				this._.tableButton.addClass('cke_' + editor.lang.dir);
				this._.tableButton.addClass('dimension-picker-tableButton');

				if (this._.tableButtonUi) {
					var output = [];

					this._.tableButtonUi.render(editor, output);
					this._.tableButton.setHtml(output.join(''));

					this._.container.append(this._.tableButton);
				}

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

				if (CKEDITOR.env.ie6Compat || CKEDITOR.env.ie7Compat) {
					this._.mouseDiv.setStyle('width', (this._.picker.$.offsetWidth + 18) + 'px');
					this._.mouseDiv.setStyle('height', this._.picker.$.offsetHeight + 'px');
				}

				var pickerWidth = this._.uhDiv.$.offsetWidth,
					pickerHeight = this._.tableButton.$.offsetHeight + this._.uhDiv.$.offsetHeight + this._.statusDiv.$.offsetHeight;

				pickerWidth += 8;
				pickerHeight += 14;

				if (CKEDITOR.env.ie6Compat || CKEDITOR.env.ie7Compat) {
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
				var mousePos = getMousePosition(ev);
				var x = mousePos.x;
				var y = mousePos.y;

				y -= this._.tableButton.$.offsetHeight;
				y = Math.max(y, 0);

				var cols = Math.ceil(x / 18.0);
				var rows = Math.ceil(y / 18.0);

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

	CKEDITOR.plugins.add('mindtouch/table', {
		lang: 'en', // %REMOVE_LINE_CORE%
		icons: 'tableoneclick', // %REMOVE_LINE_CORE%
		requires: 'mindtouch/tools,table',
		init: function(editor) {
			var plugin = this,
				lang = editor.lang['mindtouch/table'],
				picker;

			var addDialog = CKEDITOR.tools.override(CKEDITOR.dialog.add, function(add) {
				return function(name, dialogDefinition) {
					add.apply(this, [name, dialogDefinition]);
					if (!CKEDITOR.tools.objectCompare(this._.dialogDefinitions[ name ], dialogDefinition)) {
						this._.dialogDefinitions[ name ] = dialogDefinition;
					}
				}
			});

			addDialog.call(CKEDITOR.dialog, 'table', this.path + 'dialogs/table.js');
			addDialog.call(CKEDITOR.dialog, 'tableProperties', this.path + 'dialogs/table.js');
			addDialog.call(CKEDITOR.dialog, 'cellProperties', this.path + 'dialogs/tableCell.js');

			editor.addCommand('rowProperties', new CKEDITOR.dialogCommand('rowProperties'));
			addDialog.call(CKEDITOR.dialog, 'rowProperties', this.path + 'dialogs/tableRow.js');

			var lang = editor.lang['mindtouch/table'];
			CKEDITOR.tools.extend(editor.lang.table, lang);
			CKEDITOR.tools.extend(editor.lang.table.cell, lang.cell);
			CKEDITOR.tools.extend(editor.lang.table.row, lang.row);

			lang = editor.lang.table;

			var tableButton;
			editor.on( 'uiSpace', function( event ) {
				if ( event.data.space != editor.config.toolbarLocation ) {
					return;
				}

				tableButton = editor.ui.create('Table');
				if (tableButton && editor.addFeature(tableButton)) {
					tableButton.label = tableButton.title = lang.title;
				}
			});

			editor.ui.add('TableOneClick', CKEDITOR.UI_PANELBUTTON, {
				label: lang.toolbar,
				title: lang.toolbar,
				toolbar: 'insert,40',
				className: 'cke_button_tableoneclick',
				modes: {wysiwyg: 1},

				panel: {
					css: [ CKEDITOR.skin.getPath( 'editor' ) ].concat([editor.config.contentsCss, plugin.path + 'css/style.css']),
					attributes: {
						role: 'listbox',
						'aria-label': lang.toolbar
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

					picker = new dimensionPicker(pickerContainer, panel, tableButton, function(dimensions) {
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

			if (editor.addMenuItems) {
				editor.addMenuGroup('tablerowproperties', 102);
				editor.addMenuItems({
					tablerow_properties: {
						label: lang.row.title,
						group: 'tablerowproperties',
						command: 'rowProperties',
						order: 40
					}
				});
			}
		},
		onLoad: function() {
			CKEDITOR.document.appendStyleText('.cke_button__tableoneclick .cke_button_label { display: inline; margin: 0; padding-right: 2px;}');
		}
	});
})();
