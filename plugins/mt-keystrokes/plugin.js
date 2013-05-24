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
	// from a11yhelp dialog
	var keyMap = {
		8: "BACKSPACE",
		9: "TAB",
		13: "ENTER",
		16: "SHIFT",
		17: "CTRL",
		18: "ALT",
		19: "PAUSE",
		20: "CAPSLOCK",
		27: "ESCAPE",
		33: "PAGE UP",
		34: "PAGE DOWN",
		35: "END",
		36: "HOME",
		37: "LEFT ARROW",
		38: "UP ARROW",
		39: "RIGHT ARROW",
		40: "DOWN ARROW",
		45: "INSERT",
		46: "DELETE",
		91: "LEFT WINDOW KEY",
		92: "RIGHT WINDOW KEY",
		93: "SELECT KEY",
		96: "NUMPAD  0",
		97: "NUMPAD  1",
		98: "NUMPAD  2",
		99: "NUMPAD  3",
		100: "NUMPAD  4",
		101: "NUMPAD  5",
		102: "NUMPAD  6",
		103: "NUMPAD  7",
		104: "NUMPAD  8",
		105: "NUMPAD  9",
		106: "MULTIPLY",
		107: "ADD",
		109: "SUBTRACT",
		110: "DECIMAL POINT",
		111: "DIVIDE",
		112: "F1",
		113: "F2",
		114: "F3",
		115: "F4",
		116: "F5",
		117: "F6",
		118: "F7",
		119: "F8",
		120: "F9",
		121: "F10",
		122: "F11",
		123: "F12",
		144: "NUM LOCK",
		145: "SCROLL LOCK",
		186: "SEMI-COLON",
		187: "EQUAL SIGN",
		188: "COMMA",
		189: "DASH",
		190: "PERIOD",
		191: "FORWARD SLASH",
		192: "GRAVE ACCENT",
		219: "OPEN BRACKET",
		220: "BACK SLASH",
		221: "CLOSE BRAKET",
		222: "SINGLE QUOTE"
	};

	// Modifier keys override.
	if ( CKEDITOR.env.mac )
	{
		keyMap[ CKEDITOR.ALT ] = '&#8997;';
		keyMap[ CKEDITOR.SHIFT ] = '&#8679;';
		keyMap[ CKEDITOR.CTRL ] = '&#8984;';
	}
	else
	{
		keyMap[ CKEDITOR.ALT ] = 'ALT';
		keyMap[ CKEDITOR.SHIFT ] = 'SHIFT';
		keyMap[ CKEDITOR.CTRL ] = 'CTRL';
	}

	// Sort in desc.
	var modifiers = [ CKEDITOR.ALT, CKEDITOR.SHIFT, CKEDITOR.CTRL ];

	function representKeyStroke( keystroke ) {
		var quotient, modifier,
			presentation = [];

		for ( var i = 0; i < modifiers.length; i++ ) {
			modifier = modifiers[ i ];
			quotient = keystroke / modifiers[ i ];
			if ( quotient > 1 && quotient <= 2 ) {
				keystroke -= modifier;
				presentation.push( keyMap[ modifier ] );
			}
		}

		presentation.push( keyMap[ keystroke ] || String.fromCharCode( keystroke ) );

		return presentation.join( '+' );
	}

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

		if ((path.contains({li: 1}) && isStartOfBlock) || (!path.contains({td: 1, th: 1, pre: 1}) && isStartOfBlock)) {
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

			editor.setKeystroke(CKEDITOR.CTRL + 76 /*L*/, 'toggleList');
			editor.setKeystroke(CKEDITOR.CTRL + CKEDITOR.SHIFT + 55 /*7*/, 'numberedlist');
			editor.setKeystroke(CKEDITOR.CTRL + CKEDITOR.SHIFT + 56 /*8*/, 'bulletedlist');

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

			/**
			 * Add command shortcut to UI element label
			 * @see #MT-10605
			 */
			var keystrokes = {},
				i;

			var shortcuts =
				{
					'indent' : 9,
					'outdent' : CKEDITOR.SHIFT + 9,
					'copy' : CKEDITOR.CTRL + 67,
					'cut' : CKEDITOR.CTRL + 88,
					'paste' : CKEDITOR.CTRL + 86
				};

			for (i in editor.config.keystrokes) {
				keystrokes[editor.config.keystrokes[i][1]] = editor.config.keystrokes[i][0];
			}

			editor.on('pluginsLoaded', function() {
				var i, name, item, command, keystroke,
				items = editor.ui._.items;

				// go through ui items
				for (name in items) {
					if (!items.hasOwnProperty(name)) {
						continue;
					}

					item = items[name];
					command = item.command;

					if (command && item.type == CKEDITOR.UI_BUTTON) {
						if (command in keystrokes) {
							keystroke = representKeyStroke(keystrokes[command]);
						} else if (command in shortcuts) {
							keystroke = representKeyStroke(shortcuts[command]);
						}

						if (keystroke) {
							var def = item.args[0],
								title = def.title || def.label || '';

							title += ' (' + keystroke + ')';
							item.args[0].title = title;

							keystroke = null;
						}
					}
				}
			});

			CKEDITOR.ui.on('ready', function(evt) {
				var ui = evt.data;

				if (ui.items) {
					var element = ui._.element,
						item, command, keystroke,
						nodeList = element.getElementsByTag('a'),
						itemNode, title,
						i, j;

					for (i = 0; i < ui.items.length; i++) {
						item = ui.items[i];
						command = item.command;

						if (command) {
							if (command in keystrokes) {
								keystroke = representKeyStroke(keystrokes[command]);
							} else if (command in shortcuts) {
								keystroke = representKeyStroke(shortcuts[command]);
							}

							if (keystroke) {
								for (j = 0; j < nodeList.count(); j++) {
									itemNode = nodeList.getItem(j);

									if (itemNode.hasClass(item.className)) {
										// decode html entity
										var dummy = itemNode.getDocument().createElement('div');
										dummy.setHtml(keystroke);

										title = itemNode.getAttribute('title') || item.label || '';
										title += ' (' + dummy.getText() + ')';

										itemNode.setAttribute('title', title);
										break; // for j
									}
								}

								keystroke = null;
							}
						}
					}
				}
			});
		}
	});
})();
