/**
 * @license Copyright (c) 2003-2013, CKSource - Frederico Knabben. All rights reserved.
 * For licensing, see LICENSE.html or http://ckeditor.com/license
 */

if ( CKEDITOR.editorConfig ) {
	CKEDITOR.customEditorConfigFn = CKEDITOR.editorConfig;
}

CKEDITOR.editorConfig = function( config ) {
	// %REMOVE_START%
	config.plugins =
		'about,' +
		'autogrow,' +
		'basicstyles,' +
		'bidi,' +
		'blockquote,' +
		'clipboard,' +
		'colorbutton,' +
		'colordialog,' +
		'contextmenu,' +
		'dialogadvtab,' +
		'elementspath,' +
		'enterkey,' +
		'entities,' +
		'fakeobjects,' +
		'find,' +
		'floatingspace,' +
		'font,' +
		'format,' +
		'horizontalrule,' +
		'htmlwriter,' +
		'image,' +
		'indent,' +
		'justify,' +
		'link,' +
		'list,' +
		'liststyle,' +
		'newpage,' +
		'pagebreak,' +
		'pastefromword,' +
		'pastetext,' +
		'removeformat,' +
		'save,' +
		'selectall,' +
		'sharedspace,' +
		'showblocks,' +
		'showborders,' +
		'sourcearea,' +
		'specialchar,' +
		'stylescombo,' +
		'tab,' +
		'table,' +
		'tableresize,' +
		'tabletools,' +
		'toolbar,' +
		'undo,' +
		'wysiwygarea,' +
		'onchange,' +
		'scayt,' +
		'mindtouch/autogrow,' +
		'mindtouch/autosave,' +
		'mindtouch/ckoverrides,' +
		'mindtouch/clearcontents,' +
		'mindtouch/clipboard,' +
		'mindtouch/commentdelete,' +
		'mindtouch/definitionlist,' +
		'mindtouch/dialog,' +
		'mindtouch/elementbubble,' +
		'mindtouch/enterkey,' +
		'mindtouch/floatingtoolbar,' +
		'mindtouch/format,' +
		'mindtouch/image,' +
		'mindtouch/imageattach,' +
		'mindtouch/imageresize,' +
		'mindtouch/infobar,' +
		'mindtouch/infopanel,' +
		'mindtouch/keystrokes,' +
		'mindtouch/link,' +
		'mindtouch/misc,' +
		'mindtouch/pre,' +
		'mindtouch/richcombomenu,' +
		'mindtouch/save,' +
		'mindtouch/scaytcustom,' +
		'mindtouch/statistics,' +
		'mindtouch/stylescombomenu,' +
		'mindtouch/stylewrap,' +
		'mindtouch/storage,' +
		'mindtouch/table,' +
		'mindtouch/tableclipboard,' +
		'mindtouch/tableselection,' +
		'mindtouch/tablehandlers,' +
		'mindtouch/templates,' +
		'mindtouch/transformations,' +
		'mindtouch/video,' +
		'mindtouch/viewmenu,' +
		'mindtouch/whoisediting,' +
		'mindtouch/zeroclipboard';
	// %REMOVE_END%

	config.bodyId = 'topic';
	config.bodyClass = 'deki-content-edit ' + CKEDITOR.env.cssClass;

	config.skin = 'mindtouch';

	config.menu_groups = 'clipboard,' +
		'form,' +
		'anchor,link,image,flash,' +
		'checkbox,radio,textfield,hiddenfield,imagebutton,button,select,textarea,div,' +
		'tablecell,tablecellalignment,tablecellproperties,tablerow,tablecolumn,tableinsert,tabledelete,table';

	config.allowedContent = true;

	// SCAYT config
	var protocol = document.location.protocol;
	protocol = protocol.search( /https?:/) != -1 ? protocol : 'http:';
	config.scayt_srcUrl = protocol + '//spellcheck.mindtouch.us/spellcheck/lf/scayt/scayt.js';
	config.scayt_contextCommands = 'ignore|ignoreall';
	config.scayt_maxSuggestions = 4;
	config.scayt_moreSuggestions = 'off';
	config.scayt_customerid = '1:wiN6M-YQYOz2-PTPoa2-3yaA92-PmWom-3CEx53-jHqwR3-NYK6b-XR5Uh1-M7YAp4';

	config.resize_enabled = false;
	
	config.entities = false;
	config.entities_greek = false;
	config.entities_latin = false;
	
	config.startupFocus = true;
	
	config.tabSpaces = 4;

	// @see EDT-235
	config.dialog_buttonsOrder = 'ltr';

	config.autoGrow_minHeight = 250;
	config.autoGrow_onStartup = true;
	config.autoGrow_bottomSpace = 50;

	config.format_p = { element : 'p', attributes : { 'class' : '' } };

	// @see MT-10759
	config.pasteFromWordRemoveFontStyles = false;

	config.stylesSet = [
		{ name : 'None', element : 'p', attributes : { 'class' : '' }, group : 'default', priority : 10 },
		{ name : 'Formatted', element : 'pre', attributes : { 'class' : '' }, group : 'default', priority : 30 },
		{ name : 'Blockquote', element : 'blockquote', group : 'default', priority : 30, command : 'blockquote' },
		{ name : 'Comment', element : 'p', attributes : { 'class' : 'comment' }, group : 'default', priority : 30, keystroke : CKEDITOR.CTRL + CKEDITOR.ALT + 77 /*M*/ },

		{ name : 'DekiScript', element : 'pre', attributes : { 'class' : 'script' }, group : 'executable', priority : 40, keystroke : CKEDITOR.CTRL + CKEDITOR.ALT + 83 /*S*/ },
		{ name : 'JavaScript', element : 'pre', attributes : { 'class' : 'script-jem' }, group : 'executable', priority : 40 },
		{ name : 'CSS', element : 'pre', attributes : { 'class' : 'script-css' }, group : 'executable', priority : 40 },

		{ name : 'Conditional Text (Anonymous only)', element : 'div', attributes : { 'if' : 'user.anonymous', 'class' : 'mt-style-conditional' }, wrap : true, group : 'conditional', priority : 20 },
		{ name : 'Conditional Text (Community-Member only)', element : 'div', attributes : { 'if' : 'user.unseated', 'class' : 'mt-style-conditional' }, wrap : true, group : 'conditional', priority : 20 },
		{ name : 'Conditional Text (Pro-Member only)', element : 'div', attributes : { 'if' : 'user.seated', 'class' : 'mt-style-conditional' }, wrap : true, group : 'conditional', priority : 20 }
	];

	config.toolbar =
		[
			['MindTouchSave','MindTouchCancel'],
			['ViewMenu'],
			['WhoIsEditing'],
			['Cut','Copy','Paste','PasteText','PasteFromWord'],
			['Transformations'],
			['Undo','Redo','-','Find','Replace','-','SelectAll'],
			['HorizontalRule','SpecialChar','PageBreak'],
			'/',
			['Font','FontSize'],
			['TextColor','BGColor'],
			['Bold','Italic','Underline','Strike','-','Subscript','Superscript','Code','PlainText','RemoveFormat'],
			['NumberedList','BulletedList','DefinitionList','-','Outdent','Indent'],
			['JustifyLeft','JustifyCenter','JustifyRight','JustifyBlock'],
			'/',
			['Normal','H1','H2','H3','Hx','StylesMenu'],
			['MindTouchLink','Unlink','Anchor','TableOneClick','MindTouchImage','Video','MindTouchTemplates']
		];

	if ( CKEDITOR.customEditorConfigFn ) {
		CKEDITOR.customEditorConfigFn.call( this, config );
	}
};

// %LEAVE_UNMINIFIED% %REMOVE_LINE%
