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
 * @file Save plugin.
 */

(function(global) {
	// window.saveAs
	// Shims the saveAs method, using saveBlob in IE10. 
	// And for when Chrome and FireFox get round to implementing saveAs we have their vendor prefixes ready. 
	// But otherwise this creates a object URL resource and opens it on an anchor tag which contains the "download" attribute (Chrome)
	// ... or opens it in a new tab (FireFox)
	// @author Andrew Dodson
	// @copyright MIT, BSD. Free to clone, modify and distribute for commercial and personal use.

	window.saveAs || (window.saveAs = (window.navigator.msSaveBlob ? function(b, n) { return window.navigator.msSaveBlob(b, n); } : false) || window.webkitSaveAs || window.mozSaveAs || window.msSaveAs || (function() {

		// URL's
		window.URL || (window.URL = window.webkitURL);

		if (!window.URL) {
			return false;
		}

		return function(blob, name) {
			var url = URL.createObjectURL(blob);

			// Test for download link support
			if ("download" in document.createElement('a')) {
				var a = document.createElement('a');
				a.setAttribute('href', url);
				a.setAttribute('download', name);

				// Create Click event
				var clickEvent = document.createEvent("MouseEvent");
				clickEvent.initMouseEvent("click", true, true, window, 0,
					clickEvent.screenX, clickEvent.screenY, clickEvent.clientX, clickEvent.clientY,
					clickEvent.ctrlKey, clickEvent.altKey, clickEvent.shiftKey, clickEvent.metaKey,
					0, null);

				// dispatch click event to simulate download
				a.dispatchEvent(clickEvent);

			} else {
				// fallover, open resource in new tab.
				window.open(url, '_blank', '');
			}
		};
	})());

	CKEDITOR.plugins.mindtouchsave = {
		confirmSave : function(editor, callbackCommand) {
			var onPageSaved = function() {
				callbackCommand && editor.execCommand(callbackCommand);
			};
			
			var removeDialogListeners = function(evt) {
				evt.listenerData.removeListener('ok', onPageSaved);
				evt.listenerData.removeListener('hide', removeDialogListeners);
			};
			
			editor.openDialog('confirmsave', function( dialog ) {
				dialog.on('ok', onPageSaved);
				dialog.on('hide', removeDialogListeners, null, dialog);
			});
		}
	};

	function unmaximize(ev) {
		var editor = ev.editor;

		var maximizeCommand = editor.getCommand('maximize');

		if (maximizeCommand && maximizeCommand.state == CKEDITOR.TRISTATE_ON) {
			editor.execCommand('maximize');
		}
	}

	var saveCmd = {
		exec: function(editor) {
			this.editor = editor;

			editor.fire('scrollToTop');
			editor.lock && editor.lock();

			if (Deki.Plugin && Deki.Plugin.Editor) {
				editor.fire('unmaximize');

				var callbacks = {
					success: this.save,
					error: function() {
						editor.unlock && editor.unlock();
						editor.fire('saveFailed');
						return true;
					}
				};
				Deki.Plugin.Editor.checkPermissions(callbacks, this);
			} else {
				this.save();
			}
		},
		save: function() {
			var editor = this.editor;
			if (editor.readOnly) {
				editor.unlock && editor.unlock();
			} else {
				editor.fire('save');
				editor.execCommand('save');
			}
		},
		modes: {wysiwyg: 1, source: 1},
		editorFocus: false,
		canUndo: false
	};

	var quickSaveCmd = {
		exec: function(editor, callbacks) {
			callbacks = callbacks || {};

			editor.updateElement();

			var $form = $(editor.element.$.form),
				formValues = $form.serializeArray(),
				i;

			var params = {};

			for (i = 0; i < formValues.length; i++) {
				var el = formValues[i];
				params[el.name] = el.value;
			}

			CKEDITOR.tools.extend(params, {
				method: 'save',
				title: Deki.PageTitle
			});

			Deki.Plugin.AjaxRequest('page_editor', {
				data: params,
				type: 'post',
				success: function(data, status) {
					if (status == 'success' && data.success === true) {
						if (data.body.result) {
							var article = data.body.article,
								id = article.id,
								title = article.title;

							if (editor.config.mindtouch.pageId == 0) {
								Deki.PageRevision = editor.config.mindtouch.pageRevision = 1;
							}

							// update page id
							editor.config.mindtouch.pageId = id;
							CKEDITOR.document.getById('wpArticleId').setValue(id);
							Deki.PageId = id;

							// update title
							Deki.PageTitle = title;
							editor.config.mindtouch.pageTitle = title;
							CKEDITOR.document.createElement('input', {
								attributes: {
									'type': 'hidden',
									'name': 'title',
									'value': title
								}
							}).insertAfter(editor.element);

							Deki.CancelUrl = article.url;

							CKEDITOR.document.getById('wpPath').setValue(article.path);
							CKEDITOR.document.getById('displaytitle').setValue(article.titleName);

							if (Deki.Plugin && Deki.Plugin.TitleEditor) {
								Deki.Plugin.TitleEditor.Update();

								var titleElement = CKEDITOR.document.getById('deki-new-page-title'),
									parent = titleElement && titleElement.getParent();

								while (parent) {
									if (parent.hasClass('deki-new-page-title-border')) {
										parent.remove();
										break;
									}

									parent = parent.getParent();
								}
							}

							Deki.Ui.EmptyFlash();

							editor.fire('quickSave');
							Deki.Plugin && Deki.Plugin.Publish('Page.quickSave');

							callbacks.success && callbacks.success.call(this);
						} else {
							var errorNode = CKEDITOR.dom.element.createFromHtml(data.body.errors, CKEDITOR.document);
							errorNode.replace(CKEDITOR.dom.element.get($('.dekiFlash').get(0)));

							errorNode.getWindow().$.scrollTo(0, errorNode.getDocumentPosition().y);

							callbacks.error && callbacks.error.call(this);
						}
					}
				},
				error: function() {
					Deki.Ui.Flash(global.wfMsg('internal-error'));
				},
				complete: function() {
					callbacks.complete && callbacks.complete.call(this);
				}
			});
		},
		modes: {wysiwyg: 1, source: 1},
		editorFocus: false,
		canUndo: false
	};

	var cancelCmd = {
		exec: function(editor) {
			// use checkDirty event instead of editor.checkDirty
			// to add custom checks on dirty
			var isDirty = editor.fire('checkDirty', {isDirty: false}).isDirty;

			if (isDirty) {
				editor.openDialog('confirmcancel');
			} else {
				editor.fire('cancel');
			}
		},
		canUndo: false,
		editorFocus: false,
		readOnly: 1,
		modes: {wysiwyg: 1, source: 1}
	};


	CKEDITOR.plugins.add('mindtouch/save', {
		lang: 'en', // %REMOVE_LINE_CORE%
		icons: 'mindtouchcancel,mindtouchsave', // %REMOVE_LINE_CORE%
		requires: 'dialog,save',
		init: function(editor) {
			var langCancel = editor.lang['mindtouch/save'].cancel,
				langSave = editor.lang['mindtouch/save'].quicksave;

			editor.addCommand('mindtouchsave', saveCmd);
			editor.addCommand('quicksave', quickSaveCmd);
			editor.addCommand('mindtouchcancel', cancelCmd);

			editor.on('save', unmaximize);
			editor.on('cancel', unmaximize);
			editor.on('unmaximize', unmaximize);

			editor.on('cancel', function() {
				var sel = editor.getSelection();
				sel && sel.unlock();
			}, null, null, 1);

			editor.ui.addButton('MindTouchSave', {
				label: editor.lang.save.toolbar,
				command: 'mindtouchsave',
				toolbar: 'document,10'
			});

			editor.ui.addButton('MindTouchCancel', {
				label: langCancel.button,
				command: 'mindtouchcancel',
				toolbar: 'document,20'
			});

			editor.setKeystroke(CKEDITOR.CTRL + 83 /*S*/, 'mindtouchsave');

			// enable save command in source mode
			// @see EDT-571
			var saveCommand = editor.getCommand('save');
			if (saveCommand) {
				saveCommand.modes.source = saveCommand.modes.wysiwyg;
			}

			// @see EDT-577
			var element = editor.element;
			if (editor.elementMode == CKEDITOR.ELEMENT_MODE_REPLACE && element.is('textarea')) {
				var form = element.$.form && new CKEDITOR.dom.element(element.$.form);
				if (form) {
					// exec save command instead of submitting of form
					function onSubmit(evt) {
						editor.execCommand('mindtouchsave');
						evt.data.preventDefault(true);
					}
					form.on('submit', onSubmit, null, null, 1);

					// remove listener - save command will submit the form
					editor.on('save', function() {
						form.removeListener('submit', onSubmit);
					});

					editor.on('destroy', function() {
						form.removeListener('submit', onSubmit);
					});
				}
			}


			editor.on('saveFailed', function() {
				if (!Deki || !Deki.Ui) {
					return;
				}

				try {
					var isBlobSupported = !!new Blob();
				} catch (e) {}

				var message;

				if (isBlobSupported) {
					var download = CKEDITOR.tools.addFunction(function() {
						var data = editor.getData(),
							blob = new Blob([data], { type: "text/html;charset=utf-8" }),
							pageName = Deki.PageName || editor.config.mindtouch.pageTitle,
							dummy = editor.document.createElement('div');

						dummy.setHtml(pageName);

						var fileName = dummy.getText().replace(/[^A-Za-z0-9]/ig, '_') + '.html';
						window.saveAs(blob, fileName);
						return false;
					});

					message = '<a href="javascript:void(\'Download\');" onclick="return CKEDITOR.tools.callFunction(\'' + download + '\');">' + editor.lang['mindtouch/save'].saveToFileLink + '</a>';
				} else {
					var message = editor.lang['mindtouch/save'].saveToFileHint,
						copyShortcut = (CKEDITOR.env.mac ? '&#8984;' : 'CTRL') + '+C',
						hintFn = CKEDITOR.tools.addFunction(function() {
							if (editor.mode != 'source') {
								editor.on('mode', function(ev) {
									ev.removeListener();
									editor.execCommand('selectAll');
								});
								editor.execCommand('source');
							} else {
								editor.execCommand('selectAll');
							}

							return false;
						});

					message = message.replace('%1', 'javascript:void(\'Switch to source mode and select all\');')
						.replace('%2', 'onclick="return CKEDITOR.tools.callFunction(\'' + hintFn + '\');"')
						.replace('%3', copyShortcut);
				}

				Deki.Ui.Flash(message);
			}, null, null, 1000);

			CKEDITOR.dialog.add('confirmcancel', function(editor) {
				return {
					title: langCancel.discardChangesTitle,
					minWidth: 290,
					minHeight: 90,
					onShow: function() {
						this.getButton('ok').focus();
					},
					contents: [{
						id: 'info',
						label: langCancel.discardChangesTitle,
						title: langCancel.discardChangesTitle,
						elements: [{
							id: 'warning',
							type: 'html',
							html: langCancel.confirmCancel
						}]
					}],
					buttons: [
						CKEDITOR.dialog.cancelButton.override({
							label: langCancel.continueEditing
						}),
						// the default handler of OK button fires 'saveSnapshot' event
						// which is fired after editor destroying
						CKEDITOR.dialog.okButton.override({
							label: langCancel.discardChanges,
							onClick: function() {
								editor.setMode('wysiwyg');
								editor.fire('unmaximize');
								editor.fire('cancel');
							}
						})
					]
				};
			});

			var newPageTitleElement = CKEDITOR.document.getById('deki-new-page-title'),
				defaultTitle = newPageTitleElement && newPageTitleElement.getValue();

			CKEDITOR.dialog.add('confirmsave', function(editor) {
				return {
					title: langSave.saveTitle,
					minWidth: 350,
					minHeight: 90,
					onShow: function() {
						var dialog = this,
							msgElement = CKEDITOR.document.getById(dialog.getContentElement('info', 'warning').domId),
							okButton = this.getButton('ok'),
							html;

						if (newPageTitleElement && defaultTitle == newPageTitleElement.getValue()) {
							html = langSave.changeTitle.replace('%1', '<strong>' + defaultTitle + '</strong>');
							CKEDITOR.document.getById(okButton.domId).hide();
						} else {
							html = langSave.newPageAlert;
							CKEDITOR.document.getById(okButton.domId).show();
						}

						msgElement.setHtml(html);
						dialog.layout();
					},
					contents: [{
						id: 'info',
						label: langSave.saveTitle,
						title: langSave.saveTitle,
						elements: [{
							id: 'warning',
							type: 'html',
							className: 'wrap',
							html: langSave.newPageAlert
						}]
					}],
					buttons: [
						CKEDITOR.dialog.okButton.override({
							label: langSave.buttonSave,
							onClick: function(evt) {
								if (!this.isEnabled()) {
									return;
								}

								var dialog = this.getDialog(),
									button = this;

								this.disable();
								this.getElement().getFirst().setHtml(langSave.saving);

								editor.execCommand('quicksave', {
									success: function() {
										if (dialog.fire('ok', {hide: true}).hide !== false) {
											dialog.hide();
										}
									},
									error: function() {
										CKEDITOR.document.getById(
										dialog.getContentElement('info', 'warning').domId).setHtml(langSave.saveFailed);

										button.enable();
										button.getElement().getFirst().setHtml(langSave.buttonSave);
										CKEDITOR.document.getById(button.domId).hide();
									}
								});
							}
						}),
						CKEDITOR.dialog.cancelButton
					]
				};
			});

			if (Deki.Plugin) {
				Deki.Plugin.Subscribe('Editor.saveRequired', function(evt, callback, scope) {
					scope = scope || editor;

					var success, cancel;

					if (typeof callback == 'function') {
						success = callback;
					} else {
						callback = callback || {};
						success = callback.success;
						cancel = callback.cancel;
					}

					var onPageSaved = function() {
						success && success.call(scope);
					};

					var onSaveCancelled = function() {
						cancel && cancel.call(scope);
					};

					var removeDialogListeners = function(evt) {
						evt.listenerData.removeListener('ok', onPageSaved);
						evt.listenerData.removeListener('cancel', onSaveCancelled);
						evt.listenerData.removeListener('hide', removeDialogListeners);
					};

					editor.openDialog('confirmsave', function(dialog) {
						dialog.on('ok', onPageSaved);
						dialog.on('cancel', onSaveCancelled);
						dialog.on('hide', removeDialogListeners, null, dialog);
					});
				});
			}
		},
		onLoad : function() {
			CKEDITOR.document.appendStyleText('.cke .cke_button__mindtouchsave .cke_button_label, .cke .cke_button__mindtouchcancel .cke_button_label { display: inline; line-height: 16px; }');
		}
	});
})(window);
