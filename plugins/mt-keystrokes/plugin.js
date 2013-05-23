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
 * @file Keystrokes plugin.
 */

(function() {
	var tab = function(keyCode) {
		var editor = this,
			hasShift = (keyCode == CKEDITOR.SHIFT + 9);

		var selection = editor.getSelection(),
			ranges = selection && selection.getRanges(1),
			range = ranges && ranges[0];

		if (!range) {
			return false;
		}

		var path = new CKEDITOR.dom.elementPath(range.startContainer),
			isStartOfBlock = range.checkStartOfBlock();

		if ((path.contains({li: 1}) && isStartOfBlock) || (!path.contains({td: 1, th: 1, pre: 1}) && isStartOfBlock && range.checkEndOfBlock())) {
			editor.execCommand(hasShift ? 'outdent' : 'indent');
			return true;
		}

		if (!hasShift && editor.execCommand('selectNextCell') || hasShift && editor.execCommand('selectPreviousCell')) {
			return true;
		}

		return false;
	};

	var toggleListCmd = {
		exec: function(editor) {
			var commandName;

			if (editor.getCommand('bulletedlist').state == CKEDITOR.TRISTATE_ON) {
				commandName = 'numberedlist';
			} else {
				if (editor.getCommand('numberedlist').state == CKEDITOR.TRISTATE_ON) {
					var path = new CKEDITOR.dom.elementPath(editor.getSelection().getStartElement());

					commandName = 'numberedlist';

					var listsCount = 0,
						element,
						name;

					for (var i = 0; i < path.elements.length; i++) {
						element = path.elements[i];

						if (element.is('ul', 'ol')) {
							listsCount++;
						}

						if (listsCount > 1) {
							commandName = 'bulletedlist';
						}
					}
				} else {
					commandName = 'bulletedlist';
				}
			}

			if (editor.getCommand(commandName).state != CKEDITOR.TRISTATE_DISABLED) {
				editor.execCommand(commandName);
				return true;
			}

			return false;
		}
	};

	var removePagebreakOrHr = function(keyCode) {
		var editor = this;

		var selection = editor.getSelection(),
			ranges = selection && selection.getRanges(true),
			range = ranges && ranges[0],
			node = null;

		if (range && range.collapsed && range[keyCode == 8 ? 'checkStartOfBlock' : 'checkEndOfBlock']()) {
			node = range.startContainer[keyCode == 8 ? 'getPreviousSourceNode' : 'getNextSourceNode'](1, CKEDITOR.NODE_ELEMENT);
		}

		if (node && (node.data('cke-display-name') == 'pagebreak' || node.is('hr'))) {
			node.remove();
			return true;
		}

		return false;
	};

	// @see EDT-459
	// @todo fix snapshots issue and enable
	var fixStyleOnMergeBlocks = function(keyCode) {
		var editor = this,
			selection = editor.getSelection(),
			ranges = selection && selection.getRanges(1),
			range = ranges && ranges[0];

		if (!range || !range.collapsed) {
			return false;
		}

		var snapshotCounter = 0,
			onSaveSnapshot = function() {
				snapshotCounter++;
			};

		var wrapBlock = function(block) {
			var wrapper = editor.document.createElement('em'),
				wrapperPad = editor.document.createElement('span'),
				id = CKEDITOR.tools.getNextId();

			wrapper.setAttribute('id', id);
			wrapper.data('cke-temp');

			wrapperPad.append(new CKEDITOR.dom.text('\ufeff', editor.document));
			wrapperPad.data('cke-temp');
			wrapper.append(wrapperPad);

			block.moveChildren(wrapper);
			block.append(wrapper);

			editor.fire('updateSnapshot');
			editor.on('saveSnapshot', onSaveSnapshot);

			return id;
		};

		var removeWrapper = function(id) {
			var wrapper = editor.document.getById(id);

			if (wrapper) {
				// remove wrapper pad
				wrapper.getFirst().remove();

				var selection = editor.getSelection(),
					ranges = selection && selection.getRanges(1),
					range = ranges && ranges[0],
					bookmark = range && range.createBookmark();

				// remove wrapper
				wrapper.remove(true);

				if (bookmark) {
					range.moveToBookmark(bookmark);
					range.select();
				}

				editor.removeListener('saveSnapshot', onSaveSnapshot);

				for (var i = 0; i < snapshotCounter; i++) {
					editor.fire('updateSnapshot');
				}

				snapshotCounter = 0;
			}
		}

		// in some cases checkStartOfBlock returns incorrect result
		// so we need reselect range
		var bookmark = range.createBookmark();
		range.moveToBookmark(bookmark);
		range.select();

		var isStartOfBlock = range.checkStartOfBlock(),
			isEndOfBlock = range.checkEndOfBlock();

		if (keyCode == 8 && isStartOfBlock) {
			// backspace
			var path = new CKEDITOR.dom.elementPath(range.startContainer);
			if (path.block && !path.contains({li: 1})) {
				var prev = path.block.getPrevious();
				if (prev && prev.is && prev.is('table')) {
					return false;
				}

				var id = wrapBlock(path.block);

				range.moveToElementEditStart(path.block);
				range.select();

				window.setTimeout(function() {
					removeWrapper(id);
				}, 0);
			}
		} else if (keyCode == 46 && isEndOfBlock) {
			// del
			var path = new CKEDITOR.dom.elementPath(range.endContainer),
				dtd = CKEDITOR.dtd,
				block = path.block,
				blockLimit = path.blockLimit;

			if (block && !path.contains({li: 1})) {
				var next = block.getNext() || blockLimit.getNext();

				if (!next || next.type != CKEDITOR.NODE_ELEMENT) {
					return false;
				}

				if (isStartOfBlock && !(block.getName() in dtd.$tableContent)) {
					block.remove();

					if (blockLimit.getChildCount() == 0 && !(blockLimit.getName() in dtd.$nonBodyContent)) {
						blockLimit.remove();
					}

					range.moveToElementEditStart(next);
					range.select();
					return true;
				} else {
					var nextBlock = next;

					while (nextBlock && nextBlock.getName && nextBlock.getName() in dtd.$blockLimit) {
						nextBlock = nextBlock.getFirst();
					}

					if (!nextBlock || nextBlock.type != CKEDITOR.NODE_ELEMENT || nextBlock.getName() in CKEDITOR.tools.extend({table: 1, form: 1}, dtd.$list, dtd.$nonEditable)) {
						return false;
					}

					var id = wrapBlock(nextBlock);

					range.moveToElementEditEnd(block);
					range.select();

					window.setTimeout(function() {
						removeWrapper(id);
					}, 0);
				}
			}
		}

		return false;
	};

	var moveCursor = function(arrowKeyCode) {
		var editor = this,
			selection = editor.getSelection(),
			ranges = selection && selection.getRanges(1),
			range = ranges && ranges[0];

		if (!range) {
			return false;
		}

		// override up/down cursor behavior only for table cells
		var cell = range.startContainer.getAscendant({td: 1, th: 1}, 1);
		if (!cell) {
			return false;
		}

		// we need to keep offset to emulate behavior of other browsers
		var offset;
		if (range.startContainer.type == CKEDITOR.NODE_TEXT) {
			offset = range.startOffset;
		}

		window.setTimeout(function() {
			var selection = editor.getSelection(),
				ranges = selection && selection.getRanges(1),
				range = ranges && ranges[0];

			if (!range) {
				return false;
			}

			var rows = function(isReject) {
				return function(node) {
					var isRow = node && node.getName() == 'tr';
					return isReject ^ isRow;
				};
			};

			var newCell = range.startContainer.getAscendant({td: 1, th: 1}, 1);

			// if cursor was not moved out of the cell
			if (!newCell || newCell.equals(cell)) {
				return false;
			}

			var row = cell.getParent(),
				siblingRow;

			siblingRow = row && row[arrowKeyCode == 38 ? 'getPrevious' : 'getNext'](rows);

			// if we are in the last row
			if (!siblingRow) {
				var table = row.getAscendant('table'),
					next = table && table[arrowKeyCode == 38 ? 'getPrevious' : 'getNext']();

				if (next) {
					range.moveToElementEditStart(next);
					range.collapse(true);
					range.select();
				}

				return true;
			}

			var index = cell.$.cellIndex;
			if (index > siblingRow.$.cells.length - 1) {
				index = siblingRow.$.cells.length - 1;
			}

			var targetCell = new CKEDITOR.dom.element(siblingRow.$.cells[index]);

			// we don't need do anything for tables with one column
			if (newCell.equals(targetCell)) {
				return false;
			}

			// restoring cursor offset
			if (!isNaN(offset)) {
				var textNode = targetCell[arrowKeyCode == 38 ? 'getLast' : 'getFirst']();

				if (textNode && textNode.type !== CKEDITOR.NODE_TEXT) {
					var children = textNode.getChildren();
					for (var i = 0; i < children.count(); i++) {
						var child = children.getItem(i);
						if (child.type === CKEDITOR.NODE_TEXT) {
							textNode = child;
							break;
						}
					}
				}

				if (textNode && textNode.type === CKEDITOR.NODE_TEXT && textNode.getLength() >= offset) {
					range.setStart(textNode, offset);
					range.collapse(true);
					range.select();
					return true;
				}
			}

			range.moveToElementEditStart(targetCell);
			range.select();
			return true;
		}, 0);
	};

	CKEDITOR.plugins.add('mt-keystrokes', {
		requires: 'tab',
		init: function(editor) {
			editor.addCommand('toggleList', toggleListCmd);

			editor.on('key', function(evt) {
				if (evt.editor.readOnly || evt.editor.mode != 'wysiwyg') {
					return;
				}

				var editor = evt.editor,
					keyCode = evt.data.keyCode;

				switch (keyCode) {
					case 9: /* TAB */
					case CKEDITOR.SHIFT + 9:
					case CKEDITOR.CTRL + 9:
						if (tab.call(editor, keyCode)) {
							evt.cancel();
						}
						break;
					case 38: /* UP */
					case 40: /* DOWN */
						// @see #0007860
						CKEDITOR.env.webkit && moveCursor.call(editor, keyCode);
						break;
					case 8: /* BACKSPACE */
					case 46: /* DEL */
						if (!CKEDITOR.env.webkit && removePagebreakOrHr.call(editor, keyCode)) {
							evt.cancel();
						}
						break;
				}

			}, null, null, 1);
		}
	});
})();
