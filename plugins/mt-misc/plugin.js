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
 * @file MindTouch plugin.
 */

CKEDITOR.editor.prototype.lock = function() {
	if (!this._.mask) {
		var container = this.container,
			mask = new CKEDITOR.dom.element('div', CKEDITOR.document),
			preloader = new CKEDITOR.dom.element('div', CKEDITOR.document),
			dimensions = {
				width: container.$.offsetWidth,
				height: container.$.offsetHeight
			},
			pos = {x: 0, y: 0},
			toolbarHeight;

		if (this.sharedSpaces && this.sharedSpaces.top) {
			var toolbar = this.sharedSpaces.top.getParent().getParent().getParent().getParent(),
				toolbarHeight = toolbar.$.offsetHeight;
			dimensions.height += toolbarHeight;

			pos.y = -1 * toolbarHeight;
		} else {
			toolbarHeight = this.ui.space('top').$.offsetHeight;
		}

		mask.setStyles({
			'position': 'absolute',
			'left': pos.x + 'px',
			'top': pos.y + 'px',
			'z-index': 99,
			'opacity': 0.5,
			'-ms-filter': 'alpha(opacity=50)',
			'filter': 'alpha(opacity=50)',
			'background-color': '#fff',
			'cursor': 'progress'
		});

		container.setStyle('position', 'relative');

		mask.setStyle('width', dimensions.width + 'px');
		mask.setStyle('height', dimensions.height + 'px');

		var scrollPos = CKEDITOR.document.getWindow().getScrollPosition(),
			containerPos = container.getDocumentPosition(),
			adjustment = 0;

		if (scrollPos.y + toolbarHeight > containerPos.y) {
			adjustment = scrollPos.y - containerPos.y + toolbarHeight;
		}

		preloader.setStyles({
			'position': 'absolute',
			'left': Math.round(dimensions.width / 2) - 33 + 'px',
			'top': toolbarHeight + adjustment + 20 + 'px',
			'width': '66px',
			'height': '66px',
			'z-index': 100,
			'background': 'transparent url(/skins/common/images/anim-large-circle.gif) scroll no-repeat 0 0',
			'cursor': 'progress'
		});

		mask.append(preloader);
		container.append(mask);

		this._.mask = mask;
	}

	this.fire('lock');

	this.focusManager.blur();

	return this._.mask;
};

CKEDITOR.editor.prototype.unlock = function() {
	if (this._.mask) {
		this._.mask.remove();
		this._.mask = null;
	}

	this.fire('unlock');
};

(function() {
	/**
	 * @see #0006241
	 * @see #0008541
	 */
	var checkCaret = function(evt) {
		var editor = this;

		if (evt.name == 'keypress') {
			var keyCode = evt.data.getKeystroke();
			// ignore if positioning key is not pressed.
			// left or up arrow keys need to be processed as well, since <a> links can be expanded in Gecko's editor
			// when the caret moved left or up from another block element below.
			if (keyCode < 33 || keyCode > 40) {
				return;
			}
		}

		var moveCursor = function() {
			var selection = editor.getSelection(),
				ranges = selection && selection.getRanges(true),
				range = ranges && ranges[0];

			if (!range || !range.collapsed) {
				return;
			}

			var node = range.endContainer;

			// only perform the patched behavior if we're at the end of a text node.
			if (node.type != CKEDITOR.NODE_TEXT) {
				return;
			}

			var length = node.getLength();

			if (length != range.endOffset) {
				return;
			}

			var lineBreakPos = node.getText().lastIndexOf('\n');
			if (length > 0 && lineBreakPos == (length - 1)) {
				range = new CKEDITOR.dom.range(editor.document);
				range.setStart(node, lineBreakPos);
				range.setEnd(node, lineBreakPos);

				selection.selectRanges([range]);
			}
		}

		setTimeout(moveCursor, 1);
	};

	/**
	 * Merge a <pre> block with a previous sibling if available.
	 *
	 * from style plug-in
	 */

	function mergePres(preBlock, previousBlock) {
		// Merge the previous <pre> block contents into the current <pre>
		// block.
		//
		// Another thing to be careful here is that currentBlock might contain
		// a '\n' at the beginning, and previousBlock might contain a '\n'
		// towards the end. These new lines are not normally displayed but they
		// become visible after merging.
		var mergedHtml = replace(previousBlock.getHtml(), /\n$/, '') + '\n' + replace(preBlock.getHtml(), /^\n/, '');

		previousBlock.setHtml(mergedHtml);
		preBlock.remove();
	}

	// Wrapper function of String::replace without considering of head/tail bookmarks nodes.

	function replace(str, regexp, replacement) {
		var headBookmark = '',
			tailBookmark = '';

		str = str.replace(/(^<span[^>]+data-cke-bookmark.*?\/span>)|(<span[^>]+data-cke-bookmark.*?\/span>$)/gi,

		function(str, m1, m2) {
			m1 && (headBookmark = m1);
			m2 && (tailBookmark = m2);
			return '';
		});
		return headBookmark + str.replace(regexp, replacement) + tailBookmark;
	}

	CKEDITOR.plugins.add('mt-misc', {
		init: function(editor) {
			editor.setKeystroke(CKEDITOR.ALT + 13 /*ENTER*/ , 'source');

			/**
			 * Webkit specific fixes
			 */
			if (CKEDITOR.env.webkit) {
				// @see MT-8868
				editor.on('contentDom', function() {
					var body = editor.document.getBody(),
						draggedElement;

					body.on('dragstart', function(evt) {
						draggedElement = evt.data.getTarget();

						if (draggedElement) {
							if (draggedElement.type == CKEDITOR.NODE_TEXT) {
								draggedElement = draggedElement.getParent();
							}

							// webkit won't to add any styles
							// if element has style attribute
							if (!draggedElement.hasAttribute('style')) {
								draggedElement.setAttribute('style', '');
							}

							// webkit splits pre block on dragging
							// so we add custom data attribute to find split block
							// @see MT-9985
							draggedElement.is('pre') && draggedElement.data('cke-draggedpre', true);
						}
					});

					body.on('dragend', function(evt) {
						var nodeList, count, i, node;

						if (draggedElement) {
							// remove empty style attributes which was added on dragstart event

							nodeList = editor.document.getElementsByTag(draggedElement.getName());
							count = nodeList.count();

							for (i = 0; i < count; i++) {
								node = nodeList.getItem(i);
								if (node && node.hasAttribute('style') && !node.getAttribute('style').length) {
									node.removeAttribute('style');
								}
							}

							// if pre block was split merge blocks back into one
							// @see MT-9985
							if (draggedElement.is('pre')) {
								nodeList = editor.document.getElementsByTag('pre');

								for (i = 0; i < nodeList.count(); i++) {
									node = nodeList.getItem(i);
									if (node && node.data('cke-draggedpre')) {
										var next = node.getNext();
										if (next && next.data && next.data('cke-draggedpre')) {
											var sel = editor.getSelection(),
												ranges = sel && sel.getRanges(),
												range = ranges && ranges[0],
												bookmark = range && range.createBookmark(true);

											mergePres(next, draggedElement);

											bookmark && range.moveToBookmark(bookmark);
											range && range.select();
											break;
										}
									}
								}
							}
						}

						// remove dummy span

						nodeList = editor.document.getElementsByTag('span');

						for (i = nodeList.count() - 1; i >= 0; i--) {
							node = nodeList.getItem(i);
							if (node && node.hasClass('Apple-style-span')) {
								node.remove(true);
							}
						}
					});

					editor.document.on('DOMNodeInserted', function(evt) {
						var target = evt.data.getTarget(),
							name = target.getName && target.getName(),
							styles = [];

						switch (name) {
							case 'font':
								if (target.hasAttribute('face')) {
									var face = target.getAttribute('face');
									styles.push(new CKEDITOR.style(editor.config.font_style, {'family': face}));
								}

								if (target.hasAttribute('size')) {
									var size = target.getAttribute('size'),
										fontSizes = [8, 10, 13, 16, 18, 24, 32, 48];

									size = fontSizes[size] ? fontSizes[size] + 'px' : 'medium';
									styles.push(new CKEDITOR.style(editor.config.fontSize_style, {
										'size': size
									}));
								}
								break;
							case 'b':
								styles.push(new CKEDITOR.style(editor.config.coreStyles_bold));
								break;
							case 'i':
								styles.push(new CKEDITOR.style(editor.config.coreStyles_italic));
								break;
							default:
								break;
						}

						if (styles.length) {
							setTimeout(function() {
								var sel = editor.getSelection(),
									ranges = sel && sel.getRanges(),
									range = ranges && ranges[0];

								if (range) {
									range.selectNodeContents(target);
									for (var i in styles) {
										styles[i].applyToRange(range);
									}
									range.collapse(true);
									range.select();
								}
							}, 0);
						}
					});
				});
			}

			/**
			 * Firefox specific fixes
			 */
			if (CKEDITOR.env.gecko) {
				editor.on('contentDom', function() {
					editor.editable().on('keypress', checkCaret, editor);
					editor.editable().on('click', checkCaret, editor);
				});

				/**
				 * Remove last <br>
				 * @see MT-10703
				 */
				editor.on('getData', function(evt) {
					var data = evt.data.dataValue;
					data = data.replace(/<br \/>$/, '');

					evt.data.dataValue = data;
				});
			}

			editor.on('uiReady', function() {
				var normalCommand = editor.getCommand('normal'),
					button = normalCommand && normalCommand.uiItems[0];

				if (button) {
					var buttonElement = CKEDITOR.document.getById(button._.id);

					buttonElement.removeAttribute(CKEDITOR.env.ie ? 'mouseup' : 'onclick');
					buttonElement.on(CKEDITOR.env.ie ? 'mouseup' : 'click', function(ev) {
						if (ev.data.$.shiftKey) {
							var sel = editor.getSelection(),
								element = sel && sel.getStartElement(),
								path = new CKEDITOR.dom.elementPath(element),
								block = path.blockLimit,
								dtd = CKEDITOR.dtd;

							if (block.is('body')) {
								block = path.block;
							} else if (dtd.$tableContent[block.getName()]) {
								block = path.block || path.blockLimit.getAscendant('table', true);
							}

							if (dtd.$listItem[block.getName()]) {
								for (var i = path.elements.length - 1; i >= 0; i--) {
									var pathElement = path.elements[i];
									if (dtd.$list[pathElement.getName()]) {
										block = pathElement;
										break;
									}
								}
							}

							var newElementName = editor.config.enterMode == CKEDITOR.ENTER_P ? 'p' : 'div',
								newElement = editor.document.createElement(newElementName);

							editor.fire('saveSnapshot');

							if (!CKEDITOR.env.ie) newElement.appendBogus();

							newElement.insertAfter(block);

							var range = new CKEDITOR.dom.range(editor.document);
							range.moveToElementEditStart(newElement);
							range.select();

							newElement.scrollIntoView();

							editor.fire('saveSnapshot');
						} else {
							editor.execCommand(button.command);
						}
					});
				}
			});

			/**
			 * Find/Replace dialog: Find by enter key
			 *
			 * @see #0007517
			 */
			CKEDITOR.on('dialogDefinition', function(evt) {
				if (evt.data.name == 'find' || evt.data.name == 'replace') {
					var def = evt.data.definition;
					def.contents[0].elements[0].children[0].setup = function() {
						var inputElement = this;
						this.getInputElement().on('keypress', function(evt) {
							if (evt.data.getKeystroke() == 13) {
								inputElement.getDialog().getContentElement('find', 'btnFind').click();
								evt.cancel();
							}
						});
					};

					def.onShow = CKEDITOR.tools.override(def.onShow, function(original) {
						return function() {
							original.call(this);
							this.setupContent();
						}
					});
				}
			});

			/**
			 * Remove format: also clean up document structure
			 * @see #MT-10753
			 */
			editor.on('removeFormatCleanup', function(evt) {
				var formatElements = {address: 1, h1: 1, h2: 1, h3: 1, h4: 1, h5: 1, h6: 1, pre: 1, blockquote: 1},
					node = evt.data,
					nodeName = node.getName(),
					dtd = CKEDITOR.dtd;

				if (nodeName in formatElements || nodeName in dtd.$listItem) {
					node.renameNode((editor.config.enterMode == CKEDITOR.ENTER_P) ? 'p' : 'div');
				} else if (nodeName in dtd.$list) {
					node.remove(1);
				}
			});

			editor.on('destroy', function() {
				editor.unlock();
			});

			// @see EDT-134
			editor.on('mode', function(evt) {
				editor.focus();
			});

			if (CKEDITOR.env.ie) {
				// @see EDT-349
				editor.on('loadSnapshot', function(ev) {
					var nbspRe = /<p>&nbsp;<\/p>/ig;
					ev.data = ev.data.replace(nbspRe, '<p></p>');
				}, null, null, 1);
			}
		}
	});
})();
