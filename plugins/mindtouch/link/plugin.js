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
 * @file Link plugin.
 */

(function() {
	var linkTpl = CKEDITOR.addTemplate('bubbleLink', '<a target="_blank" href="{href}">{link}</a>&nbsp;&ndash;&nbsp;' +
		'<a href="javascript:void(\'Edit Link\')" onclick="return CKEDITOR.tools.callFunction({fn}, \'mindtouch/link\')">{labelEdit}</a>&nbsp;|&nbsp;' +
		'<a href="javascript:void(\'Unlink\')" onclick="return CKEDITOR.tools.callFunction({fn}, \'unlink\')">{labelUnlink}</a>');

	var pluginName = 'mindtouch/link';

	var linkCmd = {
		allowedContent: 'a[!href,accesskey,charset,dir,id,lang,name,rel,tabindex,title,type,target,onclick]{*}(*)',
		requiredContent: 'a[href]',
		canUndo: false,
		exec: function(editor) {
			if (editor.config.mindtouch.pageId == 0) {
				CKEDITOR.plugins.mindtouchsave.confirmSave(editor, pluginName);
				return true;
			}

			this.editor = editor;

			var selection = editor.getSelection(),
				element = null,
				plugin = CKEDITOR.plugins.link;

			if ((element = plugin.getSelectedLink(editor)) && element.hasAttribute('href')) {
				selection.selectElement(element);
			} else {
				element = null;
			}

			var params = this._.parseLink.apply(this, [element]);

			var pageTitle = editor.config.mindtouch.pageTitle;
			if (pageTitle.utf8URL) {
				pageTitle = pageTitle.utf8URL();
			}

			var url = [
				editor.config.mindtouch.commonPath + '/popups/link_dialog.php',
				'?href=' + params.f_href,
				'&contextID=' + editor.config.mindtouch.pageId,
				'&cntxt=' + pageTitle,
				'&userName=' + editor.config.mindtouch.userName
			];

			CKEDITOR.plugins.mindtouchdialog.open(pluginName, {
				url: url.join(''),
				width: '600px',
				height: 'auto',
				params: params,
				callback: this._.insertLink,
				scope: this
			});

			return true;
		},

		_: {
			parseLink: function(element) {
				var editor = this.editor;

				var href = (element && (element.data('cke-saved-href') || element.getAttribute('href'))) || '',
					params = {
						'f_href': href,
						'f_text': (element) ? element.getText() : '',
						'contextTopic': editor.config.mindtouch.pageTitle,
						'contextTopicID': editor.config.mindtouch.pageId,
						'userName': editor.config.mindtouch.userName
					};

				if (!element) {
					var selection = editor.getSelection(),
						selectedText = selection && selection.getSelectedText();

					params.f_href = (mindtouchLink.isLinkInternal(selectedText)) ?
						'./' + encodeURIComponent(selectedText) : encodeURI(selectedText);

					params.f_text = selectedText;
					params.newlink = true;
				}

				if (params.f_href.indexOf(mindtouchLink.internalPrefix) == 0) {
					params.f_href = params.f_href.substr(mindtouchLink.internalPrefix.length);
				}

				this._.selectedElement = element;

				return params;
			},

			insertLink: function(params) {
				var attributes = {},
				editor = this.editor,
					text = (params.f_text.length) ? params.f_text : params.f_href;

				attributes['data-cke-saved-href'] = mindtouchLink.normalizeUri(params.f_href);
				attributes.href = attributes['data-cke-saved-href'];
				attributes.title = text;

				editor.fire('saveSnapshot');

				// bugfix #2643, let parser choose classes
				if (attributes.title.indexOf(mindtouchLink.internalPrefix) == 0) {
					attributes.title = attributes.title.substr(mindtouchLink.internalPrefix.length);

					if (this._.selectedElement) {
						this._.selectedElement.removeClass('external');
					}
				}

				var selection = editor.getSelection();

				if (!this._.selectedElement) {
					// Create element if current selection is collapsed.
					var range = selection && selection.getRanges(1)[0];

					if (range && range.collapsed) {
						var textNode = new CKEDITOR.dom.text(text, editor.document);
						range.insertNode(textNode);
						range.selectNodeContents(textNode);
					}

					// Apply style.
					var style = new CKEDITOR.style({element: 'a', attributes: attributes});
					style.type = CKEDITOR.STYLE_INLINE; // need to override... dunno why.
					style.applyToRange(range);
					range.select();
				} else {
					// We're only editing an existing link, so just overwrite the attributes.
					var element = this._.selectedElement;

					element.setAttributes(attributes);
					selection.selectElement(element);

					delete this._.selectedElement;
				}

				// workaround to get focus
				CKEDITOR.env.webkit && editor.document.focus();

				editor.fire('saveSnapshot');
			}
		}
	};

	var quickLinkCmd = CKEDITOR.tools.clone(linkCmd);
	quickLinkCmd.exec = function(editor) {
		if (editor.config.mindtouch.pageId == 0) {
			CKEDITOR.plugins.mindtouchsave.confirmSave(editor, 'quicklink');
			return true;
		}

		this.editor = editor;

		var params = this._.parseLink.apply(this, [null]);
		this._.insertLink.apply(this, [params]);
	};

	// @see EDT-204
	var bubble;
	function attachBubble(linkElement, editor) {
		if (!bubble) {
			var commandFn = CKEDITOR.tools.addFunction(function(command) {
				this.execCommand(command);
				return false;
			}, editor);

			bubble = new CKEDITOR.ui.elementBubble({
				name: 'link',
				onUpdate: function(data) {
					var link = this.getAttachedElement(),
						image = link.getFirst(),
						href = link.getAttribute('href'),
						text = href,
						title = link.getAttribute('title'),
						toolbarHtml = [];

					if (image && image.is && image.is('img')) {
						data.element = image;
					}

					if (href.indexOf(mindtouchLink.internalPrefix) == 0) {
						href = href.substr(mindtouchLink.internalPrefix.length);
						text = href;

						if (href.indexOf('.') != 0 && href.indexOf('/') != 0) {
							href = '/' + href;
						}
					}

					// truncate the long links
					// @see EDT-377
					text = mindtouchLink.truncate(text);

					var html = [],
						lang = editor.lang.link,
						params = {
							href: href,
							link: text,
							fn: commandFn,
							labelEdit: lang.menu,
							labelUnlink: lang.unlink
						};

					linkTpl.output(params, html);

					if (title && title != href) {
						if (title.length > 80) {
							title = title.substring(0, 80) + '...';
						}

						html.push('<div>' + editor.lang['mindtouch/link'].title + ':&nbsp;' + title + '</div>');
					}

					var element = this.getElement();
					element.setHtml(html.join(''));
					this.setElement(element);
				}
			}, CKEDITOR.document, editor);
		}

		bubble.attach(linkElement);
	}

	var mindtouchLink = {
		lang: 'en', // %REMOVE_LINE_CORE%
		icons: 'mindtouchlink', // %REMOVE_LINE_CORE%
		requires: 'link,mindtouch/dialog,mindtouch/elementbubble,mindtouch/save',
		init: function(editor) {
			editor.addCommand(pluginName, linkCmd);
			editor.addCommand('quicklink', quickLinkCmd);

			editor.setKeystroke(CKEDITOR.CTRL + 75 /*K*/, pluginName);
			editor.setKeystroke(CKEDITOR.CTRL + CKEDITOR.ALT + 75 /*K*/, 'quicklink');
			editor.setKeystroke(CKEDITOR.CTRL + CKEDITOR.SHIFT + 75 /*K*/, 'unlink');

			var lang = editor.lang.link;

			editor.ui.addButton('MindTouchLink', {
				label: lang.toolbar,
				command: pluginName,
				toolbar: 'links,10'
			});

			editor.on('doubleclick', function(evt) {
				var element = CKEDITOR.plugins.link.getSelectedLink(editor) || evt.data.element;
				if (!element.isReadOnly()) {
					if (element.is('a') && element.getAttribute('href')) {
						if (editor.execCommand(pluginName)) {
							evt.cancel();
						}
					}
				}
			}, this, null, 1);

			// removing style on unlink command works like general inline style
			// at the start/end of the link
			// so we need to process this case separately
			// @see EDT-647
			// @see EDT-708
			var unlinkCmd = editor.getCommand('unlink');
			unlinkCmd && unlinkCmd.on('exec', function(evt) {
				var selection = editor.getSelection(),
					range = selection && selection.getRanges()[0];
				if (range && range.collapsed) {
					var element = selection.getStartElement().getAscendant('a', true);
					if (element && element.getAttribute('href') && element.getChildCount() && (range.checkBoundaryOfElement(element, CKEDITOR.END) || range.checkBoundaryOfElement(element, CKEDITOR.START))) {
						var bookmark = range.createBookmark();
						element.remove(true);
						range.moveToBookmark(bookmark);
						range.select();
						evt.cancel();
					}
				}
			});

			if (editor.addMenuItems) {
				editor.addMenuItems({
					link: {
						label: lang.menu,
						command: pluginName,
						group: 'link',
						order: 1
					},

					createlink: {
						label: editor.lang['mindtouch/link'].create,
						command: pluginName,
						group: 'link',
						order: 1
					}
				});
			}

			if (editor.contextMenu) {
				editor.contextMenu.addListener(function(element, selection) {
					if (!element || element.isReadOnly()) {
						return null;
					}

					var sel = editor.getSelection(),
						ranges = sel && sel.getRanges(),
						range = ranges && ranges[0];

					if (!range || range.collapsed) {
						return null;
					}

					if (CKEDITOR.plugins.link.getSelectedLink(editor)) {
						return null;
					}

					return {
						createlink: CKEDITOR.TRISTATE_OFF
					};
				});
			}

			editor.on('selectionChange', function(evt) {
				var element = CKEDITOR.plugins.link.getSelectedLink(editor),
					videoCmd = editor.getCommand('mindtouch/video');

				if (element && element.is('a') && element.hasAttribute('href') && !element.isReadOnly()) {
					attachBubble(element, editor);
					// don't allow to insert video into the links (EDT-476)
					videoCmd && videoCmd.state != CKEDITOR.TRISTATE_DISABLED && videoCmd.disable();
				} else {
					bubble && bubble.isAttached() && bubble.detach();
					videoCmd && videoCmd.enable();
				}
			}, null, null, 1);
		},

		internalPrefix: 'mks://localhost/',
		externalRegex: /^([a-z]+:)[\/]{2,5}/i,
		emailRegex: /^(mailto:)?[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,

		isLinkExternal: function(href) {
			return (href.match(this.externalRegex) != null) && href.indexOf(this.internalPrefix) != 0;
		},

		isLinkInternal: function(href) {
			return (!(this.isLinkExternal(href) || this.isLinkNetwork(href) || this.isEmail(href)));
		},

		isLinkNetwork: function(href) {
			return (href.indexOf("\\") == 0) || (href.indexOf("//") == 0);
		},

		isEmail: function(email) {
			return this.emailRegex.test(email);
		},

		normalizeUri: function(uri) {
			if (this.isEmail(uri)) {
				if (uri.toLowerCase().indexOf('mailto:') != 0) {
					uri = 'mailto:' + uri;
				}

				return uri;
			}

			if (this.isLinkNetwork(uri)) {
				return 'file:///' + uri.replace(/\\/g, '/');
			}

			if (this.isLinkExternal(uri)) {
				return uri;
			}

			// internal link

			if (uri.length && uri.indexOf(this.internalPrefix) != 0 && uri.indexOf('/') != 0) {
				uri = this.internalPrefix + uri;
			}

			uri = uri.replace(/ /g, '_');

			return uri;
		},

		truncate: function(url) {
			var maxLength = 80;
			if (url.length > maxLength) {
				// collect all parts of url to the array
				var truncated = [],
					// trim the last slashes and store them
					trimmedLastSlash = '';

				// remove protocol
				if (/^([^:\/]+):\/\//.test(url)) {
					var pos = url.indexOf('://'),
						// the second slash will be added on joining
						scheme = url.substring(0, pos + 2);

					// start after the second slash
					url = url.substring(pos + 3);

					truncated.push(scheme);

					maxLength -= scheme.length + 1;
				}

				// trim slashes and leading dotes
				if (/^[\.\/]/.test(url)) {
					var pos = url.indexOf('/'),
						leadingChars = url.substring(0, pos);

					url = url.substring(pos + 1);
					truncated.push(leadingChars);
					maxLength -= leadingChars.length + 1;
				}

				// trailed slashes
				if (/\/$/.test(url)) {
					var trimmed = url.replace(/\/+$/, '');
					trimmedLastSlash = CKEDITOR.tools.repeat('/', url.length - trimmed.length);
					maxLength -= trimmedLastSlash.length;
					url = trimmed;
				}

				var origin = url.split('/'),
					count = origin.length,
					firstPart = origin[0];

				if (count < 3 || firstPart.length > maxLength) {
					// if there is only one or two parts
					// or the first part exceeds max length
					// just truncate url on the end
					truncated.push(url.substring(0, maxLength - 4) + '...');
					trimmedLastSlash = '';
				} else {
					var lastPart = origin[count - 1],
						partsCharsCount = {},
						totalLength = 0,
						len, i;

					truncated.push(firstPart);
					maxLength -= firstPart.length + 1;

					// calculate the length of each part and total length of all parts
					// (excluding the first one and the last one)
					for (i = 1; i < count - 1; i++) {
						len = origin[i].length;
						partsCharsCount[i] = len;
						totalLength += len;
					}

					// if the last part is large, omit other parts and truncate the last part
					if (lastPart.length > maxLength || lastPart.length > totalLength) {
						truncated.push('...');
						maxLength -= 4;

						if (lastPart.length > maxLength) {
							lastPart = lastPart.substring(0, maxLength - 3) + '...';
							trimmedLastSlash = '';
						}

						truncated.push(lastPart);
					} else {
						// get the indexes of part in descending order of their length
						var sortedParts = [],
							index;

						for (index in partsCharsCount) {
							sortedParts.push([index, partsCharsCount[index]]);
						}

						sortedParts.sort(function(a, b) {
							return b[1] - a[1]
						});

						// get the last index of part that should be included to the result
						var subTotalLength = totalLength + lastPart.length;

						for (i = sortedParts[0][0]; i < count - 1; i++) {
							if (subTotalLength + sortedParts.length - 1 < maxLength) {
								break;
							}

							subTotalLength -= origin[i].length;
						}

						var endIndex = i,
							startIndex = sortedParts[0][0] - 1;

						// get the first index of part after which other parts should be omitted
						for (i = startIndex; i >= 1; i--) {
							if (subTotalLength + sortedParts.length - 1 < maxLength) {
								break;
							}

							subTotalLength -= origin[i].length;
						}

						startIndex = i;

						// the first parts
						for (i = 1; i <= startIndex; i++) {
							truncated.push(origin[i]);
						}

						// replace truncated parts
						truncated.push('...');

						// the last parts
						for (i = endIndex; i < count - 1; i++) {
							truncated.push(origin[i]);
						}

						// truncate the last part if it is necessary
						if (subTotalLength > maxLength) {
							lastPart.substring(0, maxLength - subTotalLength - 3) + '...';
							trimmedLastSlash = '';
						}

						truncated.push(lastPart);
					}
				}

				// put all together and append last slashes
				url = truncated.join('/') + trimmedLastSlash;
			}

			return url;
		}
	};

	CKEDITOR.plugins.add(pluginName, mindtouchLink);
})();
