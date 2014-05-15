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
/* global CKEDITOR:true, Deki:true, _:true */

/**
 * @file Attach Image plugin.
 */
(function() {
    'use strict';
    function stripHost(href) {
        var host = document.location.protocol + '//' + document.location.host;
        if(href.indexOf(host) === 0) {
            href = href.substring(host.length);
        }
        return href;
    }
    function attachImages(editor, files) {
        var file = new Deki.PageFile(Deki.PageId);
        file.attachFile({ fileInput: files }).done(function (result) {
            var elements = [];
            _(result).each(function(file) {
                if('@href' in file.contents) {
                    var element = null;
                    var url = stripHost(file.contents['@href']);
                    var size = {
                        width: file.contents['@width'],
                        height: file.contents['@height']
                    };
                    if (size.width && size.height) {
                        element = editor.document.createElement('img');
                        element.setAttribute('src', url);
                        element.data('cke-saved-src', url);
                        element.setStyle('width', size.width + 'px');
                        element.setStyle('height', size.height + 'px');
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
                    parent.postMessage(JSON.stringify(file), window.location.protocol + '//' + window.location.host);
                }
            });
            CKEDITOR.tools.setTimeout(function() {
                editor.focus();
                if(CKEDITOR.env.ie) {
                    var selection = editor.getSelection();
                    selection.unlock(true);
                }
                for(var i = 0; i < elements.length; i++) {
                    editor.insertElement(elements[i]);
                }
            }, 0);

        }).fail(function() {
            Deki.Log('FAIL');
            Deki.Log(arguments);
        });
    }
    var doAttachCmd = {
        canUndo: false,
        execCounter: 0,
        exec: function(editor, files) {
            if (editor.config.mindtouch.pageId === 0) {
                CKEDITOR.plugins.mindtouchsave.confirmSave(editor, 'attachimage', files);
            } else {
                attachImages(editor, files);
            }
        }
    };
    CKEDITOR.plugins.add('mindtouch/imageattach', {
        lang: 'en', // %REMOVE_LINE_CORE%
        requires: 'dialog,mindtouch/dialog,mindtouch/save',
        init: function(editor) {// enable attaching files on drag and drop
            editor.addCommand('attachimage', doAttachCmd);
            editor.on('contentDom', function() {
                editor.document.getBody().on('paste', function(ev) {
                    var e = ev.data.$;

                    // We need to check if event.clipboardData is supported (Chrome)
                    if(e.clipboardData) {

                        // Get the items from the clipboard
                        var items = (e.clipboardData || e.originalEvent.clipboardData).items;
                        if(items) {

                            // Loop through all items, looking for any kind of image
                            _(items).chain().filter(function(item) {
                                return _.str.include(item.type, 'image');
                            }).each(function(image) {
                                Deki.Log('adding ' + image.type);
                                if(editor.config.mindtouch.pageId === 0) {
                                    CKEDITOR.plugins.mindtouchsave.confirmSave(editor);
                                } else {
                                    ev.data.preventDefault(true);
                                    editor.lock();

                                    // We need to represent the image as a file
                                    var extension = _(image.type).strRightBack('/');
                                    var blob = image.getAsFile();
                                    var reader = new FileReader();
                                    reader.onload = function(e) {
                                        var fileInfo = {
                                            base64: true,
                                            size: e.total,
                                            name: 'clipboard_' + new Date().getTime() + '.' + extension,
                                            encoded: this.result
                                        };
                                        try {
                                            attachImages(editor, fileInfo);
                                        } catch (ex) {
                                            window.alert(ex);
                                        }
                                    };
                                    reader.readAsDataURL(blob);
                                    editor.unlock();
                                }
                        });
                    }}
                });
            });
            var stopPropagation = function(event) {
                event.preventDefault();
                event.stopPropagation();
            };
            var destroyUploader = function() {
                if(editor.body) {
                    var body = editor.document.getBody();
                    if(body) {
                        body.removeListener('dragenter', stopPropagation);
                        body.removeListener('dragover', stopPropagation);
                        body.removeListener('drop', function(e) {
                            stopPropagation(e);
                            if(e.originalEvent.dataTransfer && e.originalEvent.dataTransfer.files.length) {
                                var files = e.originalEvent.dataTransfer.files;
                                editor.execCommand('attachimage', files);
                            }
                        });
                    }
                }
            };
            var initUploader = function() {

                // prevent bubbling event to window when files are not transfered
                // to allow drag/drop operations available into editor
                var $body = $(editor.document.getBody().$);
                $body.on('dragenter', stopPropagation).on('dragover', stopPropagation).on('drop', function(e) {
                    stopPropagation(e);
                    if(e.originalEvent.dataTransfer && e.originalEvent.dataTransfer.files.length) {
                        var files = e.originalEvent.dataTransfer.files;
                        editor.execCommand('attachimage', files);
                    }
                });
            };
            editor.on('contentDom', initUploader);
            editor.on('contentDomUnload', destroyUploader);
            editor.on('destroy', destroyUploader);
        }
    });
})();
