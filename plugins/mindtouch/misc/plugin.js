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

		var top = this.ui.space('top');
		if (top.getParent().getParent().getParent().getCustomData( 'cke_hasshared' )) {
			var toolbar = top.getParent().getParent().getParent(),
				toolbarHeight = toolbar.$.offsetHeight;
			dimensions.height += toolbarHeight;

			pos.y = -1 * toolbarHeight;
		} else {
			toolbarHeight = top.$.offsetHeight;
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
			'background': 'transparent url(data:image/gif;base64,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) scroll no-repeat 0 0',
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
	if ( this._.mask ) {
		this._.mask.remove();
		this._.mask = null;
	}

	this.fire( 'unlock' );
};

(function() {
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

	CKEDITOR.plugins.add('mindtouch/misc', {
		init: function(editor) {
			editor.setKeystroke(CKEDITOR.ALT + 13 /*ENTER*/ , 'source');

			/**
			 * Webkit specific fixes
			 */
			if (false && CKEDITOR.env.webkit) {
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

							// webkit won't add any styles
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
			 * Find/Replace dialog: Find by enter key
			 *
			 * @see #0007517
			 */
			CKEDITOR.on( 'dialogDefinition', function( evt ) {
				if ( evt.data.name == 'find' || evt.data.name == 'replace' ) {
					var def = evt.data.definition;
					def.contents[ 0 ].elements[ 0 ].children[ 0 ].setup = function() {
						var inputElement = this;
						this.getInputElement().on( 'keydown', function( evt ) {
							if ( evt.data.getKeystroke() == 13 ) {
								inputElement.getDialog().getContentElement( 'find', 'btnFind' ).click();
								evt.data.preventDefault( 1 );
							}
						}, null, null, 1 );
					};

					def.onShow = CKEDITOR.tools.override( def.onShow, function( original ) {
						return function() {
							original.call( this );
							this.setupContent();
						}
					});
				}
			});

			/**
			 * Remove format: also clean up document structure
			 * @see #MT-10753
			 */
			editor.on( 'removeFormatCleanup', function( evt ) {
				var formatElements = { address: 1, h1: 1, h2: 1, h3: 1, h4: 1, h5: 1, h6: 1, pre: 1, blockquote: 1 },
					node = evt.data,
					nodeName = node.getName(),
					dtd = CKEDITOR.dtd;

				if ( nodeName in formatElements || nodeName in dtd.$listItem ) {
					node.renameNode( ( editor.config.enterMode == CKEDITOR.ENTER_P ) ? 'p' : 'div' );
				} else if ( nodeName in dtd.$list ) {
					node.remove( 1 );
				}
			});

			editor.on( 'destroy', function() {
				editor.unlock();
			});

			// @see EDT-134
			editor.on( 'mode', function() {
				editor.focus();
			});
		}
	});
})();
