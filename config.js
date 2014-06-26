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
		'mt-autogrow,' +
		'mt-autosave,' +
		'mt-ckoverrides,' +
		'mt-clearcontents,' +
		'mt-clipboard,' +
		'mt-commentdelete,' +
		'mt-definitionlist,' +
		'mt-dialog,' +
		'mt-elementbubble,' +
		'mt-enterkey,' +
		'mt-floatingtoolbar,' +
		'mt-format,' +
		'mt-image,' +
		'mt-imageattach,' +
		'mt-imageresize,' +
		'mt-infobar,' +
		'mt-infopanel,' +
		'mt-keystrokes,' +
		'mt-link,' +
		'mt-misc,' +
		'mt-pre,' +
		'mt-richcombomenu,' +
		'mt-save,' +
		'mt-scaytcustom,' +
		'mt-statistics,' +
		'mt-stylescombomenu,' +
		'mt-stylewrap,' +
		'mt-storage,' +
		'mt-table,' +
		'mt-tableclipboard,' +
		'mt-tableselection,' +
		'mt-tablehandlers,' +
		'mt-templates,' +
		'mt-transformations,' +
		'mt-video,' +
		'mt-viewmenu,' +
		'mt-whoisediting,' +
		'mt-zeroclipboard';

	var plugins = config.plugins.split( ',' );
	for ( var i = 0 ; i < plugins.length ; i++ ) {
		var plugin = plugins[ i ];
		if ( plugin.indexOf( 'mt-' ) == 0 ) {
			CKEDITOR.plugins.addExternal( plugin, CKEDITOR.basePath + '../plugins/' + plugin + '/' );
		}
	}

	CKEDITOR.plugins.addExternal( 'mt-extensions', CKEDITOR.basePath + '../plugins/mt-extensions/' );
	CKEDITOR.plugins.addExternal( 'scayt', CKEDITOR.basePath + '../vendor/scayt/' );
	// %REMOVE_END%

	config.bodyId = 'topic';
	config.bodyClass = 'deki-content-edit ' + CKEDITOR.env.cssClass;

	config.skin = 'mindtouch';
	config.skin = 'mindtouch,' + CKEDITOR.basePath + '../skins/mindtouch/'; // %REMOVE_LINE%

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

	// @todo: remove this workaround when all users custom configs will be updated
	if ( config.extraPlugins.length ) {
		config.extraPlugins = config.extraPlugins.replace( 'mindtouch/', 'mt-' );
	}
};

// %LEAVE_UNMINIFIED% %REMOVE_LINE%
