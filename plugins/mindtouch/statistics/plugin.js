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
 * @file Words/characters count plugin.
 */

(function() {
	function calculateStatistics(editor) {
		if (!editor || !editor.document) {
			return;
		}

		var stat = {words: 0, chars: 0},
			content = '',
			node = editor.document.getBody(),
			next,
			parent, prevParent;

		while (node = node.getNextSourceNode(false, CKEDITOR.NODE_TEXT)) {
			// processing of words in different paragraphs
			parent = node.getParent();
			while (parent && CKEDITOR.dtd.$inline[parent.getName()]) {
				parent = parent.getParent();
			}

			if (prevParent && !prevParent.equals(parent)) {
				content += ' ';
			}

			content += node.getText();
			prevParent = parent;

			// process line breaks into pre blocks
			next = node.getNext();
			if (next && next.is && next.is('br')) {
				content += ' ';
			}
		}

		var words = content;

		// remove line breaks
		words = words.replace(/[\r\n]/g, ' ');

		// replace two or more spaces/tabs by one
		words = words.replace(/[ \t]{2,}/g, ' ');

		words = words.split(' ');

		// remove the first space
		if (words.length && !words[0].length) {
			words.shift();
		}

		// remove the last space
		if (words.length && !words[words.length - 1].length) {
			words.pop();
		}

		stat.words = words.length;
		stat.chars = content.length;

		updateLabels(editor, stat.words, stat.chars);
		editor.ui.infobar.showGroup('statistics');
	}

	function calculateStatisticsTimeout(evt) {
		var editor = evt.editor || evt.listenerData;
		CKEDITOR.tools.setTimeout(calculateStatistics, 0, this, editor);
	}

	function updateLabels(editor, words, chars) {
		var infobar = editor.ui.infobar,
			lang = editor.lang['mindtouch/statistics'];

		infobar.updateLabel('statistics', 'words', lang.words + ':&nbsp;' + words + ',&nbsp;');
		infobar.updateLabel('statistics', 'chars', lang.chars + ':&nbsp;' + chars);
	}

	CKEDITOR.plugins.add('mindtouch/statistics', {
		requires: 'mindtouch/infobar',
		lang: 'en',
		init: function(editor) {
			editor.on('contentDom', function() {
				editor.document.getBody().on('keydown', calculateStatisticsTimeout, this, editor);
				calculateStatisticsTimeout.call(this, arguments);
			});

			editor.on('mode', function(evt) {
				if (editor.mode == 'wysiwyg') {
					calculateStatisticsTimeout(evt);
				} else {
					editor.ui.infobar.hideGroup('statistics');
				}
			});

			editor.on('insertHtml', calculateStatisticsTimeout, null, null, 90);
			editor.on('insertElement', calculateStatisticsTimeout, null, null, 90);
			editor.on('insertText', calculateStatisticsTimeout, null, null, 90);
			editor.on('loadSnapshot', calculateStatisticsTimeout, null, null, 90);
			editor.on('dataReady', calculateStatisticsTimeout, null, null, 90);

			editor.on('uiReady', function() {
				editor.ui.infobar.addGroup('statistics');
				editor.ui.infobar.addLabel('statistics', 'words');
				editor.ui.infobar.addLabel('statistics', 'chars');
			});
		}
	});
})();
