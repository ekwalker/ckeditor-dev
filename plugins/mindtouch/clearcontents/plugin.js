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

CKEDITOR.plugins.add('mindtouch/clearcontents', {
	requires: 'newpage',
	lang: 'en',  // %REMOVE_LINE_CORE%
	beforeInit: function(editor) {
		editor.lang.newpage.toolbar = editor.lang['mindtouch/clearcontents'].title;
	},
	init: function(editor) {
		var lang = editor.lang['mindtouch/clearcontents'];

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
					CKEDITOR.tools.setTimeout(function() {
						var dialog = this;
						editor.setData(editor.config.newpage_html || '', function() {
							dialog.hide();

							var range = editor.createRange();
							range.moveToElementEditStart( editor.editable() );
							range.select();
						});
					}, 0, this);

					return false;
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
