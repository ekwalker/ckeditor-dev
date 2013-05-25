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
 * @file This plugin contains copy/paste related fixes.
 */

(function() {
	CKEDITOR.plugins.add('mindtouch/clipboard', {
		init: function(editor) {
			/**
			 * Force pasting mode in pre blocks
			 *
			 * @see #0007029
			 * @see #MT-9352
			 */
			if (!editor.config.forcePasteAsPlainText) {
				var getPasteMode = function(mode, evt) {
					var sel = editor.getSelection(),
						pre = sel && sel.getStartElement().getAscendant('pre', true);

					if (pre && (CKEDITOR.env.webkit || /(^|\s+)script(\s+|-|$)/.test(pre.getAttribute('class')))) {
						mode = 'text';
					} else if (evt && evt.data && evt.data.$.clipboardData) {
						// detect if clipboard contains only plain text
						// if so -- force paste as plain text
						// @see EDT-400
						var clipboardData = evt.data.$.clipboardData;

						if (clipboardData.types && CKEDITOR.tools.isArray(clipboardData.types) && clipboardData.types.length) {
							var newMode = 'text';

							for (var i = 0; i < clipboardData.types.length; i++) {
								if (clipboardData.types[i].toLowerCase() != 'text/plain') {
									newMode = 'html';
									break;
								}
							}

							if (newMode == 'text') {
								mode = newMode;
							}
						}
					}

					return mode;
				};

				// Intercept the default pasting process.
				editor.on('beforeCommandExec', function(evt) {
					if (evt.data.name == 'paste') {
						var mode = getPasteMode(evt.data.commandData);
						// Do NOT overwrite if HTML format is explicitly requested.
						if (mode == 'text') {
							editor.execCommand('pastetext');
							evt.cancel();
						}
					}
				}, null, null, 0);

				editor.on('beforePaste', function(evt) {
					evt.data.mode = getPasteMode(evt.data.mode, evt.data.event);
				});
			}

			/**
			 * sometimes Webkit and Opera loses <table> element
			 * @see 0008930
			 */
			if (CKEDITOR.env.webkit || CKEDITOR.env.opera) {
				editor.on('paste', function(evt) {
					if (evt.data.type != 'html') {
						return;
					}

					var fragment = CKEDITOR.htmlParser.fragment.fromHtml(evt.data.dataValue),
						newFragment = new CKEDITOR.htmlParser.fragment(),
						tableElement = new CKEDITOR.htmlParser.element('table'),
						tableFix = false,
						dtd = CKEDITOR.dtd,
						i;

					for (i = 0; i < fragment.children.length; i++) {
						var child = fragment.children[i];
						if (dtd.$tableContent[child.name]) {
							tableElement.add(child);
							tableFix = true;
						} else {
							if (tableElement.children.length) {
								newFragment.add(tableElement);
								tableElement = new CKEDITOR.htmlParser.element('table');
							}

							newFragment.add(child);
						}
					}

					if (tableElement.children.length) {
						newFragment.add(tableElement);
					}

					if (tableFix) {
						var writer = new CKEDITOR.htmlParser.basicWriter();

						newFragment.writeHtml(writer);
						evt.data.dataValue = writer.getHtml(true);
					}
				});
			}

			/**
			 * Webkit specific fixes
			 */
			if (CKEDITOR.env.webkit) {
				var clipboard = '';

				// save the selected text so we can check it on pasting
				// and compare with pasting content
				var saveSelectedText = function() {
					var sel = editor.getSelection();
					clipboard = sel ? sel.getSelectedText().replace(/\s+/g, '') : '';
				};

				editor.on('key', function(evt) {
					switch (evt.data.keyCode) {
						case CKEDITOR.CTRL + 67:
						case CKEDITOR.CTRL + 88:
							saveSelectedText();
							break;
					}
				});

				editor.on('beforeCommandExec', function(evt) {
					if (evt.data.name in {'copy': 1, 'cut': 1}) {
						saveSelectedText();
					}
				});

				editor.on('zcBeforeCopy', saveSelectedText, null, null, 100);
				editor.on('zcBeforeCut', saveSelectedText, null, null, 100);

				/*
				 * Webkit adds a lot of styles on copying,
				 * so if content was copied not from editor, remove styles
				 * @see #0008224
				 * @see #0007885
				 * @see EDT-247
				 */
				editor.on('paste', function(evt) {
					if (evt.data.type != 'html') {
						return;
					}

					var div = new CKEDITOR.dom.element('div', editor.document),
						dataModified = false;

					div.setHtml(evt.data.dataValue);

					// Webkit adds white background color to pre blocks on copying
					var preElements = div.getElementsByTag('pre'),
						count = preElements.count(),
						i, pre;

					for (i = 0; i < count; i++) {
						pre = preElements.getItem(i);
						if (pre.getStyle('background-color') == 'rgb(255, 255, 255)') {
							pre.removeStyle('background-color');
							dataModified = true;
						}
					}

					// check if the content was copied out of the editor
					// and if so remove any style attributes
					if (div.getText().replace(/\s+/g, '') !== clipboard) {
						var node = div;
						while (node = node.getNextSourceNode(false, CKEDITOR.NODE_ELEMENT)) {
							node.removeAttribute('style');
						}

						dataModified = true;
					}

					if (dataModified) {
						evt.data.dataValue = div.getHtml();
					}
				});

				var insertHtmlNodeName;

				editor.on('insertHtml', function(evt) {
					var editor = evt.editor;

					if (!editor.mode == 'wysiwyg') {
						return;
					}

					var data = evt.dataValue;

					if (editor.dataProcessor) {
						data = editor.dataProcessor.toHtml(data);
					}

					var div = new CKEDITOR.dom.element('div', editor.document);
					div.setHtml(data);

					var first = div.getFirst();

					// webkit sometimes wraps copied content with div, remove it
					// @see #MT-10604
					if (div.getChildren().count() == 1 && first && first.is && first.is('div')) {
						first.remove(true);
						evt.data = div.getHtml();
					}

					var selection = editor.getSelection(),
						range = selection && selection.getRanges(true)[0],
						startContainer = range && range.collapsed && range.startContainer;

					// if we are pasting block content into the empty block
					// we can get the following structure
					// <p><div><p>pasted text</p></div></p>
					// so if current container is empty mark it for remove
					if (startContainer && startContainer.is && startContainer.is('p', 'div')) {
						var emptyNode = range.startContainer.getFirst();

						if (!emptyNode || (!emptyNode.getNext() && ((emptyNode.is && emptyNode.is('br')) || (emptyNode.type == CKEDITOR.NODE_TEXT && emptyNode.getText().length == 0)))) {
							range.startContainer.data('cke-remove', 1);
						}
					}
				});

				editor.on('insertHtml', function() {
					var elementList = editor.document.$.querySelectorAll('[data-cke-remove]');
					for (var i = 0; i < elementList.length; i++) {
						var node = CKEDITOR.dom.element.get(elementList.item(i));
						node.remove(true);
					}
				}, null, null, 1000);

				/**
				 * @see #0007663: Pasting text into editor inserts divs
				 * fix for pasting issue in webkit
				 */
				/**
				 * remove the last <br> following after the line break (for source mode)
				 * add the <br> element after the last line break in pre (for wysiwyg mode)
				 * @see EDT-404
				 */
				var dataFilter = editor.dataProcessor && editor.dataProcessor.dataFilter,
					htmlFilter = editor.dataProcessor && editor.dataProcessor.htmlFilter;

				var dataFilterRule = {
					elements: {
						meta: function(element) {
							delete element.name;
						},

						span: function(element) {
							if (element.attributes['class'] == 'Apple-style-span') delete element.name;
						},
						pre: function(element) {
							var lastChild = element.children.length && element.children[element.children.length - 1];
							if (!lastChild || (lastChild.type == CKEDITOR.NODE_TEXT && /\n$/g.test(lastChild.value))) {
								// append the bogus <br> to the empty <pre> block
								// or if <pre> block has the trailing line break 
								var br = new CKEDITOR.htmlParser.element('br');
								element.children.push(br);
							}
						}
					}
				};

				var htmlFilterRule = {
					elements: {
						pre: function(element) {
							if (element.children.length) {
								var lastChild = element.children[element.children.length - 1];
								if (lastChild.value && lastChild.value == "\n") {
									// this line break caused by bogus <br>, remove it
									element.children.pop();
								}
							}
						}
					}
				};

				dataFilter && dataFilter.addRules(dataFilterRule);
				htmlFilter && htmlFilter.addRules(htmlFilterRule);
			}

			/**
			 * Firefox specific fixes
			 */
			if (CKEDITOR.env.gecko) {
				editor.on('contentDom', function() {
					/**
					 * Sometimes FF pastes the content after <br> at the end of the line
					 * We replace <br> to \n before pasting and return it back after
					 *
					 * @see #0008541
					 */
					editor.editable().on('beforepaste', function() {
						var sel = editor.getSelection(),
							ranges = sel && sel.getRanges(true),
							range = ranges && ranges[0];

						var isPre = sel && sel.getStartElement().getAscendant('pre', true);

						if (range && range.collapsed && isPre) {
							var node = range.endContainer;
							var br, lb;

							if (node.is && node.is('pre')) {
								br = node.getChildren().getItem(range.endOffset);
							} else if (node && node.type == CKEDITOR.NODE_TEXT) {
								br = node.getNext();
							}

							if (br && br.is && br.is('br')) {
								lb = editor.document.createText("\n");
								lb.replace(br);

								window.setTimeout(function() {
									br.replace(lb);
								}, 0);
							}
						}
					});
				});


				// if list element contains only ul/ol element
				// move the last one to the previous list element
				// @see EDT-20
				var fixNestedList = function() {
					var sel = editor.getSelection(),
						startElement = sel && sel.getStartElement(),
						li = startElement && startElement.getAscendant('li', true);

					if (li) {
						var nextLi = li.getNext(),
							first = nextLi && nextLi.getFirst();
						if (first && first.is && first.is('ul', 'ol')) {
							first.move(li);
							nextLi.remove();
						}
					}
				};

				editor.on('insertHtml', fixNestedList, null, null, 100);
			}

			editor.on('insertText', function(ev) {
				function repeat(pattern, count) {
					if (count < 1) return '';

					var result = '';
					while (count > 0) {
						if (count & 1) result += pattern;

						count >>= 1, pattern += pattern;
					}

					return result;
				}

				var sel = editor.getSelection(),
					pre = sel && sel.getStartElement().getAscendant('pre', true),
					tab = pre ? repeat(' ', 4) : repeat('\u00A0', 4);

				ev.data = ev.data.replace(/\t/g, tab);
			});

			if (CKEDITOR.env.ie) {
				// sometimes queryCommandEnabled('Copy') == true in IE
				// even if range is collapsed
				// @see EDT-320
				editor.on('pasteState', function() {
					var sel = editor.getSelection(),
						ranges = sel && sel.getRanges(),
						range = ranges && ranges[0];

					if (range && range.collapsed) {
						try {
							if (editor.document.$.queryCommandEnabled('copy')) {
								editor.getCommand('copy').disable();
							}
						} catch (ex) {}
					}
				});
			}
		}
	});
})();
