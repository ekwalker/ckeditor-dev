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

(function() {
	var allowedContent = [];

	var addButtonCommand = function( editor, name, buttonDefinition, styleDefiniton ) {
		var command = buttonDefinition.command;

		var style = new CKEDITOR.style( styleDefiniton );

		if ( !editor.filter.customConfig || editor.filter.check( style ) ) {
			style._.enterMode = editor.config.enterMode;

			if ( command ) {
				editor.attachStyleStateChange( style, function( state ) {
					!editor.readOnly && editor.getCommand( command ).setState( state );
				});

				var cmd = new CKEDITOR.styleCommand( style );
				cmd.requiredContent = styleDefiniton.element;

				editor.addCommand( command, cmd );
			}

			allowedContent.push( style );
		}

		editor.ui.addButton( name, buttonDefinition );
	};

	CKEDITOR.plugins.add( 'mindtouch/format', {
		lang: 'en', // %REMOVE_LINE_CORE%
		icons: 'h1,h2,h3,h4,h5,hx,code,plaintext', // %REMOVE_LINE_CORE%
		requires: 'format',
		init: function( editor ) {
			CKEDITOR.on( 'style.copyAttributes', function( evt ) {
				evt.data.skipAttributes[ 'class' ] = 1;
			});

			var format = editor.lang.format,
				lang = editor.lang[ 'mindtouch/format' ],
				config = editor.config;

			editor.ui.addToolbarGroup( 'format', 'styles' );

			format.tag_h6 = format.tag_h5;
			format.tag_h5 = format.tag_h4;
			format.tag_h4 = format.tag_h3;
			format.tag_h3 = format.tag_h2;
			format.tag_h2 = format.tag_h1;
			format.tag_h1 = lang.tag_h1;

			var menuGroup = 'formatButton';
			editor.addMenuGroup( menuGroup );

			var normalTag = config.enterMode == CKEDITOR.ENTER_DIV ? 'div' : 'p',
				menuItems = {
					normal: {
						label: format[ 'tag_' + normalTag ],
						command: 'normal',
						group: menuGroup,
						toolbar: 'format,10'
					},
					h1: {
						label: format.tag_h2,
						command: 'h1',
						group: menuGroup,
						toolbar: 'format,20'
					},
					h2: {
						label: editor.lang.format.tag_h3,
						command: 'h2',
						group: menuGroup,
						toolbar: 'format,30'
					},
					h3: {
						label: editor.lang.format.tag_h4,
						command: 'h3',
						group: menuGroup,
						toolbar: 'format,40'
					},
					h4: {
						label: editor.lang.format.tag_h5,
						command: 'h4',
						group: menuGroup,
						toolbar: 'format,50'
					},
					h5: {
						label: editor.lang.format.tag_h6,
						command: 'h5',
						group: menuGroup,
						toolbar: 'format,60'
					}
				};

			addButtonCommand( editor, 'Normal', menuItems.normal, config[ 'format_' + normalTag ] );
			addButtonCommand( editor, 'H1', menuItems.h1, config[ 'format_h2' ] );
			addButtonCommand( editor, 'H2', menuItems.h2, config[ 'format_h3' ] );
			addButtonCommand( editor, 'H3', menuItems.h3, config[ 'format_h4' ] );
			addButtonCommand( editor, 'H4', menuItems.h4, config[ 'format_h5' ] );
			addButtonCommand( editor, 'H5', menuItems.h5, config[ 'format_h6' ] );

			editor.addMenuItems( menuItems );

			editor.ui.add( 'Hx', CKEDITOR.UI_MENUBUTTON, {
				label: lang.tag_hx,
				title: lang.tag_hx,
				toolbar: 'format,70',
				className: 'cke_button_hx',
				modes: { 'wysiwyg': 1 },
				allowedContent: allowedContent,
				panel: {
					toolbarRelated: true,
					css: [ CKEDITOR.skin.getPath( 'editor' ) ].concat( config.contentsCss )
				},
				onMenu: function() {
					var items = {};

					for ( var i = 0; i < config.menu_hxItems.length; i++ ) {
						var itemName = config.menu_hxItems[ i ].toLowerCase();

						var state = CKEDITOR.TRISTATE_DISABLED,
							commandName = menuItems[ itemName ].command,
							command = commandName && editor.getCommand( commandName );

						if ( command ) {
							state = command.state;
						}

						items[ itemName ] = state;
					}

					return items;
				},
				onRender: function() {
					var me = this;

					editor.on( 'selectionChange', function() {
						if ( editor.readOnly ) {
							return;
						}

						var state = CKEDITOR.TRISTATE_OFF;

						for ( var i = 0; i < config.menu_hxItems.length; i++ ) {
							var itemName = config.menu_hxItems[ i ].toLowerCase();
							var command = editor.getCommand( menuItems[ itemName ].command );

							if ( command && command.state == CKEDITOR.TRISTATE_ON ) {
								state = CKEDITOR.TRISTATE_ON;
							}
						}

						me.setState( state );
					});
				}
			});

			addButtonCommand( editor, 'Code', {
				label: lang.code,
				command: 'code',
				toolbar: 'basicstyles,70'
			}, editor.config.mindtouchStyles_code );

			addButtonCommand( editor, 'PlainText', {
				label: lang.plaintext,
				command: 'plaintext',
				toolbar: 'basicstyles,80'
			}, editor.config.mindtouchStyles_plaintext );

			editor.setKeystroke( CKEDITOR.CTRL + CKEDITOR.SHIFT + 76 /*L*/, 'justifyleft' );
			editor.setKeystroke( CKEDITOR.CTRL + CKEDITOR.SHIFT + 69 /*E*/, 'justifycenter' );
			editor.setKeystroke( CKEDITOR.CTRL + CKEDITOR.SHIFT + 82 /*R*/, 'justifyright' );
			editor.setKeystroke( CKEDITOR.CTRL + CKEDITOR.SHIFT + 74 /*J*/, 'justifyblock' );

			editor.setKeystroke( CKEDITOR.CTRL + 188 /*,*/, 'subscript' );
			editor.setKeystroke( CKEDITOR.CTRL + 190 /*.*/, 'superscript' );
			editor.setKeystroke( CKEDITOR.CTRL + 220 /*\*/, 'removeFormat' );
			editor.setKeystroke( CKEDITOR.CTRL + 222 /*'*/, 'code' );
			
			editor.setKeystroke( CKEDITOR.CTRL + CKEDITOR.ALT + 48 /*0*/, 'normal' );
			editor.setKeystroke( CKEDITOR.CTRL + CKEDITOR.ALT + 49 /*1*/, 'h1' );
			editor.setKeystroke( CKEDITOR.CTRL + CKEDITOR.ALT + 50 /*2*/, 'h2' );
			editor.setKeystroke( CKEDITOR.CTRL + CKEDITOR.ALT + 51 /*3*/, 'h3' );
			editor.setKeystroke( CKEDITOR.CTRL + CKEDITOR.ALT + 52 /*4*/, 'h4' );
			editor.setKeystroke( CKEDITOR.CTRL + CKEDITOR.ALT + 53 /*5*/, 'h5' );
		}
	});
})();

/**
 * The style definition to be used to apply the code style in the text.
 * @type Object
 * @default { element : 'code' }
 * @example
 * config.mindtouchStyles_code = { element : 'code', attributes : { 'class': 'Code' } };
 */
CKEDITOR.config.mindtouchStyles_code = { element: 'code' };
CKEDITOR.config.mindtouchStyles_plaintext = {
	element: 'span',
	attributes: { 'class': 'plain' }
};

CKEDITOR.config.menu_hxItems = [ 'H4', 'H5' ];
