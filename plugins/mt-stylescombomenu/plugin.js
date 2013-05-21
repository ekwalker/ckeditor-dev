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

(function() {
	CKEDITOR.plugins.add('mt-stylescombomenu', {
		requires: 'mt-richcombomenu',
		init: function(editor) {
			var config = editor.config,
				lang = editor.lang.stylescombo,
				styles = [],
				combo,
				allowedContent = [],
				iconPath = CKEDITOR.getUrl( '../images/icons.png' ),
				icons = {
					'none' : '-464',
					'preltpregtpre_format' : '-480',
					'comment' : '-80',
					'dekiscript' : '-224',
					'javascript_jem' : '-208',
					'css' : '-192',
					'conditional_text_anonymous_only' : '-512',
					'conditional_text_community_member_only' : '-512',
					'conditional_text_pro_member_only' : '-512'
				};

			editor.addMenuGroup('style_default', 1);
			editor.addMenuGroup('style_user', 2);
			editor.addMenuGroup('style_conditional', 3);
			editor.addMenuGroup('style_executable', 4);

			var addStyleCommand = function(style, commandName) {
				editor.attachStyleStateChange(style, function(state) {
					!editor.readOnly && editor.getCommand(commandName).setState(state);
				});

				editor.addCommand(commandName, new CKEDITOR.styleCommand(style));
			};

			editor.on( 'stylesSet', function( evt ) {
				var stylesDefinitions = evt.data.styles;

				if ( !stylesDefinitions ) {
					return;
				}

				var style, styleName;

				for (var i = 0, count = stylesDefinitions.length; i < count; i++) {
					var styleDefinition = stylesDefinitions[i],
						styleName = styleDefinition.name,
						group = styleDefinition.group || 'user',
						buttonName = styleName.toLowerCase();

					var style = new CKEDITOR.style(styleDefinition);

					if (!editor.filter.customConfig || editor.filter.check( style )) {
						// filter the style name
						buttonName = buttonName.replace(/\s+|-+/g, '_');
						buttonName = buttonName.replace(/[^a-zA-Z0-9_]/g, '');

						style._name = styleName;
						style._button = buttonName;
						style._.enterMode = config.enterMode;

						if (styleDefinition.command) {
							addStyleCommand(style, styleDefinition.command);
						}

						editor.addMenuItem(buttonName, {
							group: 'style_' + group,
							label: styleName,
							style: style,
							onClick: function() {
								editor.focus();
								editor.fire('saveSnapshot');

								var style = CKEDITOR.tools.clone(this.style),
									selection = editor.getSelection(),
									elementPath = new CKEDITOR.dom.elementPath(selection.getStartElement());

								if (style._.definition.group == 'conditional' && (!style._.definition.attributes || !style._.definition.attributes.title)) {
									style._.definition.attributes = style._.definition.attributes || {};
									style._.definition.attributes.title = style._name;
								}

								style[style.checkActive(elementPath) ? 'remove' : 'apply'](editor.document);

								editor.fire('saveSnapshot');
							}
						});

						if (icons[buttonName]) {
							CKEDITOR.skin.addIcon(buttonName, iconPath, icons[buttonName]);
						}

						styles.push(style);
						allowedContent.push(style);
					}
				}
			});

			editor.ui.addRichComboMenu('StylesMenu', {
				label: lang.label,
				title: lang.panelTitle,
				toolbar: 'styles,10',
				menu: {
					panel: {
						css: [ CKEDITOR.skin.getPath( 'editor' ) ].concat( config.contentsCss ),
						attributes: { 'aria-label': lang.panelTitle }
					}
				},

				onMenu: function() {
					if (CKEDITOR.env.ie || CKEDITOR.env.webkit) {
						editor.focus();
					}

					var selection = editor.getSelection(),
						element = selection.getSelectedElement(),
						elementPath = new CKEDITOR.dom.elementPath(element || selection.getStartElement()),
						items = {};

					for (var i = 0; i < styles.length; i++) {
						var style = styles[i],
							type = style.type,
							state = CKEDITOR.TRISTATE_OFF;

						if (style.checkActive(elementPath)) {
							state = CKEDITOR.TRISTATE_ON;
						} else if (type == CKEDITOR.STYLE_OBJECT && !style.checkApplicable(elementPath)) {
							state = CKEDITOR.TRISTATE_DISABLED;
						}

						items[style._button] = state;
					}

					return items;
				},

				onRender: function() {
					editor.on('selectionChange', function(ev) {
						var currentValue = this.getValue(),
							elementPath = ev.data.path,
							elements = elementPath.elements,
							prevStyle;

						// For each element into the elements path.
						for (var i = 0, count = elements.length, element; i < count; i++) {
							element = elements[i];

							// Check if the element is removable by any of
							// the styles.
							for (var j = 0; j < styles.length; j++) {
								var style = styles[j],
									value = style._name;

								if (style.checkElementRemovable(element, true)) {
									if (value != currentValue && (!prevStyle || !prevStyle._.definition.priority || prevStyle._.definition.priority < style._.definition.priority)) {
										this.setValue(value, style._.definition.label);
										currentValue = value;
									}

									prevStyle = style;
								}
							}
						}

						// If no styles match, just empty it.
						!prevStyle && this.setValue('');
					},
					this);
				},

				reset: function() {
					if (combo) {
						delete combo._.menu;
						combo._.state = CKEDITOR.TRISTATE_OFF;
					}
					styles = [];
				}
			});
		}
	});
})();
