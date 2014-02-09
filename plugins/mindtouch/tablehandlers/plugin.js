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
	function cancel(evt) {
		(evt.data || evt).preventDefault();
	}

	function tableHandlers(editor) {
		this.editor = editor;

		var handlers = {row: null, col: null},
			cell = null,
			doc = CKEDITOR.document,
			win = doc.getWindow();

		var handlerFn = CKEDITOR.tools.addFunction(function(command) {
			cell && this.execCommand(command);
			this.execCommand('autogrow');
			return false;
		}, editor);

		function update(ev) {
			if (!cell) {
				return;
			}

			if (ev && ev.listenerData && ev.listenerData.async) {
				setTimeout(update, 0);
				return;
			}

			var cellPos = cell.getDocumentPosition(doc),
				width = cell.$.offsetWidth,
				height = cell.$.offsetHeight,
				left, top;

			if (height < 48) {
				top = cellPos.y - (24 - height / 2);
			} else {
				top = cellPos.y + height / 2 - 24;
			}

			handlers.row.setStyles({
				left: cellPos.x - 16 + 'px',
				top: top + 'px'
			});

			if (width < 30) {
				left = cellPos.x - (24 - width / 2);
			} else {
				left = cellPos.x + width / 2 - 24;
			}

			handlers.col.setStyles({
				left: left + 'px',
				top: cellPos.y - 16 + 'px'
			});

			handlers.row.show();
			handlers.col.show();
		}

		this.attachTo = function(element) {
			if (cell && cell.equals(element)) {
				return;
			} else if (cell) {
				this.detach();
			}

			cell = element;

			win.on('resize', update);
			editor.on('afterCommandExec', update, null, {async: true});
			editor.on('key', update, null, {async: true});
			editor.on('change', update, null, {async: true});

			update();
		};

		this.detach = function() {
			if (!cell) {
				return;
			}

			win.removeListener('resize', update);
			editor.removeListener('afterCommandExec', update);
			editor.removeListener('key', update);
			editor.removeListener('change', update);

			cell = null;

			handlers.row.hide();
			handlers.col.hide();
		};

		var addHandler = function(name) {
			var scope = name == 'row' ? 'row' : 'column',
				lang = this.editor.lang.table[scope];

			handlers[name] = CKEDITOR.dom.element.createFromHtml(
				'<div class="cke_table_handlers cke_table_handlers_' + name + '" data-cke-tablehandlers=1 style="display:none;">' +
				'<a title="' + lang.insertBefore + '" class="' + scope + 'InsertBefore" onclick="return CKEDITOR.tools.callFunction(' + handlerFn + ', \'' + scope + 'InsertBefore\')"></a>' +
				'<a title="' + lang['delete' + CKEDITOR.tools.capitalize(scope)] + '" class="' + scope + 'Delete" onclick="return CKEDITOR.tools.callFunction(' + handlerFn + ', \'' + scope + 'Delete\')"></a>' +
				'<a title="' + lang.insertAfter + '" class="' + scope + 'InsertAfter" onclick="return CKEDITOR.tools.callFunction(' + handlerFn + ', \'' + scope + 'InsertAfter\')"></a>' +
				'</div>', doc);

			doc.getBody().append(handlers[name]);

			handlers[name].on('mousedown', function(evt) {
				cancel(evt);
			});
		};

		addHandler.call(this, 'row');
		addHandler.call(this, 'col')

		editor.on('destroy', function() {
			CKEDITOR.tools.removeFunction(handlerFn);
			handlers.row.remove();
			handlers.col.remove();
		});
	}

	CKEDITOR.plugins.add('mindtouch/tablehandlers', {
		init: function(editor) {
			if (CKEDITOR.env.gecko && !editor.config.disableNativeTableHandles) {
				return;
			}

			var handlers;

			editor.on('selectionChange', function(evt) {
				var cells = editor.plugins.tabletools.getSelectedCells(evt.data.selection),
					cell = cells.length && cells[0];

				if (!cell || cell.getAscendant('table').isReadOnly()) {
					handlers && handlers.detach();
					return;
				}

				if (!handlers) {
					handlers = new tableHandlers(editor);
				}

				handlers.attachTo(cell);
			}, null, null, 1);

			editor.on('contentDomUnload', function() {
				handlers && handlers.detach();
			});
		},
		onLoad: function() {
			var path = this.path,
				css = '.cke_table_handlers { \
					position: absolute; \
					z-index: 2; \
					overflow: hidden; \
				} \
				.cke_table_handlers a { \
					display: block; \
					width: 16px; \
					height: 16px; \
					cursor: default; \
					background: transparent scroll no-repeat; \
				} \
				.cke_table_handlers_col a { \
					float: left; \
				} \
				.cke_table_handlers a.rowInsertBefore { \
					background-image: url(' + path + 'images/arrow_up.png); \
				} \
				.cke_table_handlers a.rowInsertBefore:hover { \
					background-image: url(' + path + 'images/arrow_up_active.png); \
				} \
				.cke_table_handlers a.rowInsertAfter { \
					background-image: url(' + path + 'images/arrow_down.png); \
				} \
				.cke_table_handlers a.rowInsertAfter:hover { \
					background-image: url(' + path + 'images/arrow_down_active.png); \
				} \
				.cke_table_handlers a.columnInsertBefore { \
					background-image: url(' + path + 'images/arrow_left.png); \
				} \
				.cke_table_handlers a.columnInsertBefore:hover { \
					background-image: url(' + path + 'images/arrow_left_active.png); \
				} \
				.cke_table_handlers a.columnInsertAfter { \
					background-image: url(' + path + 'images/arrow_right.png); \
				} \
				.cke_table_handlers a.columnInsertAfter:hover { \
					background-image: url(' + path + 'images/arrow_right_active.png); \
				} \
				.cke_table_handlers a.rowDelete, \
				.cke_table_handlers a.columnDelete { \
					background-image: url(' + path + 'images/delete.png); \
				} \
				.cke_table_handlers a.rowDelete:hover, \
				.cke_table_handlers a.columnDelete:hover { \
					background-image: url(' + path + 'images/delete_active.png); \
				}';

			CKEDITOR.document.appendStyleText( css );
		}
	});
})();