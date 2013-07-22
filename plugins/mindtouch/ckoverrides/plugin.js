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
 * @file Plugin with overridden functions and behavior of CKEditor core.
 */

(function() {
	CKEDITOR.plugins.add('mindtouch/ckoverrides', {
		beforeInit: function(editor) {
			// replace title of page break button
			editor.lang.pagebreak.toolbar = editor.lang.pagebreak.alt;

			// replace CKEDITOR.tools.isArray since it does not work with frames
			// @see http://perfectionkills.com/instanceof-considered-harmful-or-how-to-write-a-robust-isarray/
			CKEDITOR.tools.isArray = function(object) {
				return Object.prototype.toString.call(object) === '[object Array]';
			}

			CKEDITOR.dom.node.prototype.clone = CKEDITOR.tools.override(CKEDITOR.dom.node.prototype.clone, function(cloneNodeFn) {
				return function(includeChildren, cloneId) {
					var clone = cloneNodeFn.apply(this, arguments);

					var removeDekiScriptAttributes = function(node) {
						if (node.nodeType != CKEDITOR.NODE_ELEMENT) {
							return;
						}

						if (!cloneId) {
							node.removeAttribute('function', false);
							node.removeAttribute('block', false);
							node.removeAttribute('init', false);
							node.removeAttribute('foreach', false);
							node.removeAttribute('if', false);
							node.removeAttribute('where', false);
							node.removeAttribute('ctor', false);
						}


						if (includeChildren) {
							var childs = node.childNodes;
							for (var i = 0; i < childs.length; i++) {
								removeDekiScriptAttributes(childs[i]);
							}
						}
					};

					removeDekiScriptAttributes(clone.$);

					return clone;
				};
			});
		},

		init: function(editor) {}
	});
})();