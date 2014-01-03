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
 * @file Enter key plugin.
 */

/**
 * 1. Enter inside pre or comment blocks should always produce line break.
 * 2. Shift + Enter at the end of the pre or comment block should exit block (EDT-470).
 * 3. Shift + Enter at the end of conditional block should exit block.
 * 4. Enter at the end of definition term or definition description should toggle definition list item.
 */

(function() {
	CKEDITOR.plugins.add('mindtouch/enterkey', {
		requires: 'enterkey',
		init: function( editor ) {
			editor.getCommand( 'enter' ).on( 'exec', enter, editor );
			editor.getCommand( 'shiftEnter' ).on( 'exec', enter, editor, { forceMode: true } );
		}
	});

	var plugin = CKEDITOR.plugins.enterkey,
		enterBr = plugin.enterBr,
		enterBlock = plugin.enterBlock;

	function enter( ev ) {
		var editor = this,
			forceMode = editor.config.forceEnterMode || ( ev.listenerData && ev.listenerData.forceMode ) || false;

		// Only effective within document.
		if ( editor.mode != 'wysiwyg' ) {
			return;
		}

		var mode = !forceMode ? editor.config.enterMode : editor.config.shiftEnterMode,
			range = getRange( editor );

		if ( !range ) {
			return;
		}

		var atBlockStart = range.checkStartOfBlock(),
			atBlockEnd = range.checkEndOfBlock(),
			path = editor.elementPath( range.startContainer ),
			block = path.block,
			blockLimit = path.blockLimit,
			pre = block && block.is( 'pre' ),
			comment = block && block.is( 'p' ) && block.hasClass( 'comment' ),
			conditional = forceMode && atBlockEnd && blockLimit.is( 'div' ) && blockLimit.hasClass( 'mt-style-conditional' ) && block.equals( blockLimit.getLast() ),
			dl = block && !forceMode && atBlockEnd && block.is( 'dt', 'dd' );

		if ( pre || comment || conditional || dl ) {
			var path = editor.elementPath();
			if ( !path.isContextFor( 'p' ) ) {
				mode = CKEDITOR.ENTER_BR;
				forceMode = 1;
			}

			editor.fire( 'saveSnapshot' );

			if ( conditional || dl ) {
				enterBlock( editor, mode, range, forceMode );
				if ( conditional ) {
					elementPath = new CKEDITOR.dom.elementPath( editor.getSelection().getStartElement() );
					elementPath.block.remove().insertAfter( blockLimit );
					range.moveToElementEditStart( elementPath.block );
					range.select();
				}
			} else if ( forceMode && ( atBlockStart || atBlockEnd ) ) {
				enterBlock( editor, mode, range, forceMode );
			} else {
				enterBr( editor, mode, range, forceMode );

				if ( pre ) {
					/**
					 * Keep indentation for pre blocks
					 * @see #0008041, 0008950
					 */
	 				range = editor.getSelection().getRanges( true )[ 0 ];

	 				var node = range.startContainer,
	 					lineBreak;

	 				if ( node.type == CKEDITOR.NODE_ELEMENT ) {
	 					node = node.getChild( range.startOffset );
	 					if ( !node ) {
	 						node = range.startContainer.getLast();
	 					}
	 				}

	 				if ( node.type == CKEDITOR.NODE_TEXT ) {
	 					lineBreak = node.getPrevious();
	 				} else {
	 					lineBreak = node;
	 				}

	 				if ( lineBreak ) {
	 					if ( lineBreak.type == CKEDITOR.NODE_ELEMENT && !lineBreak.is( 'br' ) ||
	 						lineBreak.type == CKEDITOR.NODE_TEXT && !/^(\n|\n\r|\r)$/.test( lineBreak.getText() ) ) {
	 						lineBreak = null;
	 					}
	 				}

	 				var prev = lineBreak && lineBreak.getPreviousSourceNode( true, CKEDITOR.NODE_TEXT, block ),
						prevLine = prev && prev.getText(),
						lines = prevLine && prevLine.split( /[\r\n]+/ ) || [];

					// IE puts line breaks to the start of the line
					// and splits line started with \r to array with one element
					var isIELineBreak = ( CKEDITOR.env.ie && /^\r/.test( prevLine ) );

					if ( lines.length == 1 && !isIELineBreak ) {
						while ( prev = prev.getPreviousSourceNode( true, null, block ) ) {
							if ( prev.is && prev.is( 'br' ) ) {
								break;
							} else if ( prev.type == CKEDITOR.NODE_TEXT && prev.getLength() > 0 ) {
								var text = prev.getText();

								if ( /[\r\n]$/.test( text ) ) {
									break;
								}

								// IE sometimes splits leading spaces into several nodes
								if ( /^(\s|&nbsp;|\u00A0|&#160;)+$/.test( text ) ) {
									prevLine = text + prevLine;
								} else {
									prevLine = text;
								}

								if ( CKEDITOR.env.ie && /^\r/.test( text ) ) {
									break;
								}

								// if the previous node has trailing linebreak -
								// the current node is start of the line
								var prePrev = prev.getPrevious( function( node ) { return node.type == CKEDITOR.NODE_TEXT } );
								if ( prePrev && /[\r\n]$/.test( prePrev.getText() ) ) {
									break;
								}
							}
						}
					}
					else {
						prevLine = lines[ lines.length - 1 ];
					}

					var re = /^((?:\s|&nbsp;|\u00A0|&#160;)+)/;
					var matches = re.exec( prevLine );

					if ( matches ) {
						var node = new CKEDITOR.dom.text( matches[1], editor.document );
						range.insertNode( node );
						range.setStartAt( node, CKEDITOR.POSITION_BEFORE_END );
						range.collapse( true );
						range.select();
					}
				}
			}

			if ( ( atBlockStart || atBlockEnd ) && ( ( forceMode && comment ) || dl ) ) {
				range = editor.getSelection().getRanges( true )[ 0 ];
				path = editor.elementPath( range.startContainer );

				var newBlock = atBlockEnd ? path.block : path.block.getPrevious();

				if ( comment ) {
					newBlock.removeClass( 'comment' );
					editor.forceNextSelectionCheck();
					editor.selectionChange( 1 );
				} else if ( dl ) {
					newBlock.renameNode( block.is( 'dt' ) ? 'dd' : 'dt' );
					range.moveToElementEditStart( newBlock );
					range.select();
				}
			}

			editor.fire( 'saveSnapshot' );

			ev.cancel();
		}
	}

	function getRange( editor )
	{
		// Get the selection ranges.
		var ranges = editor.getSelection().getRanges( true );

		// Delete the contents of all ranges except the first one.
		for ( var i = ranges.length - 1 ; i > 0 ; i-- )
		{
			ranges[ i ].deleteContents();
		}

		// Return the first range.
		return ranges[ 0 ];
	}
})();
