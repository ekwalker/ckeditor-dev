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
 * @file SCAYT customization.
 */
CKEDITOR.plugins.add('mindtouch/scaytcustom', {
	requires: 'scayt',
	init: function(editor) {
		CKEDITOR.on('scaytReady', function() {
			if (window.scayt) {
				// disable scayt inside pre elements
				window.scayt.prototype.nextNode = CKEDITOR.tools.override(window.scayt.prototype.nextNode, function(originalNextNode) {
					return function() {
						var nextNode = originalNextNode.call(this);
						nextNode.ignoreElementsRegex = /^(select|option|textarea|input|style|pre)$/i;
						return nextNode;
					};
				});

				// @see EDT-521
				window.scayt.prototype._setContent = CKEDITOR.tools.override(window.scayt.prototype._setContent, function(originalFn) {
					return function(func) {
						var focused = null;

						// if user highlighting text, set focused to false
						// to prevent inserting of bookmarks by scayt
						if (this._selectionStart) {
							focused = this._focused;
							this._focused = false;
						}

						originalFn.call(this, func);

						// restore the previous value
						if (focused !== null) {
							this._focused = focused;
						}
					};
				});

				// @see EDT-527
				window.scayt.minTime = 500;
				window.scayt.time = 500;

				// @see EDT-544
				window.scayt.prototype.nextBlockInterval = 0;
			}
		}, editor, null, 1);

		editor.on('contentDom', function() {
			var isKeyboardSelection = function(ev) {
				if (ev.name in { keydown: 1, keyup: 1 }) {
					switch (ev.data.getKeystroke()) {
						case CKEDITOR.SHIFT + 33: /* PAGE UP */
						case CKEDITOR.SHIFT + 34: /* PAGE DOWN */
						case CKEDITOR.SHIFT + 35: /* END */
						case CKEDITOR.SHIFT + 36: /* HOME */
						case CKEDITOR.SHIFT + 37: /* LEFT */
						case CKEDITOR.SHIFT + 38: /* UP */
						case CKEDITOR.SHIFT + 39: /* RIGHT */
						case CKEDITOR.SHIFT + 40: /* DOWN */
							return true;
							break;
						default:
							break;
					}
				}

				return false;
			};

			// set the flag when user highlighting text
			var onSelectionStart = function(ev) {
				var scayt = CKEDITOR.plugins.scayt.getScayt(editor);
				if (scayt && (isKeyboardSelection(ev) || ev.name == 'mousedown')) {
					scayt._selectionStart = true;
				}
			};

			var onSelectionEnd = function(ev) {
				var scayt = CKEDITOR.plugins.scayt.getScayt(editor);
				if (scayt) {
					scayt._selectionStart = false;
				}
			};

			editor.document.on('mousedown', onSelectionStart);
			editor.document.on('keydown', onSelectionStart);
			editor.document.on('mouseup', onSelectionEnd);
			editor.document.on('keyup', onSelectionEnd);
		});
	}
});
