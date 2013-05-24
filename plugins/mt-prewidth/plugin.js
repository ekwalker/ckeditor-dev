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
 * @file Recalculates width of pre blocks.
 * @see EDT-264
 */

(function()
{
	var styles = {};

	function update( pre )
	{
		var editor = this,
			updateSnapshot = false;

		if ( !pre )
		{
			var sel = editor.getSelection(),
				firstElement = sel && sel.getStartElement(),
				path = firstElement && new CKEDITOR.dom.elementPath( firstElement );

			if ( !path || !path.block || !path.block.is( 'pre' ) )
			{
				return;
			}

			pre = path.block;
		}

		// the fake pre element to calculate the width
		var dummyPre = pre.clone( true );
		dummyPre.data( 'cke-temp', 1 );
		dummyPre.setStyles(
			{
				'position' : 'absolute',
				'left' : '-9999px',
				'overflow' : 'auto',
				'width' : 'auto'
			});
		dummyPre.data( 'cke-prewidth', false );
		editor.document.getBody().append( dummyPre );

		var id = pre.data( 'cke-prewidth' );

		if ( !id )
		{
			id = CKEDITOR.tools.getNextNumber();
			pre.data( 'cke-prewidth', id );
			updateSnapshot = true;
		}

		var doc = editor.document,
			style = styles[ id ],
			newWidth = dummyPre.$.scrollWidth,
			cssStyleText = '';
			
		if ( doc.getBody().$.offsetWidth < newWidth )
		{
			cssStyleText = 'pre[data-cke-prewidth="' + id + '"] { width : ' + newWidth + 'px; }';
		}

		cssStyleText = new CKEDITOR.dom.text( cssStyleText, doc );

		if ( !style )
		{
			style = new CKEDITOR.dom.element( 'style', doc );
			style.append( cssStyleText );
			doc.getHead().append( style );

			styles[ id ] = style;
		}
		else
		{
			cssStyleText.replace( style.getFirst() );
		}

		dummyPre.remove();

		updateSnapshot && editor.fire( 'updateSnapshot' );
	}

	CKEDITOR.plugins.add( 'prewidth',
	{
		requires : [ 'selection' ],

		init : function( editor )
		{
			// ie adds resize controls to pre elements
			if ( CKEDITOR.env.ie )
			{
				return false;
			}
			
			var updatePreBlocksWidth = function()
			{
				var preElements = editor.document.getElementsByTag( 'pre' ),
					count = preElements.count(),
					pre, i;

				for ( i = 0 ; i < count ; i++ )
				{
					pre = preElements.getItem( i );
					update.call( editor, pre );
				}
			};
			
			editor.on( 'afterPaste', updatePreBlocksWidth );

			editor.on( 'contentDom', function()
				{
					updatePreBlocksWidth();
					
					var callback = function()
					{
						CKEDITOR.tools.setTimeout( update, 0, editor );
					};

					editor.document.on( 'keydown', callback );
					editor.document.on( 'mouseup', callback );
				});
		}
	});
})();
