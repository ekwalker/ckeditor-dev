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
 * @file MindTouch plugin.
 */

CKEDITOR.editor.prototype.lock = function()
{
	if ( !this._.mask )
	{
		var container = this.container,
			mask = new CKEDITOR.dom.element( 'div', CKEDITOR.document ),
			preloader = new CKEDITOR.dom.element( 'div', CKEDITOR.document ),
			dimensions = { width : container.$.offsetWidth, height : container.$.offsetHeight },
			pos = { x : 0, y : 0 },
			toolbarHeight;

		if ( this.sharedSpaces && this.sharedSpaces.top )
		{
			var toolbar = this.sharedSpaces.top.getParent().getParent().getParent().getParent(),
			toolbarHeight = toolbar.$.offsetHeight;
			dimensions.height += toolbarHeight;

			pos.y = -1 * toolbarHeight;
		}
		else
		{
			toolbarHeight = this.ui.space( 'top' ).$.offsetHeight;
		}
		
		mask.setStyles(
			{
				'position' : 'absolute',
				'left' : pos.x + 'px',
				'top' : pos.y + 'px',
				'z-index' : 99,
				'opacity' : 0.5,
				'-ms-filter' : 'alpha(opacity=50)',
				'filter' : 'alpha(opacity=50)',
				'background-color' : '#fff',
				'cursor' : 'progress'
			}
		);
			
		container.setStyle( 'position', 'relative' );

		mask.setStyle( 'width', dimensions.width + 'px' );
		mask.setStyle( 'height', dimensions.height + 'px' );

		var scrollPos = CKEDITOR.document.getWindow().getScrollPosition(),
			containerPos = container.getDocumentPosition(),
			adjustment = 0;

		if ( scrollPos.y + toolbarHeight > containerPos.y )
		{
			adjustment = scrollPos.y - containerPos.y + toolbarHeight;
		}

		preloader.setStyles(
			{
				'position' : 'absolute',
				'left' : Math.round( dimensions.width / 2 ) - 33 + 'px',
				'top' : toolbarHeight + adjustment + 20 + 'px',
				'width' : '66px',
				'height' : '66px',
				'z-index' : 100,
				'background' : 'transparent url(/skins/common/images/anim-large-circle.gif) scroll no-repeat 0 0',
				'cursor' : 'progress'
			}
		);
	
		mask.append( preloader );
		container.append( mask );
	
		this._.mask = mask;
	}

	this.fire( 'lock' );
	
	this.focusManager.blur();
	
	return this._.mask;
};

CKEDITOR.editor.prototype.unlock = function()
{
	if ( this._.mask )
	{
		this._.mask.remove();
		this._.mask = null;
	}

	this.fire( 'unlock' );
};

(function()
{
	/**
	 * @see #0006241
	 * @see #0008541
	 */
	var checkCaret = function( evt )
	{
		var editor = this;

		if ( evt.name == 'keypress' )
		{
			var keyCode = evt.data.getKeystroke();
			// ignore if positioning key is not pressed.
			// left or up arrow keys need to be processed as well, since <a> links can be expanded in Gecko's editor
			// when the caret moved left or up from another block element below.
			if ( keyCode < 33 || keyCode > 40 )
				return ;
		}

		var moveCursor = function()
		{
			var selection = editor.getSelection(),
				ranges = selection && selection.getRanges( true ),
				range = ranges && ranges[0];

			if ( !range || !range.collapsed )
				return ;

			var node = range.endContainer;

			// only perform the patched behavior if we're at the end of a text node.
			if ( node.type != CKEDITOR.NODE_TEXT )
				return;

			var length = node.getLength();

			if ( length != range.endOffset )
				return;

			var lineBreakPos = node.getText().lastIndexOf( '\n' );
			if ( length > 0 && lineBreakPos == ( length - 1 ) )
			{
				range = new CKEDITOR.dom.range( editor.document );
				range.setStart( node, lineBreakPos );
				range.setEnd( node, lineBreakPos );

				selection.selectRanges( [ range ] );
			}
		}

		setTimeout( moveCursor, 1 ) ;
	};
	
	// from a11yhelp dialog
	var keyMap =
	{
		8 : "BACKSPACE",
		9 : "TAB" ,
		13 : "ENTER" ,
		16 : "SHIFT" ,
		17 : "CTRL" ,
		18 : "ALT" ,
		19 : "PAUSE" ,
		20 : "CAPSLOCK" ,
		27 : "ESCAPE" ,
		33 : "PAGE UP" ,
		34 : "PAGE DOWN" ,
		35 : "END" ,
		36 : "HOME" ,
		37 : "LEFT ARROW" ,
		38 : "UP ARROW" ,
		39 : "RIGHT ARROW" ,
		40 : "DOWN ARROW" ,
		45 : "INSERT" ,
		46 : "DELETE" ,
		91 : "LEFT WINDOW KEY" ,
		92 : "RIGHT WINDOW KEY" ,
		93 : "SELECT KEY" ,
		96 : "NUMPAD  0" ,
		97 : "NUMPAD  1" ,
		98 : "NUMPAD  2" ,
		99 : "NUMPAD  3" ,
		100 : "NUMPAD  4" ,
		101 : "NUMPAD  5" ,
		102 : "NUMPAD  6" ,
		103 : "NUMPAD  7" ,
		104 : "NUMPAD  8" ,
		105 : "NUMPAD  9" ,
		106 : "MULTIPLY" ,
		107 : "ADD" ,
		109 : "SUBTRACT" ,
		110 : "DECIMAL POINT" ,
		111 : "DIVIDE" ,
		112 : "F1" ,
		113 : "F2" ,
		114 : "F3" ,
		115 : "F4" ,
		116 : "F5" ,
		117 : "F6" ,
		118 : "F7" ,
		119 : "F8" ,
		120 : "F9" ,
		121 : "F10" ,
		122 : "F11" ,
		123 : "F12" ,
		144 : "NUM LOCK" ,
		145 : "SCROLL LOCK" ,
		186 : ";" ,
		187 : "=" ,
		188 : "," ,
		189 : "-" ,
		190 : "." ,
		191 : "/" ,
		192 : "`" ,
		219 : "[" ,
		220 : "\\" ,
		221 : "]" ,
		222 : "'"
	};

	// Modifier keys override.
	if ( CKEDITOR.env.mac )
	{
		keyMap[ CKEDITOR.ALT ] = '&#8997;';
		keyMap[ CKEDITOR.SHIFT ] = '&#8679;';
		keyMap[ CKEDITOR.CTRL ] = '&#8984;';
	}
	else
	{
		keyMap[ CKEDITOR.ALT ] = 'ALT';
		keyMap[ CKEDITOR.SHIFT ] = 'SHIFT';
		keyMap[ CKEDITOR.CTRL ] = 'CTRL';
	}

	// Sort in desc.
	var modifiers = [ CKEDITOR.ALT, CKEDITOR.SHIFT, CKEDITOR.CTRL ];

	function representKeyStroke( keystroke )
	{
		var quotient,
				modifier,
				presentation = [];

		for ( var i = 0; i < modifiers.length; i++ )
		{
			modifier = modifiers[ i ];
			quotient = keystroke / modifiers[ i ];
			if ( quotient > 1 && quotient <= 2 )
			{
				keystroke -= modifier;
				presentation.push( keyMap[ modifier ] );
			}
		}
		
		presentation.reverse();

		presentation.push( keyMap[ keystroke ]
			|| String.fromCharCode( keystroke ) );

		if ( CKEDITOR.env.mac )
			return presentation.join( '' );
		else
			return presentation.join( '+' );
	}
	
	/**
	 * Merge a <pre> block with a previous sibling if available.
	 *
	 * from style plug-in
	 */
	function mergePres( preBlock, previousBlock )
	{
		// Merge the previous <pre> block contents into the current <pre>
		// block.
		//
		// Another thing to be careful here is that currentBlock might contain
		// a '\n' at the beginning, and previousBlock might contain a '\n'
		// towards the end. These new lines are not normally displayed but they
		// become visible after merging.
		var mergedHtml = replace( previousBlock.getHtml(), /\n$/, '' ) + '\n' +
				replace( preBlock.getHtml(), /^\n/, '' ) ;

		previousBlock.setHtml( mergedHtml );
		preBlock.remove();
	}
	
	// Wrapper function of String::replace without considering of head/tail bookmarks nodes.
	function replace( str, regexp, replacement )
	{
		var headBookmark = '',
			tailBookmark = '';

		str = str.replace( /(^<span[^>]+data-cke-bookmark.*?\/span>)|(<span[^>]+data-cke-bookmark.*?\/span>$)/gi,
			function( str, m1, m2 ){
					m1 && ( headBookmark = m1 );
					m2 && ( tailBookmark = m2 );
				return '';
			} );
		return headBookmark + str.replace( regexp, replacement ) + tailBookmark;
	}
	
	CKEDITOR.plugins.add( 'mt-misc',
	{
		requires : 'a11yhelp',
		init : function( editor )
		{
			editor.setKeystroke(CKEDITOR.ALT + 13 /*ENTER*/, 'source');

			/**
			 * Force pasting mode in pre blocks
			 *
			 * @see #0007029
			 * @see #MT-9352
			 */
			if ( !editor.config.forcePasteAsPlainText )
			{
				var getPasteMode = function( mode, evt )
				{
					var sel = editor.getSelection(),
						pre = sel && sel.getStartElement().getAscendant( 'pre', true );

					if ( pre && ( CKEDITOR.env.webkit || /(^|\s+)script(\s+|-|$)/.test( pre.getAttribute( 'class' ) ) ) )
					{
						mode = 'text';
					}
					else if ( evt && evt.data && evt.data.$.clipboardData )
					{
						// detect if clipboard contains only plain text
						// if so -- force paste as plain text
						// @see EDT-400
						var clipboardData = evt.data.$.clipboardData;

						if ( clipboardData.types && CKEDITOR.tools.isArray( clipboardData.types ) && clipboardData.types.length )
						{
							var newMode = 'text';

							for ( var i = 0 ; i < clipboardData.types.length ; i++ )
							{
								if ( clipboardData.types[ i ].toLowerCase() != 'text/plain' )
								{
									newMode = 'html';
									break;
								}
							}

							if ( newMode == 'text' )
							{
								mode = newMode;
							}
						}
					}
					
					return mode;
				};
				
				// Intercept the default pasting process.
				editor.on( 'beforeCommandExec', function ( evt )
				{
					if ( evt.data.name == 'paste' )
					{
						var mode = getPasteMode( evt.data.commandData );
						// Do NOT overwrite if HTML format is explicitly requested.
						if ( mode == 'text' )
						{
							editor.execCommand( 'pastetext' );
							evt.cancel();
						}
					}
				}, null, null, 0 );

				editor.on( 'beforePaste', function( evt )
					{
						evt.data.mode = getPasteMode( evt.data.mode, evt.data.event );
					});
			}

			/**
			 * sometimes Webkit and Opera loses <table> element
			 * @see 0008930
			 */
			if ( CKEDITOR.env.webkit || CKEDITOR.env.opera )
			{
				editor.on( 'paste', function( evt )
					{
						if ( !evt.data.html )
						{
							return;
						}

						var fragment = CKEDITOR.htmlParser.fragment.fromHtml( evt.data.html ),
							newFragment = new CKEDITOR.htmlParser.fragment(),
							tableElement = new CKEDITOR.htmlParser.element( 'table' ),
							tableFix = false,
							dtd = CKEDITOR.dtd,
							i;

						for ( i = 0 ; i < fragment.children.length ; i++ )
						{
							var child = fragment.children[ i ];
							if ( dtd.$tableContent[ child.name ] )
							{
								tableElement.add( child );
								tableFix = true;
							}
							else
							{
								if ( tableElement.children.length )
								{
									newFragment.add( tableElement );
									tableElement = new CKEDITOR.htmlParser.element( 'table' );
								}

								newFragment.add( child );
							}
						}

						if ( tableElement.children.length )
						{
							newFragment.add( tableElement );
						}

						if ( tableFix )
						{
							var writer = new CKEDITOR.htmlParser.basicWriter();

							newFragment.writeHtml( writer );
							evt.data[ 'html' ] = writer.getHtml( true );
						}
					});
			}

			/**
			 * Webkit specific fixes
			 */
			if ( CKEDITOR.env.webkit )
			{
				var clipboard = '';

				// save the selected text so we can check it on pasting
				// and compare with pasting content
				var saveSelectedText = function()
				{
					var sel = editor.getSelection();
					clipboard = sel ? sel.getSelectedText().replace( /\s+/g, '' ) : '';
				};

				editor.on( 'key', function( evt )
					{
						switch ( evt.data.keyCode )
						{
							case CKEDITOR.CTRL + 67:
							case CKEDITOR.CTRL + 88:
								saveSelectedText();
								break;
						}
					});

				editor.on( 'beforeCommandExec', function( evt )
					{
						if ( evt.data.name in { 'copy':1, 'cut':1 } )
						{
							saveSelectedText();
						}
					});

				editor.on( 'zcBeforeCopy', saveSelectedText, null, null, 100 );
				editor.on( 'zcBeforeCut', saveSelectedText, null, null, 100 );

				/*
				 * Webkit adds a lot of styles on copying,
				 * so if content was copied not from editor, remove styles
				 * @see #0008224
				 * @see #0007885
				 * @see EDT-247
				 */
				editor.on( 'paste', function( evt )
					{
						if ( !evt.data.html )
						{
							return;
						}

						var div = new CKEDITOR.dom.element( 'div', editor.document ),
							dataModified = false;

						div.setHtml( evt.data.html );
						
						// Webkit adds white background color to pre blocks on copying
						var preElements = div.getElementsByTag( 'pre' ),
							count = preElements.count(),
							i, pre;
						
						for ( i = 0 ; i < count ; i++ )
						{
							pre = preElements.getItem( i );
							if ( pre.getStyle( 'background-color' ) == 'rgb(255, 255, 255)' )
							{
								pre.removeStyle( 'background-color' );
								dataModified = true;
							}
						}

						// check if the content was copied out of the editor
						// and if so remove any style attributes
						if ( div.getText().replace( /\s+/g, '' ) !== clipboard )
						{
							var node = div;
							while ( node = node.getNextSourceNode( false, CKEDITOR.NODE_ELEMENT ) ) // one =
							{
								node.removeAttribute( 'style' );
							}

							dataModified = true;
						}

						if ( dataModified )
						{
							evt.data[ 'html' ] = div.getHtml();
						}
					});

				var insertHtmlNodeName;

				editor.on( 'insertHtml', function( evt )
					{
						var editor = evt.editor;

						if ( !editor.mode == 'wysiwyg' )
						{
							return;
						}

						var data = evt.data;
						
						if ( editor.dataProcessor )
							data = editor.dataProcessor.toHtml( data );

						var div = new CKEDITOR.dom.element( 'div', editor.document );
						div.setHtml( data );
						
						var first = div.getFirst();
						
						// webkit sometimes wraps copied content with div, remove it
						// @see #MT-10604
						if ( div.getChildren().count() == 1 && first && first.is && first.is( 'div' ) )
						{
							first.remove( true );
							evt.data = div.getHtml();
						}
						
						var selection = editor.getSelection(),
							range = selection && selection.getRanges( true )[ 0 ],
							startContainer = range && range.collapsed && range.startContainer;
							
						// if we are pasting block content into the empty block
						// we can get the following structure
						// <p><div><p>pasted text</p></div></p>
						// so if current container is empty mark it for remove
						if ( startContainer && startContainer.is && startContainer.is( 'p', 'div' ) )
						{
							var emptyNode = range.startContainer.getFirst();

							if ( !emptyNode ||
								( !emptyNode.getNext() &&
									( ( emptyNode.is && emptyNode.is( 'br' ) ) ||
									( emptyNode.type == CKEDITOR.NODE_TEXT && emptyNode.getText().length == 0 ) ) ) )
							{
								range.startContainer.data( 'cke-remove', 1 );
							}
						}
					});

				editor.on( 'insertHtml', function() {
					var elementList = editor.document.$.querySelectorAll( '[data-cke-remove]' );
					for ( var i = 0 ; i < elementList.length ; i++ )
					{
						var node = CKEDITOR.dom.element.get( elementList.item( i ) );
						node.remove( true );
					}
				}, null, null, 1000 );

				/**
				 * @see #0007663: Pasting text into editor inserts divs
				 * fix for pasting issue in webkit
				 */
				/**
				 * remove the last <br> following after the line break (for source mode)
				 * add the <br> element after the last line break in pre (for wysiwyg mode)
				 * @see EDT-404
				 */
				var dataFilter = editor.dataProcessor && editor.dataProcessor.dataFilter,
					htmlFilter = editor.dataProcessor && editor.dataProcessor.htmlFilter;

				var dataFilterRule =
					{
						elements :
							{
								meta : function( element )
								{
									delete element.name;
								},
								
								span : function( element )
								{
									if ( element.attributes[ 'class' ] == 'Apple-style-span' )
										delete element.name;
								},
								pre : function( element )
								{
									var lastChild = element.children.length && element.children[ element.children.length - 1 ];
									if ( !lastChild || ( lastChild.type == CKEDITOR.NODE_TEXT && /\n$/g.test( lastChild.value ) ) )
									{
										// append the bogus <br> to the empty <pre> block
										// or if <pre> block has the trailing line break 
										var br = new CKEDITOR.htmlParser.element( 'br' );
										element.children.push( br );
									}
								}
							}
					};

				var htmlFilterRule =
					{
						elements :
							{
								pre : function( element )
								{
									if ( element.children.length )
									{
										var lastChild = element.children[ element.children.length - 1 ];
										if ( lastChild.value && lastChild.value == "\n" )
										{
											// this line break caused by bogus <br>, remove it
											element.children.pop();
										}
									}
								}
							}
					};
				
				dataFilter && dataFilter.addRules( dataFilterRule );
				htmlFilter && htmlFilter.addRules( htmlFilterRule );

				
				// @see MT-8868
				editor.on( 'contentDom', function()
					{
						var body = editor.document.getBody(),
							draggedElement;
						
						body.on( 'dragstart', function( evt )
							{
								draggedElement = evt.data.getTarget();
								
								if ( draggedElement )
								{
									if ( draggedElement.type == CKEDITOR.NODE_TEXT )
									{
										draggedElement = draggedElement.getParent();
									}
									
									// webkit won't to add any styles
									// if element has style attribute
									if ( !draggedElement.hasAttribute( 'style' ) )
									{
										draggedElement.setAttribute( 'style', '' );
									}
									
									// webkit splits pre block on dragging
									// so we add custom data attribute to find split block
									// @see MT-9985
									draggedElement.is( 'pre' ) && draggedElement.data( 'cke-draggedpre', true );
								}
							});
						
						body.on( 'dragend', function( evt )
							{
								var nodeList, count, i, node;
								
								if ( draggedElement )
								{
									// remove empty style attributes which was added on dragstart event
									
									nodeList = editor.document.getElementsByTag( draggedElement.getName() );
									count = nodeList.count();
										
									for ( i = 0 ; i < count ; i++ )
									{
										node = nodeList.getItem( i );
										if ( node && node.hasAttribute( 'style' ) && !node.getAttribute( 'style' ).length )
										{
											node.removeAttribute( 'style' );
										}
									}
									
									// if pre block was split merge blocks back into one
									// @see MT-9985
									if ( draggedElement.is( 'pre' ) )
									{
										nodeList = editor.document.getElementsByTag( 'pre' );
										
										for ( i = 0 ; i < nodeList.count() ; i++ )
										{
											node = nodeList.getItem( i );
											if ( node && node.data( 'cke-draggedpre' ) )
											{
												var next = node.getNext();
												if ( next && next.data && next.data( 'cke-draggedpre' ) )
												{
													var sel = editor.getSelection(),
														ranges = sel && sel.getRanges(),
														range = ranges && ranges[ 0 ],
														bookmark = range && range.createBookmark( true );
													
													mergePres( next, draggedElement );
													
													bookmark && range.moveToBookmark( bookmark );
													range && range.select();
													break;
												}
											}
										}
									}
								}
								
								// remove dummy span
								
								nodeList = editor.document.getElementsByTag( 'span' );
								
								for ( i = nodeList.count() - 1 ; i >= 0 ; i-- )
								{
									node = nodeList.getItem( i );
									if ( node && node.hasClass( 'Apple-style-span' ) )
									{
										node.remove( true );
									}
								}
							});
							
						editor.document.on( 'DOMNodeInserted', function( evt )
							{
								var target = evt.data.getTarget(),
									name = target.getName && target.getName(),
									styles = [];
									
								switch ( name )
								{
									case 'font':
										if ( target.hasAttribute( 'face' ) )
										{
											var face = target.getAttribute( 'face' );
											styles.push( new CKEDITOR.style( editor.config.font_style, { 'family' : face } ) );
										}
										
										if ( target.hasAttribute( 'size' ) )
										{
											var size = target.getAttribute( 'size' ),
												fontSizes = [ 8, 10, 13, 16, 18, 24, 32, 48 ];
												
											size = fontSizes[ size ] ? fontSizes[ size ] + 'px' : 'medium';
											styles.push( new CKEDITOR.style( editor.config.fontSize_style, { 'size' : size } ) );
										}
										break;
									case 'b':
										styles.push( new CKEDITOR.style( editor.config.coreStyles_bold ) );
										break;
									case 'i':
										styles.push( new CKEDITOR.style( editor.config.coreStyles_italic ) );
										break;
									default:
										break;
								}
								
								if ( styles.length )
								{
									setTimeout(function()
									{
										var sel = editor.getSelection(),
											ranges = sel && sel.getRanges(),
											range = ranges && ranges[ 0 ];

										if ( range )
										{
											range.selectNodeContents( target );
											for ( var i in styles )
											{
												styles[ i ].applyToRange( range );
											}
											range.collapse( true );
											range.select();
										}
									}, 0);
								}
							});
					});				
			}

			/**
			 * Firefox specific fixes
			 */
			if ( CKEDITOR.env.gecko )
			{
				editor.on( 'contentDom', function()
					{
						editor.document.on( 'keypress', checkCaret, editor );
						editor.document.on( 'click', checkCaret, editor );

						/**
						 * Sometimes FF pastes the content after <br> at the end of the line
						 * We replace <br> to \n before pasting and return it back after
						 * 
						 * @see #0008541
						 */
						editor.document.getBody().on( 'beforepaste', function()
							{
								var sel = editor.getSelection(),
									ranges = sel && sel.getRanges( true ),
									range = ranges && ranges[0];

								var isPre = sel && sel.getStartElement().getAscendant( 'pre', true );

								if ( range && range.collapsed && isPre )
								{
									var node = range.endContainer;
									var br, lb;

									if ( node.is && node.is( 'pre' ) )
									{
										br = node.getChildren().getItem( range.endOffset );
									}
									else if ( node && node.type == CKEDITOR.NODE_TEXT )
									{
										br = node.getNext();
									}

									if ( br && br.is && br.is( 'br' ) )
									{
										lb = editor.document.createText( "\n" );
										lb.replace( br );

										window.setTimeout( function()
											{
												br.replace( lb );
											}, 0 );
									}
								}
							});
					});

				/**
				 * Remove last <br>
				 * @see MT-10703
				 */
				editor.on( 'getData', function( evt )
					{
						var data = evt.data.dataValue;
						data = data.replace( /<br \/>$/, '' );
						
						evt.data.dataValue = data;
					});

				// if list element contains only ul/ol element
				// move the last one to the previous list element
				// @see EDT-20
				var fixNestedList = function()
				{
					var sel = editor.getSelection(),
						startElement = sel && sel.getStartElement(),
						li = startElement && startElement.getAscendant( 'li', true );

					if ( li )
					{
						var nextLi = li.getNext(),
							first = nextLi && nextLi.getFirst();
						if ( first && first.is && first.is( 'ul', 'ol' ) )
						{
							first.move( li );
							nextLi.remove();
						}
					}
				};

				editor.on( 'insertHtml', fixNestedList, null, null, 100 );
			}

			editor.on( 'uiReady', function()
				{
					var normalCommand = editor.getCommand( 'normal' ),
						button = normalCommand && normalCommand.uiItems[ 0 ];

					if ( button )
					{
						var buttonElement = CKEDITOR.document.getById( button._.id );

						buttonElement.removeAttribute( CKEDITOR.env.ie ? 'mouseup' : 'onclick' );
						buttonElement.on( CKEDITOR.env.ie ? 'mouseup' : 'click', function( ev )
							{
								if ( ev.data.$.shiftKey )
								{
									var sel = editor.getSelection(),
										element = sel && sel.getStartElement(),
										path = new CKEDITOR.dom.elementPath( element ),
										block = path.blockLimit,
										dtd = CKEDITOR.dtd;

									if ( block.is( 'body' ) )
									{
										block = path.block;
									}
									else if ( dtd.$tableContent[ block.getName() ] )
									{
										block = path.block || path.blockLimit.getAscendant( 'table', true );
									}

									if ( dtd.$listItem[ block.getName() ] )
									{
										for ( var i = path.elements.length - 1 ; i >= 0 ; i-- )
										{
											var pathElement = path.elements[ i ];
											if ( dtd.$list[ pathElement.getName() ] )
											{
												block = pathElement;
												break;
											}
										}
									}

									var newElementName = editor.config.enterMode == CKEDITOR.ENTER_P ? 'p' : 'div',
										newElement = editor.document.createElement( newElementName );

									editor.fire( 'saveSnapshot' );

									if ( !CKEDITOR.env.ie )
										newElement.appendBogus();

									newElement.insertAfter( block );

									var range = new CKEDITOR.dom.range( editor.document );
									range.moveToElementEditStart( newElement );
									range.select();

									newElement.scrollIntoView();

									editor.fire( 'saveSnapshot' );
								}
								else
								{
									editor.execCommand( button.command );
								}
							});
					}
				});
			
			/**
			 * Find/Replace dialog: Find by enter key
			 * 
			 * @see #0007517
			 */
			CKEDITOR.on( 'dialogDefinition', function( evt )
				{
					if ( evt.data.name == 'find' || evt.data.name == 'replace' )
					{
						var def = evt.data.definition;
						def.contents[ 0 ].elements[ 0 ].children[ 0 ].setup = function()
							{
								var inputElement = this;
								this.getInputElement().on( 'keypress', function( evt )
									{
										if ( evt.data.getKeystroke() == 13 )
										{
											inputElement.getDialog().getContentElement( 'find', 'btnFind' ).click();
											evt.cancel();
										}
									});
							};
						
						def.onShow = CKEDITOR.tools.override( def.onShow, function( original )
							{
								return function()
								{
									original.call( this );
									this.setupContent();
								}
							});
					}
				});
			
			/**
			 * Add command shortcut to UI element label
			 * @see #MT-10605
			 */
			var keystrokes = {},
				shortcuts = editor.config.shortcuts,
				i;

			for ( i in editor.config.keystrokes )
			{
				keystrokes[ editor.config.keystrokes[ i ][ 1 ] ] = editor.config.keystrokes[ i ][ 0 ];
			}

			editor.on( 'pluginsLoaded', function()
				{
					var i, name, item, command, keystroke,
						items = editor.ui._.items;
					
					// go through ui items
					for ( name in items )
					{
						if ( !items.hasOwnProperty( name ) )
						{
							continue;
						}
						
						item = items[ name ];
						command = item.command;
						
						if ( command && item.type == CKEDITOR.UI_BUTTON )
						{
							if ( command in keystrokes )
							{
								keystroke = representKeyStroke( keystrokes[ command ] );
							}
							else if ( command in shortcuts )
							{
								keystroke = representKeyStroke( shortcuts[ command ] );
							}

							if ( keystroke )
							{
								var def = item.args[ 0 ],
									title = def.title || def.label || '';
								
								title += ' (' + keystroke + ')';
								item.args[ 0 ].title = title;

								keystroke = null;
							}
						}
					}
				});
			
			CKEDITOR.ui.on( 'ready', function( evt )
				{
					var ui = evt.data;

					if ( ui.items )
					{
						var element = ui._.element,
							item, command, keystroke,
							nodeList = element.getElementsByTag( 'a' ),
							itemNode, title,
							i, j;
						
						for ( i = 0 ; i < ui.items.length ; i++ )
						{
							item = ui.items[ i ];
							command = item.command;
							
							if ( command )
							{
								if ( command in keystrokes )
								{
									keystroke = representKeyStroke( keystrokes[ command ] );
								}
								else if ( command in shortcuts )
								{
									keystroke = representKeyStroke( shortcuts[ command ] );
								}

								if ( keystroke )
								{
									for ( j = 0 ; j < nodeList.count() ; j++ )
									{
										itemNode = nodeList.getItem( j );
										
										if ( itemNode.hasClass( item.className ) )
										{
											// decode html entity
											var dummy = itemNode.getDocument().createElement( 'div' );
											dummy.setHtml( keystroke );
											
											title = itemNode.getAttribute( 'title' ) || item.label || '';
											title += ' (' + dummy.getText() + ')';
											
											itemNode.setAttribute( 'title', title );
											break; // for j
										}
									}

									keystroke = null;
								}
							}
						}
					}
				});
			
			/**
			 * Remove format: also clean up document structure
			 * @see #MT-10753
			 */
			editor.on( 'removeFormatCleanup', function( evt )
				{
					var formatElements = { address:1,h1:1,h2:1,h3:1,h4:1,h5:1,h6:1,pre:1,blockquote:1 },
						node = evt.data,
						nodeName = node.getName(),
						dtd = CKEDITOR.dtd;
					
					if ( nodeName in formatElements || nodeName in dtd.$listItem )
					{
						node.renameNode( ( editor.config.enterMode == CKEDITOR.ENTER_P ) ? 'p' : 'div' );
					}
					else if ( nodeName in dtd.$list )
					{
						node.remove( 1 );
					}
				});
				
			editor.on( 'destroy', function()
				{
					editor.unlock();
				});
				
			// @see EDT-134
			editor.on( 'mode', function ( evt )
				{
					editor.focus();
				});

			editor.on( 'insertText', function( ev )
				{
					function repeat( pattern, count )
					{
						if ( count < 1 )
							return '';

						var result = '';
						while ( count > 0 )
						{
							if ( count & 1 )
								result += pattern;

							count >>= 1, pattern += pattern;
						}

						return result;
					}

					var sel = editor.getSelection(),
						pre = sel && sel.getStartElement().getAscendant( 'pre', true ),
						tab = pre ? repeat( ' ', 4 ) : repeat( '\u00A0', 4 );

					ev.data = ev.data.replace( /\t/g, tab );
				});
				
			if ( CKEDITOR.env.ie )
			{
				// sometimes queryCommandEnabled('Copy') == true in IE
				// even if range is collapsed
				// @see EDT-320
				editor.on( 'pasteState', function()
					{
						var sel = editor.getSelection(),
							ranges = sel && sel.getRanges()
							range = ranges && ranges[ 0 ];
						
						if ( range && range.collapsed )
						{
							try
							{
								if ( editor.document.$.queryCommandEnabled( 'copy' ) )
								{
									editor.getCommand( 'copy' ).disable();
								}
							}
							catch ( ex ) {}
						}
					});

				// @see EDT-349
				editor.on( 'loadSnapshot', function( ev )
					{
						var nbspRe = /<p>&nbsp;<\/p>/ig;
						ev.data = ev.data.replace( nbspRe, '<p></p>' );

					}, null, null, 1 );
			}
		}
	});
})();

/**
 * List of commands' shortcuts which can't be listed in {config.keystrokes}
 * @type Object
 */
CKEDITOR.config.shortcuts =
	{
		'indent' : 9,
		'outdent' : CKEDITOR.SHIFT + 9,
		'copy' : CKEDITOR.CTRL + 67,
		'cut' : CKEDITOR.CTRL + 88,
		'paste' : CKEDITOR.CTRL + 86
	};
