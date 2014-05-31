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
 * @file Use ZeroClipboard to copy/paste via flash.
 */

(function() {
	var zClipboardData;

	function getStates(editor) {
		var state = CKEDITOR.TRISTATE_OFF,
			sel = editor.getSelection()
			ranges = sel && sel.getRanges(),
			range = ranges && ranges[0];

		if (range && range.collapsed) {
			state = CKEDITOR.TRISTATE_DISABLED;
		}

		return {
			'copy': state,
			'cut': range && range.checkReadOnly() ? CKEDITOR.TRISTATE_DISABLED : state
		};
	}

	function setToolbarStates(editor) {
		if (editor.mode != 'wysiwyg') {
			return;
		}

		var states = getStates(editor);

		editor.getCommand('copy').setState(states.copy);
		editor.getCommand('cut').setState(states.cut);
	}

	function getSelectedHtml(editor, removeContents) {
		var sel = editor.getSelection(),
			ranges = (sel && sel.getRanges()) || [],
			html = '',
			i, range;

		for (i = 0; i < ranges.length; i++) {
			range = ranges[i];

			if (range.collapsed) {
				continue;
			}

			range.enlarge( CKEDITOR.ENLARGE_ELEMENT );

			var div = editor.document.createElement('div'),
				// create bookmark since cloneContents may lost selection
				bookmark = range.createBookmark();

			// get the selected contents and copy it to the temporary node
			range.cloneContents().appendTo(div);

			range.moveToBookmark(bookmark);

			// get the copied html
			html += div.getHtml();

			// remove contents on cut operations
			if ( removeContents && !range.checkReadOnly() ) {
				var boundaryNodes = range.getBoundaryNodes(),
					startPath = new CKEDITOR.dom.elementPath( boundaryNodes.startNode ),
					endPath = new CKEDITOR.dom.elementPath( boundaryNodes.endNode ),
					startBlock = startPath.block || startPath.blockLimit,
					endBlock = endPath.block || endPath.blockLimit,
					previousNode = startBlock && startBlock.getPrevious(),
					nextNode = endBlock && endBlock.getNext();

				range.deleteContents();

				var editable = editor.editable(),
					startBlockExists = startBlock && editable.contains( startBlock ),
					endBlockExists = endBlock && editable.contains( endBlock );

				// if selected two and more different block nodes
				// we need to merge the end node into the start node
				// note: we can't use mergeThen param of deleteContents
				// since it doesn't work with different block nodes
				// (i.e. header and paragraph)
				if ( startBlock && !startBlock.equals( endBlock ) ) {
					// merge end block content into the start block
					// except the case when end block is in the table
					if ( startBlockExists && endBlockExists && !endPath.contains( CKEDITOR.dtd.$tableContent ) ) {
						var span = CKEDITOR.dom.element.createFromHtml( '<span ' +
							'data-cke-bookmark="1" style="display:none">&nbsp;</span>', range.document );

						range.moveToElementEditEnd( startBlock );
						range.insertNode( span );

						// the end block should be removed after merging
						var removeEndBlock = true;

						// special case for pre block:
						// if it still has content after deleting
						// we need to merge just the first line of pre block
						if ( endBlock.is( 'pre' ) ) {
							var node = endBlock;
							while ( node && !node.is( 'br' ) ) {
								node = node.getNextSourceNode( false, CKEDITOR.NODE_ELEMENT, endBlock );
							}

							if ( node ) {
								range.setStartAt( endBlock, CKEDITOR.POSITION_AFTER_START );
								range.setEndAt( node, CKEDITOR.POSITION_BEFORE_START );
								range.select();

								range.extractContents().appendTo( startBlock );

								node.remove();

								if ( endBlock.getChildCount() > 0 ) {
									// don't remove pre block
									removeEndBlock = false;
								}
							}
						}

						if ( removeEndBlock ) {
							endBlock.moveChildren( startBlock );
							endBlock.remove();
						}

						range.moveToBookmark( { startNode: span } );
					} else if ( startBlockExists ) {
						range.moveToElementEditEnd( startBlock );
					} else if ( endBlockExists ) {
						range.moveToElementEditStart( endBlock );
					} else if ( previousNode && editable.contains( previousNode ) ) {
						range.moveToElementEditEnd( previousNode );
					} else if ( nextNode && editable.contains( nextNode ) ) {
						range.moveToElementEditStart( nextNode );
					} else {
						range.moveToElementEditStart( editable );
					}

					range.collapse( 1 );
				}
			}

			range.select();
		}

		return html;
	}

	function tryToCutCopy(editor, type) {
		try {
			return editor.document.$.execCommand(type, false, null);
		} catch (ex) {
			return false;
		}
	}

	function createClipboard(editor, element, name) {
		var clipboard = new ZeroClipboard.Client();
		clipboard.setHandCursor(false);

		clipboard.addEventListener('load', function(client) {
			var div = new CKEDITOR.dom.element(client.div),
				isSafari = navigator.vendor.indexOf('Apple') != -1;

			// don't set opacity for Safari. see EDT-373
			!isSafari && div.setOpacity(0);

			client.movie.setAttribute('title', element.getAttribute('title'));

			setToolbarStates(editor);
		});

		clipboard.addEventListener('complete', function(client, args) {
			zClipboardData = args.text;

			if (editor.getCommand(name).state != CKEDITOR.TRISTATE_DISABLED && !editor.readOnly) {
				editor.getCommand('paste').enable();
			}

			editor.focus();
		});

		clipboard.addEventListener('mouseDown', function(client) {
			if (editor.getCommand(name).state != CKEDITOR.TRISTATE_DISABLED) {
				var cancel = (editor.fire('zcBefore' + CKEDITOR.tools.capitalize(name), {zcClient: client}) === false);
				if (!cancel) {
					var isCut = (name == 'cut');
					isCut && editor.fire('saveSnapshot');

					var html = getSelectedHtml(editor, isCut);
					client.setText(html);

					isCut && editor.fire('saveSnapshot');
				}
			}
		});

		clipboard.glue(element.$, CKEDITOR.document.getBody().$, {
			zIndex: Math.floor(editor.config.baseFloatZIndex + 2)
		});

		return clipboard;
	}

	function initZeroClipboard() {
		var editor = this.editor,
			doc = CKEDITOR.document,
			toolbarClipboards = {},
			contextMenuClipboards = {};

		// check if copy/cut commands are enabled in browser
		var copyEnabled = tryToCutCopy(editor, 'copy'),
			cutEnabled = tryToCutCopy(editor, 'cut');

		if (copyEnabled && cutEnabled) {
			return;
		}

		ZeroClipboard.setMoviePath(this.plugin.path + 'ZeroClipboard10.swf');

		ZeroClipboard.getDOMObjectPosition = function(obj) {
			var element = new CKEDITOR.dom.element(obj),
				pos = element.getDocumentPosition(CKEDITOR.document);

			var info = {
				left: pos.x,
				top: pos.y,
				width: obj.width ? obj.width : obj.offsetWidth,
				height: obj.height ? obj.height : obj.offsetHeight
			};

			return info;
		};

		var extendCommand = function(name) {
			if (!toolbarClipboards[name]) {
				var command = editor.getCommand(name),
					button = command.uiItems[0];

				if (!button) {
					return;
				}

				button = doc.getById(button._.id);
				toolbarClipboards[name] = createClipboard(editor, button, name);
			} else {
				setToolbarStates(editor);
			}
		};

		// reposition flash elements on scroll/resize/etc.
		var reposition = function() {
			var editor = this,
				shared = editor.sharedSpaces && editor.sharedSpaces.top && editor.sharedSpaces.top.getParent().getParent().getParent().getParent(),
				name, clipboard;

			for (name in toolbarClipboards) {
				clipboard = toolbarClipboards[name];
				clipboard.reposition();

				if (shared) {
					if (shared.getComputedStyle('position') == 'fixed') {
						clipboard.div.style['position'] = 'fixed';

						var top = parseInt(clipboard.div.style['top'], 10),
							scroll = CKEDITOR.document.getWindow().getScrollPosition();
						top -= scroll.y;
						clipboard.div.style['top'] = top + 'px';
					} else {
						clipboard.div.style['position'] = 'absolute';
					}
				}
			}
		};

		var win = doc.getWindow();
		win.on('resize', reposition, editor);
		(editor.config.floating_toolbar !== false) && win.on('scroll', reposition, editor);

		editor.on('afterCommandExec', function(evt) {
			if (evt.data.name == 'toolbarCollapse') {
				reposition.call(editor);
			}
		});

		editor.on('destroy', function() {
			win.removeListener('resize', reposition);
			win.removeListener('scroll', reposition);

			for (var name in toolbarClipboards) {
				toolbarClipboards[name].destroy();
			}

			for (var name in contextMenuClipboards) {
				contextMenuClipboards[name].destroy();
			}
		});

		editor.on('pasteState', function(evt) {
			!copyEnabled && extendCommand('copy');
			!cutEnabled && extendCommand('cut');
		});

		editor.on('contentDom', function() {
			var editable = editor.editable();
			editable.attachListener( editable.isInline() ? editable : editor.document, 'mouseup', function() {
				setToolbarStates(editor);
			});
		});

		// enable ZeroClipboard for context menu items
		if (editor.contextMenu) {
			// set the new states for context menu items
			editor.contextMenu.addListener(function(element, selection) {
				var states = getStates(editor),
					contextMenu = editor.contextMenu,
					i, item;

				for (i = 0; i < contextMenu.items.length; i++) {
					item = contextMenu.items[i];
					switch (item.name) {
						case 'cut':
							if (!cutEnabled) {
								item.state = states.cut;
							}
							break;
						case 'copy':
							if (!copyEnabled) {
								item.state = states.copy;
							}
							break;
					}
				}

				return null;
			});

			CKEDITOR.ui.on('ready', function(ev) {
				var menu = ev.data,
					i;

				if (!(menu instanceof CKEDITOR.plugins.contextMenu)) {
					return;
				}

				var onHide = function() {
					setTimeout(function() {
						for (var i in contextMenuClipboards) {
							contextMenuClipboards[i].hide();
						}
					}, 100);
				};

				if (menu.onHide) {
					menu.onHide = CKEDITOR.tools.override(menu.onHide, function(originalOnHide) {
						return function() {
							onHide.call(this);
							originalOnHide.call(this);
						}
					});
				} else {
					menu.onHide = onHide;
				}

				var attachZeroClipboard = function(panel) {
					// wait until the menu will not be visible
					if (panel.element.getStyle('opacity') == '0') {
						setTimeout(function() {
							attachZeroClipboard(panel);
						}, 0);
						return;
					}

					var menuItems = panel.getHolderElement().getElementsByTag('a'),
						count = menuItems.count(),
						i, item;

					var attach = function(menuItem, name) {
						if (!contextMenuClipboards[name]) {
							contextMenuClipboards[name] = createClipboard(editor, menuItem, name);
							// use this trick to reset hover state of menu item
							// when cursor is over the flash element
							// @see EDT-617
							panel.element.on('mouseleave', function() {
								panel.getHolderElement().addClass('zcResetHover');
							});
							panel.element.on('mouseenter', function() {
								panel.getHolderElement().removeClass('zcResetHover');
							});
						} else {
							contextMenuClipboards[name].reposition(menuItem.$);
						}
					};

					for (i = 0; i < count; i++) {
						item = menuItems.getItem(i);

						if (item.hasClass('cke_menubutton__copy') && !copyEnabled) {
							attach(item, 'copy');
						} else if (item.hasClass('cke_menubutton__cut') && !cutEnabled) {
							attach(item, 'cut');
						}
					}
				};

				var onMenuShow = function(ev) {
					ev.removeListener();
					setTimeout(function() {
						attachZeroClipboard(ev.data[0]._.panel);
					}, 0);
				};

				for (i = 0; i < menu.items.length; i++) {
					if (menu.items[i].name in {cut: 1, copy: 1}) {
						editor.on('menuShow', onMenuShow);
						break;
					}
				}
			});
		}
	}

	CKEDITOR.plugins.add('mindtouch/zeroclipboard', {
		requires: 'clipboard',
		init: function(editor) {
			if (CKEDITOR.env.ie) {
				// IE supports clipboard copy/cut commands
				// so we don't need to enable ZeroClipboard for IE
				return;
			}

			var scope = {editor: editor, plugin: this};

			// load ZeroClipboard core
			if (typeof ZeroClipboard == 'undefined') {
				CKEDITOR.scriptLoader.load(CKEDITOR.getUrl(this.path + 'ZeroClipboard.min.js'), initZeroClipboard, scope);
			} else {
				initZeroClipboard.call(scope);
			}
		}
	});
})();
