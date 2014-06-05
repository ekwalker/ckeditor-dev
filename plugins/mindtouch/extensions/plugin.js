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
 * @file Extensions plugin.
 */

(function()
{
	var pluginName = 'mindtouch/extensions';

	var extensionsCmd = {
		canUndo: false,
		exec: function( editor ) {
			this.editor = editor;
			
			var selection = editor.getSelection(),
				range = selection && selection.getRanges( true )[0],
				selectedText = '';
		
			if ( range && !range.collapsed ) {
				selection.lock();
				selectedText = range.cloneContents().getFirst().getText();
				selection.unlock( true );
			}
			
			var params = {
				'sSelection': selectedText,
				'elParent': selection.getStartElement().getParent()
			};
		
			CKEDITOR.plugins.mindtouchdialog.open( pluginName, {
				url: editor.config.mindtouch.commonPath + '/popups/extension_dialog.php',
				width: '700px',
				height: '400px',
				params: params,
				callback: this._.insertExtension,
				scope: this
			});
		},
		
		_ : {
			insertExtension: function( params ) {
				var editor = this.editor;
				
				if ( params.sDekiScript ) {
					editor.insertText( CKEDITOR.tools.htmlEncode( params.sDekiScript ) );
				}
			}
		}
	};
	
	CKEDITOR.plugins.add( pluginName, {
		lang: 'en', // %REMOVE_LINE_CORE%
		icons: 'extensions', // %REMOVE_LINE_CORE%
		requires: 'mindtouch/dialog',
		init: function( editor ) {
			editor.addCommand( pluginName, extensionsCmd );
			editor.ui.addButton( 'Extensions', {
				label: editor.lang['mindtouch/extensions'].toolbar,
				command: pluginName
			});	
		}
	});
})();
