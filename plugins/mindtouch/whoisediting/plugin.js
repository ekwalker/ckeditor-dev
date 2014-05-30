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
 * @file Who Is Editing plugin.
 */

(function() {
	function sendRequest(formatter, options) {
		var pageId = this.config.mindtouch.pageId;

		if (!pageId) {
			return;
		}

		var url = Deki.Plugin.AJAX_URL,
			data = {
				formatter: formatter,
				pageId: pageId
			};

		options = CKEDITOR.tools.extend({
			url: url,
			data: data,
			dataType: 'json',
			type: 'GET'
		}, options);

		$.ajax(options);
	}

	function checkIsEdited() {
		return (Deki.EditorEditedBy && Deki.EditorEditedBy.length);
	}

	function updateLabel(updateFailed) {
		var editor = this,
			lang = editor.lang['mindtouch/whoisediting'];

		if (!editor.config.whoisediting_showLabel) {
			return;
		}

		var label = [lang.editors, '&nbsp;'];

		if (!updateFailed) {
			if (checkIsEdited()) {
				label.push('<strong>', Deki.EditorEditedBy[0].name);

				if (Deki.EditorEditedBy.length > 1) {
					label.push(', ...');
				}

				label.push('<strong>');
			} else {
				label.push(lang.none);
			}
		} else {
			label.push(lang.error);
		}

		var checkNowFn = function() {
			editor.ui.infobar.updateLabel('whoisediting', 'editedby', [lang.editors, '&nbsp;', lang.updating].join(''));
			update.call(editor);
			editor.focus();
		},
		checkNowFnRef = CKEDITOR.tools.addFunction(checkNowFn);

		var checkNowLink = '<a href="javascript:void(0)"' +
			' onclick="CKEDITOR.tools.callFunction(' + checkNowFnRef + '); return false;"' +
			'>' + lang.checkNow + '</a>';

		label.push('&nbsp;(', checkNowLink, ')');
		editor.ui.infobar.updateLabel('whoisediting', 'editedby', label.join(''));
		editor.ui.infobar.showGroup('whoisediting');
	}

	function cancelEditing(async) {
		sendRequest.call(this, 'page_editor_whoisediting_cancel', {
			async: async
		});
	}

	function update() {
		var editor = this;

		sendRequest.call(editor, 'page_editor_whoisediting_update', {
			async: true,
			success: function(data, status) {
				if (data && data.success) {
					Deki.EditorEditedBy = data.body.editedBy;
					updateLabel.call(editor);

					if (!checkIsEdited() && editor.readOnly && editor.config.whoisediting_autoDisableReadOnly) {
						editor.setReadOnly(false);
						update.call(editor);
					}
				} else {
					updateLabel.call(editor, true);
				}
			},
			error: function() {
				updateLabel.call(editor, true);
			}
		});
	}

	CKEDITOR.plugins.add('mindtouch/whoisediting', {
		lang: 'en', // %REMOVE_LINE_CORE%
		icons: 'whoisediting', // %REMOVE_LINE_CORE%
		requires: 'dialog,mindtouch/infobar',
		init: function(editor) {
			var lang = editor.lang['mindtouch/whoisediting'];

			editor.addCommand('whoisediting', {
				exec: function() {
					sendRequest.call(editor, 'page_editor_whoisediting_getlist', {
						async: false,
						success: function(data, status) {
							if (data && data.success) {
								Deki.EditorEditedBy = data.body.editedBy;
								editor.openDialog('whoisediting');
								updateLabel.call(editor);
							} else {
								Deki.Ui.Message(wfMsg('error'), wfMsg('internal-error'));
								updateLabel.call(editor, true);
							}
						},
						error: function() {
							Deki.Ui.Message(wfMsg('error'), wfMsg('internal-error'));
							updateLabel.call(editor, true);
						}
					});
				},
				canUndo: false,
				modes: {wysiwyg: 1, source: 1},
				readOnly: 1
			});

			editor.ui.addButton('WhoIsEditing', {
				label: lang.title,
				command: 'whoisediting',
				toolbar: 'document,40'
			});

			editor.on('instanceReady', function() {
				checkIsEdited() && editor.openDialog('whoisediting');
				updateLabel.call(editor);
			}, null, null, 1);

			editor.on('cancel', function() {
				if (!Deki.CancelUrl) {
					window.setTimeout(function() {
						cancelEditing.call(editor, true);
					}, 0);
				} else {
					cancelEditing.call(editor, false);
				}
			}, null, null, 1);

			var timeout = Deki.EditorEditTimeout || 300,
				interval = window.setInterval(function() {
					update.call(editor);
				}, timeout * 1000);

			editor.on('quickSave', function() {
				update.call(editor);
			});

			$(CKEDITOR.document.getWindow().$).bind('unload.whoisediting', function() {
				cancelEditing.call(editor, false);
			});

			var reset = function() {
				clearInterval(interval);
				$(CKEDITOR.document.getWindow().$).unbind('unload.whoisediting');
			};

			editor.on('destroy', reset);
			editor.on('save', reset);

			editor.on('uiReady', function() {
				var infoBar = editor.ui.infobar;
				infoBar.addGroup('whoisediting');
				infoBar.addLabel('whoisediting', 'editedby');
			});

			CKEDITOR.dialog.add('whoisediting', function(editor) {
				return {
					title: lang.title,
					minWidth: 390,
					minHeight: 90,
					contents: [{
						id: 'info',
						label: lang.title,
						title: lang.title,
						elements: [{
							id: 'warning',
							type: 'html',
							className: 'wrap',
							html: ''
						}]
					}],
					onCancel: function() {
						if (editor.readOnly) {
							update.call(editor);
						}
						editor.setReadOnly(false);
					},
					buttons: [
						CKEDITOR.dialog.okButton.override({
							label: lang.cancel,
							'class': 'cke_dialog_ui_button_canceleditor',
							onClick: function() {
								editor.fire('cancel', {
									removeDraft: false
								});
							}
						}),
						CKEDITOR.dialog.cancelButton.override({
							label: lang.continueEditing,
							'class': 'cke_dialog_ui_button_continueedit'
						}),
						{
							id: 'readOnly',
							type: 'button',
							label: lang.continueReadOnly,
							'class': 'cke_dialog_ui_button_readonly',
							onClick: function(evt) {
								var dialog = evt.data.dialog;
								editor.setReadOnly(true);
								cancelEditing.call(editor, true);
								dialog.hide();
							}
						}
					],
					onShow: function() {
						var dialog = this,
							msgElement = CKEDITOR.document.getById(dialog.getContentElement('info', 'warning').domId),
							html;

						if (checkIsEdited()) {
							var editedBy = [];

							for (var i in Deki.EditorEditedBy) {
								editedBy.push(Deki.EditorEditedBy[i].name);
							}

							html = lang.editedBy + '&nbsp;<strong>' + editedBy.join(', ') + '</strong>';

							CKEDITOR.document.getById(this.getButton('ok').domId).show();
						} else {
							html = lang.nobodyEdits;

							CKEDITOR.document.getById(this.getButton('ok').domId).hide();
							CKEDITOR.document.getById(this.getButton('readOnly').domId).hide();
						}

						msgElement.setHtml(html);

						this.getButton('ok').focus();
					}
				};
			});
		}
	});
})();

/**
 * Show info in infobar
 * @default false
 */
CKEDITOR.config.whoisediting_showLabel = false;

/**
 * Disable read only mode when page is not being edited by anyone
 * @default true
 */
CKEDITOR.config.whoisediting_autoDisableReadOnly = false;
