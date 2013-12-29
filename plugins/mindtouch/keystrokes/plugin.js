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
		186: ";",
		187: "=",
		188: ",",
		189: "-",
		190: ".",
		191: "/",
		192: "`",
		219: "(",
		220: "\\",
		221: ")",
		222: "'"
	};

	// Modifier keys override.
	if ( CKEDITOR.env.mac ) {
		keyMap[ CKEDITOR.ALT ] = '&#8997;';
		keyMap[ CKEDITOR.SHIFT ] = '&#8679;';
		keyMap[ CKEDITOR.CTRL ] = '&#8984;';
	} else {
		keyMap[ CKEDITOR.ALT ] = 'ALT';
		keyMap[ CKEDITOR.SHIFT ] = 'SHIFT';
		keyMap[ CKEDITOR.CTRL ] = 'CTRL';
	}

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

		presentation.reverse();
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

		var path = new CKEDITOR.dom.elementPath(range.startContainer);

		if (!path.contains({td: 1, th: 1, pre: 1}) && range.checkStartOfBlock()) {
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
		var editor = this,
			selection = editor.getSelection(),
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

	CKEDITOR.plugins.add('mindtouch/keystrokes', {
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
						
						// @see EDT-582
						// change the default firefox behavior on backspace/delete at the start/end of pre block
						if (CKEDITOR.env.gecko) {
							var selection = editor.getSelection(),
								range = selection && selection.getRanges()[0];

							if (range.collapsed) {
								var startElement = selection.getStartElement();
								if (startElement && startElement.is('pre') && range[keyCode == 8 ? 'checkStartOfBlock' : 'checkEndOfBlock']()) {
									var sibling = startElement[keyCode == 8 ? 'getPrevious' : 'getNext']();
									if (sibling && sibling.is && sibling.is('pre')) {
										// if current block and its sibling (prev for backspace and next for del keys)
										// are pre blocks, merge the first line of current (backspace) or the sibling (delete) block
										var from, to;
										if (keyCode == 8) {
											from = startElement;
											to = sibling;
										} else {
											from = sibling;
											to = startElement;
										}

										editor.fire('saveSnapshot');

										// looking for the first br node
										var br = from;
										while (br && !br.is('br')) {
											br = br.getNextSourceNode(false, CKEDITOR.NODE_ELEMENT, from);
										}

										range.setStartAt(from, CKEDITOR.POSITION_AFTER_START);
										
										// if there are few lines we'll extract only the first one
										// or we'll use the whole block otherwise
										if (br) {
											range.setEndAt(br, CKEDITOR.POSITION_BEFORE_START);
										} else {
											range.setEndAt(from, CKEDITOR.POSITION_BEFORE_END);
										}

										range.select();

										var contentToMerge = range.extractContents();

										br && br.remove();

										range.moveToElementEditEnd(to);
										range.select();

										// if there is br element at the end of the block
										// where we'll merge the line, remove it
										br = to.getLast();
										br && br.is && br.is('br') && br.remove();

										contentToMerge.appendTo(to);

										if (!from.getChildCount()) {
											from.remove();
										}

										editor.fire('saveSnapshot');

										evt.cancel();
									}
								}
							}
						}
						break;
				}

			}, null, null, 1);

			/**
			 * Webkit applies css styles as inline styles on merging blocks with backspace/delete
			 * 1. Save the current (backspace) or next (delete) block
			 * 2. When DOM is modified get the node next to the cursor
			 * 		(usually Webkit inserts span node but it may use inline node at start of block if it is already exist)
			 * 3. Insert cloned block (see #1)
			 * 4. Compare inline styles of span node (see #2) and computed styles of block node
			 * 5. If styles are equal, remove inline style of span node - this style was added by Webkit
			 *
			 * Known issue: incorrect behavior in case if the first child of the block is inline node (not span, i.e. code, sub etc.)
			 *
			 * @see EDT-459
			 * @link {https://dev.ckeditor.com/ticket/9998}
			 */
			if (CKEDITOR.env.webkit) {
				editor.on( 'contentDom', function() {
					editor.document.getBody().on( 'keydown', function( evt ) {
						var keyCode = evt.data.getKeystroke();

						if (keyCode === 8 || keyCode === 46) {
							var selection = editor.getSelection(),
								range = selection && selection.getRanges(true)[0];

							if (!range || !range.collapsed) {
								return false;
							}

							var isStartOfBlock = range.checkStartOfBlock(),
								isEndOfBlock = range.checkEndOfBlock(),
								node;

							if ((keyCode === 8 && isStartOfBlock) || (keyCode === 46 && isEndOfBlock)) {
								var path = new CKEDITOR.dom.elementPath(range.startContainer);

								node = path.block || path.blockLimit;

								if (keyCode === 46) {
									// use the next block for delete
									node = node && node.getNext();
								}
							}

							if (!node || node.type !== CKEDITOR.NODE_ELEMENT) {
								return;
							}

							window.setTimeout(function() {
								var range = editor.getSelection().getRanges(true)[0],
									styledNode = range.getNextNode(),
									reselect = false;

								if (!styledNode) {
									return;
								}

								if (styledNode.type === CKEDITOR.NODE_TEXT) {
									styledNode = styledNode.getParent();
									range.setStartBefore(styledNode);
									range.collapse(true);
									reselect = true;
								}

								if (styledNode && styledNode.type === CKEDITOR.NODE_ELEMENT && styledNode.getName() in CKEDITOR.dtd.$inline) {
									var dummy = node.clone();
									dummy.setStyle('visibility', 'hidden');
									dummy.data('cke-temp');

									// actually we need to keep the previous context for dummy node
									// but let's make things simple
									// this should work for most cases
									range.root.append(dummy);

									for (var i = styledNode.$.style.length; i--; ) {
										var style = styledNode.$.style[i];

										if (styledNode.getComputedStyle(style) === dummy.getComputedStyle(style)) {
											styledNode.removeStyle(style);
										}
									}

									if (styledNode.is('span') && !styledNode.$.style.length) {
										styledNode.remove(true);
									}

									dummy.remove();

									reselect && range.select();
								}
							}, 0);
						}
					}, null, null, 100);
				});
			}

			/**
			 * Add command shortcut to UI element label
			 * @see #MT-10605
			 */
			var keystrokes = {};
			editor.on( 'uiSpace', function( ev ) {
				if ( ev.data.space != editor.config.toolbarLocation ) {
					return;
				}

				var i, name, item, command, keystroke,
					items = editor.ui.items;

				for (keystroke in editor.keystrokeHandler.keystrokes) {
					keystrokes[editor.keystrokeHandler.keystrokes[keystroke]] = keystroke;
				}

				keystrokes['indent'] = 9;
				keystrokes['outdent'] = CKEDITOR.SHIFT + 9;
				keystrokes['copy'] = CKEDITOR.CTRL + 67;
				keystrokes['cut'] = CKEDITOR.CTRL + 88;
				keystrokes['paste'] = CKEDITOR.CTRL + 86;

				// go through ui items
				for (name in items) {
					if (!items.hasOwnProperty(name)) {
						continue;
					}

					item = items[name];
					command = item.command;

					if (command && item.type == CKEDITOR.UI_BUTTON && command in keystrokes) {
						keystroke = representKeyStroke(keystrokes[command]);

						var def = item.args[0],
							title = def.title || def.label || '';

						title += ' (' + keystroke + ')';
						item.args[0].title = title;
					}
				}
			}, null, null, 1);

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

						if (command && command in keystrokes) {
							keystroke = representKeyStroke(keystrokes[command]);

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
						}
					}
				}
			});
		}
	});
})();
