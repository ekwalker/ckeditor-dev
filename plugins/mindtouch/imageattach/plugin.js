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
 * @file Attach Image plugin.
 */

(function() {
	function stripHost(href) {
		var host = document.location.protocol + '//' + document.location.host;

		if (href.indexOf(host) == 0) {
			href = href.substring(host.length);
		}

		return href;
	}

	function insertImages(attachedFileIds) {
		if (!CKEDITOR.tools.isArray(attachedFileIds)) {
			return;
		}

		var editor = this,
			fileIds = [],
			i;

		for (i = 0; i < attachedFileIds.length; i++) {
			if (attachedFileIds[i] !== false) {
				fileIds.push(attachedFileIds[i]);
			}
		}

		editor.lock && editor.lock();

		if (CKEDITOR.env.ie) {
			var selection = editor.getSelection();
			selection && selection.lock();
		}

		var options = {
			data: {
				'fileIds': fileIds.join(','),
				'action': 'get'
			},
			success: function(data) {
				var files = data.body,
					elements = [];

				if (CKEDITOR.tools.isArray(files)) {
					for (i = 0; i < files.length; i++) {
						var file = files[i];

						if (!file.href) {
							continue;
						}

						var element = null,
							url = stripHost(file.href);

						if (file.width && file.height) {
							element = editor.document.createElement('img');
							element.setAttribute('src', url);
							element.data('cke-saved-src', url);
							element.setStyle('width', file.width + 'px');
							element.setStyle('height', file.height + 'px');
							element.setAttribute('alt', '');
						} else {
							element = editor.document.createElement('a');

							element.setAttribute('href', url);
							element.data('cke-saved-href', url);
							element.setAttribute('title', url);
							element.setHtml(url);
						}

						element.addClass('internal');
						elements.push(element);
					}

					if (Deki.Plugin && Deki.Plugin.FilesTable) {
						Deki.Plugin.FilesTable.Refresh(editor.config.mindtouch.pageId);
					}

					CKEDITOR.tools.setTimeout(function() {
						editor.focus();

						if (CKEDITOR.env.ie) {
							var selection = editor.getSelection();
							selection && selection.unlock(true);
						}

						for (var i = 0; i < elements.length; i++) {
							editor.insertElement(elements[i]);
						}
					}, 0);
				}

				editor.unlock && editor.unlock();
				editor.focus();
			},
			error: function() {
				editor.unlock && editor.unlock();
				editor.focus();
			}
		};

		Deki.Plugin.AjaxRequest('page_attach_files', options);
	}

	// @see Supa.js

	function attachImage(data) {
		var editor = this,
			actionUrl = Deki.Plugin.AJAX_URL,
			fieldname = 'clipboard',
			filename = 'clipboard_' + new Date().getTime() + '.png',
			params = {
				'formatter': 'page_attach_files',
				'action': 'attach',
				'encoding': 'base64',
				'pageId': editor.config.mindtouch.pageId
			};

		// some constants for the request body
		// FIXME: make sure boundaryString is not part of bytes or the form values
		var boundaryString = 'AaB03x' + parseInt(Math.random() * 9999999, 10),
			boundary = '--' + boundaryString,
			cr = '\r\n';

		// build request body
		var body = '';
		body += boundary + cr;

		for (var name in params) {
			if (!params.hasOwnProperty(name)) {
				continue;
			}

			body += "Content-disposition: form-data; name=\"" + escape(name) + "\";" + cr;
			body += cr;
			body += encodeURI(params[name]) + cr;
			body += boundary + cr;
		}

		// add the screenshot as a file
		// FIXME: is this the correct encoding?
		body += "Content-Disposition: form-data; name=\"" + escape(fieldname) + "\"; filename=\"" + encodeURI(filename) + "\"" + cr;
		body += "Content-Type: application/octet-stream" + cr;
		body += "Content-Transfer-Encoding: base64" + cr;
		body += cr;
		body += data + cr;
		// last boundary, no extra cr here!
		body += boundary + "--" + cr;

		// finally, the Ajax request
		var isAsync = false,
			xrequest = new XMLHttpRequest();

		xrequest.open("POST", actionUrl, isAsync);

		// set request headers
		// please note: chromium needs charset set explicitly.
		//   It will autocomplete if it's missing but it won't work 
		//   (PHP backend only)?
		// also: chromium considers setting Content-length and Connection unsafe
		// this is no problem as all browsers seem to determine this automagically.
		xrequest.setRequestHeader("Content-Type", "multipart/form-data; charset=UTF-8; boundary=" + boundaryString);
		//xrequest.setRequestHeader( "Content-length", body.length );
		//xrequest.setRequestHeader( "Connection", "close" );
		xrequest.send(body);

		var result = jQuery.parseJSON(xrequest.responseText);

		if (result.success) {
			insertImages.call(editor, result.body);
		} else if (result.message) {
			throw result.message;
		}

		return result.success;
	}

	var pasteImageCmd = {
		canUndo: false,
		execCounter: 0,
		exec: function(editor) {
			if (editor.config.mindtouch.pageId == 0) {
				CKEDITOR.plugins.mindtouchsave.confirmSave(editor, 'pasteimage');
				return true;
			}

			var applet = CKEDITOR.document.getById('SupaApplet');

			if (!applet) {
				var html = '<applet id="SupaApplet" archive="' + CKEDITOR.getUrl('plugins/mindtouch/imageattach/supa/Supa.jar') + '" code="de.christophlinder.supa.SupaApplet" width="1" height="1">' +
					'<param name="imagecodec" value="png">' +
					'<param name="encoding" value="base64">' +
					'<param name="previewscaler" value="fit to canvas">' +
					'</applet>';

				applet = CKEDITOR.dom.element.createFromHtml(html, CKEDITOR.document);
				applet.setOpacity(0);
				CKEDITOR.document.getBody().append(applet);
			}

			var lang = editor.lang['mindtouch/imageattach'],
				status, msg = '';

			var ping = function(supaApplet) {
				try {
					return supaApplet.ping();
				} catch (e) {
					return false;
				}
			};

			if (!ping(applet.$)) {
				// wait for applet for a some time
				if (this.execCounter < 5) {
					this.execCounter++;
					editor.execCommand('pasteimage');
				} else {
					this.execCounter = 0;
					alert(lang.appletNotLoaded);
				}
				return false;
			}

			editor.lock && editor.lock();

			try {
				status = applet.$.pasteFromClipboard();
				switch (status) {
					case 0:
						break;
					case 1:
						msg = lang.unexpectedError;
						break;
					case 2:
						msg = lang.emptyClipboard;
						break;
					case 3:
						msg = lang.unsupportedFormat;
						break;
					default:
						msg = lang.unknownError;
						break;
				}
			} catch (ex) {
				msg = 'Internal exception: ' + ex;
			}

			if (status === 0) {
				try {
					var data = applet.$.getEncodedString();
					attachImage.call(editor, data);
				} catch (ex) {
					msg = ex;
				}
			}

			if (msg.length) {
				alert(msg);
			}

			editor.unlock && editor.unlock();
			editor.focus();

			return true;
		}
	};

	CKEDITOR.plugins.add('mindtouch/imageattach', {
		lang: 'en', // %REMOVE_LINE_CORE%
		icons: 'pasteimage', // %REMOVE_LINE_CORE%
		requires: 'dialog,mindtouch/dialog,mindtouch/save',
		init: function(editor) {
			editor.addCommand('pasteimage', pasteImageCmd);
			editor.ui.addButton('PasteImage', {
				label: editor.lang['mindtouch/imageattach'].pasteFromClipboard,
				command: 'pasteimage',
				toolbar: 'clipboard,60'
			});

			editor.on('contentDom', function() {
				editor.document.getBody().on('paste', function(ev) {
					var e = ev.data.$;

					// We need to check if event.clipboardData is supported (Chrome)
					if (e.clipboardData) {
						// Get the items from the clipboard
						var items = e.clipboardData.items;
						if (items) {
							// Loop through all items, looking for any kind of image
							for (var i = 0; i < items.length; i++) {
								if (items[i].type.indexOf('image') !== -1) {
									if (editor.config.mindtouch.pageId == 0) {
										CKEDITOR.plugins.mindtouchsave.confirmSave(editor);
										return true;
									}

									ev.data.preventDefault(true);

									editor.lock && editor.lock();

									// We need to represent the image as a file
									var blob = items[i].getAsFile(),
										reader = new FileReader();

									reader.onload = function(evt) {
										var dataURL = evt.target.result;
										dataURL = dataURL.replace(/^data:image\/(png|jpg);base64,/i, '');

										try {
											attachImage.call(editor, dataURL);
										} catch (ex) {
											alert(ex);
										}

										editor.unlock && editor.unlock();
									};

									reader.readAsDataURL(blob);
								}
							}
						}
					}
				});
			});

			// enable attaching files on drag and drop
			if (Deki.Plugin && Deki.Plugin.PageAttachFiles) {
				var up;

				var onAttach = function(evt, attachedFileIds) {
					insertImages.call(editor, attachedFileIds);
				};

				var stopPropagation = function(evt) {
					var stop = true;

					// files.length in webkit is 0 if event default action is not cancelled
					if (CKEDITOR.env.webkit) {
						try {
							for (var i = 0; i < evt.data.$.dataTransfer.types.length; i++) {
								if (evt.data.$.dataTransfer.types[i].toLowerCase() == 'files') {
									stop = false;
									break;
								}
							}
						} catch (ex) {};
					} else if (evt.data.$.dataTransfer) {
						var dt = evt.data.$.dataTransfer;

						if (typeof dt.files == 'undefined') {
							stop = false;
						} else if (dt.files && !!dt.files.length) {
							stop = false;							
						} else if (CKEDITOR.env.ie && dt.types) {
							for (var i = 0; i < dt.types.length; i++) {
								if (dt.types[i].toLowerCase() == 'files') {
									stop = false;
									break;
								}
							}
						}
					}

					stop && evt.data.$.stopImmediatePropagation();
				};


				var destroyUploader = function() {
					Deki.Plugin.Unsubscribe('PageAttachFiles.attach', onAttach);
					up && up.GetUploader().destroy();

					var body = editor.document && editor.document.getBody();
					if (body) {
						body.removeListener('dragenter', stopPropagation);
						body.removeListener('dragover', stopPropagation);
						body.removeListener('drop', stopPropagation);
					}
				};

				var initUploader = function() {
					var doc = editor.document,
						body = doc.getBody();

					// prevent bubbling event to window when files are not transfered
					// to allow drag/drop operations available into editor
					body.on('dragenter', stopPropagation);
					body.on('dragover', stopPropagation);
					body.on('drop', stopPropagation);

					if ( CKEDITOR.env.ie )
					{
						// use document as drop element in IE
						// @see EDT-496
						up = Deki.Plugin.PageAttachFiles.InitUploader( doc.$ );
					}
					else
					{
						up = Deki.Plugin.PageAttachFiles.InitUploader( doc.getWindow().$ );
					}

					Deki.Plugin.Subscribe('PageAttachFiles.attach', onAttach);
				};

				editor.on('contentDom', initUploader);
				editor.on('contentDomUnload', destroyUploader);
				editor.on('destroy', destroyUploader);
			}
		}
	});
})();
