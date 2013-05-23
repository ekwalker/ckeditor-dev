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
 * @file Use ZeroClipboard to copy/paste via flash.
 */

(function()
{
	var zClipboardData;

	function getStates( editor )
	{
		var state = CKEDITOR.TRISTATE_OFF,
			sel = editor.getSelection()
			ranges = sel && sel.getRanges(),
			range = ranges && ranges[ 0 ];

		if ( range && range.collapsed )
		{
			state = CKEDITOR.TRISTATE_DISABLED;
		}

		return { 'copy' : state, 'cut' : range && range.checkReadOnly() ? CKEDITOR.TRISTATE_DISABLED : state };
	}

	function setToolbarStates( editor )
	{
		if ( editor.mode != 'wysiwyg' )
			return;

		var states = getStates( editor );

		editor.getCommand( 'copy' ).setState( states.copy );
		editor.getCommand( 'cut' ).setState( states.cut );
	}

	function getTopRangeNodes( range )
	{
		var boundaryNodes = range.getBoundaryNodes();

		var startNode = range.startContainer,
			endNode = range.endContainer,
			startOffset = range.startOffset,
			endOffset = range.endOffset,
			childCount;

		if ( startNode.type == CKEDITOR.NODE_ELEMENT )
		{
			childCount = startNode.getChildCount();
			if ( childCount > startOffset )
				startNode = startNode.getChild( startOffset );
			else if ( childCount < startOffset && childCount > 0 )
			{
				// Try to take the node just after the current position.
				startNode = startNode.$;
				while ( startNode.lastChild )
					startNode = startNode.lastChild;
				startNode = new CKEDITOR.dom.node( startNode );
			}
		}

		if ( endNode.type == CKEDITOR.NODE_ELEMENT )
		{
			childCount = endNode.getChildCount();
			if ( childCount > endOffset )
				endNode = endNode.getChild( endOffset );
			else if ( childCount < endOffset && childCount > 0 )
			{
				// Try to take the node just before the current position.
				endNode = endNode.$;
				while ( endNode.lastChild )
					endNode = endNode.lastChild;
				endNode = new CKEDITOR.dom.node( endNode );
			}
		}

		while ( startNode.type != CKEDITOR.NODE_ELEMENT || startNode.getName() in CKEDITOR.dtd.$inline )
		{
			startNode = startNode.getParent();
		}

		while ( endNode.type != CKEDITOR.NODE_ELEMENT || endNode.getName() in CKEDITOR.dtd.$inline )
		{
			endNode = endNode.getParent();
		}

		return { topStart : startNode, topEnd : endNode };
	}

	function getSelectedHtml( editor, removeContents )
	{
		var sel = editor.getSelection(),
			ranges = ( sel && sel.getRanges() ) || [],
			html = '',
			i, range;

		for ( i = 0 ; i < ranges.length ; i++ )
		{
			range = ranges[ i ];

			if ( range.collapsed )
			{
				continue;
			}

			var div = editor.document.createElement( 'div' ),
				// create bookmark since cloneContents may lost selection
				bookmark = range.createBookmark();
			
			// get the selected contents and copy it to the temporary node
			range.cloneContents().appendTo( div );
			
			range.moveToBookmark( bookmark );

			// get the copied html
			html += div.getHtml();

			// remove contents on cut operations
			if ( removeContents && !range.checkReadOnly() )
			{
				var topRangeNodes = getTopRangeNodes( range.clone() );

				range.deleteContents();

				// if selected two and more different block nodes
				// we need to merge the last node into the first node
				// note: we can't use mergeThen param of deleteContents
				// since it doesn't work with different block nodes
				// (i.e. header and paragraph)
				if ( !topRangeNodes.topStart.equals( topRangeNodes.topEnd ) )
				{
					// if the last selected node is into the table
					// we don't need to merge its content
					if ( !( topRangeNodes.topEnd.getName() in CKEDITOR.dtd.$tableContent ) )
					{
						var span = CKEDITOR.dom.element.createFromHtml( '<span ' +
							'data-cke-bookmark="1" style="display:none">&nbsp;</span>', range.document );

						range.moveToElementEditEnd( range.getBoundaryNodes().startNode );
						range.insertNode( span );
						range.setStartAfter( span );
						range.collapse( 1 );

						// flag that indicates that the end node should be removed after merging
						var removeTopEnd = true;

						// special case for pre block:
						// if it still has content after deleting
						// we need to merge just the first line of pre block into the start node
						if ( topRangeNodes.topEnd.is( 'pre' ) )
						{
							var preHtml = topRangeNodes.topEnd.getHtml(),
								lines = preHtml.split( /\r|\n|\r\n|<br\s*\/?>/ig );

							if ( lines.length > 1 )
							{
								var lineBreak;

								if ( CKEDITOR.env.ie && CKEDITOR.env.version < 8 )
								{
									lineBreak = '\r';
								}
								else
								{
									lineBreak = range.document.createElement( 'br' ).getOuterHtml();
								}

								range.insertNode( new CKEDITOR.dom.text( lines.shift(), range.document ) );
								topRangeNodes.topEnd.setHtml( lines.join( lineBreak ) );

								// don't remove pre block
								removeTopEnd = false;
							}
						}

						if ( removeTopEnd )
						{
							topRangeNodes.topEnd.moveChildren( topRangeNodes.topStart );
							topRangeNodes.topEnd.remove();
						}

						range.moveToBookmark( { startNode : span } );
					}
				}

				// append the bogus node if we have an empty block
				if ( !topRangeNodes.topStart.getText().length )
				{
					!CKEDITOR.env.ie && topRangeNodes.topStart.appendBogus();
					range.moveToElementEditStart( topRangeNodes.topStart );
				}

				range.collapse( 1 );
			}

			range.select();
		}

		return html;
	}
	
	function getPlainText( editor, data )
	{
		var html = editor.dataProcessor.toDataFormat( data );
		html = html.split( "\n" );
		result = [];
		for ( var i = 0 ; i < html.length ; i++ )
		{
			var str = html[ i ];
			// remove leading tabs
			str = str.replace( /^\t+/ig, '' );
			// strip tags
			str = str.replace( /<[^>]+>/ig, '' );

			if ( str.length )
			{
				result.push( str );
			}
		}

		html = result.join( "\n" );

		// set html to dummy element to convert html entities
		var dummy = new CKEDITOR.dom.element( 'div', CKEDITOR.document );
		dummy.setHtml( html );
		data = dummy.getText();

		return data;
	}

	function tryToCutCopy( editor, type )
	{
		try
		{
			return editor.document.$.execCommand( type, false, null );
		}
		catch( ex )
		{
			return false;
		}
	}

	function createClipboard( editor, element, name, callback )
	{
		var clipboard = new ZeroClipboard.Client();
		clipboard.setHandCursor( false );

		clipboard.addEventListener( 'load', function( client )
			{
				var div = new CKEDITOR.dom.element( client.div ),
					isSafari = navigator.vendor.indexOf( 'Apple' ) != -1;

				// don't set opacity for Safari. see EDT-373
				!isSafari && div.setOpacity( 0 );

				client.movie.setAttribute( 'title', element.getAttribute( 'title' ) );
				
				setToolbarStates( editor );
			});

		clipboard.addEventListener( 'complete', function( client, args )
			{
				zClipboardData = args.text;

				if ( editor.getCommand( name ).state != CKEDITOR.TRISTATE_DISABLED )
				{
					editor.getCommand( 'paste' ).enable();
				}

				// move focus out of the editor: EDT-234
				if ( CKEDITOR.env.mac )
				{
					var id = 'cke_zeroclipboard_fakelink',
						link = CKEDITOR.document.getById( id );

					if ( !link )
					{
						link = CKEDITOR.document.createElement( 'a' );
						link.setAttribute( 'href', '#' );
						link.setStyles({
							'position' : 'absolute',
							'top' : 0,
							'left' : '-9999px'
						});
						link.setHtml( 'fake link' );
						CKEDITOR.document.getBody().append( link );
					}

					link.focus();
				}

				editor.focus();
			});

		clipboard.addEventListener( 'mouseDown', function( client )
			{
				if ( editor.getCommand( name ).state != CKEDITOR.TRISTATE_DISABLED )
				{
					var cancel = ( editor.fire( 'zcBefore' + CKEDITOR.tools.capitalize( name ) ) === false );
					!cancel && callback.call( client, client );
				}
			});

		clipboard.glue( element.$, CKEDITOR.document.getBody().$, { zIndex : Math.floor( editor.config.baseFloatZIndex + 1 ) } );

		return clipboard;
	}

	function initZeroClipboard()
	{
		var editor = this.editor,
			doc = CKEDITOR.document,
			toolbarClipboards = {},
			contextMenuClipboards = {};

		// check if copy/cut commands are enabled in browser
		var copyEnabled = tryToCutCopy( editor, 'copy' ),
			cutEnabled = tryToCutCopy( editor, 'cut' );

		if ( copyEnabled && cutEnabled )
		{
			return;
		}

		ZeroClipboard.setMoviePath( this.plugin.path + 'ZeroClipboard10.swf' );

		ZeroClipboard.getDOMObjectPosition = function( obj )
		{
			var element = new CKEDITOR.dom.element( obj ),
				pos = element.getDocumentPosition( CKEDITOR.document );

			var info =
			{
				left: pos.x,
				top: pos.y,
				width : obj.width ? obj.width : obj.offsetWidth,
				height : obj.height ? obj.height : obj.offsetHeight
			};

			return info;
		};

		var extendCommand = function( name, exec )
		{
			if ( !toolbarClipboards[ name ] )
			{
				var command = editor.getCommand( name ),
					button = command.uiItems[ 0 ];

				if ( !button )
				{
					return;
				}

				button = doc.getById( button._.id );
				toolbarClipboards[ name ] = createClipboard( editor, button, name, exec );
			}
			else
			{
				setToolbarStates( editor );
			}
		};

		// reposition flash elements on scroll/resize/etc.
		var reposition = function()
		{
			var editor = this,
				shared = editor.sharedSpaces && editor.sharedSpaces.top && editor.sharedSpaces.top.getParent().getParent().getParent().getParent(),
				name, clipboard;

			for ( name in toolbarClipboards )
			{
				clipboard = toolbarClipboards[ name ];
				clipboard.reposition();

				if ( shared )
				{
					if ( shared.getComputedStyle( 'position' ) == 'fixed' )
					{
						clipboard.div.style[ 'position' ] = 'fixed';

						var top = parseInt( clipboard.div.style[ 'top' ], 10 ),
							scroll = CKEDITOR.document.getWindow().getScrollPosition();
						top -= scroll.y;
						clipboard.div.style[ 'top' ] = top + 'px';
					}
					else
					{
						clipboard.div.style[ 'position' ] = 'absolute';
					}
				}
			}
		};

		var win = doc.getWindow();
		win.on( 'resize', reposition, editor );
		editor.config.floating_toolbar && win.on( 'scroll', reposition, editor );

		editor.on( 'afterCommandExec', function( evt )
			{
				if ( evt.data.name == 'toolbarCollapse' )
				{
					reposition.call( editor );
				}
			});

		editor.on( 'destroy', function()
			{
				win.removeListener( 'resize', reposition );
				win.removeListener( 'scroll', reposition );

				for ( var name in toolbarClipboards )
				{
					toolbarClipboards[ name ].destroy();
				}

				for ( var name in contextMenuClipboards )
				{
					contextMenuClipboards[ name ].destroy();
				}
			});

		editor.on( 'pasteState', function( evt )
			{
				!copyEnabled && extendCommand( 'copy', function( clipboard )
					{
						var html = getSelectedHtml( editor );
						clipboard.setText( html );
					});

				!cutEnabled && extendCommand( 'cut', function( clipboard )
					{
						editor.fire( 'saveSnapshot' );

						var html = getSelectedHtml( editor, true );
						clipboard.setText( html );

						editor.fire( 'saveSnapshot' );
					});
			});

		editor.on( 'contentDom', function()
			{
				editor.document.on( 'mouseup', function()
					{
						setToolbarStates( editor );
					});
			});

		// strip html tags on pasting as plain text
		// @see EDT-304
		CKEDITOR.on( 'dialogDefinition', function( evt )
			{
				if ( evt.data.name == 'pastetext' )
				{
					var dialog = evt.data.definition.dialog;

					var paste = function ( textarea, data )
					{
						//IE support
						if ( document.selection )
						{
							textarea.focus();

							sel = document.selection.createRange();
							sel.text = data;
						}
						//Firefox support
						else if ( textarea.$.selectionStart || textarea.$.selectionStart == '0' )
						{
							textarea.focus();

							var startPos = textarea.$.selectionStart,
								endPos = textarea.$.selectionEnd,
								value = textarea.getValue();

							textarea.setValue( value.substring( 0, startPos ) + data + value.substring( endPos, value.length ) );
							textarea.$.setSelectionRange( endPos + data.length, endPos + data.length );
						}
						else
						{
							textarea.setValue( textarea.getValue() + data );
						}
					};

					var getClipboardData = function( evt, textarea, callback )
					{
						var doc = CKEDITOR.document;

						// Avoid recursions on 'paste' event or consequent paste too fast.
						if ( doc.getById( 'cke_z_pastebin' ) )
							return;

						// If the browser supports it, get the data directly
						if ( evt.data && evt.data.$.clipboardData )
						{
							// evt.data.$.clipboardData.types contains all the flavours in Mac's Safari, but not on windows.
							var plain = evt.data.$.clipboardData.getData( 'text/plain' );
							if ( plain )
							{
								evt.data.preventDefault();
								callback( plain );
								return;
							}
						}

						// Create container to paste into
						var pastebin = new CKEDITOR.dom.element( 'textarea', doc );
						pastebin.setAttribute( 'id', 'cke_z_pastebin' );
						doc.getBody().append( pastebin );

						pastebin.setStyles(
							{
								'position' : 'fixed',
								// Position the bin exactly at the position of the textarea
								// to avoid any subsequent document scroll.
								'top' : textarea.getDocumentPosition( doc ).y + 'px',
								'width' : '1px',
								'height' : '1px',
								'overflow' : 'hidden',
								'z-index' : this.config.baseFloatZIndex + 100
							});

						// It's definitely a better user experience if we make the paste-bin pretty unnoticed
						// by pulling it off the screen.
						pastebin.setStyle( this.config.contentsLangDirection == 'ltr' ? 'left' : 'right', '-1000px' );
						pastebin.focus();

						// Wait a while and grab the pasted contents
						window.setTimeout( function()
						{
							textarea.focus();
							pastebin.remove();

							callback( pastebin.getValue() );
						}, 0 );
					};

					dialog.on( 'load', function()
						{
							var input = this.getElement().getElementsByTag( 'textarea' ).getItem( 0 );

							input.on( 'keydown', function( ev )
								{
									var keyCode = ev.data.getKeystroke();
									if ( keyCode == CKEDITOR.CTRL + 86 || keyCode == CKEDITOR.SHIFT + 45 )
									{
										var target = ev.data && ev.data.getTarget();
										target && target.fire( 'beforepaste' );
										ev.cancel();
									}
								});

							input.on( CKEDITOR.env.webkit ? 'paste' : 'beforepaste', function( ev )
								{
									var textarea = this;
									getClipboardData.call( editor, ev, textarea, function( data )
									{
										// if data was copied with ZeroClipboard
										// strip html tags manually
										if ( data && data === zClipboardData )
										{
											data = getPlainText( editor, data );
										}

										paste( textarea, data );
									});
								});

							// FF: in case when user pastes data via context menu
							// requires enabled "signed.applets.codebase_principal_support"
							CKEDITOR.env.gecko && input.on( 'paste', function( ev )
								{
									try
									{
										if ( netscape.security.PrivilegeManager.enablePrivilege )
										{
											netscape.security.PrivilegeManager.enablePrivilege( "UniversalXPConnect" );
										}
										else
										{
											return;
										}
									} catch (ex)
									{
										return;
									}

									var clip = Components.classes[ "@mozilla.org/widget/clipboard;1" ].getService( Components.interfaces.nsIClipboard );
									if ( !clip )
									{
										return;
									}

									var trans = Components.classes[ "@mozilla.org/widget/transferable;1" ].createInstance( Components.interfaces.nsITransferable );
									if ( !trans )
									{
										return;
									}

									trans.addDataFlavor( "text/unicode" );

									clip.getData( trans, clip.kGlobalClipboard );

									var str = {}, strLength = {}, data = null;

									trans.getTransferData( "text/unicode", str, strLength );

									if ( str )
									{
										str = str.value.QueryInterface( Components.interfaces.nsISupportsString );
										data = str.data.substring( 0, strLength.value / 2 );

										if ( data === zClipboardData )
										{
											data = getPlainText( editor, data );
											paste( this, data );
											ev.data.preventDefault();
										}
									}
								});
						}, dialog);
				}
			});

		// enable ZeroClipboard for context menu items
		if ( editor.contextMenu )
		{
			// set the new states for context menu items
			editor.contextMenu.addListener( function( element, selection )
				{
					var states = getStates( editor ),
						contextMenu = editor.contextMenu,
						i, item;

					for ( i = 0 ; i < contextMenu.items.length ; i++ )
					{
						item = contextMenu.items[ i ];
						switch ( item.name )
						{
							case 'cut' :
								if ( !cutEnabled )
									item.state = states.cut;
								break;
							case 'copy' :
								if ( !copyEnabled )
									item.state = states.copy;
								break;
						}
					}

					return null;
				});

			CKEDITOR.ui.on( 'ready', function( ev )
				{
					var menu = ev.data,
						i;

					if ( !( menu instanceof CKEDITOR.plugins.contextMenu ) )
					{
						return;
					}

					var onHide = function()
					{
						setTimeout( function()
							{
								for ( var i in contextMenuClipboards )
								{
									contextMenuClipboards[ i ].hide();
								}
							}, 100 );
					};

					if ( menu.onHide )
					{
						menu.onHide = CKEDITOR.tools.override( menu.onHide, function( originalOnHide )
							{
								return function()
								{
									onHide.call( this );
									originalOnHide.call( this );
								}
							});
					}
					else
					{
						menu.onHide = onHide;
					}

					var attachZeroClipboard = function( panel )
					{
						// wait until the menu will not be visible
						if ( panel.element.getStyle( 'opacity' ) == '0' )
						{
							setTimeout( function()
								{
									attachZeroClipboard( panel );
								}, 0 );
							return;
						}

						var menuItems = panel.getHolderElement().getElementsByTag( 'a' ),
							count = menuItems.count(),
							i, item;

						var attach = function( menuItem, name, exec )
						{
							if ( !contextMenuClipboards[ name ] )
							{
								contextMenuClipboards[ name ] = createClipboard( editor, menuItem, name, exec );
							}
							else
							{
								contextMenuClipboards[ name ].reposition( menuItem.$ );
							}
						};

						for ( i = 0 ; i < count ; i++ )
						{
							item = menuItems.getItem( i );

							if ( item.hasClass( 'cke_menubutton__copy' ) && !copyEnabled )
							{
								attach( item, 'copy', function( clipboard )
									{
										var html = getSelectedHtml( editor );
										clipboard.setText( html );
									});
							}
							else if ( item.hasClass( 'cke_menubutton__cut' ) && !cutEnabled )
							{
								attach( item, 'cut', function( clipboard )
									{
										editor.fire( 'saveSnapshot' );

										var html = getSelectedHtml( editor, true );
										clipboard.setText( html );

										editor.fire( 'saveSnapshot' );
									});
							}
						}
					};

					var onMenuShow = function( ev )
					{
						ev.removeListener();
						setTimeout( function()
							{
								attachZeroClipboard( ev.data[0]._.panel );
							}, 0 );
					};

					for ( i = 0 ; i < menu.items.length ; i++ )
					{
						if ( menu.items[ i ].name in { cut:1, copy:1 } )
						{
							editor.on( 'menuShow', onMenuShow );
							break;
						}
					}
				});
		}
	}

	CKEDITOR.plugins.add( 'zeroclipboard',
	{
		requires : 'clipboard',
		init : function( editor )
		{
			if ( CKEDITOR.env.ie )
			{
				// @see EDT-318
				if ( editor.config.ie_copy_html && window.clipboardData )
				{
					// replace the clipboard data with selected html
					editor.on( 'contentDom', function()
						{
							for ( var eventName in { 'copy' : 1, 'cut' : 1 } )
							{
								editor.document.getBody().on( eventName, function( evt )
									{
										var html = getSelectedHtml( editor, evt.name == 'cut' ),
											result = window.clipboardData.setData( 'Text', html );
										
										if ( result )
										{
											zClipboardData = html;
											evt.data.preventDefault();
										}
									});
							}
						});

					editor.on( 'paste', function( evt )
						{
							if ( evt.data.text && evt.data.text === zClipboardData )
							{
								evt.data.text = getPlainText( editor, evt.data.text );
							}
							else if ( evt.data.html )
							{
								if ( !zClipboardData )
								{
									return;
								}
								
								var data = window.clipboardData.getData( 'Text' );

								if ( data && data === zClipboardData )
								{
									evt.data.html = data;
								}
							}
						});
				}
				
				// IE supports clipboard copy/cut commands
				// so we don't need to enable ZeroClipboard for IE
				return;
			}

			var scope =
				{
					editor : editor,
					plugin : this
				};

			// load ZeroClipboard core
			if ( typeof ZeroClipboard == 'undefined' )
			{
				CKEDITOR.scriptLoader.load( CKEDITOR.getUrl( this.path + 'ZeroClipboard.min.js' ), initZeroClipboard, scope );
			}
			else
			{
				initZeroClipboard.call( scope );
			}
		}
	});
})();

/**
 * Copy selected text as html in IE.
 * IE will throw the confirm dialog if this option is enabled.
 * @type Boolean
 * @default true
 * @example
 * config.ie_copy_html = false;
 */
CKEDITOR.config.ie_copy_html = true;

