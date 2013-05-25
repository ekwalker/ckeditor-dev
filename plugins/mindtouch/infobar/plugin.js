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

CKEDITOR.plugins.add('mindtouch/infobar', {
	requires: 'mindtouch/infopanel',
	init: function(editor) {
		editor.ui.infobar = new CKEDITOR.ui.infoPanel(CKEDITOR.document, {
			className: 'cke_infobar'
		});

		editor.on( 'uiSpace', function(evt) {
			if (evt.data.space == 'top') {
				evt.removeListener();
				evt.data.html += editor.ui.infobar.renderHtml(evt.editor);
			}
		});

		editor.on('dataReady', function() {
			editor.editable().addClass('cke_infobar_enabled');
		});
	},
	onLoad : function() {
		var css = [
			'.cke_infobar { position: absolute; z-index: 1; height: 15px; padding: 5px 0; overflow: hidden; border-radius: 0 0 0 5px; background-color: #cfd1cf; bottom: -25px; right: 0; }',
			'.cke_infobar .cke_infopanel_group a { text-decoration: underline; color: #333; cursor: pointer; }',
			'.cke_infobar .cke_infopanel_group { float: left; background: transparent url(/deki/plugins/page_editor_ckeditor/images/infobar-delim.gif) scroll no-repeat right center; padding: 0 1em; }',
			'.cke_infobar span { cursor: default; -ms-filter: alpha(opacity=70); opacity: 0.70; }',
			'.cke_hc .cke_infobar span { opacity: 1.0; -ms-filter: alpha(opacity=100); }'
		];
		CKEDITOR.document.appendStyleText(css.join(''));
	}
});
