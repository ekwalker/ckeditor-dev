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
 * @file Transformations plugin.
 */

(function() {
	CKEDITOR.mindtouch = CKEDITOR.mindtouch || {};

	CKEDITOR.mindtouch.transformation = function(definition) {
		CKEDITOR.tools.extend(this, definition);
	};

	CKEDITOR.mindtouch.transformation.prototype = {
		apply: function(editor, selection) {
			var elementPath = new CKEDITOR.dom.elementPath(selection && selection.getStartElement());

			for (var i = 0, element; i < elementPath.elements.length; i++) {
				element = elementPath.elements[i];

				if (this.isApplicable(element)) {
					element.setAttribute('function', this['function']);
					element.data('cke-transform', this.name);

					this._fixWebkitSelection(editor, selection, element);
				}
			}
		},

		remove: function(editor, selection) {
			var elementPath = new CKEDITOR.dom.elementPath(selection && selection.getStartElement());

			for (var i = 0, element; i < elementPath.elements.length; i++) {
				element = elementPath.elements[i];

				if (this.isApplicable(element)) {
					element.removeAttribute('function');
					element.data('cke-transform', false);

					this._fixWebkitSelection(editor, selection, element);
				}
			}
		},

		isApplicable: function(element) {
			return (element.is && element.is('pre') && !element.isReadOnly());
		},

		isActive: function(selection) {
			var elementPath = new CKEDITOR.dom.elementPath(selection && selection.getStartElement());

			for (var i = 0, element; i < elementPath.elements.length; i++) {
				element = elementPath.elements[i];

				if (this.isApplicable(element) && element.getAttribute('function') == this['function']) {
					// make sure that element has data attribute
					if (!element.data('cke-transform')) {
						element.data('cke-transform', this.name);
					}
					return true;
				}
			}

			return false;
		},

		_fixWebkitSelection: function(editor, selection, element) {
			if (CKEDITOR.env.webkit && element.is('pre') && element.getHtml() == '\u200B') {
				CKEDITOR.tools.setTimeout(function(element) {
					var doc = element.getDocument(),
						selection = doc.getSelection(),
						bookmarks = selection.createBookmarks(1);

					if (bookmarks.length == 1 && bookmarks[0].collapsed) {
						var range = new CKEDITOR.dom.range(doc);
						range.setStartAt(element, CKEDITOR.POSITION_AFTER_START);
						range.collapse(1);

						selection.selectRanges([range]);
						doc.getById(bookmarks[0].startNode).remove();
					} else {
						selection.selectBookmarks(bookmarks);
					}

					this.editor.forceNextSelectionCheck();
					this.editor.selectionChange(1);
				}, 0, this, element);
			}
		}
	};

	/**
	 * transformations bubble
	 * @see EDT-378
	 */
	var bubble;
	function attachBubble(preElement, editor, transformations) {
		if (!bubble) {
			bubble = new CKEDITOR.ui.elementBubble({
				name: 'transformations',
				transformations: transformations,
				filter: function(element) {
					if (element.is('pre') && /(^|\s+)script(\s+|-|$)/.test(element.getAttribute('class'))) {
						return true;
					}

					return false;
				},
				onAttach: function() {
					var element = this.getAttachedElement();

					this.currentTransformName = element.data('cke-transform');

					if (!this.currentTransformName) {
						var selection = editor.getSelection();

						for (var name in this.transformations) {
							if (this.transformations[name].isActive(selection)) {
								this.currentTransformName = name;
								break;
							}
						}
					}
				},
				onUpdate: function() {
					var selection = this.editor.getSelection();
					selection && this.render(selection);
				},
				applyTransform: function(ev) {
					var selectedElement = ev.data.getTarget(),
						attachedElement = this.getAttachedElement(),
						editor = this.editor;

					ev.data.preventDefault(true);
					editor.focus();

					var selection = editor.getSelection();

					if (!selectedElement || !attachedElement || !selection) {
						return false;
					}

					if (selectedElement.is('select')) {
						selectedElement = CKEDITOR.dom.element.get(selectedElement.$[selectedElement.$.selectedIndex]);
					}

					var value = selectedElement.data('transform');

					if (!value) {
						return false;
					}

					var transform = this.transformations[value] || null,
						currentTransform = (this.currentTransformName && this.transformations[this.currentTransformName]) || null;

					editor.fire('saveSnapshot');

					currentTransform && currentTransform.remove(editor, selection);
					transform && transform.apply(editor, selection);

					this.currentTransformName = attachedElement.data('cke-transform');

					editor.fire('saveSnapshot');

					return false;
				},
				render: function(selection) {
					var lang = this.editor.lang['mindtouch/transformations'],
						element = this.getElement();

					var select = this.doc.createElement('select'),
						links = this.doc.createElement('span'),
						link, option, text, name, transform, func;

					select.setAttribute('name', 'cke_transformations_select');
					select.addClass('cke_transformations_select');

					// "More..." items
					text = lang.more;
					option = this.doc.createElement('option');
					option.setAttribute('value', '');
					option.setHtml(text);
					select.append(option);

					// Transformations select box
					for (name in this.transformations) {
						transform = this.transformations[name];

						if (transform.visible || transform.isActive(selection)) {
							// we will add the active transformation to the links later
							continue;
						}

						option = this.doc.createElement('option');
						option.setAttribute('value', name);
						option.data('transform', name);
						option.setHtml(transform.name);
						select.append(option);
					}

					select.on('change', this.applyTransform, this);

					// Links
					var addItem = function(name, text) {
						var itemName = 'a';

						if (name == this.currentTransformName || (name == 'none' && !this.currentTransformName)) {
							itemName = 'span';
						}

						var item = this.doc.createElement(itemName);
						item.addClass('cke_element_bubble_transform_item');
						item.addClass('cke_element_bubble_transform__' + name);
						item.data('transform', name);
						item.setHtml(text || name);

						if (itemName == 'a') {
							item.setAttribute('href', 'javascript:void("' + name + '")');
							item.on('click', this.applyTransform, this);
						}

						links.append(item);
					};

					addItem.call(this, 'none', lang.none);
					for (name in this.transformations) {
						transform = this.transformations[name];
						if (transform.visible) {
							addItem.call(this, name);
						}
					}

					// add the active transformation from more menu as link
					if (this.currentTransformName && !this.transformations[this.currentTransformName].visible) {
						transform = this.transformations[this.currentTransformName];
						transform && addItem.call(this, transform.name);
					}

					element.append(this.doc.createText(lang.syntax + '\u00A0'));
					element.append(links);
					element.append(select);
				}

			}, CKEDITOR.document, editor);
		}

		bubble.attach(preElement);
	}

	var transformations = [
		// functions to display as links
		{
			name: "css",
			func: "syntax.css",
			visible: true
		},
		{
			name: "html",
			func: "syntax.html",
			visible: true
		},
		{
			name: "javascript",
			func: "syntax.javascript",
			visible: true
		},
		{
			name: "java",
			func: "syntax.java",
			visible: true
		},
		{
			name: "php",
			func: "syntax.php",
			visible: true
		},
		{
			name: "sql",
			func: "syntax.sql",
			visible: true
		},
		{
			name: "xml",
			func: "syntax.xml",
			visible: true
		},

		// functions to display into More select box
		{
			name: "as3",
			func: "syntax.as3",
			visible: false
		},
		{
			name: "coldfusion",
			func: "syntax.coldfusion",
			visible: false
		},
		{
			name: "cpp",
			func: "syntax.cpp",
			visible: false
		},
		{
			name: "csharp",
			func: "syntax.csharp",
			visible: false
		},
		{
			name: "dekiscript",
			func: "syntax.dekiscript",
			visible: false
		},
		{
			name: "delphi",
			func: "syntax.delphi",
			visible: false
		},
		{
			name: "diff",
			func: "syntax.diff",
			visible: false
		},
		{
			name: "erlang",
			func: "syntax.erlang",
			visible: false
		},
		{
			name: "groovy",
			func: "syntax.groovy",
			visible: false
		},
		{
			name: "javafx",
			func: "syntax.javafx",
			visible: false
		},
		{
			name: "perl",
			func: "syntax.perl",
			visible: false
		},
		{
			name: "powershell",
			func: "syntax.powershell",
			visible: false
		},
		{
			name: "python",
			func: "syntax.python",
			visible: false
		},
		{
			name: "ruby",
			func: "syntax.ruby",
			visible: false
		},
		{
			name: "scala",
			func: "syntax.scala",
			visible: false
		},
		{
			name: "shell",
			func: "syntax.shell",
			visible: false
		},
		{
			name: "text",
			func: "syntax.text",
			visible: false
		},
		{
			name: "vb",
			func: "syntax.vb",
			visible: false
		}
	];


	CKEDITOR.plugins.add('mindtouch/transformations', {
		requires: 'mindtouch/elementbubble',
		lang: 'en',
		transformations : {},
		onLoad: function() {
			CKEDITOR.document.appendStyleText(
				'.cke_element_bubble__transformations .cke_element_bubble_transform_item {' +
				'	padding-right: 5px;' +
				'}' +
				'.cke_element_bubble__transformations span.cke_element_bubble_transform_item {' +
				'	font-weight: bold;' +
				'}');

			var i, j, transformation, name, def;

			for (i = 0; i < transformations.length; i++) {
				transformation = transformations[i];
				name = transformation.name || transformation.func;

				def = {
					name: name,
					visible: transformation.visible,
					'function': transformation.func
				};

				this.transformations[name] = new CKEDITOR.mindtouch.transformation(def);

				CKEDITOR.addCss('pre[function="' + transformation.func + '"] { background-image: url(' + CKEDITOR.getUrl(this.path + 'images/func.php?func=' + name) + '); }');
			}

			CKEDITOR.addCss('pre[function] { padding: 16px 12px 0 12px; background-repeat: no-repeat; background-position: 5px 0; border: 1px solid #aaa; border-left-width: 5px; }');
		},
		init: function(editor) {
			CKEDITOR.on( 'style.copyAttributes', function( evt ) {
				evt.data.skipAttributes[ 'function' ] = 1;
				evt.data.skipAttributes[ 'data-cke-transform' ] = 1;
			});

			var onSelectionChange = function(evt) {
				if (evt.editor.readOnly) {
					return null;
				}

				var selection = evt.data.selection,
					element = selection && selection.getStartElement().getAscendant('pre', true);

				if (element && !element.isReadOnly()) {
					attachBubble(element, editor, this.transformations);
				} else {
					bubble && bubble.isAttached() && bubble.detach();
				}
			};

			editor.on('selectionChange', onSelectionChange, this, null, 1);
		}
	});
})();
