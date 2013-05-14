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
 * @file Confirm dialog for the new page (clear contents).
 * @see EDT-430
 */

CKEDITOR.plugins.add('mt-clearcontents', {
	requires: 'newpage',
	lang: 'en',
	beforeInit: function(editor) {
		editor.lang.newpage.toolbar = editor.lang['mt-clearcontents'].title;
	},
	init: function(editor) {
		var lang = editor.lang['mt-clearcontents'];

		editor.getCommand('newpage').on('exec', function(ev) {
			editor.openDialog('clearcontents');
			ev.cancel();
		});

		CKEDITOR.dialog.add('clearcontents', function(editor) {
			return {
				title: lang.title,
				minWidth: 290,
				minHeight: 90,
				onShow: function() {
					this.getButton('ok').focus();
				},
				onOk: function() {
					// executing newpage command here throws the js error
					// @todo: investigate why and replace this function with execCommand('newpage')
					editor.setData('', function() {
						editor.focus();
						// Save the undo snapshot after all document changes are affected. (#4889)
						setTimeout(function() {
							editor.selectionChange();
						}, 200);
					});
				},
				contents: [{
					id: 'info',
					label: lang.title,
					title: lang.title,
					elements: [{
						id: 'warning',
						type: 'html',
						html: lang.confirm
					}]
				}]
			};
		});
	}
});
