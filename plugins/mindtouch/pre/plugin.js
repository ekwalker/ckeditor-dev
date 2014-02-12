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
 * @file Display line/col of cursor position inside pre blocks.
 */

(function() {
	function calculateCursorPosition(editor) {
		var sel = editor.getSelection(),
			firstElement = sel && sel.getStartElement(),
			path = firstElement && new CKEDITOR.dom.elementPath(firstElement),
			infobar = editor.ui.infobar;

		if (!path || !path.block || !path.block.is('pre')) {
			infobar.hideGroup('dekiscript');
			return;
		}

		var range = sel.getRanges()[0],
			node = range && range.startContainer,
			stat = {lines: 1, chars: 0};

		var processNode = function(node) {
			var text;

			if (node.type == CKEDITOR.NODE_TEXT) {
				text = node.getText();

				// Gecko returns text node within of the one line
				if (!CKEDITOR.env.gecko) {
					var splitChar;
					var re;

					if (CKEDITOR.env.ie) {
						splitChar = "\r";
						re = /(^\r)|(\r$)/;
					}

					if (CKEDITOR.env.webkit) {
						splitChar = "\n";
						re = /(^\n)|(\n$)/;
					}

					if (CKEDITOR.env.opera) {
						splitChar = "\r\n";
						re = /(^\r\n)|(\r\n$)/;
					}

					var lines = text.split(splitChar);

					switch (lines.length) {
						// there are no line breaks
						case 1:
							if (stat.lines < 2) {
								stat.chars += text.length;
							}
							break;
						case 2:
							if (re.test(text)) {
								if (stat.lines < 2) {
									stat.chars += lines[lines.length - 1].length;
								}

								stat.lines++;
								break;
							}
							// break;
						default:
							if (stat.lines < 2) {
								stat.chars += lines[lines.length - 1].length;
							}
							stat.lines += lines.length - 1;
							break;
					}

					return;
				}

				if (stat.lines < 2) {
					stat.chars += text.length;
				}
			} else if (node.type == CKEDITOR.NODE_ELEMENT) {
				// FF
				if (node.is('br')) {
					stat.lines++;
				} else {
					if (stat.lines < 2) {
						stat.chars += node.getText().length;
					}
				}
			}
		};

		if (node && node.is && node.is('pre') && range.collapsed) {
			// If we try to set cursor at the end of the line with mouse (by clicking out of text)
			// IE sets range to the next line but cursor stays on the current line.
			// We unable to handle that case properly so just reselect range
			CKEDITOR.env.ie && CKEDITOR.env.version > 7 && range.select();

			var dummySpan = editor.document.createElement('span');
			dummySpan.setHtml('&#65279;');

			range.insertNode(dummySpan);
			node = dummySpan.getPreviousSourceNode(true, null, range.startContainer);

			node && processNode(node);

			dummySpan.remove();
		} else if (node && node.type == CKEDITOR.NODE_TEXT) {
			text = node.getText().substring(0, range.startOffset);

			if (CKEDITOR.env.webkit) {
				// remove the filling char
				text = text.replace(/\u200B/g, '');
			}

			var textNode = new CKEDITOR.dom.text(text);

			processNode(textNode);
		} else if (node) {
			processNode(node);
		}

		if (node) {
			while (node = node.getPreviousSourceNode(true, null, path.block)) // only one =
			{
				processNode(node);
			}
		}

		updateLabels(editor, stat.lines, stat.chars);
		infobar.showGroup('dekiscript');
	}

	function calculateCursorPositionTimeout(evt) {
		var editor = evt.editor || evt.listenerData;
		CKEDITOR.tools.setTimeout(calculateCursorPosition, 0, this, editor);
	}

	function updateLabels(editor, line, col) {
		var lang = editor.lang['mindtouch/pre'],
			infobar = editor.ui.infobar;

		infobar.updateLabel('dekiscript', 'line', lang.line + ':&nbsp;' + line + ',&nbsp;');
		infobar.updateLabel('dekiscript', 'col', lang.col + ':&nbsp;' + col);
	}

	var styles = {};
	function updateWidth(pre) {
		if (!pre || !pre.is || !pre.is( 'pre' )) {
			return;
		}

		// the fake pre element to calculate the width
		var editor = this,
			editable = editor.editable(),
			dummyPre = pre.clone(true);

		dummyPre.data('cke-temp', 1);
		dummyPre.setStyles({
			'position': 'absolute',
			'left': '-9999px',
			'overflow': 'auto',
			'width': 'auto'
		});
		dummyPre.data('cke-prewidth', false);
		editable.append(dummyPre);

		var id = pre.data('cke-prewidth');

		if (!id) {
			id = CKEDITOR.tools.getNextNumber();
			pre.data('cke-prewidth', id);
		}

		var doc = editor.document,
			style = styles[id],
			newWidth = dummyPre.$.scrollWidth,
			cssStyleText = '';

		if (editable.$.offsetWidth < newWidth) {
			cssStyleText = 'pre[data-cke-prewidth="' + id + '"] { width : ' + newWidth + 'px; }';
		}

		cssStyleText = new CKEDITOR.dom.text(cssStyleText, doc);

		if (!style) {
			style = new CKEDITOR.dom.element('style', doc);
			style.append(cssStyleText);
			doc.getHead().append(style);

			styles[id] = style;
		} else {
			cssStyleText.replace(style.getFirst());
		}

		dummyPre.remove();
	}

	CKEDITOR.plugins.add('mindtouch/pre', {
		requires: 'mindtouch/infobar',
		lang: 'en', // %REMOVE_LINE_CORE%
		init: function(editor) {
			editor.on('contentDom', function() {
				var editable = editor.editable();
				editable.on('mouseup', calculateCursorPositionTimeout, this, editor);
				editable.on('keyup', calculateCursorPositionTimeout, this, editor);
			});

			editor.on('mode', calculateCursorPositionTimeout);
			editor.on('selectionChange', calculateCursorPositionTimeout);

			editor.on('uiReady', function() {
				var infobar = editor.ui.infobar;
				infobar.addGroup('dekiscript');
				infobar.addLabel('dekiscript', 'line');
				infobar.addLabel('dekiscript', 'col');
			});

			if ( !CKEDITOR.env.ie ) {
				/**
				 * Recalculate width of pre blocks.
				 * @see EDT-264
				 */
				var updateAll = function() {
					var preElements = editor.document.getElementsByTag( 'pre' ),
						count = preElements.count(),
						pre, i;

					for ( i = 0; i < count; i++ ) {
						pre = preElements.getItem( i );
						updateWidth.call( editor, pre );
					}
				};

				var update = function() {
					var sel = editor.getSelection(),
						startElement = sel && sel.getStartElement();

					startElement = startElement && startElement.getAscendant( 'pre', true );

					if ( startElement ) {
						updateWidth.call( editor, startElement );
						editor.execCommand( 'autogrow' );
					}
				};

				editor.on( 'afterPaste', update );

				var undoCommand = editor.getCommand( 'undo' );
				if ( undoCommand ) {
					undoCommand.on( 'afterUndo', update );
					editor.getCommand( 'redo' ).on( 'afterRedo', update );
				}

				editor.on( 'contentDom', function() {
					updateAll();

					var callback = function() {
						CKEDITOR.tools.setTimeout( update, 0, editor );
					};

					var editable = editor.editable();
					editable.on( 'keydown', callback );
					editable.on( 'mouseup', callback );
				});

				// remove data-cke-prewidth attribute from the snapshot
				editor.on( 'getSnapshot', function( ev ) {
					if ( typeof ev.data == 'string' ) {
						ev.data = ev.data.replace( /\s+data-cke-prewidth=".*?"/g, '' );
					}
				}, null, null, 1000 );
			}
		},

		afterInit: function(editor) {
			var dataProcessor = editor.dataProcessor,
				dataFilter = dataProcessor && dataProcessor.dataFilter,
				htmlFilter = dataProcessor && dataProcessor.htmlFilter;

			if (dataFilter && (!CKEDITOR.env.ie || (CKEDITOR.env.ie && CKEDITOR.env.version > 7))) {
				dataFilter.addRules({
					elements: {
						'pre': function(pre) {
							// Replace \n to <br> inside pre elements
							var replaceLineBreaks = function(element) {
								if (!element.children) {
									return;
								}

								for (var i = 0; i < element.children.length; i++) {
									var child = element.children[i];

									if (child.type == CKEDITOR.NODE_TEXT) {
										child.value = child.value.replace(/\n|\r\n/g, '<br>');
										child.value = child.value.replace(/^<br>/, '').replace('/<br>$/', '');
									} else {
										replaceLineBreaks(child);
									}
								}
							};

							replaceLineBreaks(pre);
						}
					}
				});
			}

			if (htmlFilter && editor.config.allowedContent === true) {
				htmlFilter && htmlFilter.addRules({
					elements: {
						/**
						 * remove all node elements inside of special pre elements
						 * @see EDT-523
						 */
						pre: function(element) {
							// get an array of text nodes + br nodes of element
							var getText = function(element) {
								var text = [];

								for (var i = 0; i < element.children.length; i++) {
									var child = element.children[i];

									if (child.type == CKEDITOR.NODE_ELEMENT && child.name != 'br') {
										text = text.concat(getText(child));
									} else {
										text.push(child);
									}
								}

								return text;
							};

							if (element.attributes['class'] && /(^|\s+)script(-|\s+|$)/.test(element.attributes['class'])) {
								var text = getText(element);
								element.children.splice(0, element.children.length);
								for (var i = 0; i < text.length; i++) {
									element.add(text[i]);
								}
							}
						}
					}
				});
			}
		}
	});
})();
