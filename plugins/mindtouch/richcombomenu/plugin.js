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

CKEDITOR.plugins.add('mindtouch/richcombomenu', {
	requires: 'button,menu',
	beforeInit: function(editor) {
		editor.ui.addHandler(CKEDITOR.UI_RICHCOMBOMENU, CKEDITOR.ui.richComboMenu.handler);
	}
});

(function() {
	/**
	 * Button UI element.
	 * @constant
	 * @example
	 */
	CKEDITOR.UI_RICHCOMBOMENU = 'richcombomenu';

	CKEDITOR.ui.richComboMenu = CKEDITOR.tools.createClass({
		$: function(editor, definition) {
			// Copy all definition properties to this object.
			CKEDITOR.tools.extend(this, definition,
			// Set defaults.
			{
				canGroup: false,
				title: definition.label,
				modes: { wysiwyg: 1 },
				editorFocus: 1
			});

			// We don't want the menu definition in this object.
			var menuDefinition = this.menu || {};
			delete this.menu;

			this.id = CKEDITOR.tools.getNextNumber();

			this.document = ( menuDefinition.parent && menuDefinition.parent.getDocument() ) || CKEDITOR.document;

			var panelDefinition = menuDefinition.panel = menuDefinition.panel || {};
			panelDefinition.toolbarRelated = true;
			panelDefinition.className = 'cke_combopanel';

			panelDefinition.block = {
				attributes : panelDefinition.attributes
			};

			this._ = {
				menuDefinition: menuDefinition,
				items: {},
				state: CKEDITOR.TRISTATE_OFF,
				previousState: CKEDITOR.TRISTATE_OFF
			};
		},

		statics: {
			handler: {
				create: function(definition) {
					return new CKEDITOR.ui.richComboMenu(this.editor, definition);
				}
			}
		},

		proto: {
			renderHtml: function(editor) {
				var output = [];
				this.render(editor, output);
				return output.join('');
			},

			/**
			 * Renders the combo.
			 * @param {CKEDITOR.editor} editor The editor instance which this button is
			 *		to be used by.
			 * @param {Array} output The output array to which append the HTML relative
			 *		to this button.
			 * @example
			 */
			render: function(editor, output) {
				var env = CKEDITOR.env;

				var id = 'cke_' + this.id;
				var clickFn = CKEDITOR.tools.addFunction(function(el) {
					// Restore locked selection in Opera.
					if (selLocked) {
						editor.unlockSelection(1);
						selLocked = 0;
					}
					instance.execute(el);
				}, this);

				var combo = this;
				var instance = {
					id: id,
					combo: this,
					focus: function() {
						var element = CKEDITOR.document.getById(id).getChild(1);
						element.focus();
					},
					execute: function(el) {
						var _ = combo._;

						if (_.state == CKEDITOR.TRISTATE_DISABLED) {
							return;
						}

						if (!_.on) {
							_.previousState = _.state;
						}

						combo.createMenu(editor);

						if (_.on) {
							_.menu.hide();
							return;
						}

						_.menuElement = new CKEDITOR.dom.element(el);
						_.menu.show(_.menuElement, 4);

						combo.setState(CKEDITOR.TRISTATE_ON);
						_.on = true;
					},
					clickFn: clickFn
				};

				function updateState() {
					var state = this.modes[editor.mode] ? CKEDITOR.TRISTATE_OFF : CKEDITOR.TRISTATE_DISABLED;
					this.setState(editor.readOnly && !this.readOnly ? CKEDITOR.TRISTATE_DISABLED : state);
					this.setValue('');
				}

				editor.on('mode', updateState, this);
				// If this combo is sensitive to readOnly state, update it accordingly.
				!this.readOnly && editor.on('readOnly', updateState, this);

				var keyDownFn = CKEDITOR.tools.addFunction(function(ev, element) {
					ev = new CKEDITOR.dom.event(ev);

					var keystroke = ev.getKeystroke();
					switch (keystroke) {
						case 13: // ENTER
						case 32: // SPACE
						case 40: // ARROW-DOWN
							// Show panel
							CKEDITOR.tools.callFunction(clickFn, element);
							break;
						default:
							// Delegate the default behavior to toolbar button key handling.
							instance.onkey(instance, keystroke);
					}

					// Avoid subsequent focus grab on editor document.
					ev.preventDefault();
				});

				var focusFn = CKEDITOR.tools.addFunction(function() {
					instance.onfocus && instance.onfocus();
				});

				var selLocked = 0;
				var mouseDownFn = CKEDITOR.tools.addFunction( function() {
					// Opera: lock to prevent loosing editable text selection when clicking on button.
					if ( CKEDITOR.env.opera ) {
						var edt = editor.editable();
						if ( edt.isInline() && edt.hasFocus ) {
							editor.lockSelection();
							selLocked = 1;
						}
					}
				});

				// For clean up
				instance.keyDownFn = keyDownFn;

				var params = {
					id: id,
					name: this.name || this.command,
					label: this.label,
					title: this.title,
					cls: this.className || '',
					titleJs: env.gecko && env.version >= 10900 && !env.hc ? '' : ( this.title || '' ).replace( "'", '' ),
					keydownFn: keyDownFn,
					mousedownFn: mouseDownFn,
					focusFn: focusFn,
					clickFn: clickFn
				};

				CKEDITOR.getTemplate('combo').output( params, output );

				if (this.onRender) {
					this.onRender();
				}

				return instance;
			},

			createMenu: function(editor) {
				if (this._.menu) {
					return;
				}

				var menuDefinition = this._.menuDefinition,
					menu = new CKEDITOR.menu(editor, menuDefinition);

				menu.onHide = CKEDITOR.tools.bind(function() {
					this.setState(this.modes && this.modes[editor.mode] ? this._.previousState : CKEDITOR.TRISTATE_DISABLED);
					this._.on = false;
					this._.menuElement = null;
				},
				this);

				// Initialize the menu items at this point.
				if (this.onMenu) {
					menu.addListener(this.onMenu);
				}

				this._.menu = menu;
			},

			setValue: function(value, text) {
				this._.value = value;

				var textElement = this.document.getById('cke_' + this.id + '_text');
				if (textElement) {
					if (!(value || text)) {
						text = this.label;
						textElement.addClass('cke_combo_inlinelabel');
					} else {
						textElement.removeClass('cke_combo_inlinelabel');
					}

					textElement.setText(typeof text != 'undefined' ? text : value);
				}
			},

			getValue: function() {
				return this._.value || '';
			},

			setState: function(state) {
				if (this._.state == state) {
					return;
				}

				var el = this.document.getById('cke_' + this.id);
				el.setState(state, 'cke_combo');

				state == CKEDITOR.TRISTATE_DISABLED ? el.setAttribute('aria-disabled', true) : el.removeAttribute('aria-disabled');

				this._.state = state;
			}
		}
	});

	CKEDITOR.ui.prototype.addRichComboMenu = function(name, definition) {
		this.add(name, CKEDITOR.UI_RICHCOMBOMENU, definition);
	};
})();
