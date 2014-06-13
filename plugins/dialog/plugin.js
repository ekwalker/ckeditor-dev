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
 * @file Wrapper for mindtouch dialog.
 */

CKEDITOR.plugins.mindtouchdialog = {
	beforeInit: function(editor) {
		this.editor = editor;
	},

	/**
	 * Dialog command. It opens a specific mindtouch dialog when executed.
	 * @constructor
	 * @param {string} dialogName The name of the dialog to open when executing
	 *		this command.
	 * @param {Object} dialogParams
	 * @example
	 * // Register the "link" command, which opens the "link" dialog.
	 * editor.addCommand( 'mindtouchlink', <b>new CKEDITOR.plgins.mindtouchdialog.open( 'mindtouchlink', { url : '/skins/common/popups/link_dialog.php' } )</b> );
	 */
	open: function(dialogName, dialogParams) {
		if (!Deki.Dialog || !this.editor) {
			return;
		}

		var editor = this.editor;

		this.dialogName = dialogName;
		this.dialogParams = CKEDITOR.tools.extend(dialogParams, {
			'height': 'auto',
			'buttons': [
				Deki.Dialog.BTN_OK,
				Deki.Dialog.BTN_CANCEL
			],
			extra: {}
		});

		var params = {
			'src': this.dialogParams.url,
			'width': this.dialogParams.width,
			'height': this.dialogParams.height,
			'buttons': this.dialogParams.buttons,
			'args': this.dialogParams.params,
			'callback': function() {
				if (arguments[0]) {
					this.dialogParams.callback.apply(this.dialogParams.scope, arguments);
				}

				setTimeout(function() {
					editor.focus();

					// Give a while before unlock, waiting for focus to return to the editable. (#172)
					setTimeout(function() {
						editor.focusManager.unlock();
					}, 0);
				}, 0);
			},
			'forceCallback': true,
			'scope': this
		};

		CKEDITOR.tools.extend(params, this.dialogParams.extra);

		var dialog = new Deki.Dialog(params);

		dialog.render();
		dialog.show();

		editor.focusManager.lock();
	},

	/**
	 * For backward compatibility
	 * @deprecated
	 */
	openDialog: function(editor, dialogName, dialogParams) {
		this.open(dialogName, dialogParams);
	}
};

CKEDITOR.plugins.add('mindtouch/dialog', CKEDITOR.plugins.mindtouchdialog);
