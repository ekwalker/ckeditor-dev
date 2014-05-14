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
 * @file View menu button plugin.
 */

(function() {
	function getButtonDefinition(name, editor) {
		var uiItem = editor.ui.items[name];

		if (typeof uiItem == 'undefined' || uiItem.type != CKEDITOR.UI_BUTTON) {
			return null;
		}

		var definition = {
			command: uiItem.command
		};

		definition = CKEDITOR.tools.extend({}, definition, uiItem.args[0]);

		return definition;
	}

	function getUIMenuItems(editor, menuGroup, menuItems) {
		editor.addMenuGroup(menuGroup);
		var uiMenuItems = {};

		for (var i = 0; i < menuItems.length; i++) {
			var menuItem = menuItems[i],
				menuItemDefinition = getButtonDefinition(menuItem, editor);

			if (menuItemDefinition) {
				// override button group
				menuItemDefinition.group = menuGroup;
				uiMenuItems[menuItem.toLowerCase()] = menuItemDefinition;
			}
		}

		return uiMenuItems;
	}

	function getUIMenuItemsState(editor, uiMenuItems) {
		var menuItems = {};

		for (var itemName in uiMenuItems) {
			var state = CKEDITOR.TRISTATE_DISABLED,
				commandName = uiMenuItems[itemName].command,
				command = commandName && editor.getCommand(commandName);

			if (command) {
				state = command.state;
			}

			menuItems[itemName] = state;
		}

		return menuItems;
	}

	CKEDITOR.plugins.add('mindtouch/viewmenu', {
		requires: 'menu,menubutton',
		lang: 'en', // %REMOVE_LINE_CORE%
		init: function(editor) {
			var lang = editor.lang['mindtouch/viewmenu'],
				config = editor.config;

			var uiViewMenuItems = getUIMenuItems(editor, 'viewButton', config.menu_viewItems);
			editor.addMenuItems(uiViewMenuItems);

			editor.ui.addToolbarGroup('view', 'doctools', 'document');

			editor.ui.add('ViewMenu', CKEDITOR.UI_MENUBUTTON, {
				label: lang.view,
				title: lang.view,
				toolbar: 'view,10',
				className: 'cke_button_view',
				modes: {'wysiwyg': 1, 'source': 1},
				readOnly: 1,
				panel: {
					toolbarRelated: true,
					css: [ CKEDITOR.skin.getPath( 'editor' ) ].concat( config.contentsCss )
				},
				onMenu: function() {
					var menuItem, label, itemName, i;

					for (i = 0; i < config.menu_viewItems.length; i++) {
						itemName = config.menu_viewItems[i].toLowerCase();
						menuItem = editor.getMenuItem(itemName);

						switch (itemName) {
							case 'source':
								label = (editor.mode == 'source') ? lang.wysiwyg : editor.lang.sourcearea.toolbar;
								break;
							case 'showblocks':
								var state = editor.getCommand('showblocks').state;
								label = (state == CKEDITOR.TRISTATE_ON) ? lang.hideBlocks : editor.lang.showblocks.toolbar;
								break;
						}

						if (menuItem && label) {
							menuItem.label = label;
						}
					}

					return getUIMenuItemsState(editor, uiViewMenuItems);
				},
				onRender: function() {
					var me = this;

					var updateState = function() {
						for (var i = 0; i < config.menu_viewItems.length; i++) {
							var button = getButtonDefinition(config.menu_viewItems[i], editor),
								command = button && editor.getCommand(button.command);
							if (command) {
								switch (command.state) {
									case CKEDITOR.TRISTATE_ON:
										me.setState(CKEDITOR.TRISTATE_ON);
										return;
								}
							}
						}

						me.setState(CKEDITOR.TRISTATE_OFF);
					};

					editor.on('afterCommandExec', function() {
						updateState();
					});
					editor.on('mode', function() {
						updateState();
					});
				}
			});
		}
	});
})();

CKEDITOR.config.menu_viewItems = [
	'Source', 'ShowBlocks'
];
